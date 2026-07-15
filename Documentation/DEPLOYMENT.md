# Deployment Guide

EcoTrack can be deployed as a static React frontend plus a hosted Flask API.

## Frontend Deployment

Build the frontend:

```bash
cd "Project Files/frontend"
npm install
npm run build
```

Deploy `Project Files/frontend/dist` to a static host such as:

- Firebase Hosting
- Netlify
- Vercel
- Cloudflare Pages

Set these production environment variables in the frontend host:

```env
VITE_BACKEND_URL=https://your-backend.example.com
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

## Backend Deployment

Deploy `Project Files/backend` to a Python host such as:

- Render
- Railway
- Fly.io
- Google Cloud Run

Install dependencies from:

```text
Project Files/backend/requirements.txt
```

Production start command:

```bash
python app.py
```

For a stronger production setup, run Flask through a WSGI server such as Gunicorn on Linux:

```bash
gunicorn app:app --bind 0.0.0.0:$PORT
```

Add backend environment variables:

```env
GROQ_API_KEY=your_groq_api_key
CARBON_INTERFACE_API_KEY=your_carbon_interface_api_key
```

Add the Firebase Admin SDK service account as a private file or secret. The current code expects:

```text
Project Files/backend/serviceAccountKey.json
```

If your host stores secrets differently, update `firebase_config.py` to read the service account from the host's secret manager.

## Firestore Rules

Publish `Project Files/firestore.rules` before using production Firestore.

The rules restrict each authenticated user to their own:

- Profile document.
- Daily logs.
- Badge document.

## CORS

The backend currently enables CORS for all origins with `CORS(app)`. For production, restrict CORS to the deployed frontend domain.

Example target behavior:

```python
CORS(app, origins=["https://your-frontend.example.com"])
```

## Deployment Checklist

- Frontend build succeeds with `npm run build`.
- Backend starts successfully.
- `VITE_BACKEND_URL` points to the deployed backend URL.
- Firebase Email/Password Authentication is enabled.
- Firestore rules are published.
- Service account is configured for backend Firestore writes.
- Groq key is present if AI recommendations should call the model.
- Carbon Interface key is present if external estimates are required.
- CORS is restricted for production.
- Private keys and `.env` files are not committed.
