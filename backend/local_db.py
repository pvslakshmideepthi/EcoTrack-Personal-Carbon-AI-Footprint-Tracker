import json
import os
import sqlite3
from datetime import datetime


DB_PATH = os.path.join(os.path.dirname(__file__), "ecotrack.db")


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_local_database():
    with get_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                email TEXT,
                name TEXT,
                daily_budget REAL DEFAULT 8,
                profile_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS logs (
                user_id TEXT NOT NULL,
                date_key TEXT NOT NULL,
                log_json TEXT NOT NULL,
                total REAL DEFAULT 0,
                travel_emissions REAL DEFAULT 0,
                food_emissions REAL DEFAULT 0,
                energy_emissions REAL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (user_id, date_key)
            );

            CREATE TABLE IF NOT EXISTS badges (
                user_id TEXT PRIMARY KEY,
                badges_json TEXT NOT NULL DEFAULT '[]',
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS recommendations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                source_total REAL DEFAULT 0,
                suggestions_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )


def now_iso():
    return datetime.utcnow().isoformat() + "Z"


def upsert_user(data):
    initialize_local_database()
    user_id = data.get("user_id")
    if not user_id:
        raise ValueError("user_id is required")

    timestamp = now_iso()
    with get_connection() as connection:
        existing = connection.execute(
            "SELECT created_at FROM users WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        connection.execute(
            """
            INSERT INTO users (user_id, email, name, daily_budget, profile_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                email = COALESCE(excluded.email, users.email),
                name = COALESCE(excluded.name, users.name),
                daily_budget = COALESCE(excluded.daily_budget, users.daily_budget),
                profile_json = excluded.profile_json,
                updated_at = excluded.updated_at
            """,
            (
                user_id,
                data.get("email"),
                data.get("name") or data.get("displayName"),
                data.get("daily_budget", data.get("budget", 8)),
                json.dumps(data),
                existing["created_at"] if existing else timestamp,
                timestamp,
            ),
        )


def get_user(user_id):
    initialize_local_database()
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM users WHERE user_id = ?",
            (user_id,),
        ).fetchone()
    if not row:
        return {}
    data = json.loads(row["profile_json"] or "{}")
    data.update(
        {
            "user_id": row["user_id"],
            "email": row["email"],
            "name": row["name"],
            "daily_budget": row["daily_budget"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }
    )
    return data


def save_log(data):
    initialize_local_database()
    user_id = data.get("user_id")
    date_key = data.get("date")
    if not user_id or not date_key:
        raise ValueError("user_id and date are required")

    timestamp = now_iso()
    with get_connection() as connection:
        existing = connection.execute(
            "SELECT created_at FROM logs WHERE user_id = ? AND date_key = ?",
            (user_id, date_key),
        ).fetchone()
        connection.execute(
            """
            INSERT INTO logs (
                user_id, date_key, log_json, total, travel_emissions,
                food_emissions, energy_emissions, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id, date_key) DO UPDATE SET
                log_json = excluded.log_json,
                total = excluded.total,
                travel_emissions = excluded.travel_emissions,
                food_emissions = excluded.food_emissions,
                energy_emissions = excluded.energy_emissions,
                updated_at = excluded.updated_at
            """,
            (
                user_id,
                date_key,
                json.dumps(data),
                data.get("total", 0),
                data.get("travel_emissions", 0),
                data.get("food_emissions", 0),
                data.get("energy_emissions", 0),
                existing["created_at"] if existing else timestamp,
                timestamp,
            ),
        )


def get_history(user_id, limit=30):
    initialize_local_database()
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT log_json FROM logs
            WHERE user_id = ?
            ORDER BY date_key DESC
            LIMIT ?
            """,
            (user_id, limit),
        ).fetchall()
    return [json.loads(row["log_json"]) for row in rows]


def save_badges(user_id, badges):
    initialize_local_database()
    timestamp = now_iso()
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO badges (user_id, badges_json, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
                badges_json = excluded.badges_json,
                updated_at = excluded.updated_at
            """,
            (user_id, json.dumps(badges), timestamp),
        )


def get_badges(user_id):
    initialize_local_database()
    with get_connection() as connection:
        row = connection.execute(
            "SELECT badges_json, updated_at FROM badges WHERE user_id = ?",
            (user_id,),
        ).fetchone()
    if not row:
        return {"badges": []}
    return {"badges": json.loads(row["badges_json"]), "updated_at": row["updated_at"]}


def save_recommendations(user_id, source_total, suggestions):
    initialize_local_database()
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO recommendations (user_id, source_total, suggestions_json, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (user_id, source_total or 0, json.dumps(suggestions), now_iso()),
        )
