const SESSION_STORAGE_KEY = 'karate_training_sessions';
const GROUP_STORAGE_KEY = 'karate_training_groups';

const sessionListEl = document.getElementById('sessionList');
const addSessionButton = document.getElementById('addSessionButton');
const sessionModal = document.getElementById('sessionModal');
const sessionForm = document.getElementById('sessionForm');
const closeSessionModal = document.getElementById('closeSessionModal');
const cancelSessionButton = document.getElementById('cancelSessionButton');
const searchSessions = document.getElementById('searchSessions');
const sessionGroupSelect = document.getElementById('sessionGroup');
const totalSessionsEl = document.getElementById('totalSessions');
const weeklySessionsEl = document.getElementById('weeklySessions');
const averageRatingEl = document.getElementById('averageRating');
const filterButtons = document.querySelectorAll('.filter-btn');

const state = {
    sessions: [],
    groups: [],
    filter: 'all',
    search: ''
};

function safeDate(dateValue) {
    if (!dateValue) return new Date();
    const date = new Date(dateValue);
    return Number.isNaN(date.getTime()) ? new Date() : date;
}

function getFallbackGroups() {
    const saved = localStorage.getItem(GROUP_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    const defaultGroups = [
        { id: 'g1', name: 'البراعم' },
        { id: 'g2', name: 'المدارس' },
        { id: 'g3', name: 'الأشبال' }
    ];
    localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(defaultGroups));
    return defaultGroups;
}

function getFallbackSessions() {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) return JSON.parse(saved);

    const fallback = [
        {
            id: 'demo-1',
            title: 'تمرين أساسي',
            group_id: 'g1',
            group_name: 'البراعم',
            session_date: new Date().toISOString().slice(0, 10),
            duration: 60,
            focus_level: 'متوسط',
            type: 'أساسية',
            rating: 4,
            notes: 'تمرينات وقوف وانطلاقات',
            created_at: new Date().toISOString()
        }
    ];

    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(fallback));
    return fallback;
}

function getSupabaseClient() {
    return window._supabase || null;
}

function showStatus(message, isError = false) {
    const existing = document.getElementById('sessionStatus');
    if (existing) existing.remove();

    const status = document.createElement('div');
    status.id = 'sessionStatus';
    status.className = `rounded-xl px-4 py-3 text-sm font-bold ${isError ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`;
    status.textContent = message;
    document.querySelector('main').prepend(status);
}

function fillGroupOptions() {
    const groups = state.groups.length ? state.groups : getFallbackGroups();
    sessionGroupSelect.innerHTML = groups.map(group => `<option value="${group.id}">${group.name}</option>`).join('');
}

function getGroupName(groupId) {
    const group = state.groups.find(item => item.id === groupId) || getFallbackGroups().find(item => item.id === groupId);
    return group ? group.name : 'غير محدد';
}

function formatDate(value) {
    const date = safeDate(value);
    return new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function getVisibleSessions() {
    const query = state.search.trim().toLowerCase();
    let filtered = [...state.sessions];

    if (state.filter === 'this-week') {
        const today = new Date();
        const start = new Date(today);
        start.setDate(today.getDate() - 7);
        filtered = filtered.filter(item => safeDate(item.session_date) >= start);
    } else if (state.filter === 'high-rating') {
        filtered = filtered.filter(item => Number(item.rating || 0) >= 4);
    }

    if (query) {
        filtered = filtered.filter(item => {
            const title = (item.title || '').toLowerCase();
            const groupName = getGroupName(item.group_id).toLowerCase();
            return title.includes(query) || groupName.includes(query);
        });
    }

    return filtered.sort((a, b) => safeDate(b.session_date) - safeDate(a.session_date));
}

function renderStats() {
    totalSessionsEl.textContent = String(state.sessions.length);

    const now = new Date();
    const weekCount = state.sessions.filter(item => safeDate(item.session_date) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)).length;
    weeklySessionsEl.textContent = String(weekCount);

    const ratings = state.sessions.map(item => Number(item.rating || 0)).filter(value => value > 0);
    const avg = ratings.length ? (ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(1) : '0';
    averageRatingEl.textContent = `${avg}/5`;
}

function renderSessions() {
    const sessions = getVisibleSessions();

    if (!sessions.length) {
        sessionListEl.innerHTML = '<div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500 font-bold">لا توجد حصص مطابقة حاليًا.</div>';
        return;
    }

    sessionListEl.innerHTML = sessions.map(session => {
        const rating = Number(session.rating || 0);
        const groupName = getGroupName(session.group_id);
        const stars = Array.from({ length: 5 }, (_, index) => index < rating ? '★' : '☆').join('');

        return `
            <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div class="flex gap-4 items-start">
                        <div class="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 flex flex-col items-center justify-center font-black">
                            <span class="text-xl leading-none">${safeDate(session.session_date).getDate()}</span>
                            <span class="text-[10px] mt-1">${new Intl.DateTimeFormat('ar-EG', { month: 'short' }).format(safeDate(session.session_date))}</span>
                        </div>
                        <div>
                            <div class="flex flex-wrap items-center gap-2">
                                <h3 class="text-xl font-black text-slate-800">${(session.title || 'حصة تدريبية').replace(/</g, '&lt;')}</h3>
                                <span class="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-black text-slate-700">${session.type || 'أساسية'}</span>
                            </div>
                            <p class="mt-1 text-sm font-bold text-slate-500">${groupName}</p>
                            <div class="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
                                <span>المدة: ${session.duration || 60} دقيقة</span>
                                <span>•</span>
                                <span>التركيز: ${session.focus_level || 'متوسط'}</span>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-2">
                        <button type="button" data-action="edit" data-id="${session.id}" class="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700">تعديل</button>
                        <button type="button" data-action="delete" data-id="${session.id}" class="rounded-xl bg-red-50 px-3 py-2 text-sm font-black text-red-600">حذف</button>
                    </div>
                </div>

                <div class="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div class="text-sm text-slate-600 font-bold">${session.notes ? session.notes.replace(/</g, '&lt;') : 'لا توجد ملاحظات إضافية.'}</div>
                    <div class="flex items-center gap-2 text-amber-500 text-lg" aria-label="تقييم الحصة">${stars}</div>
                </div>
            </article>
        `;
    }).join('');

    document.querySelectorAll('[data-action="edit"]').forEach(button => {
        button.addEventListener('click', () => openSessionModal(button.dataset.id));
    });

    document.querySelectorAll('[data-action="delete"]').forEach(button => {
        button.addEventListener('click', () => deleteSession(button.dataset.id));
    });
}

function saveToLocalStorage() {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state.sessions));
}

async function loadGroups() {
    const client = getSupabaseClient();
    if (client && typeof client.from === 'function') {
        try {
            const { data, error } = await client.from('athlete_groups').select('id, name').order('name', { ascending: true });
            if (!error && data && data.length) {
                state.groups = data;
                localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(data));
                fillGroupOptions();
                return;
            }
        } catch (error) {
            console.warn('تعذر تحميل الأفواج من Supabase.', error);
        }
    }

    state.groups = getFallbackGroups();
    fillGroupOptions();
}

async function loadSessions() {
    const client = getSupabaseClient();
    if (client && typeof client.from === 'function') {
        try {
            const { data, error } = await client.from('training_sessions').select('*').order('session_date', { ascending: false });
            if (!error && Array.isArray(data) && data.length) {
                state.sessions = data;
                saveToLocalStorage();
                renderStats();
                renderSessions();
                return;
            }
            if (error) {
                console.warn('جدول الحصص غير موجود، سيتم استخدام التخزين المحلي.', error.message);
            }
        } catch (error) {
            console.warn('تعذر الاتصال بـ Supabase، سيتم استخدام التخزين المحلي.', error);
        }
    }

    state.sessions = getFallbackSessions();
    saveToLocalStorage();
    renderStats();
    renderSessions();
}

function openSessionModal(sessionId = null) {
    const form = document.getElementById('sessionForm');
    form.reset();

    if (sessionId) {
        const session = state.sessions.find(item => item.id === sessionId);
        if (!session) return;

        document.getElementById('sessionId').value = session.id;
        document.getElementById('sessionTitle').value = session.title || '';
        document.getElementById('sessionDate').value = session.session_date || '';
        document.getElementById('sessionDuration').value = session.duration || 60;
        document.getElementById('sessionFocus').value = session.focus_level || 'متوسط';
        document.getElementById('sessionRating').value = session.rating || '';
        document.getElementById('sessionType').value = session.type || 'أساسية';
        document.getElementById('sessionNotes').value = session.notes || '';
        sessionGroupSelect.value = session.group_id || sessionGroupSelect.value;
        document.getElementById('sessionModalTitle').textContent = 'تعديل الحصة التدريبية';
    } else {
        document.getElementById('sessionId').value = '';
        document.getElementById('sessionDate').value = new Date().toISOString().slice(0, 10);
        document.getElementById('sessionDuration').value = 60;
        document.getElementById('sessionFocus').value = 'متوسط';
        document.getElementById('sessionRating').value = '';
        document.getElementById('sessionType').value = 'أساسية';
        document.getElementById('sessionNotes').value = '';
        document.getElementById('sessionTitle').value = '';
        if (sessionGroupSelect.options.length) sessionGroupSelect.value = sessionGroupSelect.options[0].value;
        document.getElementById('sessionModalTitle').textContent = 'إضافة حصة تدريبية';
    }

    sessionModal.classList.remove('hidden');
    sessionModal.classList.add('flex');
}

function closeModal() {
    sessionModal.classList.add('hidden');
    sessionModal.classList.remove('flex');
    sessionForm.reset();
}

async function upsertSession(event) {
    event.preventDefault();
    const client = getSupabaseClient();

    const payload = {
        id: document.getElementById('sessionId').value || `session-${Date.now()}`,
        title: document.getElementById('sessionTitle').value.trim() || 'حصة تدريبية',
        group_id: sessionGroupSelect.value,
        session_date: document.getElementById('sessionDate').value,
        duration: Number(document.getElementById('sessionDuration').value || 60),
        focus_level: document.getElementById('sessionFocus').value,
        type: document.getElementById('sessionType').value,
        rating: document.getElementById('sessionRating').value ? Number(document.getElementById('sessionRating').value) : null,
        notes: document.getElementById('sessionNotes').value.trim(),
        group_name: getGroupName(sessionGroupSelect.value),
        created_at: new Date().toISOString()
    };

    if (client && typeof client.from === 'function') {
        try {
            const existing = state.sessions.find(item => item.id === payload.id);
            if (existing) {
                const { error } = await client.from('training_sessions').update(payload).eq('id', payload.id);
                if (!error) {
                    state.sessions = state.sessions.map(item => item.id === payload.id ? { ...item, ...payload } : item);
                    saveToLocalStorage();
                    renderStats();
                    renderSessions();
                    closeModal();
                    showStatus('تم تحديث الحصة بنجاح.');
                    return;
                }
                throw error;
            }

            const { error } = await client.from('training_sessions').insert([payload]);
            if (!error) {
                state.sessions = [payload, ...state.sessions];
                saveToLocalStorage();
                renderStats();
                renderSessions();
                closeModal();
                showStatus('تمت إضافة الحصة بنجاح.');
                return;
            }
            throw error;
        } catch (error) {
            console.warn('فشل حفظ الحصة في Supabase، سيتم الاحتفاظ بالتخزين المحلي.', error);
        }
    }

    const existingIndex = state.sessions.findIndex(item => item.id === payload.id);
    if (existingIndex >= 0) {
        state.sessions[existingIndex] = { ...state.sessions[existingIndex], ...payload };
    } else {
        state.sessions.unshift(payload);
    }

    saveToLocalStorage();
    renderStats();
    renderSessions();
    closeModal();
    showStatus('تم حفظ الحصة محليًا لأن قاعدة البيانات غير متاحة في الوقت الحالي.');
}

async function deleteSession(sessionId) {
    if (!confirm('هل تريد حذف هذه الحصة؟')) return;

    const client = getSupabaseClient();
    if (client && typeof client.from === 'function') {
        try {
            const { error } = await client.from('training_sessions').delete().eq('id', sessionId);
            if (!error) {
                state.sessions = state.sessions.filter(item => item.id !== sessionId);
                saveToLocalStorage();
                renderStats();
                renderSessions();
                showStatus('تم حذف الحصة بنجاح.');
                return;
            }
            throw error;
        } catch (error) {
            console.warn('تعذر حذف الحصة من Supabase.', error);
        }
    }

    state.sessions = state.sessions.filter(item => item.id !== sessionId);
    saveToLocalStorage();
    renderStats();
    renderSessions();
    showStatus('تم حذف الحصة محليًا.');
}

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        filterButtons.forEach(item => {
            const isActive = item === button;
            item.classList.toggle('bg-blue-600', isActive);
            item.classList.toggle('text-white', isActive);
            item.classList.toggle('bg-slate-100', !isActive);
            item.classList.toggle('text-slate-600', !isActive);
        });

        state.filter = button.dataset.filter || 'all';
        renderSessions();
    });
});

searchSessions.addEventListener('input', (event) => {
    state.search = event.target.value;
    renderSessions();
});

addSessionButton.addEventListener('click', () => openSessionModal());
closeSessionModal.addEventListener('click', closeModal);
cancelSessionButton.addEventListener('click', closeModal);
sessionForm.addEventListener('submit', upsertSession);

(async function init() {
    await loadGroups();
    await loadSessions();
    renderSessions();
    renderStats();
})();