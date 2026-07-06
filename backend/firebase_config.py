import firebase_admin
from firebase_admin import credentials, firestore

def initialize_firebase():
    """
    Initializes the Firebase Admin SDK using the downloaded serviceAccountKey.json.
    Ensures the app is only initialized once.
    """
    if not firebase_admin._apps:
        try:
            # Points to the private key file you will download
            cred = credentials.Certificate("serviceAccountKey.json")
            firebase_admin.initialize_app(cred)
            print("Firebase Admin successfully initialized.")
        except Exception as e:
            print(f"Error initializing Firebase: {e}")
            
    # Return the database client so other files can use it
    return firestore.client()

# Initialize the database instance
db = initialize_firebase()