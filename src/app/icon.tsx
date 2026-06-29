import { ImageResponse } from 'next/og';

export const contentType = 'image/png';
export const size = { width: 32, height: 32 };

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: '#1aa8a1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 13,
          fontWeight: 700,
          fontFamily: 'sans-serif',
        }}
      >
        FT
      </div>
    ),
    { width: 32, height: 32 },
  );
}
