// إعدادات الاتصال بقاعدة البيانات
const { createClient } = supabase;
const supabaseUrl = 'https://klkvblbtttklzaypnokl.supabase.co';
const supabaseKey = 'sb_publishable_vnrYeqJxy1OQIwaEvdnc_A_H2R9IC3v';
const _supabase = createClient(supabaseUrl, supabaseKey);

function logoutUser() {
    localStorage.removeItem('karate_auth');
    localStorage.removeItem('karate_auth_time');
    window.location.replace('login.html');
}