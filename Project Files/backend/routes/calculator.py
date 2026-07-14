from flask import Blueprint, request, jsonify

# Establish Flask blueprint
calculator_bp = Blueprint('calculator', __name__)

# Define Emission Coefficient Tables
# Transport Coefficients (kg CO2 per km per person)
TRANSPORT_COEFFICIENTS = {
    'Car Petrol': 0.192, 'Car Diesel': 0.171, 'Car Electric': 0.053,
    'Bus': 0.089, 'Train': 0.041, 'Motorcycle': 0.114,
    'Bicycle': 0.000, 'Walking': 0.000,
    'Flight Short-haul': 0.255, 'Flight Long-haul': 0.195
}

# Food Emission Values (kg CO2 per day)
FOOD_COEFFICIENTS = {
    'Meat-heavy': 7.19, 'Omnivore': 5.63, 'Vegetarian': 3.81, 'Vegan': 2.89
}

# Energy Factors
ELECTRICITY_FACTOR = 0.233 # kg CO2/kWh (India grid)
HEATING_FLAT_RATE = 2.0 # kg
AC_FLAT_RATE = 1.5 # kg

@calculator_bp.route('/api/calculate/footprint', methods=['POST'])
def calculate_footprint():
    data = request.json or {}

    def parse_non_negative_number(field_name):
        try:
            value = float(data.get(field_name, 0))
        except (TypeError, ValueError):
            raise ValueError(f"{field_name} must be a valid number")
        if value < 0:
            raise ValueError(f"{field_name} must be non-negative")
        return value
    
    # 1. Travel Emissions
    transport_mode = data.get('transport_mode')
    if transport_mode not in TRANSPORT_COEFFICIENTS:
        return jsonify({"error": "Unknown transport mode"}), 400

    try:
        distance = parse_non_negative_number('distance')
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
        
    travel_emissions = TRANSPORT_COEFFICIENTS.get(transport_mode, 0) * distance

    # 2. Food Emissions
    diet_type = data.get('diet_type')
    if diet_type not in FOOD_COEFFICIENTS:
        return jsonify({"error": "Unknown diet type"}), 400

    food_emissions = FOOD_COEFFICIENTS.get(diet_type, 0)
    # Applies a 10% emission penalty for food waste
    if data.get('food_waste') == True:
        food_emissions *= 1.10

    # 3. Energy Emissions
    try:
        electricity_kwh = parse_non_negative_number('electricity_kwh')
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    energy_emissions = electricity_kwh * ELECTRICITY_FACTOR
    
    if data.get('heating'):
        energy_emissions += HEATING_FLAT_RATE
    if data.get('ac'):
        energy_emissions += AC_FLAT_RATE
        
    total_emissions = travel_emissions + food_emissions + energy_emissions

    # Response Structure
    return jsonify({
        "success": True,
        "travel_emissions": round(travel_emissions, 2),
        "food_emissions": round(food_emissions, 2),
        "energy_emissions": round(energy_emissions, 2),
        "total": round(total_emissions, 2),
        "calculation_method": "coefficient-based kg CO2e estimate",
        "factors": {
            "transport_kg_per_km": TRANSPORT_COEFFICIENTS[transport_mode],
            "food_kg_per_day": FOOD_COEFFICIENTS[diet_type],
            "electricity_kg_per_kwh": ELECTRICITY_FACTOR,
            "heating_flat_kg": HEATING_FLAT_RATE if data.get('heating') else 0,
            "ac_flat_kg": AC_FLAT_RATE if data.get('ac') else 0
        },
        "breakdown": data
    })
