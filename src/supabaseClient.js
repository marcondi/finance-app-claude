import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://oooegbbvrwifilavlvgt.supabase.co';
export const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vb2VnYmJ2cndpZmlsYXZsdmd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMTk5NTAsImV4cCI6MjA4NTc5NTk1MH0.x6wDd7c8V3eb1gYgQcEILEBEJKkPfJuF4o2_UuAV7Gk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
