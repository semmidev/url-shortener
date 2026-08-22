# ADR frontend-0004: Comprehensive i18n Internationalization & Language Toggle

* Status: `Accepted`
* Date: 2026-08-22

## Context

The React SPA interface initially contained hardcoded English text strings across dashboard pages, navigation components, modals, and authentication screens. To support multilingual users (English and Bahasa Indonesia), the application required a flexible, lightweight internationalization (i18n) solution without adding heavy external dependencies.

## Decision

We implemented a zero-dependency React i18n framework using Context API (`I18nContext.jsx`):

1. **Locale Dictionaries (`web/src/locales/en.js` & `id.js`)**:
   - Comprehensive translation dictionaries covering all pages (`Overview`, `URLs`, `URL Detail`, `Analytics`, `Admin Users`, `Account`, `Login`, `Register`, `Create URL Modal`, `Navbar`, and `LanguageToggle`).
2. **Context Provider & Hook (`useI18n()`)**:
   - Provides `t(key, params)` translation helper with parameter interpolation and fallback to English.
   - Persists user language preference in `localStorage` (`app-language`) and automatically updates `document.documentElement.lang`.
3. **Toggle Component (`LanguageToggle.jsx`)**:
   - Standardized English / Indonesian language selector positioned at top-left of Color Presets in `DashboardLayout.jsx` and top headers of Auth pages.

## Consequences

- Complete localization across 100% of SPA pages and UI components.
- Instant, smooth language switching without page reloads or layout shifts.
- Persisted user language preference across sessions.
