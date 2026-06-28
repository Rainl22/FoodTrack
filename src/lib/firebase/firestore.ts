import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
} from 'firebase/firestore';
import firebaseApp from './app';

// Initialise Firestore with persistent IndexedDB cache for offline support.
// Must be called before any other Firestore operation.
// Safe to call multiple times — Firebase guards against double-init.
function createFirestore() {
  try {
    return initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    // Already initialized (e.g. hot-reload) — return existing instance
    return getFirestore(firebaseApp);
  }
}

const db = createFirestore();

export default db;
