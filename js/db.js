/**
 * Noten - Database and Sync Module (PouchDB wrapper with Filen replication)
 */

import { FilenSDK } from "@filen/sdk";
import { Buffer } from "buffer";
import { Readable } from "stream";

// Polyfill Readable.from in the browser stream polyfill (unconditionally overwrite the throwing stub)
if (Readable) {
  Readable.from = function (iterable, options) {
    const opt = Object.assign({ objectMode: true }, options);
    const readable = new Readable({
      ...opt,
      read() { }
    });

    (async () => {
      try {
        for await (const chunk of iterable) {
          readable.push(chunk);
        }
        readable.push(null);
      } catch (err) {
        readable.destroy(err);
      }
    })();

    return readable;
  };
}

// Initialize PouchDB local database (renamed to noten_db)
const db = new PouchDB('noten_db');

// State variables for Filen Sync
let filenClient = null;
let onChangeCallback = null;
let onSyncStatusCallback = null;
let syncPromise = Promise.resolve();
let syncInterval = null;

/**
 * Register callbacks for external event changes
 */
export function registerCallbacks(onChange, onSyncStatus) {
  onChangeCallback = onChange;
  onSyncStatusCallback = onSyncStatus;
}

// Watch local database changes for live updates (sync, edits)
db.changes({
  since: 'now',
  live: true,
  include_docs: true
}).on('change', (change) => {
  // Ignore configuration/sync documents in general notes list updates
  if (change.id.startsWith('_local/')) {
    return;
  }
  if (onChangeCallback) {
    onChangeCallback(change);
  }
});

/**
 * Get local-only sync settings (not synchronized to remote server).
 */
export async function getSyncSettings() {
  try {
    return await db.get('_local/sync_settings');
  } catch (err) {
    if (err.status === 404) {
      return { email: '', password: '', twoFactorCode: '', username: '', avatarURL: '', enabled: false };
    }
    throw err;
  }
}

/**
 * Save sync settings locally.
 */
export async function saveSyncSettings(settings) {
  try {
    let existing;
    try {
      existing = await db.get('_local/sync_settings');
    } catch (e) {
      existing = null;
    }

    const doc = {
      _id: '_local/sync_settings',
      ...settings
    };
    if (existing) {
      doc._rev = existing._rev;
    }
    await db.put(doc);
  } catch (err) {
    console.error("Failed to save sync settings:", err);
    throw err;
  }
}

/**
 * Save a note in plaintext locally.
 * @param {string} id - Unique note ID
 * @param {Object} noteObj - Decrypted note object
 */
export async function saveNote(id, noteObj) {
  try {
    let existingDoc = null;
    try {
      existingDoc = await db.get(id);
    } catch (err) {
      // Note is new
    }

    const doc = {
      _id: id,
      type: 'note',
      updatedAt: noteObj.updatedAt || Date.now(),
      title: noteObj.title || '',
      body: noteObj.body || '',
      tags: noteObj.tags || [],
      color: noteObj.color || 'default',
      isPinned: noteObj.isPinned || false,
      isArchived: noteObj.isArchived || false,
      isTrashed: noteObj.isTrashed || false,
      images: noteObj.images || [],
      createdAt: noteObj.createdAt || Date.now()
    };

    if (existingDoc) {
      doc._rev = existingDoc._rev;
      // Preserve sync-related metadata to prevent regression
      if (existingDoc.lastSynced) doc.lastSynced = existingDoc.lastSynced;
      if (existingDoc.remoteLastModified) doc.remoteLastModified = existingDoc.remoteLastModified;
      if (existingDoc.synced) doc.synced = existingDoc.synced;
    }

    const response = await db.put(doc);

    // Trigger sync replication
    triggerSyncReconciliation();

    return response;
  } catch (err) {
    console.error("Failed to save note:", err);
    throw err;
  }
}

/**
 * Get a single note by ID.
 * @param {string} id
 * @returns {Promise<Object>} - Plaintext note document
 */
export async function getNote(id) {
  return await db.get(id);
}

/**
 * Load all notes in the database.
 * @returns {Promise<Array>} - Array of plaintext note documents
 */
export async function loadAllNotes() {
  try {
    const result = await db.allDocs({
      include_docs: true,
      startkey: 'note_',
      endkey: 'note_\ufff0'
    });

    return result.rows.map(row => {
      const doc = row.doc;
      return {
        id: doc._id,
        _rev: doc._rev,
        title: doc.title || '',
        body: doc.body || '',
        tags: doc.tags || [],
        color: doc.color || 'default',
        isPinned: doc.isPinned || false,
        isArchived: doc.isArchived || false,
        isTrashed: doc.isTrashed || false,
        images: doc.images || [],
        createdAt: doc.createdAt || Date.now(),
        updatedAt: doc.updatedAt || Date.now(),
        synced: doc.synced || false,
        lastSynced: doc.lastSynced,
        remoteLastModified: doc.remoteLastModified
      };
    });
  } catch (err) {
    console.error("Failed to load notes:", err);
    return [];
  }
}

/**
 * Permanently delete a note from the database.
 * @param {string} id
 */
export async function deleteNoteFromDB(id) {
  try {
    const doc = await db.get(id);
    await db.remove(doc);

    // Add to deleted queue to sync deletion to remote
    const settings = await getSyncSettings();
    if (settings && settings.enabled) {
      await addToDeletedNotesQueue(id);
      triggerSyncReconciliation();
    }
  } catch (err) {
    console.error("Failed to delete note from DB:", err);
    throw err;
  }
}

/**
 * Configure and start subscription and synchronization with Filen.
 * @param {Object} settings - Sync settings ({email, password, twoFactorCode, enabled})
 */
export async function startSync(settings) {
  stopSync();

  const hasCredentials = settings.email && settings.password;
  const hasSession = settings.apiKey && settings.masterKeys;

  if (!settings.enabled || (!hasCredentials && !hasSession)) {
    if (onSyncStatusCallback) onSyncStatusCallback('offline');
    return;
  }

  if (onSyncStatusCallback) onSyncStatusCallback('syncing');

  await initFilenAndSync(settings);
}

/**
 * Stop any active synchronization.
 */
export function stopSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  filenClient = null;
  if (onSyncStatusCallback) onSyncStatusCallback('offline');
}

/**
 * Clear all local data. Used for logging out / purging.
 */
export async function destroyDatabase() {
  stopSync();
  await db.destroy();
  // Re-instantiate database
  window.location.reload();
}

// --- Custom Local-First Sync Reconciliation Logic for Filen ---

async function getDeletedNotesQueue() {
  try {
    const doc = await db.get('_local/deleted_notes');
    return doc.ids || [];
  } catch (err) {
    if (err.status === 404) {
      return [];
    }
    throw err;
  }
}

async function addToDeletedNotesQueue(id) {
  try {
    let doc;
    try {
      doc = await db.get('_local/deleted_notes');
    } catch (err) {
      if (err.status === 404) {
        doc = { _id: '_local/deleted_notes', ids: [] };
      } else {
        throw err;
      }
    }
    if (!doc.ids.includes(id)) {
      doc.ids.push(id);
      await db.put(doc);
    }
  } catch (err) {
    console.error("Failed to add to deleted notes queue:", err);
  }
}

async function removeFromDeletedNotesQueue(id) {
  try {
    const doc = await db.get('_local/deleted_notes');
    doc.ids = doc.ids.filter(item => item !== id);
    await db.put(doc);
  } catch (err) {
    if (err.status !== 404) {
      console.error("Failed to remove from deleted notes queue:", err);
    }
  }
}

export function triggerSyncReconciliation() {
  if (!filenClient) return;
  queueSync();
}

function queueSync() {
  syncPromise = syncPromise.then(() => runSync()).catch(err => {
    console.error("[Sync] Error in sync queue:", err);
  });
}

async function initFilenAndSync(settings) {
  try {
    filenClient = new FilenSDK({
      metadataCache: true
    });

    if (settings.apiKey && settings.masterKeys) {
      // Initialize with existing session keys
      filenClient.init({
        apiKey: settings.apiKey,
        masterKeys: settings.masterKeys,
        publicKey: settings.publicKey,
        privateKey: settings.privateKey,
        baseFolderUUID: settings.baseFolderUUID,
        userId: settings.userId,
        authVersion: settings.authVersion,
        metadataCache: true
      });

      // Fetch and update profile info in background if needed
      try {
        const accountInfo = await filenClient.user().account();
        if (accountInfo) {
          const nickname = accountInfo.nickName || accountInfo.displayName;
          const avatarURL = accountInfo.avatarURL || '';
          let changed = false;
          if (nickname && nickname !== settings.username) {
            settings.username = nickname;
            changed = true;
          }
          if (avatarURL !== settings.avatarURL) {
            settings.avatarURL = avatarURL;
            changed = true;
          }
          if (changed) {
            await saveSyncSettings(settings);
          }
        }
      } catch (e) {
        console.warn("[Sync] Failed to update profile info in background:", e);
      }
    } else if (settings.email && settings.password) {
      // Perform initial login
      await filenClient.login({
        email: settings.email,
        password: settings.password,
        twoFactorCode: settings.twoFactorCode || undefined
      });

      // Fetch nickname and avatar from Filen
      let nickname = settings.email.split('@')[0];
      let avatarURL = '';
      try {
        const accountInfo = await filenClient.user().account();
        if (accountInfo) {
          if (accountInfo.nickName) nickname = accountInfo.nickName;
          else if (accountInfo.displayName) nickname = accountInfo.displayName;
          if (accountInfo.avatarURL) avatarURL = accountInfo.avatarURL;
        }
      } catch (e) {
        console.warn("[Sync] Failed to fetch profile info during login:", e);
      }

      const sessionSettings = {
        enabled: true,
        username: nickname,
        avatarURL: avatarURL,
        email: settings.email,
        apiKey: filenClient.config.apiKey,
        masterKeys: filenClient.config.masterKeys,
        publicKey: filenClient.config.publicKey,
        privateKey: filenClient.config.privateKey,
        baseFolderUUID: filenClient.config.baseFolderUUID,
        userId: filenClient.config.userId,
        authVersion: filenClient.config.authVersion
      };

      // Save session settings and discard plaintext email/password
      await saveSyncSettings(sessionSettings);
    } else {
      throw new Error("No credentials or active session keys available");
    }

    // Ensure Directory structure exists
    try {
      await filenClient.fs().mkdir({ path: '/Noten' });
    } catch (e) { }
    try {
      await filenClient.fs().mkdir({ path: '/Noten/notes' });
    } catch (e) { }

    // Trigger initial sync reconciliation
    queueSync();

    // Set up periodic sync check every 30 seconds
    syncInterval = setInterval(() => {
      queueSync();
    }, 30000);

  } catch (err) {
    console.error("[Sync] Failed to initialize Filen SDK client:", err);
    if (onSyncStatusCallback) onSyncStatusCallback('error');
    throw err;
  }
}

async function runSync() {
  if (!filenClient) return;
  const settings = await getSyncSettings();
  if (!settings.enabled || !filenClient.isLoggedIn()) return;

  if (onSyncStatusCallback) onSyncStatusCallback('syncing');

  try {
    // 1. Process deletions
    const deletedQueue = await getDeletedNotesQueue();
    for (const noteId of deletedQueue) {
      try {
        const filePath = `/Noten/notes/${noteId}.json`;
        await filenClient.fs().rm({ path: filePath, permanent: true });
        await removeFromDeletedNotesQueue(noteId);
      } catch (err) {
        console.error(`[Sync] Failed to remote delete note ${noteId}:`, err);
        throw err; // Stop sync flow to retry next time
      }
    }

    // 2. Fetch all local notes
    const localResult = await db.allDocs({
      include_docs: true,
      startkey: 'note_',
      endkey: 'note_\ufff0'
    });
    const localDocs = localResult.rows.map(row => row.doc);

    // 3. Fetch remote files in '/Noten/notes'
    let remoteFiles = [];
    try {
      remoteFiles = await filenClient.fs().readdir({ path: '/Noten/notes' });
    } catch (err) {
      // If the folder doesn't exist, create it and proceed with empty remote list
      if (err.message && err.message.includes('not found')) {
        console.warn("[Sync] Remote notes directory not found, creating it...");
        try {
          await filenClient.fs().mkdir({ path: '/Noten' });
        } catch (e) { /* may already exist */ }
        try {
          await filenClient.fs().mkdir({ path: '/Noten/notes' });
        } catch (e) { /* may already exist */ }
        remoteFiles = [];
      } else {
        console.error("[Sync] Failed to read remote notes directory:", err);
        throw err;
      }
    }

    // Gather stats of remote files to build remoteMap
    const remoteMap = new Map();
    for (const filename of remoteFiles) {
      if (!filename.endsWith('.json')) continue;
      const noteId = filename.substring(0, filename.length - 5);
      const filePath = `/Noten/notes/${filename}`;
      try {
        const stats = await filenClient.fs().stat({ path: filePath });
        remoteMap.set(noteId, { filename, filePath, stats });
      } catch (err) {
        console.error(`[Sync] Failed to stat remote file ${filePath}:`, err);
      }
    }

    const localMap = new Map(localDocs.map(doc => [doc._id, doc]));

    // Helper functions for file upload and download
    const uploadNoteToFilen = async (localDoc) => {
      const payload = {
        _id: localDoc._id,
        type: localDoc.type,
        updatedAt: localDoc.updatedAt,
        title: localDoc.title,
        body: localDoc.body,
        tags: localDoc.tags,
        color: localDoc.color,
        isPinned: localDoc.isPinned,
        isArchived: localDoc.isArchived,
        isTrashed: localDoc.isTrashed,
        images: localDoc.images || [],
        createdAt: localDoc.createdAt
      };

      // Resolve the parent directory UUID on Filen
      const parentUUID = await filenClient.fs().pathToItemUUID({
        path: '/Noten/notes',
        type: 'directory'
      });

      if (!parentUUID) {
        throw new Error("Could not resolve parent directory UUID on Filen.");
      }

      // Convert payload to File object for browser-compatible upload
      const jsonStr = JSON.stringify(payload);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const file = new File([blob], `${localDoc._id}.json`, {
        type: 'application/json',
        lastModified: localDoc.updatedAt
      });

      const item = await filenClient.cloud().uploadWebFile({
        file,
        parent: parentUUID,
        name: `${localDoc._id}.json`
      });

      // Update local PouchDB document with sync metadata
      const currentDoc = await db.get(localDoc._id);
      currentDoc.lastSynced = Date.now();
      currentDoc.remoteLastModified = item.lastModified;
      currentDoc.synced = true;
      await db.put(currentDoc);
    };

    const downloadNoteFromFilen = async (filePath, mtimeMs) => {
      const content = await filenClient.fs().readFile({ path: filePath });
      const payload = JSON.parse(content.toString('utf-8'));

      const noteId = payload._id;
      let existingDoc = null;
      try {
        existingDoc = await db.get(noteId);
      } catch (err) {
        // Note is new locally
      }

      const doc = {
        _id: noteId,
        type: 'note',
        updatedAt: payload.updatedAt,
        title: payload.title || '',
        body: payload.body || '',
        tags: payload.tags || [],
        color: payload.color || 'default',
        isPinned: payload.isPinned || false,
        isArchived: payload.isArchived || false,
        isTrashed: payload.isTrashed || false,
        images: payload.images || [],
        createdAt: payload.createdAt || Date.now(),
        synced: true,
        lastSynced: Date.now(),
        remoteLastModified: mtimeMs
      };

      if (existingDoc) {
        doc._rev = existingDoc._rev;
      }

      await db.put(doc);

      if (onChangeCallback) {
        onChangeCallback({ id: noteId, doc });
      }
    };

    // 4. Process local docs
    for (const localDoc of localDocs) {
      const remoteItem = remoteMap.get(localDoc._id);

      if (localDoc.remoteLastModified && !remoteItem) {
        // Local note was synced before but is missing from remote, meaning it was deleted remotely.
        // Delete it locally!
        await db.remove(localDoc);
      } else if (!remoteItem) {
        // Local note is not in remote and was not synced yet. Upload it!
        await uploadNoteToFilen(localDoc);
      } else {
        // Note exists in both. Compare timestamps.
        if (localDoc.updatedAt > (localDoc.lastSynced || 0)) {
          // Local is newer. Upload to remote.
          await uploadNoteToFilen(localDoc);
        } else if (remoteItem.stats.mtimeMs > (localDoc.remoteLastModified || 0)) {
          // Remote is newer. Update locally.
          await downloadNoteFromFilen(remoteItem.filePath, remoteItem.stats.mtimeMs);
        } else {
          // Equal. Ensure marked synced locally.
          if (!localDoc.synced) {
            localDoc.synced = true;
            await db.put(localDoc);
          }
        }
      }
    }

    // 5. Process remote items not present locally
    for (const [noteId, remoteItem] of remoteMap.entries()) {
      if (!localMap.has(noteId)) {
        // Was it deleted offline locally?
        const deletedQueueUpdated = await getDeletedNotesQueue();
        if (deletedQueueUpdated.includes(noteId)) {
          // Yes, we deleted it locally offline, so it's in the deleted queue.
          // Trigger its deletion on remote now.
          try {
            await filenClient.fs().rm({ path: remoteItem.filePath, permanent: true });
            await removeFromDeletedNotesQueue(noteId);
          } catch (err) {
            console.error(`[Sync] Failed to remote delete note ${noteId}:`, err);
          }
        } else {
          // No, it's a new remote note. Download it!
          await downloadNoteFromFilen(remoteItem.filePath, remoteItem.stats.mtimeMs);
        }
      }
    }

    if (onSyncStatusCallback) onSyncStatusCallback('online');
  } catch (err) {
    console.error("[Sync] Error during sync reconciliation:", err);
    if (onSyncStatusCallback) onSyncStatusCallback('error');
  }
}
