import { cookies } from 'next/headers';
import CharacterDetailClient from './CharacterDetailClient';

async function fetchApi(path: string, token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  return res.json();
}

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: charId } = await params;
  const searchParams = new URLSearchParams();

  let initialChar = null;

  try {
    const cookieStore = await cookies();
    const sbCookieName = process.env.NEXT_PUBLIC_SUPABASE_COOKIE || '';
    const supabaseCookie = sbCookieName ? cookieStore.get(sbCookieName) : null;

    if (supabaseCookie?.value) {
      let session: any;
      try {
        session = JSON.parse(supabaseCookie.value);
      } catch {
        const parsed = JSON.parse(supabaseCookie.value);
        if (Array.isArray(parsed)) session = { access_token: parsed[0] };
      }

      if (session?.access_token) {
        const charData = await fetchApi(`/api/character/${charId}`, session.access_token);
        if (charData.success) initialChar = JSON.parse(JSON.stringify(charData.data));
      }
    }
  } catch {}

  return <CharacterDetailClient charId={charId} initialChar={initialChar} />;
}
