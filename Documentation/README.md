# EcoTrack Documentation

This folder contains the project documentation for EcoTrack Personal Carbon AI Footprint Tracker.

## Documents

- [SETUP.md](SETUP.md): local installation, environment variables, and run commands.
- [ARCHITECTURE.md](ARCHITECTURE.md): frontend, backend, storage, and data flow overview.
- [API_REFERENCE.md](API_REFERENCE.md): Flask endpoint reference with request and response examples.
- [FIREBASE.md](FIREBASE.md): Firebase Authentication, Firestore structure, and security rules.
- [DEPLOYMENT.md](DEPLOYMENT.md): production deployment checklist for frontend and backend.
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md): common setup and runtime issues.

## Project Summary

EcoTrack helps users estimate and reduce their personal carbon footprint. Users can log daily transport, food, and energy behavior, view emissions analytics, compare totals against a personal budget, earn badges, and request AI-generated sustainability suggestions.

## Technology Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React, Vite, Tailwind CSS, Chart.js, Firebase Web SDK, Axios |
| Backend | Flask, Flask-CORS, Firebase Admin SDK, SQLite, Groq SDK, Requests |
| Authentication | Firebase Email/Password or in-app local account fallback |
| Cloud database | Firestore |
| Local persistence | Browser localStorage and backend SQLite |
| AI | Groq LLaMA 3.3 70B with local fallback suggestions |
| External carbon estimates | Carbon Interface API |

## Source Locations

- Frontend source: `Project Files/frontend/src`
- Backend source: `Project Files/backend`
- Firestore rules: `Project Files/firestore.rules`
- Existing final report: `Documentation/final_project_report.pdf`
