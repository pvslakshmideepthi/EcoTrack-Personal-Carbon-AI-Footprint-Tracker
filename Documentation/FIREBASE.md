# Firebase Setup

EcoTrack uses Firebase for Email/Password Authentication and Firestore realtime sync.

## Create Firebase Project

1. Open Firebase Console.
2. Create a project.
3. Add a web app.
4. Copy the web app config values into `Project Files/frontend/.env`.

Required frontend values:

```env
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

## Enable Authentication

1. Go to Authentication.
2. Open Sign-in method.
3. Enable Email/Password.

## Create Firestore Database

1. Go to Firestore Database.
2. Create a database.
3. Start in production mode.
4. Publish the rules from `Project Files/firestore.rules`.

Current rules:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /logs/{userId}/daily/{dateId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /badges/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Firestore Data Model

### `users/{userId}`

Stores profile and budget settings.

Example:

```json
{
  "user_id": "abc123",
  "name": "Alex Green",
  "email": "alex@example.com",
  "daily_budget": 8,
  "created_at": "2026-07-15T10:30:00.000Z"
}
```

### `logs/{userId}/daily/{date}`

Stores one carbon log per user per date.

Example document path:

```text
logs/abc123/daily/2026-07-15
```

Example:

```json
{
  "user_id": "abc123",
  "date": "2026-07-15",
  "transport_mode": "Bus",
  "distance": 12,
  "diet_type": "Vegetarian",
  "food_waste": false,
  "electricity_kwh": 6,
  "travel_emissions": 1.07,
  "food_emissions": 3.81,
  "energy_emissions": 1.4,
  "total": 6.28
}
```

### `badges/{userId}`

Stores earned badge records.

Example:

```json
{
  "badges": [
    {
      "id": "first_step",
      "dateEarned": "2026-07-15T10:30:00.000Z"
    }
  ]
}
```

## Backend Admin SDK

For backend Firestore writes and token verification:

1. Open Project settings.
2. Go to Service accounts.
3. Generate a new private key.
4. Save it as:

```text
Project Files/backend/serviceAccountKey.json
```

Keep this file private. Do not commit it to a public repository.

## Authorization Behavior

When Firestore is available, the backend checks that:

- The request includes `Authorization: Bearer <Firebase ID token>`.
- The token is valid.
- The token UID matches the requested `user_id`.

If these checks fail, the backend does not sync that request to Firestore.
