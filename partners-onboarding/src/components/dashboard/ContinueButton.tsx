'use client';

import { Button } from '@/components/ui/Button';
import { Play } from 'lucide-react';
import Link from 'next/link';

export function ContinueButton({ trailId }: { trailId: string }) {
  return (
    <Link href={`/trilhas/${trailId}`}>
      <Button variant="accent" icon={Play} iconPosition="left">
        Continuar
      </Button>
    </Link>
  );
}
