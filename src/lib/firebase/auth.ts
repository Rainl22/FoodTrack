import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';
import firebaseApp from './app';

// Lazy singleton — deferred to avoid calling getAuth during Next.js SSR/prerender.
let _auth: Auth | null = null;
function auth(): Auth {
  if (!_auth) _auth = getAuth(firebaseApp);
  return _auth;
}

// Basic sign-in: email + profile only. Does NOT request Drive scope so users
// never see the "app not verified" consent screen during normal sign-in.
export async function signInWithGoogle(): Promise<{ user: User }> {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth(), provider);
  return { user: credential.user };
}

// Requests drive.readonly incrementally — called only when the user initiates
// a Health Connect sync. A second consent popup appears, but only for that
// feature. drive.readonly is a sensitive scope that triggers Google's
// "unverified app" warning, so it must not be requested at initial sign-in.
export async function requestDriveAccess(): Promise<string | null> {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/drive.readonly');
  const credential = await signInWithPopup(auth(), provider);
  const googleCredential = GoogleAuthProvider.credentialFromResult(credential);
  return googleCredential?.accessToken ?? null;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth());
}

export function subscribeToAuthState(
  callback: (user: User | null) => void,
): () => void {
  return onAuthStateChanged(auth(), callback);
}

export function getCurrentUser(): User | null {
  return auth().currentUser;
}
