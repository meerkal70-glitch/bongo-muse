const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://gqxdbwnmnqvtdpxnrgtx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxeGRid25tbnF2dGRweG5yZ3R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MTkxODQsImV4cCI6MjA5ODQ5NTE4NH0.tR0UOoPtscMbIpQCkjMPQ3n8vtBWIEIyhOqHIUX3uS4';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
async function check() {
  const { data, error } = await supabase.from('notifications').select('*').limit(1);
  console.log(error ? error : data);
}
check();
