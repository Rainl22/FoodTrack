import { initializeApp, getApps, getApp } from 'firebase/app';

// Keys that must be present at build time. measurementId is optional (Analytics only).
const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

function buildConfig() {
  const missing = REQUIRED_ENV_VARS.filter(k => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `Firebase initialization failed — missing required environment variables:\n` +
      missing.map(k => `  ${k}`).join('\n') +
      '\n\nFor local development: add them to .env.local.' +
      '\nFor Netlify: add them under Site configuration → Environment variables.',
    );
  }
  return {
    apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
    measurementId:     process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
}

// initializeApp only stores config — no network calls. Safe to run on the server.
// NEXT_PUBLIC_* vars are baked into the bundle at Netlify build time.
const firebaseApp = getApps().length === 0 ? initializeApp(buildConfig()) : getApp();

export default firebaseApp;
