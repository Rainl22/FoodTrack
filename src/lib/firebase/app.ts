import { initializeApp, getApps, getApp } from 'firebase/app';

// Each reference must be a literal so Next.js/webpack statically replaces
// it with the real value at build time. Dynamic process.env[key] lookups
// are NOT replaced and always return undefined in the browser bundle.
function buildConfig() {
  const apiKey            = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain        = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId         = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket     = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId             = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  const measurementId     = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

  // Build-time diagnostic: logs presence as booleans only — never actual values.
  if (process.env.NODE_ENV !== 'production') {
    console.info('[Firebase] env var check:', {
      NEXT_PUBLIC_FIREBASE_API_KEY:             !!apiKey,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:         !!authDomain,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID:          !!projectId,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:      !!storageBucket,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: !!messagingSenderId,
      NEXT_PUBLIC_FIREBASE_APP_ID:              !!appId,
    });
  }

  const missing: string[] = [];
  if (!apiKey)            missing.push('NEXT_PUBLIC_FIREBASE_API_KEY');
  if (!authDomain)        missing.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
  if (!projectId)         missing.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  if (!storageBucket)     missing.push('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
  if (!messagingSenderId) missing.push('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
  if (!appId)             missing.push('NEXT_PUBLIC_FIREBASE_APP_ID');

  if (missing.length > 0) {
    throw new Error(
      `Firebase initialization failed — missing required environment variables:\n` +
      missing.map(k => `  ${k}`).join('\n') +
      '\n\nFor local development: add them to .env.local.' +
      '\nFor Netlify: add them under Site configuration → Environment variables.',
    );
  }

  return { apiKey: apiKey!, authDomain: authDomain!, projectId: projectId!,
           storageBucket: storageBucket!, messagingSenderId: messagingSenderId!,
           appId: appId!, measurementId };
}

// initializeApp only stores config — no network calls. Safe to run on server.
const firebaseApp = getApps().length === 0 ? initializeApp(buildConfig()) : getApp();

export default firebaseApp;
