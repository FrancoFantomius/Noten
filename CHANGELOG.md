# Changelog

All notable changes to **Noten** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.1.0] - 2026-08-22

### Added
- Progressive Web App (PWA) app shortcuts for instant navigation to **New Note**, **Archive**, **Trash**, and **Settings** directly from the home screen / application launcher.
- Dynamic Web App Manifest synchronization (`updateDynamicManifest`), dynamically updating manifest name, description, and shortcut action labels in real time when switching UI languages.
- Deep linking / hash navigation support (`#new` and `#new-note`) to open the note creation dialog immediately on launch.
- Dedicated shortcut icon assets (`ArchiveIcon.png`, `TrashIcon.png`, `SettingsIcon.png`) with offline service worker caching support.

### Changed
- Bumped package version and Service Worker cache version to `noten-v2.1.0`.
- Enhanced Vite build pipeline to copy root `img/` image assets into `dist/img/`.

### Fixed
- Fixed mobile bottom navigation bar layout with fixed viewport positioning and adjusted content panel bottom padding to avoid overlapping note cards.
- Prevented reserved URL hash routes (`#settings`, `#new`, `#new-note`) from triggering invalid note ID lookups on page load.

### Added
- Complete Material Design 3 overhaul adopting custom web components from `@francofantomius/material-components` (`md-account-menu`, `md-app-drawer`, `md-search-bar`, `md-button`, `md-icon-button`, `md-chip-set`, `md-dialog`, `md-fab`, `md-snackbar`).
- Filen Account Storage breakdown widget integrated into the account menu displaying real-time usage (Notes storage, Other files, Free storage).
- App drawer widget (`md-app-drawer`) for switching across ecosystem web apps.
- Integrated search tag filter chips within the search bar component.
- Dynamic automated Material Symbols icon subsetting via `subset-font` with automatic scanning of components and templates.
- PouchDB database migration and schema standardization for all notes.

### Changed
- Migrated UI components from bespoke HTML/CSS to standard Material Design 3 web components (`lit` & `@francofantomius/material-components`).
- Upgraded dependencies including `pouchdb` to `^9.0.0`, `@fontsource/roboto` `^5.3.0`, and `@fontsource-variable/material-symbols-outlined` `^5.3.3`.
- Bumped Service Worker cache version to `noten-v2.0.0`.
- Refactored static pages and theme management system.
- Streamlined and synchronized all 16 supported language translation files.

## [1.3.1] - 2026-08-13

### Changed
- Bumped service worker cache version to `noten-v1.3.1` and package version to `1.3.1`.
- Updated dependencies to latest versions (`@filen/sdk` ^0.4.2, `vite` ^8.2.1, `vite-plugin-node-polyfills` ^0.28.0, `@fontsource/material-symbols-outlined` ^5.3.2).

## [1.3.0] - 2026-08-13

### Changed
- Reduced supported languages to a curated set of 16 translations (Arabic, Chinese, Dutch, English, French, German, Greek, Hindi, Italian, Polish, Portuguese, Russian, Spanish, Swedish, Turkish, Ukrainian) with the full language list removed from the settings modal.
- Bumped service worker cache version to `noten-v1.3.0` and package version to `1.3.0`.
- Refined theme switching logic with Light, Dark, and Device modes (dropdown selector) and updated shared state accordingly.

## [1.2.2] - 2026-07-24

### Changed
- Switched the app to self-hosted fonts (`@fontsource/plus-jakarta-sans` and `@fontsource/material-symbols-outlined`), removing external Google Fonts dependencies for improved privacy and offline reliability.
- Updated build caching behavior and head templates to load fonts and styles locally.
- Set the PWA manifest to `fullscreen` display mode with updated theme colors.

## [1.2.1] - 2026-07-24

### Changed
- Enhanced service worker caching logic.
- Improved internationalization support in the settings modal.
- Merged the logout action with the local cache purge button.

## [1.2.0] - 2026-07-24

### Added
- Modularized the UI logic by splitting code into dedicated components: accounts, cards, modals, and state management.
- Added a dedicated login modal for Filen sync credentials.
- Added account dropdown with profile details (avatar, username, email).
- Added sync status indicator (offline / syncing / online / error).
- Added dedicated archive, trash, terms of service, and privacy pages.

### Changed
- Migrated to modular Handlebars templates configured via `vite-plugin-handlebars`.
- Replaced Lucide icons with Google Material Symbols.
- Refactored internationalization module with lazy-loaded language chunks and browser language detection.
- Redesigned the account settings UI/UX.
- Moved icons and metadata updates.

### Fixed
- Sidebar navigation, live search filtering, and note grid rendering logic in the cards UI.
- Login info not displayed in settings, plus icon adjustments.

## [1.1.0] - 2026-06-28

### Added
- Link to GitHub repository, formalizing public hosting on GitHub Pages with a CI deployment workflow.
- Archive and Trash workflow with automatic permanent deletion after 60 days.
- Data portability via JSON export/import backups.

### Changed
- Refactored JS/CSS and adjusted sync behavior.
- Updated the Filen SDK dependency and lockfile.

### Fixed
- Various UI refinements and mobile responsiveness (WIP).

## [1.0.1] - 2026-05-23

### Added
- Core UI, README, and internationalization modules with initial translations.
- Updated project license to AGPL-3.0-only.

### Fixed
- Login info not displayed on the settings page.
- Icon adjustments.

## [1.0.0] - 2026-05-22

### Added
- Initial core notes application with PWA support.
- Local-first storage via PouchDB (IndexedDB) under the `noten_db` database.
- Filen cloud synchronization with client-side E2E encryption (AES-256-GCM) via the official Filen SDK.
- Responsive masonry layout for note cards with pin-to-top support.
- Interactive checklists with hierarchical tasks (Tab / Shift+Tab indentation, drag-and-drop reordering, keyboard shortcuts).
- Media attachments with local image compression (Canvas API, JPEG 75%) and fullscreen lightbox viewer.
- Custom hashtags, dynamic tag sidebar filtering, and real-time search.
- Color-coded note cards using curated palettes.
- Secure lockscreen and pin entry UI.
- Light/dark theme switching.
- Build and deployment script using Vite.

### Fixed
- Mobile responsiveness groundwork (WIP).

[Unreleased]: https://github.com/FrancoFantomius/noten/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/FrancoFantomius/noten/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/FrancoFantomius/noten/releases/tag/v2.0.0
[1.3.1]: https://github.com/FrancoFantomius/noten/releases/tag/v1.3.1
[1.3.0]: https://github.com/FrancoFantomius/noten/releases/tag/v1.3.0
[1.2.2]: https://github.com/FrancoFantomius/noten/releases/tag/v1.2.2
[1.2.1]: https://github.com/FrancoFantomius/noten/releases/tag/v1.2.1
[1.2.0]: https://github.com/FrancoFantomius/noten/releases/tag/v1.2.0
[1.1.0]: https://github.com/FrancoFantomius/noten/releases/tag/v1.1.0
[1.0.1]: https://github.com/FrancoFantomius/noten/releases/tag/v1.0.1
[1.0.0]: https://github.com/FrancoFantomius/noten/releases/tag/v1.0.0