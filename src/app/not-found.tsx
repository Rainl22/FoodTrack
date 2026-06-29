import Link from 'next/link';

/**
 * Static 404 page — no auth, no Firebase, no client-side context.
 * Replaces Next.js's auto-generated /_not-found route so prerendering
 * never touches Firebase modules.
 */
export default function NotFound() {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#f8fafb' }}>
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          textAlign: 'center',
          padding: '24px',
        }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 700, color: '#1aa8a1', margin: 0 }}>
            404
          </h1>
          <p style={{ color: '#64748b', margin: 0 }}>
            Page not found.
          </p>
          <Link
            href="/today"
            style={{
              marginTop: '8px',
              padding: '10px 24px',
              background: '#1aa8a1',
              color: '#fff',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 500,
            }}
          >
            Go to app
          </Link>
        </div>
      </body>
    </html>
  );
}
