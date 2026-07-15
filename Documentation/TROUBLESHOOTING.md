# Troubleshooting

## Frontend Shows Firebase Setup Required

Check `Project Files/frontend/.env`.

Required values:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

Restart Vite after changing `.env`.

## Firebase Rejects The API Key

Copy the web app config again from:

```text
Firebase Console > Project settings > General > Your apps
```

Make sure the frontend is using the web API key, not the Admin SDK private key.

## Login Says Email/Password Is Not Enabled

Open:

```text
Firebase Console > Authentication > Sign-in method
```

Enable Email/Password.

## Firestore Data Does Not Sync

Check these items:

- The user is signed in.
- Firestore Database exists.
- `Project Files/firestore.rules` has been published.
- `Project Files/backend/serviceAccountKey.json` exists for backend Firestore writes.
- The frontend sends a Firebase ID token through `Authorization: Bearer <token>`.
- The requested `user_id` matches the authenticated Firebase UID.

## Backend Uses SQLite Instead Of Firestore

This is expected when `serviceAccountKey.json` is missing or invalid. The backend falls back to SQLite at:

```text
Project Files/backend/ecotrack.db
```

## AI Suggestions Are Generic

The suggestions endpoint uses fallback recommendations when:

- `GROQ_API_KEY` is missing.
- The Groq API request fails.
- The model response cannot be parsed as JSON.

Add `GROQ_API_KEY` to `Project Files/backend/.env` and restart Flask.

## Carbon Interface Returns 503

Check that:

- `CARBON_INTERFACE_API_KEY` is present in `Project Files/backend/.env`.
- The API key is valid.
- The Carbon Interface service is reachable.
- The request payload includes the expected fields.

The app can still use local calculator coefficients if Carbon Interface is unavailable.

## Backend Port Is Already In Use

The backend uses port `5000`.

Stop the existing process or change the port in `Project Files/backend/app.py`.

If the port changes, update:

```env
VITE_BACKEND_URL=http://localhost:new-port
```

## Frontend Cannot Reach Backend

Check:

- Flask is running.
- `VITE_BACKEND_URL` points to the right URL.
- The backend allows CORS from the frontend origin.
- Browser devtools network tab for the exact failing request.

## Build Fails

Run:

```bash
cd "Project Files/frontend"
npm install
npm run build
```

If dependencies are missing or outdated, delete `node_modules` and reinstall.
