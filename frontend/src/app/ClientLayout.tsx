'use client';

import { DemoProvider } from '@/lib/demo-context';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
      {children}
    </DemoProvider>
  );
}
