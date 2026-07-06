import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials

# Load environment variables from the .env file [1]
load_dotenv()

# Initialize the Flask Application
app = Flask(__name__)

# Enable CORS so your React frontend (port 5173) can communicate with this backend (port 5000) [2]
CORS(app)

# Initialize Firebase Admin SDK [3]
# Ensure you have downloaded serviceAccountKey.json and placed it in the backend folder [3]
try:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)
    print("Firebase successfully initialized.")
except Exception as e:
    print(f"Error initializing Firebase: {e}")

# Import your modular route Blueprints [4]
from routes.calculator import calculator_bp
from routes.habits import habits_bp
from routes.suggestions import suggestions_bp
from routes.carbon_interface import carbon_interface_bp

# Register the Blueprints to the main app [4]
app.register_blueprint(calculator_bp)
app.register_blueprint(habits_bp)
app.register_blueprint(suggestions_bp)
app.register_blueprint(carbon_interface_bp)

# A simple health check route
@app.route('/', methods=['GET'])
def health_check():
    return {"status": "EcoTrack Backend is running!"}, 200

# Run the application on port 5000 [2]
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)