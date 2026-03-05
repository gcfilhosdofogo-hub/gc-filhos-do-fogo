import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    acc[key.trim()] = value.join('=').trim().replace(/['"]/g, '');
  }
  return acc;
}, {});

const supabase = createClient(env['VITE_SUPABASE_URL'], env['VITE_SUPABASE_ANON_KEY']);

async function fixUpdatedAt() {
  const { data: profiles, error } = await supabase.from('profiles').select('id, updated_at');
  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }
  let updatedCount = 0;
  for (const p of profiles) {
    if (!p.updated_at) {
      const now = new Date().toISOString();
      await supabase.from('profiles').update({ updated_at: now }).eq('id', p.id);
      updatedCount++;
    }
  }
  console.log('Fixed updated_at for', updatedCount, 'profiles.');
}
fixUpdatedAt();
