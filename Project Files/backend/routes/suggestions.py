import os
import json
import re
from flask import Blueprint, request, jsonify
from groq import Groq
from local_db import save_recommendations

suggestions_bp = Blueprint('suggestions', __name__)

def fallback_suggestions(data):
    travel = float(data.get('travel_emissions') or 0)
    food = float(data.get('food_emissions') or 0)
    energy = float(data.get('energy_emissions') or 0)
    highest = max(
        [('travel', travel), ('food', food), ('energy', energy)],
        key=lambda item: item[1],
    )[0]
    return [
        {
            "title": "Target the highest footprint category",
            "description": f"Your largest current source is {highest}. Start with one specific swap there before changing lower-impact habits.",
            "category": highest,
            "estimated_co2_saving": "0.5-2.5 kg CO2e/day",
        },
        {
            "title": "Plan a low-carbon default",
            "description": "Choose public transport, plant-forward meals, and efficient appliance use on routine days to lower emissions without extra planning.",
            "category": "lifestyle",
            "estimated_co2_saving": "1.0 kg CO2e/day",
        },
        {
            "title": "Keep a visible daily budget",
            "description": "Compare every new log with your personal budget and use high-footprint days as triggers for the next-day reduction plan.",
            "category": "budget",
            "estimated_co2_saving": "measurable weekly reduction",
        },
    ]

def parse_json_array(content):
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r'\[[\s\S]*\]', content or '')
        if match:
            return json.loads(match.group(0))
        raise

@suggestions_bp.route('/api/suggestions/generate', methods=['POST'])
def generate_suggestions():
    data = request.json or {}
    api_key = os.environ.get("GROQ_API_KEY")

    if not api_key:
        suggestions = fallback_suggestions(data)
        if data.get("user_id"):
            save_recommendations(data.get("user_id"), data.get("total"), suggestions)
        return jsonify(suggestions)
    
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
        client = Groq(api_key=api_key)
        # Submit request to Groq API
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=800,
        )
        
        # Parse returned JSON array
        suggestions_json = chat_completion.choices[0].message.content
        suggestions = parse_json_array(suggestions_json)

        if data.get("user_id"):
            save_recommendations(data.get("user_id"), data.get("total"), suggestions)
        
        return jsonify(suggestions)
        
    except Exception as e:
        # Serve static fallback if API is unavailable
        suggestions = fallback_suggestions(data)
        if data.get("user_id"):
            save_recommendations(data.get("user_id"), data.get("total"), suggestions)
        return jsonify(suggestions)
