import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';
import firebaseApp from './app';

// Initialise Firestore with persistent IndexedDB cache (offline support).
// Only runs in the browser — persistentLocalCache requires IndexedDB.
function createFirestore(): Firestore {
  if (typeof window === 'undefined') return {} as Firestore;
  try {
    return initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    // Already initialized (e.g. hot-reload)
    return getFirestore(firebaseApp);
  }
}

const db = createFirestore();

export default db;
