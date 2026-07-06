# EcoTrack Personal Carbon AI Footprint Tracker

EcoTrack is a full-stack realtime sustainability platform built with React, Flask, Firebase Authentication, Firestore realtime listeners, Chart.js analytics, Carbon Interface API hooks, and Groq LLaMA 3.3 70B recommendations.

## Features

- Daily travel, food, and energy habit logger
- Carbon footprint calculator with category breakdowns
- Personal daily carbon budget tracker
- Trend, stacked category, doughnut, and radar analytics
- AI eco-friendly recommendation engine with Groq fallback mode
- Badge and achievement system
- Firebase Email/Password Authentication and Firestore realtime persistence
- Responsive professional dashboard UI with a blue and purple product theme

## Folder To Run

Run all commands from:

```bash
C:\mycoding\EcoTrack-Personal-Carbon-AI-Footprint-Tracker\EcoTrack-Personal-Carbon-AI-Footprint-Tracker
```

## Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python app.py
```

The Flask API runs at `http://localhost:5000`.

For production cloud storage, place your Firebase Admin SDK file at `backend/serviceAccountKey.json`. The backend writes user logs, settings, and badges to Firestore.

## Frontend Setup

Open a second terminal:

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

The React app runs at `http://localhost:5173`.

## API Keys

Add these values before production deployment:

- `GROQ_API_KEY` for LLaMA 3.3 70B recommendations
- `CARBON_INTERFACE_API_KEY` for verified external carbon estimates
- `VITE_FIREBASE_*` for Firebase web authentication configuration
- `backend/serviceAccountKey.json` for Firestore Admin access

## Firebase Database And Authentication

1. Open Firebase Console and create a project.
2. Go to Authentication, enable the Email/Password provider.
3. Go to Firestore Database, create a database, and start in production mode.
4. Publish the security rules from `firestore.rules`.
5. Copy the Firebase web app keys into `frontend/.env`.
6. Download a Firebase Admin SDK service account JSON and save it as `backend/serviceAccountKey.json`.
7. Start Flask with `python app.py`, then start React with `npm run dev`.

EcoTrack stores data in these Firestore paths:

- `users/{userId}` for profile and daily budget settings
- `logs/{userId}/daily/{date}` for preserved daily carbon logs
- `badges/{userId}` for achievement progress

## Realtime Behavior

- The frontend signs users in with Firebase Email/Password Authentication.
- Firestore `onSnapshot` listeners stream log history, budget settings, and badges into the dashboard.
- The Flask API verifies Firebase ID tokens before storing or returning user records.
- The Flask API remains responsible for carbon calculation, AI recommendation calls, Carbon Interface integration, and server-side Firestore writes.

## Build For Deployment

```bash
cd frontend
npm run build
```

Deploy `frontend/dist` to a static host such as Firebase Hosting, Netlify, or Vercel. Deploy the Flask backend to a Python host such as Render, Railway, Fly.io, or Google Cloud Run, then set `VITE_BACKEND_URL` to the deployed API URL.
