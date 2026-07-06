import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const placeholderValues = [
  'your_firebase_web_api_key',
  'your_project.firebaseapp.com',
  'your_project_id',
  'your_firebase_app_id',
];

export const firebaseEnabled = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  !placeholderValues.includes(firebaseConfig.apiKey) &&
  !placeholderValues.includes(firebaseConfig.authDomain) &&
  !placeholderValues.includes(firebaseConfig.projectId),
);

export const firebaseConfigStatus = {
  hasApiKey: Boolean(firebaseConfig.apiKey),
  hasAuthDomain: Boolean(firebaseConfig.authDomain),
  hasProjectId: Boolean(firebaseConfig.projectId),
  projectId: firebaseConfig.projectId || '',
};

let app = null;
let auth = null;
let db = null;

if (firebaseEnabled) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export {
  app,
  auth,
  db,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
};
