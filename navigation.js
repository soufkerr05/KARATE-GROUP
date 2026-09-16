(function () {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const isCurrent = page => currentPage === page;
    const linkClass = page => isCurrent(page)
        ? 'px-3 py-2 rounded-xl font-bold text-sm bg-blue-600 text-white shadow'
        : 'px-3 py-2 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors';
    const mobileLinkClass = page => isCurrent(page)
        ? 'w-full text-center px-4 py-3 rounded-xl font-bold text-lg bg-blue-600 text-white shadow'
        : 'w-full text-center px-4 py-3 rounded-xl font-bold text-lg text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors bg-slate-50 border border-slate-100';
    const groupActive = pages => pages.includes(currentPage);
    const groupButtonClass = pages => groupActive(pages)
        ? 'px-3 py-2 rounded-xl font-bold text-sm bg-blue-600 text-white shadow flex items-center gap-1'
        : 'px-3 py-2 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors flex items-center gap-1';
    const arrow = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>';
    const mobileArrow = '<svg class="w-5 h-5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>';

    function desktopGroup(label, pages, links) {
        return `<div class="relative group"><button class="${groupButtonClass(pages)}">${label}${arrow}</button><div class="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">${links}</div></div>`;
    }

    function desktopLink(page, label) {
        return `<a href="${page}" class="block px-4 py-3 text-sm font-bold ${isCurrent(page) ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'}">${label}</a>`;
    }

    function desktopTopLink(page, label) {
        return `<a href="${page}" class="${linkClass(page)}">${label}</a>`;
    }

    function mobileGroup(label, pages, links) {
        return `<details class="w-full text-center group" ${groupActive(pages) ? 'open' : ''}><summary class="px-4 py-4 rounded-2xl font-black text-xl ${groupActive(pages) ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'} list-none flex items-center justify-center gap-2 cursor-pointer outline-none">${label}${mobileArrow}</summary><div class="flex flex-col gap-2 mt-2 px-4">${links}</div></details>`;
    }

    function mobileLink(page, label) {
        return `<a href="${page}" class="${mobileLinkClass(page)}">${label}</a>`;
    }

    function renderNavigation() {
        const desktop = document.querySelector('header nav.hidden.md\\:flex');
        const mobile = document.getElementById('mobileMenu');
        if (!desktop || !mobile) return;

        desktop.innerHTML = `
            ${desktopTopLink('index.html', 'إدارة الرياضيين')}
            ${desktopGroup('التدريب', ['attendance.html', 'payments.html', 'groups.html', 'training_sessions.html', 'samurai_competition.html'], `${desktopLink('attendance.html', 'الحضور')}${desktopLink('payments.html', 'الاشتراكات')}${desktopLink('groups.html', 'الأفواج')}${desktopLink('training_sessions.html', 'الحصص التدريبية')}${desktopLink('samurai_competition.html', 'مسابقة الساموراي')}`)}
            ${desktopGroup('المالية', ['expenses.html', 'insurance_batches.html', 'contributions.html', 'report.html'], `${desktopLink('expenses.html', 'المصاريف')}${desktopLink('insurance_batches.html', 'دفعات تأمين المركز')}${desktopLink('contributions.html', 'الدعم والمساهمات')}${desktopLink('report.html', 'التقرير المالي')}`)}
            ${desktopGroup('المخزون والإحصائيات', ['dashboard.html', 'kimono.html'], `${desktopLink('dashboard.html', 'الإحصائيات')}${desktopLink('kimono.html', 'المخزون')}`)}
        `;
        mobile.innerHTML = `
            <button onclick="toggleMobileMenu()" class="absolute top-6 right-6 text-slate-500 hover:text-red-500 p-3 bg-slate-100 hover:bg-red-50 rounded-full transition-colors" aria-label="إغلاق القائمة">×</button>
            ${mobileGroup('التدريب', ['attendance.html', 'payments.html', 'groups.html', 'training_sessions.html', 'samurai_competition.html'], `${mobileLink('attendance.html', 'الحضور')}${mobileLink('payments.html', 'الاشتراكات')}${mobileLink('groups.html', 'الأفواج')}${mobileLink('training_sessions.html', 'الحصص التدريبية')}${mobileLink('samurai_competition.html', 'مسابقة الساموراي')}`)}
            ${mobileGroup('المالية', ['expenses.html', 'insurance_batches.html', 'contributions.html', 'report.html'], `${mobileLink('expenses.html', 'المصاريف')}${mobileLink('insurance_batches.html', 'دفعات تأمين المركز')}${mobileLink('contributions.html', 'الدعم والمساهمات')}${mobileLink('report.html', 'التقرير المالي')}`)}
            ${mobileGroup('المخزون والإحصائيات', ['dashboard.html', 'kimono.html'], `${mobileLink('dashboard.html', 'الإحصائيات')}${mobileLink('kimono.html', 'المخزون')}`)}
            ${mobileLink('settings.html', 'الإعدادات')}
        `;
    }

    window.addEventListener('DOMContentLoaded', renderNavigation);
})();
