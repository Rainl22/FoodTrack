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

// Scopes requested at sign-in. Drive readonly is needed for Health Connect sync.
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
];

// Lazy singleton — getAuth calls app.getProvider() which fails if firebaseApp
// is not a real initialized app. By deferring to first use we avoid running
// this during Next.js SSR / static prerender of server-rendered pages.
let _auth: Auth | null = null;
function auth(): Auth {
  if (!_auth) _auth = getAuth(firebaseApp);
  return _auth;
}

function createGoogleProvider() {
  const provider = new GoogleAuthProvider();
  GOOGLE_SCOPES.forEach(scope => provider.addScope(scope));
  return provider;
}

export async function signInWithGoogle(): Promise<{
  user: User;
  driveToken: string | null;
}> {
  const provider = createGoogleProvider();
  const credential = await signInWithPopup(auth(), provider);
  const googleCredential = GoogleAuthProvider.credentialFromResult(credential);
  return {
    user: credential.user,
    driveToken: googleCredential?.accessToken ?? null,
  };
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
