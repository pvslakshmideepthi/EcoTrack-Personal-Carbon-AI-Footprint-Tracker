# Setup Guide

Use this guide to run EcoTrack locally.

## Prerequisites

- Python 3.10 or newer.
- Node.js 18 or newer.
- npm.
- A Firebase project for full cloud sync.
- Optional Groq and Carbon Interface API keys.

## Backend Setup

From the repository root:

```bash
cd "Project Files/backend"
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

The Flask API runs on `http://localhost:5000`.

## Backend Environment

Create `Project Files/backend/.env` when using external services:

```env
GROQ_API_KEY=your_groq_api_key
CARBON_INTERFACE_API_KEY=your_carbon_interface_api_key
```

For Firestore server-side writes, download a Firebase Admin SDK service account JSON file and save it as:

```text
Project Files/backend/serviceAccountKey.json
```

If this file is missing, the backend still runs and stores user profiles, logs, badges, and recommendations in SQLite at:

```text
Project Files/backend/ecotrack.db
```

## Frontend Setup

Open a second terminal:

```bash
cd "Project Files/frontend"
npm install
npm run dev
```

The Vite dev server runs on `http://localhost:5173`.

## Frontend Environment

Create `Project Files/frontend/.env` for Firebase and backend configuration:

```env
VITE_BACKEND_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

If Firebase web keys are not present or are placeholders, the frontend uses the in-app local account flow.

## Local Verification

1. Start Flask and confirm `http://localhost:5000` returns a backend status message.
2. Start Vite and open `http://localhost:5173`.
3. Register or log in.
4. Create a daily carbon log.
5. Confirm the dashboard updates with totals, charts, recent logs, and badges.

## Build Check

Before deployment, verify the frontend production build:

```bash
cd "Project Files/frontend"
npm run build
```
