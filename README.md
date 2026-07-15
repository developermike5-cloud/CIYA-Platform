# CIYA Student Platform - Architecture & Optimization Guide

This repository contains the optimized CIYA Student Platform, a highly performant and network-efficient React + Vite + TypeScript application utilizing Firebase (Firestore & Auth) and Supabase (file storage).

To prevent excessive database read-quota use (such as hitting Firestore's free daily read limits), the platform features an advanced interceptor, strict offline caching, and smart resource cleanup.

---

## 🛠️ Environment Variables Configuration

All configuration is managed using system secrets. For local development or deployment, define the following variables in your `.env` or system environment (refer to `.env.example`):

| Variable Name | Description | Required / Optional |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Secret key for Gemini AI API integrations. | Optional |
| `APP_URL` | Self-referential URL where this applet is hosted (e.g. Cloud Run service URL). | Required for production |
| `VITE_SUPABASE_URL` | Public endpoint for Supabase backend. | Required for file storage |
| `VITE_SUPABASE_ANON_KEY` | Public anonymous API key for Supabase access. | Required for file storage |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary integration cloud name. | Optional |
| `CLOUDINARY_API_KEY` | Cloudinary API access key. | Optional |
| `CLOUDINARY_API_SECRET` | Cloudinary API access secret. | Optional |

---

## 💾 Firestore Intelligent Caching Wrapper

To minimize network consumption, a transparent resolve alias in `vite.config.ts` redirects all imports of `'firebase/firestore'` to `src/lib/firebase-cache-wrapper.ts`. This custom wrapper acts as an intelligent intermediary.

### Caching Strategy & TTL
*   **Time-To-Live (TTL):** Standard data fetches via `getDoc()` and `getDocs()` are cached in the client's `localStorage` with a **6-hour expiration window** (`CACHE_EXPIRATION_MS = 21,600,000`).
*   **Live Bypass Paths:** Critical documents that mandate immediate, fresh updates bypass the cache entirely and are fetched live from Firestore. These include:
    *   `settings/app` (Portal-wide configuration and lock states)
    *   `settings/system_signals` (System state indicators)
    *   `users/*` (User profile metadata and registration statuses)
*   **Real-time Listeners:** Active snapshot listeners (`onSnapshot`) remain live by design to secure absolute synchronization accuracy, while optimizing internal listeners to prevent duplicates.

### Testing Offline Mode
Students, developers, and testers can force the entire database layer into custom offline-emulation mode to test extreme latency, cached UI renders, and offline resiliency.
*   **To Enable Offline Mode:**
    ```javascript
    localStorage.setItem('ciya_db_connection_disabled', 'true');
    ```
*   **To Restore Online Mode:**
    ```javascript
    localStorage.removeItem('ciya_db_connection_disabled');
    ```

---

## 🧼 Auto-Cleanup and Submission Maintenance

To prevent high payload overheads and maintain lean Firestore storage:
*   **Image Stripping:** A periodic maintenance routine `cleanUpOldGlobalSubmissions` scans student assignments that are older than 3 days and strips heavy base64 images, replacing them with standard completion checkboxes.
*   **24-Hour Cooldown Gate:** To avoid running expensive collections scans repeatedly on every dashboard mount or tab switch, this cleanup is gated behind a **24-hour client-side cooldown** using `localStorage` keyed uniquely by user `uid`.

---

## 📦 Production Bundling & Optimizations

Vite is configured with Rollup dynamic bundle splitting (`manualChunks`) to split monolithic codebases. Modules are cleanly segmented into:
1.  `vendor-core`: React, React DOM, and core runtime libraries.
2.  `vendor-firebase`: Firebase SDK and related authentication/database packages.
3.  `vendor-charts`: Recharts, D3, and associated analytical components.
4.  `vendor-animation`: Motion and animation frameworks.
5.  `vendor-icons`: Lucide icon components.
6.  `vendor-others`: Remaining third-party assets and scripts.
