# ADR-0039: Domain-Driven Feature Modular Architecture for React Frontend

* **Status**: Accepted
* **Date**: 2026-08-22

## Context

As web applications grow in feature set and business logic, traditional flat file layouts (placing all page components in a generic `/pages` directory and all API requests in a monolithic `/api.js`) lead to tight coupling, high cognitive load, code duplication, and maintenance bottlenecks.

To align with the backend's clean modular architecture (`server/internal/domain/*`), the React SPA frontend requires a domain-driven, feature-based modular structure (`src/features/*`) that isolates domain logic, services, and UI components into cohesive feature modules.

## Decision

We refactored and standardized the React frontend codebase into a **Domain-Driven Feature Architecture**:

1. **Feature Module Boundaries (`src/features/*`)**:
   Each core domain in the application is encapsulated inside a self-contained feature folder:
   - `src/features/auth/`: Login, Register, OAuth Google Callback, Auth Store (`useAuthStore`), Auth API service.
   - `src/features/urls/`: Short Link Management, Modals (Create, Edit, Delete, QR Code, Safety Preview), Link Detail & Click Analytics, URLs API service.
   - `src/features/dashboard/`: Overview Metrics, Quick Shorten Widget, Recent Links, Dashboard Layout & Navigation.
   - `src/features/analytics/`: Overall Click Traffic Analytics, Recharts visualizations, Analytics API service.
   - `src/features/admin/`: User Management, Role Inspection, Admin API service.
   - `src/features/account/`: User Profile Update, Password Change, Google Account Connection management, Account API service.

2. **Feature API Service Layer (`src/features/{feature}/api.js`)**:
   - Replaced scattered inline `axios`/`client` request calls with strongly-typed, named API service functions inside each domain feature.
   - Cleaned up obsolete legacy LMS endpoint methods and stores.

3. **Shared Primitives and Layout Components (`src/components/`)**:
   - `src/components/ui/`: Atomic UI primitives (Shadcn/Tailwind buttons, cards, dialogs, inputs, badges).
   - `src/components/`: Shared app-level components (`TopLoadingBar`, `LanguageToggle`, `ThemePresetPicker`, `AppSidebar`, `NavUser`).

4. **Dead Code Elimination**:
   - Deleted unreferenced legacy pages in `src/pages/` and obsolete components (`Layout.jsx`, `Navbar.jsx`, `Sidebar.jsx`, `site-header.jsx`).

## Consequences

### Positive
- **Maintainability & Scalability**: Clear separation of concerns makes it easy to add new features without affecting existing modules.
- **Code Reuse**: Reusable API services prevent duplicate request logic across components.
- **Zero UI Regression**: Enforces clean code architecture while keeping 100% visual fidelity and user experience.

### Negative
- Require team discipline to place new page components and API logic within their respective `src/features/{domain}` module.
