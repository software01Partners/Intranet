import { Skeleton } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';

export default function QuizLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
      <Skeleton className="h-8 w-1/2" />
      <Card>
        <div className="p-6 space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
