import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBUvJvcxpYXdnqSKvVT1nbvUaE1cypZYlE",
  authDomain: "faywalk-ecom.firebaseapp.com",
  projectId: "faywalk-ecom",
  storageBucket: "faywalk-ecom.firebasestorage.app",
  messagingSenderId: "357327740793",
  appId: "1:357327740793:web:f3c6c0ba3fbffed9c419a8",
  measurementId: "G-Z3H2PHGQH6"
};

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

// Optional Analytics
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      getAnalytics(firebaseApp);
    }
  });
}
