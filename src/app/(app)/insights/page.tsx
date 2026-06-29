import { TopBar } from '@/components/navigation/TopBar';
import { Card } from '@/components/ui/Card';

export const metadata = { title: 'Insights — FoodTrack' };

export default function InsightsPage() {
  return (
    <>
      <TopBar title="Insights" />
      <div className="pt-[56px] pb-[68px] px-4 py-6 space-y-4">
        <Card>
          <p className="text-sm text-text-secondary">
            Insights coming in a future milestone.
          </p>
        </Card>
      </div>
    </>
  );
}
