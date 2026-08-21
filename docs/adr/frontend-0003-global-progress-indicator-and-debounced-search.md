# ADR frontend-0003: Global Progress Loading Indicator & Debounced Search Inputs

* Status: `Accepted`
* Date: 2026-08-21

## Context

In modern Single-Page Applications (SPAs), users expect instant feedback during page navigation and asynchronous API requests. Without visual feedback, background network latency can make the application feel unresponsive.

Simultaneously, realtime search/filter inputs (e.g. searching short URLs or analytics events) that trigger API queries on every keypress can cause API rate limiting, unnecessary database load, and UI flickering due to out-of-order API responses.

## Decision

We implemented a global UI feedback mechanism and request throttling pattern across the React frontend (`web/src`):

1. **Global NProgress Top-Bar Loading Indicator (`useLoadingStore` & Axios Interceptor)**:
   - Configured an integrated global loading indicator using `nprogress` wired directly to Axios HTTP client interceptors (`web/src/lib/api-client.js`).
   - Every background API request automatically increments active request counters and displays a sleek top-bar progress animation, giving immediate feedback without cluttering UI components with manual spinner states.
2. **Custom `useDebounce` Hook for Input Filtering**:
   - Implemented `useDebounce` (`web/src/hooks/use-debounce.js`) with a default `300ms` delay window.
   - Applied debouncing to all search inputs across URL management and analytics dashboards (`web/src/features/urls`). API calls are deferred until the user finishes typing.

## Consequences

- Highly responsive, modern visual feedback for all navigation transitions and network requests.
- Elimination of API request spamming on search input typing, significantly reducing server CPU and PostgreSQL query load under user interaction.
- Prevents out-of-order response race conditions in search query results.
