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

/**
 * تبديل قائمة التنقل الخاصة بالهواتف المحمولة.
 */
function toggleMobileMenu() {
    const menu = document.getElementById("mobileMenu");
    if (menu) { // التأكد من وجود العنصر قبل التفاعل معه
        menu.classList.toggle("hidden");
        menu.classList.toggle("flex");
        document.body.classList.toggle("overflow-hidden");
    }
}

/**
 * تطبيق الوضع الليلي أو الفاتح بناءً على إعدادات المستخدم أو النظام.
 */
function applyTheme() {
    const theme = localStorage.getItem('theme') || 'system';
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// إضافة زر العودة للأعلى في جميع الصفحات
window.addEventListener('DOMContentLoaded', () => {
    // إعدادات دور القراءة فقط (Athlete)
    if (localStorage.getItem('karate_role') === 'athlete') {
        document.body.classList.add('role-athlete');
        // إخفاء أزرار الإضافة
        const adminButtons = document.querySelectorAll('button[onclick="openRegisterModal()"]');
        adminButtons.forEach(btn => btn.style.display = 'none');
    }
    
    // تطبيق الثيم عند التحميل الأولي
    applyTheme();
    // الاستماع لتغييرات تفضيلات النظام للوضع الليلي
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if ((localStorage.getItem('theme') || 'system') === 'system') applyTheme(); });

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

    // إخفاء وإظهار شريط الرأس عند التمرير لتوفير مساحة أكبر.
    let lastScrollTop = 0;
    let isScrolling = false;
    window.addEventListener('scroll', function() {
        if (!isScrolling) {
            window.requestAnimationFrame(function() {
                const header = document.querySelector('.header-wrapper');
                let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                if (header && scrollTop > lastScrollTop && scrollTop > 80) { // التأكد من وجود الهيدر
                    header.classList.add('header-hidden');
                } else if (header) {
                    header.classList.remove('header-hidden');
                }
                lastScrollTop = scrollTop;
                isScrolling = false;
            });
            isScrolling = true;
        }
    });
});