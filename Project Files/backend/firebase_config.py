import os
import firebase_admin
from firebase_admin import credentials, firestore


def initialize_firebase():
    """
    Initializes the Firebase Admin SDK using the downloaded serviceAccountKey.json.
    Ensures the app is only initialized once.
    """
    if firebase_admin._apps:
        return firestore.client()

    try:
        key_path = os.path.join(os.path.dirname(__file__), "serviceAccountKey.json")
        if not os.path.exists(key_path):
            print("serviceAccountKey.json not found; Firestore routes will be unavailable.")
            return None

        cred = credentials.Certificate(key_path)
        firebase_admin.initialize_app(cred)
        print("Firebase Admin successfully initialized.")
    except Exception as e:
        print(f"Error initializing Firebase: {e}")
        return None

    return firestore.client()


# Initialize the database instance
db = initialize_firebase()