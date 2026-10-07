// @ts-nocheck
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { SecureStorageAdapter } from './secureStorage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://gqxdbwnmnqvtdpxnrgtx.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxeGRid25tbnF2dGRweG5yZ3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MTkxODQsImV4cCI6MjA5ODQ5NTE4NH0.tR0UOoPtscMbIpQCkjMPQ3n8vtBWIEIyhOqHIUX3uS4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SecureStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
