# EcoTrack Personal Carbon AI Footprint Tracker

EcoTrack is a full-stack sustainability app for logging daily travel, food, and energy habits, estimating carbon emissions, tracking a personal daily budget, earning badges, and generating AI-powered reduction recommendations.

## Project Structure

```text
EcoTrack-Personal-Carbon-AI-Footprint-Tracker/
+-- Documentation/
|   +-- README.md
|   +-- SETUP.md
|   +-- ARCHITECTURE.md
|   +-- API_REFERENCE.md
|   +-- FIREBASE.md
|   +-- DEPLOYMENT.md
|   +-- TROUBLESHOOTING.md
+-- Demo Video/
+-- Project Files/
|   +-- backend/
|   +-- frontend/
|   +-- firestore.rules
+-- README.md
```

## Main Features

- Carbon footprint calculator for transport, diet, food waste, electricity, heating, and air conditioning.
- Daily habit logging with 30-day history.
- Personal carbon budget tracking.
- Dashboard analytics with line, bar, doughnut, and radar charts.
- AI suggestions through Groq LLaMA 3.3 70B, with local fallback suggestions.
- Firebase Authentication and Firestore sync when configured.
- SQLite fallback storage for local backend persistence.
- In-app local storage fallback for frontend-only usage.
- Badge and achievement system.

## Quick Start

Run the backend:

```bash
cd "Project Files/backend"
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Run the frontend in a second terminal:

```bash
cd "Project Files/frontend"
npm install
npm run dev
```

Open `http://localhost:5173`.

## Documentation

- [Documentation overview](Documentation/README.md)
- [Setup guide](Documentation/SETUP.md)
- [Architecture](Documentation/ARCHITECTURE.md)
- [API reference](Documentation/API_REFERENCE.md)
- [Firebase setup and rules](Documentation/FIREBASE.md)
- [Deployment guide](Documentation/DEPLOYMENT.md)
- [Troubleshooting](Documentation/TROUBLESHOOTING.md)

## Required Services For Full Cloud Mode

- Firebase Authentication with Email/Password enabled.
- Firestore Database.
- Firebase Admin SDK service account at `Project Files/backend/serviceAccountKey.json`.
- Groq API key for AI recommendations.
- Carbon Interface API key for external carbon estimates.

The app can still run locally without all external keys. Missing Firebase web credentials use the in-app account flow, missing Firebase Admin credentials use SQLite backend storage, and missing Groq credentials use built-in fallback recommendations.
