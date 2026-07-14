from flask import Blueprint, request, jsonify
from firebase_admin import auth, firestore
from firebase_config import initialize_firebase
from local_db import get_badges, get_history as get_local_history, get_user, save_badges, save_log, upsert_user

habits_bp = Blueprint('habits', __name__)
db = initialize_firebase()

def firestore_available():
    return db is not None

def authenticated_user_id():
    if not firestore_available():
        return None

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header.replace("Bearer ", "", 1).strip()
    if not token:
        return None

    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token.get("uid")
    except Exception:
        return None

def require_owner(requested_user_id):
    if not firestore_available():
        return True

    token_user_id = authenticated_user_id()
    return bool(token_user_id and token_user_id == requested_user_id)

def can_sync_firestore(user_id):
    return firestore_available() and require_owner(user_id)

@habits_bp.route('/api/users/upsert', methods=['POST'])
def upsert_user_profile():
    data = request.json or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    upsert_user(data)

    if can_sync_firestore(user_id):
        db.collection("users").document(user_id).set(data, merge=True)

    return jsonify({"success": True, "message": "User saved", "storage": "sqlite"})

@habits_bp.route('/api/habits/log', methods=['POST'])
def log_habit():
    data = request.json or {}
    user_id = data.get("user_id")
    date_key = data.get("date") # Format: YYYY-MM-DD
    
    # User ID must be present for all Firestore operations
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
    if not date_key:
        return jsonify({"error": "Date is required"}), 400

    save_log(data)
        
    if can_sync_firestore(user_id):
        db.collection("logs").document(user_id).collection("daily").document(date_key).set(data)

    return jsonify({"success": True, "message": "Habits logged successfully", "storage": "sqlite"})

@habits_bp.route('/api/habits/history', methods=['GET'])
def get_history():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    if not can_sync_firestore(user_id):
        return jsonify(get_local_history(user_id))
        
    # Retrieves sorted 30-day log history per user
    logs_ref = db.collection("logs").document(user_id).collection("daily")
    logs = logs_ref.order_by("__name__", direction=firestore.Query.DESCENDING).limit(30).stream()
    
    history = [log.to_dict() for log in logs]
    return jsonify(history)

@habits_bp.route('/api/habits/settings', methods=['GET', 'PATCH'])
def manage_settings():
    user_id = request.args.get("user_id") if request.method == 'GET' else request.json.get("user_id")
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    if request.method == 'GET' and not can_sync_firestore(user_id):
        return jsonify(get_user(user_id))

    if request.method == 'PATCH':
        upsert_user(request.json or {})
        
    if not can_sync_firestore(user_id):
        return jsonify({"success": True, "message": "Settings updated", "storage": "sqlite"})

    user_ref = db.collection("users").document(user_id)
    
    if request.method == 'GET':
        doc = user_ref.get()
        return jsonify(doc.to_dict() if doc.exists else {})
        
    if request.method == 'PATCH':
        user_ref.set(request.json, merge=True)
        return jsonify({"success": True, "message": "Settings updated"})

@habits_bp.route('/api/habits/badges', methods=['GET', 'POST'])
def manage_badges():
    data = request.json if request.method == 'POST' else request.args
    user_id = data.get("user_id")
    if not user_id:
         return jsonify({"error": "User ID is required"}), 400

    if request.method == 'POST':
         save_badges(user_id, data.get("badges", []))

    if not can_sync_firestore(user_id):
         if request.method == 'GET':
             return jsonify(get_badges(user_id))
         return jsonify({"success": True, "message": "Badges updated", "storage": "sqlite"})
         
    badge_ref = db.collection("badges").document(user_id)
    
    if request.method == 'GET':
        doc = badge_ref.get()
        return jsonify(doc.to_dict() if doc.exists else {})
        
    if request.method == 'POST':
        badge_ref.set(request.json, merge=True)
        return jsonify({"success": True, "message": "Badges updated"})
