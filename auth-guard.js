(function () {
    const isLoginPage = /login\.html$/i.test(window.location.pathname);
    const redirectToLogin = () => {
        if (!isLoginPage) window.location.replace('login.html');
    };

    async function checkSession() {
        if (!window._supabase || !window._supabase.auth || typeof window._supabase.auth.getSession !== 'function') {
            console.warn('Supabase not available. Skipping auth redirect for this page.');
            return;
        }

        const { data, error } = await window._supabase.auth.getSession();
        if (error || !data.session) {
            redirectToLogin();
            return;
        }

        if (isLoginPage) window.location.replace('index.html');
        if (typeof window.applyUserRole === 'function') window.applyUserRole(data.session.user);
        window.dispatchEvent(new CustomEvent('supabase-auth-ready', { detail: data.session }));
    }

    if (window._supabase && window._supabase.auth && typeof window._supabase.auth.onAuthStateChange === 'function') {
        window._supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || !session) redirectToLogin();
        });
        checkSession();
    } else {
        window.addEventListener('supabase-ready', checkSession, { once: true });
    }
})();
