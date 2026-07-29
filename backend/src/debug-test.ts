import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function test() {
  const admin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data, error } = await admin
    .from('users')
    .select('tier, status')
    .eq('user_id', '24621e33-1156-44e0-9884-c6cf3e48c29e')
    .maybeSingle();

  console.log('data:', JSON.stringify(data));
  console.log('error:', error);
}

test();
