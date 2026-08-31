import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 
  process.env.REACT_APP_SUPABASE_URL || 
  'https://oooegbbvrwifilavlvgt.supabase.co';

const supabaseAnonKey = 
  process.env.REACT_APP_SUPABASE_ANON_KEY || 
  'sb_publishable_8iCmRDDPfAXCrZteb1rG-w_4DGlbmhK';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
