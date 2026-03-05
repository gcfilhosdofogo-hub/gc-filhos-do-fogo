import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkColumn() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1)
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Keys in profiles table:', Object.keys(data[0] || {}))
  }
}
checkColumn()
