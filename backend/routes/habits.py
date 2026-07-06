from flask import Blueprint, request, jsonify
from firebase_admin import firestore

habits_bp = Blueprint('habits', __name__)
db = firestore.client()

@habits_bp.route('/api/habits/log', methods=['POST'])
def log_habit():
    data = request.json
    user_id = data.get("user_id")
    date_key = data.get("date") # Format: YYYY-MM-DD
    
    # User ID must be present for all Firestore operations
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
        
    # Saves daily logs to Firestore with date key
    db.collection("logs").document(user_id).collection("daily").document(date_key).set(data)
    return jsonify({"success": True, "message": "Habits logged successfully"})

@habits_bp.route('/api/habits/history', methods=['GET'])
def get_history():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
        
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
         
    badge_ref = db.collection("badges").document(user_id)
    
    if request.method == 'GET':
        doc = badge_ref.get()
        return jsonify(doc.to_dict() if doc.exists else {})
        
    if request.method == 'POST':
        badge_ref.set(request.json, merge=True)
        return jsonify({"success": True, "message": "Badges updated"})