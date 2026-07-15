# Architecture

EcoTrack is split into a React frontend and a Flask backend. The app is designed to keep working in multiple modes:

- Full cloud mode: Firebase Authentication, Firestore, Flask, Groq, and Carbon Interface are configured.
- Hybrid mode: Flask is available, but Firestore or AI credentials are missing.
- Local mode: the frontend can preserve account and log data in browser storage.

## High-Level Flow

```text
User
  |
  v
React frontend
  |
  |-- Firebase Web SDK: login, auth state, Firestore realtime listeners
  |
  |-- Axios API calls
      |
      v
Flask backend
  |
  |-- Local calculator coefficients
  |-- SQLite fallback database
  |-- Firebase Admin SDK for Firestore writes
  |-- Groq for AI suggestions
  |-- Carbon Interface for external estimates
```

## Frontend

Location: `Project Files/frontend`

Important files:

- `src/app.jsx`: main application UI, auth handling, logging workflow, charts, badges, recommendations, local fallback storage.
- `src/api.js`: Axios client and API helper methods.
- `src/firebase.js`: Firebase Web SDK initialization and config checks.
- `src/badges.js`: achievement evaluation logic.
- `src/index.css`: Tailwind CSS and shared styles.

The frontend listens to Firestore when Firebase is configured:

- `logs/{userId}/daily`
- `users/{userId}`
- `badges/{userId}`

When Firebase is not configured, it uses browser `localStorage` under the key `ecotrack-app-database-v1`.

## Backend

Location: `Project Files/backend`

Important files:

- `app.py`: Flask application entry point and blueprint registration.
- `routes/calculator.py`: coefficient-based carbon footprint calculation.
- `routes/habits.py`: user, log, history, settings, and badge endpoints.
- `routes/suggestions.py`: AI recommendation endpoint with fallback suggestions.
- `routes/carbon_interface.py`: optional Carbon Interface proxy endpoints.
- `firebase_config.py`: Firebase Admin SDK initialization.
- `local_db.py`: SQLite persistence layer.

## Storage Strategy

| Data | Cloud path | Local backend fallback | Frontend fallback |
| --- | --- | --- | --- |
| Users/settings | `users/{userId}` | SQLite `users` table | `localStorage` users object |
| Daily logs | `logs/{userId}/daily/{date}` | SQLite `logs` table | `localStorage` logs object |
| Badges | `badges/{userId}` | SQLite `badges` table | `localStorage` badges object |
| AI suggestions | Not currently synced to Firestore | SQLite `recommendations` table | React component state |

## Carbon Calculation Model

The local calculator estimates kg CO2e from:

- Transport mode multiplied by distance in kilometers.
- Diet type daily coefficient.
- Food waste 10 percent penalty when selected.
- Electricity in kWh multiplied by `0.233`.
- Heating flat rate of `2.0 kg`.
- Air conditioning flat rate of `1.5 kg`.

These values are simple educational estimates. Carbon Interface endpoints are included for optional verified estimates.

## Authentication And Authorization

The frontend sends a Firebase ID token in the `Authorization: Bearer <token>` header when Firebase login is active. The backend verifies the token before syncing a user document to Firestore. If Firebase Admin is not configured, the backend accepts local fallback requests and writes to SQLite.
