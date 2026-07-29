'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getDeviceFingerprint } from '@/lib/fingerprint';

type DemoSession = {
  session_id: string;
  char_id: string;
  char_name: string;
  prompt_count: number;
  prompts_remaining: number;
  expires_at: string;
};

type DemoContextType = {
  session: DemoSession | null;
  loading: boolean;
  fingerprint: string | null;
  startDemo: () => Promise<{ success: boolean; error?: string }>;
  refreshSession: () => Promise<void>;
};

const DemoContext = createContext<DemoContextType>({
  session: null,
  loading: false,
  fingerprint: null,
  startDemo: async () => ({ success: false }),
  refreshSession: async () => {},
});

export function DemoProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<DemoSession | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Generate fingerprint once on mount
  useEffect(() => {
    getDeviceFingerprint().then(setFingerprint);
  }, []);

  // Check existing session on mount
  useEffect(() => {
    if (!fingerprint) return;
    checkExisting(fingerprint);
  }, [fingerprint]);

  const checkExisting = async (fp: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/demo/check?fp=${encodeURIComponent(fp)}`);
      const data = await res.json();

      if (data.success && data.data?.has_session) {
        setSession({
          session_id: data.data.session_id,
          char_id: data.data.char_id,
          char_name: 'Demo Karakter',
          prompt_count: data.data.prompt_count,
          prompts_remaining: data.data.prompts_remaining,
          expires_at: data.data.expires_at,
        });
      }
    } catch {}
    setLoading(false);
  };

  const startDemo = useCallback(async () => {
    if (!fingerprint) return { success: false, error: 'Fingerprint tidak tersedia' };

    try {
      const res = await fetch('/api/demo/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint }),
      });
      const data = await res.json();

      if (!data.success) {
        return { success: false, error: data.error?.message || 'Gagal memulai demo' };
      }

      setSession({
        session_id: data.data.session_id,
        char_id: data.data.char_id,
        char_name: data.data.char_name,
        prompt_count: data.data.prompt_count,
        prompts_remaining: data.data.prompts_remaining,
        expires_at: data.data.expires_at,
      });

      return { success: true };
    } catch {
      return { success: false, error: 'Gagal terhubung ke server' };
    }
  }, [fingerprint]);

  const refreshSession = useCallback(async () => {
    if (!fingerprint) return;
    await checkExisting(fingerprint);
  }, [fingerprint]);

  return (
    <DemoContext.Provider value={{ session, loading, fingerprint, startDemo, refreshSession }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  return useContext(DemoContext);
}
