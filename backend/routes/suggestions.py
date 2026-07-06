import os
import json
from flask import Blueprint, request, jsonify
from groq import Groq

suggestions_bp = Blueprint('suggestions', __name__)

# Initialize Groq Client securely using environment variables
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

@suggestions_bp.route('/api/suggestions/generate', methods=['POST'])
def generate_suggestions():
    data = request.json
    
    # Construct context prompt
    prompt = f"""
    The user has the following daily carbon footprint breakdown:
    - Travel: {data.get('travel_emissions')} kg CO2 (Mode: {data.get('transport_mode')})
    - Food: {data.get('food_emissions')} kg CO2 (Diet: {data.get('diet_type')})
    - Energy: {data.get('energy_emissions')} kg CO2 (Electricity: {data.get('electricity_kwh')} kWh)
    - Total: {data.get('total')} kg CO2.
    
    Based on this, provide exactly 3 personalised and actionable eco-friendly lifestyle swap recommendations. 
    Return the response ONLY as a structured JSON array of 3 suggestion objects with keys: "title", "description", "category", and "estimated_co2_saving".
    """

    try:
        # Submit request to Groq API
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=800,
        )
        
        # Parse returned JSON array
        suggestions_json = chat_completion.choices.message.content
        suggestions = json.loads(suggestions_json)
        
        return jsonify(suggestions)
        
    except Exception as e:
        # Serve static fallback if API is unavailable
        fallback_suggestions = [
            {"title": "Use public transport", "description": "Taking the bus reduces emissions.", "category": "travel", "estimated_co2_saving": "2.4 kg"},
            {"title": "Eat plant-based", "description": "Reduce meat intake.", "category": "food", "estimated_co2_saving": "1.5 kg"},
            {"title": "Unplug devices", "description": "Turn off switches when not in use.", "category": "energy", "estimated_co2_saving": "0.3 kg"}
        ]
        return jsonify(fallback_suggestions)