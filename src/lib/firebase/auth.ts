import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import firebaseApp from './app';

// Scopes requested at sign-in. Drive readonly is needed for Health Connect sync.
// Requesting it at initial sign-in avoids a second auth prompt later.
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
];

const auth = getAuth(firebaseApp);

function createGoogleProvider() {
  const provider = new GoogleAuthProvider();
  GOOGLE_SCOPES.forEach(scope => provider.addScope(scope));
  return provider;
}

/**
 * Open Google Sign-In popup and return the authenticated user plus
 * the Google OAuth access token (required for Drive API calls).
 */
export async function signInWithGoogle(): Promise<{
  user: User;
  driveToken: string | null;
}> {
  const provider = createGoogleProvider();
  const credential = await signInWithPopup(auth, provider);
  const googleCredential = GoogleAuthProvider.credentialFromResult(credential);
  return {
    user: credential.user,
    driveToken: googleCredential?.accessToken ?? null,
  };
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export function subscribeToAuthState(
  callback: (user: User | null) => void,
): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * Get the currently authenticated user, or null.
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

export { auth };
