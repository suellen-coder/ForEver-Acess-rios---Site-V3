import { auth } from "./firebase-config.js";
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

export function observeAuth(callback) {
    return onAuthStateChanged(auth, callback);
}

export async function loginAdmin(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}

export async function logoutAdmin() {
    return signOut(auth);
}
