import os
import requests
from flask import Blueprint, request, jsonify

carbon_interface_bp = Blueprint('carbon_interface', __name__)
API_KEY = os.environ.get("CARBON_INTERFACE_API_KEY")
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

@carbon_interface_bp.route('/api/carbon/electricity', methods=['POST'])
def calculate_electricity():
    data = request.json
    try:
        response = requests.post(
            "https://www.carboninterface.com/api/v1/estimates",
            headers=HEADERS,
            json={
                "type": "electricity",
                "electricity_value": data.get("electricity_value"),
                "electricity_unit": "kwh",
                "country": data.get("country", "in")
            }
        )
        return jsonify(response.json())
    except Exception:
        # Fallback behaviour
        return jsonify({"error": "API unavailable, use local coefficients"}), 503

@carbon_interface_bp.route('/api/carbon/flight', methods=['POST'])
def calculate_flight():
    data = request.json
    try:
        response = requests.post(
            "https://www.carboninterface.com/api/v1/estimates",
            headers=HEADERS,
            json={
                "type": "flight",
                "passengers": data.get("passengers", 1),
                "legs": [
                    {"departure_airport": data.get("departure"), "destination_airport": data.get("destination")}
                ]
            }
        )
        return jsonify(response.json())
    except Exception:
        # Fallback behaviour
        return jsonify({"error": "API unavailable, use local coefficients"}), 503