import { signInWithPopup } from "firebase/auth";

import { auth, googleProvider } from "./auth";

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}