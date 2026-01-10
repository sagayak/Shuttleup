
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yvbvcmfonnbhzwhrzbxt.supabase.co';
const supabaseAnonKey = 'sb_publishable_t3kSHlUw6PyrywqBgZlRUA_w7DFBIPY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
