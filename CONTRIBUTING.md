# Contributing to Noten

Thank you for your interest in contributing to **Noten**! We welcome contributions from developers and designers of all skill levels.

Noten is an open-source, local-first, end-to-end encrypted notes application. Our goal is to maintain a lightweight, fast, secure, and beautiful user experience without external server dependencies or tracking.

---

## Code of Conduct

Please help us keep this project open, welcoming, and inclusive. Be respectful and constructive in all issue discussions, pull requests, and communications.

---

## Ways to Contribute

- 🐛 **Report Bugs**: Help us find and fix issues by opening a detailed bug report.
- 💡 **Suggest Features**: Share ideas for new capabilities, performance improvements, or UI enhancements.
- 🌍 **Translations (i18n)**: Add support for new languages or refine existing translations.
- 🛠️ **Submit Code**: Fix open issues or implement approved features via Pull Requests.

---

## Getting Started

### Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm** (v9 or higher)
- A modern web browser (Chrome, Firefox, Edge, Safari)

### Local Setup

1. **Fork and clone the repository**:
   ```bash
   git clone https://github.com/YOUR-USERNAME/noten.git
   cd noten
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open the local server URL (typically `http://localhost:3000` or `http://localhost:5173`) in your browser.

4. **Verify production build**:
   Before submitting changes, make sure the production build compiles cleanly:
   ```bash
   npm run build
   ```

---

## Architecture & Codebase Overview

### 1. HTML & Template System (`templates/`)
- Page entry points (`index.html`, `archive.html`, `trash.html`, `privacy.html`, `terms.html`) are lightweight shell files.
- Shared UI components (header, sidebar, note creator, modals, grids, FAB) live as Handlebars partials inside the **`templates/`** directory.
- **`vite-plugin-handlebars`** compiles these partials and injects per-page context data during `npm run dev` and `npm run build`.
- **Note**: When modifying shared UI layout or elements, edit the corresponding template inside `templates/`, not the root HTML files.

### 2. Styling (`css/`)
- Styles are built with **Vanilla CSS3** using modular files imported into `css/style.css`.
- Always use predefined CSS variables from `css/variables.css` for colors, spacing, border-radii, and theme tokens to maintain dark/light theme consistency.
- Avoid introducing Tailwind or utility CSS libraries.

### 3. Application Logic (`js/`)
- **`js/app.js`**: Core controller, bootstrapping, and Service Worker registration.
- **`js/db.js`**: PouchDB / IndexedDB storage adapter and Filen Cloud E2E sync engine.
- **`js/ui.js`**: Central UI coordinator and event binding.
- **`js/ui/`**: Specialized UI modules (`cards.js`, `creator.js`, `checklist.js`, `modal.js`, `theme.js`, `utils.js`).
- **`js/i18n.js` & `js/languages/`**: Internationalization logic and JSON translation files (`en.json`, `it.json`, `de.json`, `es.json`, `fr.json`).

---

## Adding or Updating Translations (i18n)

Translations are managed as JSON files in `js/languages/`.

1. To add or update translation strings, edit the relevant language file (e.g., `js/languages/it.json`).
2. Add corresponding `data-i18n="key"` or `data-i18n-placeholder="key"` attributes to HTML elements in `templates/`.
3. If adding a **new language**:
   - Create `js/languages/<lang-code>.json`.
   - Add the language option to `<select id="language-select">` in `templates/settings-modal.html`.
   - Register the language code in `js/i18n.js`.

---

## Guidelines & Best Practices

- **Local-First & Privacy First**: Never add telemetry, tracking scripts, or external network requests that transmit unencrypted user data.
- **Performance**: Keep the app lightweight. Prefer native Web APIs over adding heavy npm dependencies.
- **Clean Commits**: Keep commit messages concise and descriptive (e.g., `fix(ui): correct modal scrollbar alignment` or `feat(templates): extract navigation partial`).
- **Testing**: Test your changes across mobile and desktop browser viewports, and verify both Dark and Light themes.

---

## Submitting a Pull Request (PR)

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/my-new-feature
   ```
2. Commit your changes with clear messages.
3. Test locally using `npm run build` and `npm run dev`.
4. Push your branch to your GitHub fork:
   ```bash
   git push origin feature/my-new-feature
   ```
5. Open a Pull Request against the `main` branch of the official repository. Provide a summary of the changes and any relevant screenshots or testing notes.

---

## License

By contributing to Noten, you agree that your contributions will be licensed under the [GNU Affero General Public License v3 (AGPL-3.0)](LICENSE).
