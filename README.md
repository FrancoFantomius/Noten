# Noten

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![PWA Support](https://img.shields.io/badge/PWA-Supported-orange.svg)](#key-features)
[![Local-First](https://img.shields.io/badge/Architecture-Local--First-green.svg)](#sync-setup-filen)

**Noten** is a fast, lightweight, and end-to-end encrypted (E2E) notes application. Designed with a **local-first** architecture, it runs entirely in your browser, works 100% offline, and replicates securely to your personal Filen account.

Because the encryption is client-side, the sync server only stores ciphertext. **Your credentials and note contents are never exposed in plaintext to any network or cloud server.**

---

## Key Features

- **Local-First & Offline Support**: Stores notes locally in IndexedDB (via PouchDB) for instantaneous loading. The application is a fully functional Progressive Web App (PWA) with offline capabilities.
- **Client-Side E2E Encrypted Sync**: Seamless synchronization with your personal **Filen** account using the official Filen SDK. All encryption and decryption happen in your browser using AES-256-GCM before data is uploaded.
- **Advanced Interactive Checklists**:
  - Toggle checklist format on notes.
  - **Hierarchical Tasks**: Indent checklist items using `Tab` (or `Shift + Tab` to outdent) or the on-screen left/right chevron buttons.
  - **Drag-and-Drop Reordering**: Move tasks with cursor dragging, or use keyboard shortcuts `Alt + Arrow Up` / `Alt + Arrow Down`.
- **Responsive Masonry Layout**: Beautifully displays notes in a CSS-column masonry grid. Pin crucial notes to the top of your feed.
- **Organization & Customization**:
  - Color-code note cards using curated premium palettes.
  - Categorize notes with custom hashtags (`#tags`).
  - Dynamic Tag Section in the sidebar for quick filtering.
  - Real-time instant search across titles, descriptions, and tags.
- **Media Attachments**:
  - Attach multiple images to note cards.
  - Local image compression via the Canvas API (JPEG at 75% quality) to optimize sync speeds.
  - Grid preview layouts on note cards and a fullscreen image lightbox viewer.
- **Workflow Archiving & Trash**:
  - Move completed or old notes to the **Archive** to keep your feed clean.
  - Send notes to **Trash** with options to restore or delete them permanently.
- **Multi-language Support (i18n)**: Fully translated into English, Italian (Italiano), German (Deutsch), Spanish (Español), and French (Français) with dynamic runtime switching.
- **Premium User Interface**: Modern styling built on the *Plus Jakarta Sans* typeface, harmonious colors, glassmorphic styling, and interactive micro-animations. Responsive sidebar controls and mobile FAB (Floating Action Button).
- **Data Portability**: Prevent platform lock-in by exporting database contents to a JSON file or importing backups to restore them.

---

## Cryptographic Security Model

In this version of Noten, client-side encryption and cloud storage are offloaded directly to the secure, zero-knowledge cloud provider **Filen** via the battle-tested official **Filen SDK**.

```mermaid
graph TD
    LocalDB[(PouchDB / IndexedDB <br/> Plaintext browser-sandboxed)] <-->|Read / Write Notes| UI[User Interface]
    LocalDB <-->|Sync Reconciliation| Sync[Sync Engine]
    Sync <-->|JSON Payload| SDK[Filen SDK Client-Side]
    SDK <-->|E2E Encrypted WebFile <br/> AES-256-GCM| Cloud[Filen Cloud Storage]
```

### 1. Local Security (Browser Sandboxing)
Local notes are stored in plaintext within the browser's IndexedDB (managed by PouchDB) under the database name `noten_db`. Local access is protected by the browser's native sandboxing mechanisms:
- **Same-Origin Policy (SOP)**: Restricts other websites from accessing your IndexedDB cache.
- **Sandboxed Scope**: Data remains local and private to the device. Note: For shared devices, clearing site storage or using guest profiles is recommended.

### 2. Client-Side E2E Encryption (Syncing)
When you log in to Filen and enable Sync, encryption operations are performed client-side in the browser:
- **Zero-Knowledge Key Derivation**: Encryption keys are derived client-side from your Filen password. Filen servers never receive or store your plaintext password.
- **AES-256-GCM Encryption**: Note data payloads are serialized into JSON, wrapped as blobs, and encrypted via the Filen SDK client library using AES-256-GCM before transmission.
- **Storage**: Filen only stores encrypted ciphertext metadata and file chunks. Plaintext notes are never exposed to any network or server.

---

## Getting Started

### Prerequisites
You need Node.js and npm installed to run and build this project.

### Running Locally
To run the app locally, clone this repository, install the dependencies, and start the Vite dev server:

```bash
# Clone the repository
git clone https://github.com/FrancoFantomius/Notes.git
cd Notes

# Install dependencies
npm install

# Start development server
npm run dev
```
Open the local URL printed in your console (usually `http://localhost:5173` or similar) in your browser.

*Note: The Web Crypto API and secure features require a secure context (HTTPS) to function in production, but work on `localhost` during development.*

### Building for Production
To compile and build the static distribution folder `dist`:

```bash
npm run build
```

---

## Sync Setup (Filen)

You can synchronize your notes across multiple devices (desktops, phones, tablets) by connecting them to your personal Filen account.

### 1. Enabling Sync in the App
1. Open the app and navigate to **Settings** (gear icon in the top right).
2. Enter your **Filen Email** and **Password** (and Two-Factor Code if enabled on your account).
3. Click **Save & Enable Sync**. The app will connect to your account and upload notes to the secure directory `/Noten/notes/`.

### 2. Syncing to a New Device
1. Open the Noten app on your new device.
2. Go to **Settings** and log in using your **Filen Email**, **Password**, and **Two-Factor Code**.
3. The background sync process will automatically fetch the encrypted notes from `/Noten/notes/`, decrypt them locally using the SDK, and populate your local PouchDB instance.

---

## Tech Stack

- **Markup & Layout**: Semantic HTML5
- **Styling**: Vanilla CSS3 (Custom Variables, Column Masonry Layouts, responsive media queries)
- **Local Storage**: IndexedDB (managed via PouchDB)
- **Replication & E2E Encryption**: Filen SDK Integration (`@filen/sdk`)
- **Bundler**: Vite & Vite Node Polyfills Plugin
- **Icons**: Lucide Icons CDN

---

## License

This project is licensed under the GNU Affero General Public License v3 (AGPL-3.0). See the [LICENSE](LICENSE) file for the full license text.