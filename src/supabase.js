import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ytmiwcazfsdrkgahirkp.supabase.co';
const supabaseKey = 'sb_publishable_kht_rtLmKh9bkE6T7Kkf8w_DJggL-e-';

export const supabase = createClient(supabaseUrl, supabaseKey);
