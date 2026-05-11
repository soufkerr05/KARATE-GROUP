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

// إضافة زر العودة للأعلى في جميع الصفحات
window.addEventListener('DOMContentLoaded', () => {
    const scrollTopBtn = document.createElement('button');
    scrollTopBtn.innerHTML = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7"></path></svg>';
    scrollTopBtn.className = 'scroll-to-top print:hidden';
    scrollTopBtn.title = 'الرجوع للأعلى';
    scrollTopBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.appendChild(scrollTopBtn);

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollTopBtn.classList.add('show');
        } else {
            scrollTopBtn.classList.remove('show');
        }
    });
});