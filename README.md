# CIYA Student Platform

This repository contains the CIYA Student Platform, a React + Vite + TypeScript application utilizing Firebase (Firestore & Auth) and Supabase (file storage).

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

## 🧼 Auto-Cleanup and Submission Maintenance

To prevent high payload overheads and maintain lean Firestore storage:
*   **Image Stripping:** A periodic maintenance routine `cleanUpOldGlobalSubmissions` scans student assignments that are older than 3 days and strips heavy base64 images, replacing them with standard completion checkboxes.
*   **24-Hour Cooldown Gate:** To avoid running expensive collections scans repeatedly on every dashboard mount or tab switch, this cleanup is gated behind a **24-hour client-side cooldown** using `localStorage` keyed uniquely by user `uid`.
