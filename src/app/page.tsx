import { redirect } from 'next/navigation';

// Root redirects to /today. Auth guard in layout handles unauthenticated users.
export default function RootPage() {
  redirect('/today');
}
