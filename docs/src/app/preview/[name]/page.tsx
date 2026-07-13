import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { DEMO_NAMES } from '@/components/demos/names';
import { PreviewFrame } from './preview-frame';

type Params = { params: Promise<{ name: string }> };

export function generateStaticParams() {
  return DEMO_NAMES.map((name) => ({ name }));
}

export default async function PreviewPage({ params }: Params) {
  const { name } = await params;
  if (!(DEMO_NAMES as readonly string[]).includes(name)) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading preview…
        </div>
      }
    >
      <PreviewFrame name={name} />
    </Suspense>
  );
}

export async function generateMetadata({ params }: Params) {
  const { name } = await params;
  return {
    title: `Preview · ${name}`,
    robots: { index: false, follow: false },
  };
}
