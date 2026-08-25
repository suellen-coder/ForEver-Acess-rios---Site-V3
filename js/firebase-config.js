import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";


const firebaseConfig = {
  apiKey: "AIzaSyBnqbtMJz074RAC-8fwGorTXXsjN9JdXyo",
  authDomain: "forever-acessorios.firebaseapp.com",
  projectId: "forever-acessorios",
  storageBucket: "forever-acessorios.firebasestorage.app",
  messagingSenderId: "362829031987",
  appId: "1:362829031987:web:42363a15da7a8247f99146"
};


const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);