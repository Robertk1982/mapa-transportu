import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyA8nAm4Sm7JD7uQvGKe9zMSxIlhcZfBPCE",
  authDomain: "mapa-transport.firebaseapp.com",
  databaseURL: "https://mapa-transport-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mapa-transport",
  storageBucket: "mapa-transport.firebasestorage.app",
  messagingSenderId: "639172527680",
  appId: "1:639172527680:web:eb260b672810b1560e01a5",
  measurementId: "G-JSLRKV1TL3"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
