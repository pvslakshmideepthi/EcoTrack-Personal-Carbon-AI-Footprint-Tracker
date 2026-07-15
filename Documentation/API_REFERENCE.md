# API Reference

Base URL for local development:

```text
http://localhost:5000
```

All request and response bodies use JSON.

## Health Check

### `GET /`

Returns backend status.

Example response:

```json
{
  "status": "EcoTrack Backend is running!"
}
```

## Calculate Footprint

### `POST /api/calculate/footprint`

Calculates travel, food, energy, and total emissions.

Request:

```json
{
  "transport_mode": "Bus",
  "distance": 12,
  "diet_type": "Vegetarian",
  "food_waste": false,
  "electricity_kwh": 6,
  "heating": false,
  "ac": false
}
```

Success response:

```json
{
  "success": true,
  "travel_emissions": 1.07,
  "food_emissions": 3.81,
  "energy_emissions": 1.4,
  "total": 6.28,
  "calculation_method": "coefficient-based kg CO2e estimate",
  "factors": {
    "transport_kg_per_km": 0.089,
    "food_kg_per_day": 3.81,
    "electricity_kg_per_kwh": 0.233,
    "heating_flat_kg": 0,
    "ac_flat_kg": 0
  },
  "breakdown": {}
}
```

Validation errors:

- Unknown transport mode returns `400`.
- Unknown diet type returns `400`.
- Negative distance or electricity values return `400`.

Supported transport modes:

- `Car Petrol`
- `Car Diesel`
- `Car Electric`
- `Bus`
- `Train`
- `Motorcycle`
- `Bicycle`
- `Walking`
- `Flight Short-haul`
- `Flight Long-haul`

Supported diet types:

- `Meat-heavy`
- `Omnivore`
- `Vegetarian`
- `Vegan`

## Upsert User

### `POST /api/users/upsert`

Creates or updates a user profile.

Request:

```json
{
  "user_id": "firebase-or-local-user-id",
  "name": "Alex Green",
  "email": "alex@example.com",
  "daily_budget": 8
}
```

Response:

```json
{
  "success": true,
  "message": "User saved",
  "storage": "sqlite"
}
```

When Firebase Admin is configured and the bearer token matches the user, the backend also writes to `users/{userId}`.

## Log Habit

### `POST /api/habits/log`

Saves a daily footprint log.

Request:

```json
{
  "user_id": "firebase-or-local-user-id",
  "date": "2026-07-15",
  "transport_mode": "Bus",
  "distance": 12,
  "diet_type": "Vegetarian",
  "food_waste": false,
  "electricity_kwh": 6,
  "heating": false,
  "ac": false,
  "travel_emissions": 1.07,
  "food_emissions": 3.81,
  "energy_emissions": 1.4,
  "total": 6.28
}
```

Response:

```json
{
  "success": true,
  "message": "Habits logged successfully",
  "storage": "sqlite"
}
```

Required fields:

- `user_id`
- `date`

## Get History

### `GET /api/habits/history?user_id={userId}`

Returns the most recent 30 logs for a user.

Response:

```json
[
  {
    "user_id": "firebase-or-local-user-id",
    "date": "2026-07-15",
    "total": 6.28
  }
]
```

## Settings

### `GET /api/habits/settings?user_id={userId}`

Returns profile and budget settings.

### `PATCH /api/habits/settings`

Updates profile and budget settings.

Request:

```json
{
  "user_id": "firebase-or-local-user-id",
  "daily_budget": 7.5
}
```

Response:

```json
{
  "success": true,
  "message": "Settings updated",
  "storage": "sqlite"
}
```

## Badges

### `GET /api/habits/badges?user_id={userId}`

Returns earned badges.

Response:

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

### `POST /api/habits/badges`

Saves earned badges.

Request:

```json
{
  "user_id": "firebase-or-local-user-id",
  "badges": [
    {
      "id": "first_step",
      "dateEarned": "2026-07-15T10:30:00.000Z"
    }
  ]
}
```

## Generate Suggestions

### `POST /api/suggestions/generate`

Generates three sustainability recommendations from the latest footprint breakdown.

Request:

```json
{
  "user_id": "firebase-or-local-user-id",
  "transport_mode": "Bus",
  "diet_type": "Vegetarian",
  "electricity_kwh": 6,
  "travel_emissions": 1.07,
  "food_emissions": 3.81,
  "energy_emissions": 1.4,
  "total": 6.28
}
```

Response:

```json
[
  {
    "title": "Target the highest footprint category",
    "description": "Start with one specific swap in the highest-emission category.",
    "category": "food",
    "estimated_co2_saving": "0.5-2.5 kg CO2e/day"
  }
]
```

If `GROQ_API_KEY` is missing or the AI request fails, the endpoint returns fallback suggestions.

## Carbon Interface

These endpoints proxy optional Carbon Interface estimates.

### `POST /api/carbon/electricity`

Request:

```json
{
  "electricity_value": 6,
  "country": "in"
}
```

### `POST /api/carbon/flight`

Request:

```json
{
  "passengers": 1,
  "departure": "DEL",
  "destination": "BOM"
}
```

If the external API is unavailable, the backend returns:

```json
{
  "error": "API unavailable, use local coefficients"
}
```
