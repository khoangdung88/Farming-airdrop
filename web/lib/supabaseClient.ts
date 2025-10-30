import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Tránh throw lỗi cứng khiến build fail trên môi trường chưa set env
  console.warn('Supabase env chưa được cấu hình.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
