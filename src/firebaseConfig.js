
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager} from "firebase/firestore";




// Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyDBEGismDsDJgZWUUWZ4MrEOftsVNlKA4k",
  authDomain: "fundflow-fsc.firebaseapp.com",
  projectId: "fundflow-fsc",
  storageBucket: "fundflow-fsc.appspot.com",
  messagingSenderId: "721942929537",
  appId: "1:721942929537:web:abd9764a0f4ca7138d2d80",
  measurementId: "G-L1MVYV0M0V"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
// const db = getFirestore(app);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
});


// Export services to use in components - the import lines in other jsx files
export { auth, provider, db };
