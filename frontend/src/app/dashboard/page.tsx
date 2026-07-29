import { cookies } from 'next/headers';
import DashboardClient from './DashboardClient';

async function fetchApi(path: string, token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000';
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  return res.json();
}

export default async function DashboardPage() {
  // Coba baca session dari cookie (hanya works dengan @supabase/ssr)
  // Jika tidak ada, client component handle sendiri via localStorage
  let initialUser = null;
  let initialCharacters: any[] = [];

  try {
    const cookieStore = await cookies();
    const sbCookieName = process.env.NEXT_PUBLIC_SUPABASE_COOKIE || '';
    const supabaseCookie = sbCookieName ? cookieStore.get(sbCookieName) : null;

    if (supabaseCookie?.value) {
      let session: any;
      try {
        session = JSON.parse(supabaseCookie.value);
      } catch {
        // Try array format [access_token, refresh_token, user]
        const parsed = JSON.parse(supabaseCookie.value);
        if (Array.isArray(parsed)) {
          session = { access_token: parsed[0] };
        }
      }

      if (session?.access_token) {
        const [userData, charData] = await Promise.all([
          fetchApi('/api/auth/me', session.access_token),
          fetchApi('/api/character', session.access_token),
        ]);
        if (userData.success) initialUser = JSON.parse(JSON.stringify(userData.data));
        if (charData.success) initialCharacters = JSON.parse(JSON.stringify(charData.data));
      }
    }
  } catch {
    // Silent fail — client component will handle auth
  }

  return (
    <DashboardClient
      initialUser={initialUser}
      initialCharacters={initialCharacters}
    />
  );
}
