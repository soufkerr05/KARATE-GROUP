(function () {
    const defaults = {
        name: 'قاعة KARATE',
        shortName: 'KARATE',
        logo: '',
        primary: '#2563eb',
        secondary: '#0f172a'
    };
    const storageKey = 'club_brand_config';

    function readConfig() {
        try {
            return { ...defaults, ...(JSON.parse(localStorage.getItem(storageKey)) || {}) };
        } catch (error) {
            return { ...defaults };
        }
    }

    function setCssVariables(config) {
        const root = document.documentElement;
        root.style.setProperty('--brand-primary', config.primary);
        root.style.setProperty('--brand-secondary', config.secondary);
    }

    function applyBranding() {
        const config = readConfig();
        setCssVariables(config);
        document.title = document.title.replace(/قاعة KARATE|KARATE|نادي كرة القدم/g, config.name);

        document.querySelectorAll('[data-brand-name]').forEach(element => {
            element.textContent = config.name;
        });
        document.querySelectorAll('[data-brand-short-name]').forEach(element => {
            element.textContent = config.shortName;
        });
        document.querySelectorAll('header a span.inline, .brand-name').forEach(element => {
            element.textContent = config.shortName;
        });
        document.querySelectorAll('header a span.text-2xl').forEach(element => {
            if (config.logo) {
                element.replaceChildren(Object.assign(document.createElement('img'), {
                    src: config.logo,
                    alt: config.name,
                    className: 'brand-logo'
                }));
            } else {
                element.textContent = '🥋';
            }
        });
        document.querySelectorAll('.watermark').forEach(element => {
            element.textContent = config.shortName;
        });
        document.querySelectorAll('input[placeholder="KARATE"]').forEach(element => {
            element.placeholder = config.shortName;
        });
        document.querySelectorAll('[data-brand-logo]').forEach(element => {
            if (config.logo) {
                element.src = config.logo;
                element.alt = config.name;
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
        });
    }

    window.clubBrand = {
        defaults,
        get: readConfig,
        save(config) {
            const cleanConfig = {
                name: String(config.name || defaults.name).trim() || defaults.name,
                shortName: String(config.shortName || defaults.shortName).trim() || defaults.shortName,
                logo: String(config.logo || '').trim(),
                primary: config.primary || defaults.primary,
                secondary: config.secondary || defaults.secondary
            };
            localStorage.setItem(storageKey, JSON.stringify(cleanConfig));
            applyBranding();
            window.dispatchEvent(new CustomEvent('club-brand-updated', { detail: cleanConfig }));
            return cleanConfig;
        },
        reset() {
            localStorage.removeItem(storageKey);
            applyBranding();
            return readConfig();
        },
        apply: applyBranding
    };

    setCssVariables(readConfig());
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyBranding);
    } else {
        applyBranding();
    }
})();
