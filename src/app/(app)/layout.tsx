import { BottomNav } from '@/components/navigation/BottomNav';
import { AuthGuard } from '@/components/AuthGuard';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-dvh bg-surface-page">
        <main>{children}</main>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
