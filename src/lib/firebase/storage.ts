import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseApp from './app';

const storage = getStorage(firebaseApp);

/**
 * Upload a meal photo to Firebase Storage and return the public download URL.
 * Path: users/{uid}/meal-photos/{timestamp}-{random}.jpg
 *
 * The returned URL is stored in the Entry document (entry.photoUrl).
 * Firebase Storage is the only place binary data lives — never Firestore.
 */
export async function uploadMealPhoto(uid: string, file: Blob): Promise<string> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const path = `users/${uid}/meal-photos/${timestamp}-${random}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}

/**
 * Convert an image File/Blob to base64 for sending to the Claude API.
 * This conversion happens in the browser — the image never touches our server
 * until the base64 is sent in the API request body.
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix — Claude API wants raw base64
      resolve(result.split(',')[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
