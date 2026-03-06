import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

let envContent = '';
try {
    envContent = readFileSync('.env', 'utf-8');
} catch (e) { }

envContent.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length) {
        process.env[key.trim()] = values.join('=').trim().replace(/"/g, '');
    }
});

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data, error } = await supabase.from('group_events').insert({
        title: 'test',
        date: '2025-01-01',
        description: 'test',
        price: 0,
        event_time: '12:00',
        created_by: '00000000-0000-0000-0000-000000000000'
    }).select();

    if (error) {
        console.error('Insert error:', error.message, error.code, error.details);
    } else {
        console.log('Insert success!', data);
    }
}

test();
