// ===================================================================
// سجل الحصص التدريبية - training_sessions.js
// يتوافق مع نمط الكود الموجود في مشروع قاعة KARATE
// ===================================================================

/* ---- متغيرات عامة ---- */
let sessions = [];           // كل الحصص المجلوبة من Supabase
let currentSessionId = null; // الحصة المفتوحة حالياً في النافذة المنبثقة
let editingSessionId = null; // ID الحصة التي يتم تعديلها (إن وجد)

/* ---- عناصر DOM ---- */
const sessionForm     = document.getElementById('sessionForm');
const sessionDateInput = document.getElementById('sessionDate');
const sessionsGrid    = document.getElementById('sessionsGrid');
const loadingState    = document.getElementById('loadingState');
const sessionsStats   = document.getElementById('sessionsStats');

/* ---- دوال النافذة المنبثقة لإضافة حصة ---- */
function openAddSessionModal() {
    editingSessionId = null;
    document.getElementById('sessionModalTitle').innerHTML = '<span class="text-3xl text-blue-600">📋</span> تسجيل حصة جديدة';
    document.getElementById('submitSessionBtn').innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg> حفظ الحصة وبدء التدريب`;
    
    document.getElementById('sessionTitle').value     = '';
    document.getElementById('sessionGoal').value      = '';
    document.getElementById('trainingMethod').value   = '';
    document.getElementById('manualTrainingMethod').value = '';
    document.getElementById('manualTrainingMethod').classList.add('hidden');
    document.getElementById('sessionDuration').value  = '';
    document.getElementById('evalComprehension').value = '3';
    document.getElementById('evalDiscipline').value    = '3';
    document.getElementById('evalEnthusiasm').value    = '3';
    document.getElementById('sessionDate').value       = new Date().toISOString().split('T')[0];
    
    document.getElementById('exercisesContainer').innerHTML = '';
    addExerciseField();

    document.getElementById('addSessionModal').style.display = 'flex';
}
function closeAddSessionModal() {
    document.getElementById('addSessionModal').style.display = 'none';
}

/* ---- تعيين تاريخ اليوم كافتراضي ---- */
sessionDateInput.value = new Date().toISOString().split('T')[0];

/* ---- إدارة حقول التمارين الديناميكية ---- */
function addExerciseField() {
    const container = document.getElementById('exercisesContainer');
    const count = container.children.length + 1;
    const div = document.createElement('div');
    div.className = 'exercise-item flex flex-col md:flex-row gap-3 border border-slate-200 p-4 rounded-xl bg-slate-50 relative';
    div.innerHTML = `
        <span class="absolute -right-2 -top-2 bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold exercise-number">${count}</span>
        <div class="flex-1 relative">
            <textarea rows="1" placeholder="اسم التمرين..." required oninput="this.style.height = ''; this.style.height = this.scrollHeight + 'px'" class="exercise-name w-full p-3.5 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-base bg-white text-slate-800 font-bold shadow-sm resize-none overflow-hidden leading-relaxed"></textarea>
            <button type="button" onclick="startDictation(this)" class="absolute left-3 top-3.5 text-slate-400 hover:text-blue-600 transition-colors" title="إدخال صوتي">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
            </button>
        </div>
        <div class="flex-1 relative">
            <textarea rows="1" placeholder="الهدف من التمرين..." required oninput="this.style.height = ''; this.style.height = this.scrollHeight + 'px'" class="exercise-goal w-full p-3.5 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-base bg-white text-slate-800 font-bold shadow-sm resize-none overflow-hidden leading-relaxed"></textarea>
            <button type="button" onclick="startDictation(this)" class="absolute left-3 top-3.5 text-slate-400 hover:text-blue-600 transition-colors" title="إدخال صوتي">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
            </button>
        </div>
        <div class="flex-1 flex gap-2 items-start relative">
            <div class="relative flex-1 w-full">
                <textarea rows="1" placeholder="ملاحظة (اختياري)..." oninput="this.style.height = ''; this.style.height = this.scrollHeight + 'px'" class="exercise-note w-full p-3.5 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-base bg-white text-slate-800 font-bold shadow-sm resize-none overflow-hidden leading-relaxed"></textarea>
                <button type="button" onclick="startDictation(this)" class="absolute left-3 top-3.5 text-slate-400 hover:text-blue-600 transition-colors" title="إدخال صوتي">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                </button>
            </div>
            <button type="button" onclick="removeExerciseField(this)" class="flex-shrink-0 text-red-500 hover:text-white hover:bg-red-500 p-3.5 rounded-xl transition-colors border border-transparent hover:border-red-600 shadow-sm bg-white" title="حذف التمرين">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
        </div>
    `;
    container.appendChild(div);
}

function removeExerciseField(btn) {
    const container = document.getElementById('exercisesContainer');
    if (container.children.length > 1) {
        btn.closest('.exercise-item').remove();
        Array.from(container.children).forEach((item, index) => {
            item.querySelector('.exercise-number').innerText = index + 1;
        });
    } else {
        alert('يجب أن تحتوي الحصة على تمرين واحد على الأقل.');
    }
}

/* ---- إعداد النافذة لوضع التعديل ---- */
function openEditSessionModal(id) {
    const s = sessions.find(x => x.id === id);
    if (!s) return;

    editingSessionId = id;
    closeDetailsModal(); // إغلاق نافذة التفاصيل

    document.getElementById('sessionModalTitle').innerHTML = '<span class="text-3xl text-blue-600">✏️</span> تعديل الحصة التدريبية';
    document.getElementById('submitSessionBtn').innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg> حفظ التعديلات`;

    document.getElementById('sessionDate').value = s.session_date;
    document.getElementById('sessionDuration').value = s.duration_minutes || '';
    document.getElementById('sessionTitle').value = s.title || '';
    document.getElementById('sessionGoal').value = s.session_goal || '';
    
    const methodSelect = document.getElementById('trainingMethod');
    const manualInput = document.getElementById('manualTrainingMethod');
    const standardMethods = ["التدريب الدائري", "الفتري", "المستمر"];
    
    if (s.training_method && standardMethods.includes(s.training_method)) {
        methodSelect.value = s.training_method;
        manualInput.classList.add('hidden');
        manualInput.required = false;
    } else if (s.training_method) {
        methodSelect.value = 'أخرى';
        manualInput.value = s.training_method;
        manualInput.classList.remove('hidden');
        manualInput.required = true;
    } else {
        methodSelect.value = '';
        manualInput.classList.add('hidden');
        manualInput.required = false;
    }

    document.getElementById('evalComprehension').value = s.rating_comprehension || '3';
    document.getElementById('evalDiscipline').value = s.rating_discipline || '3';
    document.getElementById('evalEnthusiasm').value = s.rating_enthusiasm || '3';

    rebuildExerciseFields(s.exercises_goals);

    document.getElementById('addSessionModal').style.display = 'flex';
}

/* ---- تفكيك النص لإعادة ملء حقول التمارين ---- */
function rebuildExerciseFields(text) {
    const container = document.getElementById('exercisesContainer');
    container.innerHTML = '';
    
    if (!text || text.trim() === '' || text === '—') {
        addExerciseField();
        return;
    }

    const blocks = text.trim().split(/\n\s*\n/);
    let hasValidBlocks = false;

    blocks.forEach(block => {
        const lines = block.split('\n');
        let name = '', goal = '', note = '';

        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.match(/^\d*\.?\s*التمرين:/)) {
                name = trimmed.replace(/^\d*\.?\s*التمرين:\s*/, '');
            } else if (trimmed.startsWith('الهدف:')) {
                goal = trimmed.replace(/^الهدف:\s*/, '');
            } else if (trimmed.startsWith('ملاحظة:')) {
                note = trimmed.replace(/^ملاحظة:\s*/, '');
            } else {
                if (note !== '') note += '\n' + trimmed;
                else if (goal !== '') goal += '\n' + trimmed;
                else if (name !== '') name += '\n' + trimmed;
                else name += trimmed;
            }
        });

        if (name || goal || note) {
            addExerciseField();
            const lastItem = container.lastElementChild;
            lastItem.querySelector('.exercise-name').value = name;
            if (goal) lastItem.querySelector('.exercise-goal').value = goal;
            if (note) lastItem.querySelector('.exercise-note').value = note;
            
            lastItem.querySelectorAll('textarea').forEach(ta => {
                ta.style.height = 'auto';
                ta.style.height = ta.scrollHeight + 'px';
            });
            hasValidBlocks = true;
        }
    });

    if (!hasValidBlocks) {
        addExerciseField();
        const firstTa = container.lastElementChild.querySelector('.exercise-name');
        firstTa.value = text;
        firstTa.style.height = 'auto';
        firstTa.style.height = firstTa.scrollHeight + 'px';
    }
}

/* ---- متغيرات عالمية للتسجيل الصوتي ---- */
let globalRecognition = null;
let currentDictationBtn = null;
let pendingDictationBtn = null;

/* ---- دالة التسجيل الصوتي (Speech-to-Text) ---- */
function startDictation(btn) {
    // التحقق من دعم المتصفح لميزة الإدخال الصوتي
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('عذراً، متصفحك الحالي لا يدعم ميزة الإدخال الصوتي. جرب استخدام Google Chrome.');
        return;
    }

    // إذا كان هناك تسجيل شغال بالفعل
    if (globalRecognition && currentDictationBtn) {
        if (currentDictationBtn === btn) {
            // إيقاف التسجيل لنفس الزر
            globalRecognition.stop();
            return;
        } else {
            // المستخدم نقر على زر آخر، نوقف الحالي وننتظر حدث onend لتشغيل الجديد
            pendingDictationBtn = btn;
            globalRecognition.stop();
            return;
        }
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    globalRecognition = new SpeechRecognition();

    // دعم اللغة العربية فقط
    globalRecognition.lang = 'ar-SA'; 
    // استمرار التسجيل حتى يقوم المستخدم بإيقافه يدوياً
    globalRecognition.continuous = true; 
    globalRecognition.interimResults = false;
    globalRecognition.maxAlternatives = 1;

    const textarea = btn.previousElementSibling;
    // الاحتفاظ بالأيقونة الأصلية
    const originalIcon = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>`;

    globalRecognition.onstart = function() {
        currentDictationBtn = btn;
        // تغيير شكل الزر ليدل على بدء التسجيل (أيقونة حمراء وامضة)
        btn.classList.add('text-red-500');
        btn.classList.remove('text-slate-400');
        btn.innerHTML = `<svg class="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>`;
    };

    globalRecognition.onresult = function(event) {
        let newTranscript = '';
        // استخراج النصوص الجديدة فقط أثناء التسجيل المستمر
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                newTranscript += event.results[i][0].transcript + ' ';
            }
        }
        
        if (newTranscript.trim() !== '') {
            // إرفاق النص الجديد بالنص القديم
            textarea.value = textarea.value.trim() !== '' ? textarea.value + ' ' + newTranscript.trim() : newTranscript.trim();
            // تحديث ارتفاع مربع النص تلقائياً
            textarea.dispatchEvent(new Event('input'));
        }
    };

    globalRecognition.onerror = function(event) {
        console.error('خطأ في التعرف على الصوت:', event.error);
        if (event.error === 'not-allowed') {
            alert('الرجاء السماح باستخدام الميكروفون من إعدادات المتصفح.');
        }
        // لا داعي لتنظيف المتغيرات هنا لأن onend سيعمل دائماً بعد الخطأ
    };

    globalRecognition.onend = function() {
        if (currentDictationBtn) {
            // إعادة الزر لشكله الطبيعي
            currentDictationBtn.classList.remove('text-red-500');
            currentDictationBtn.classList.add('text-slate-400');
            currentDictationBtn.innerHTML = originalIcon;
            currentDictationBtn = null;
        }
        globalRecognition = null;

        // إذا كان هناك زر آخر ينتظر التشغيل (تم الضغط عليه أثناء التسجيل)
        if (pendingDictationBtn) {
            const nextBtn = pendingDictationBtn;
            pendingDictationBtn = null;
            startDictation(nextBtn); // بدء التسجيل للحقل الجديد بأمان
        }
    };

    try {
        globalRecognition.start();
    } catch (e) {
        console.error("خطأ أثناء بدء التسجيل:", e);
    }
}

/* ---- دالة إظهار/إخفاء طريقة التدريب اليدوية ---- */
window.toggleManualMethod = function() {
    const select = document.getElementById('trainingMethod');
    const manualInput = document.getElementById('manualTrainingMethod');
    if (select.value === 'أخرى') {
        manualInput.classList.remove('hidden');
        manualInput.required = true;
        manualInput.focus();
    } else {
        manualInput.classList.add('hidden');
        manualInput.required = false;
        manualInput.value = '';
    }
};

// ===================================================================
// 1. جلب البيانات من Supabase
// ===================================================================
async function fetchSessions() {
    loadingState.classList.remove('hidden');
    sessionsGrid.classList.add('hidden');
    sessionsStats.classList.add('hidden');

    const { data, error } = await _supabase
        .from('training_sessions')
        .select('*')
        .order('session_date', { ascending: false });

    if (error) {
        console.error("خطأ في جلب الحصص التدريبية:", error);
        loadingState.innerHTML = `
            <div class="text-center py-10 text-red-500">
                <p class="font-bold">حدث خطأ أثناء جلب البيانات.</p>
                <p class="text-sm mt-1 text-slate-400">${error.message}</p>
            </div>`;
        return;
    }

    sessions = data || [];
    loadingState.classList.add('hidden');
    renderSessions();
}


// ===================================================================
// 2. عرض الحصص في الواجهة
// ===================================================================
function renderSessions() {
    const searchVal  = (document.getElementById('searchSessions')?.value || '').trim().toLowerCase();
    const sortVal    = document.getElementById('sortSessions')?.value || 'newest';

    // --- فلترة ---
    let filtered = sessions.filter(s => {
        if (!searchVal) return true;
        return (
            (s.title || '').toLowerCase().includes(searchVal) ||
            (s.session_date || '').includes(searchVal)
        );
    });

    // --- ترتيب ---
    if (sortVal === 'newest') {
        filtered.sort((a, b) => new Date(b.session_date) - new Date(a.session_date));
    } else if (sortVal === 'oldest') {
        filtered.sort((a, b) => new Date(a.session_date) - new Date(b.session_date));
    } else if (sortVal === 'longest') {
        filtered.sort((a, b) => (b.duration_minutes || 0) - (a.duration_minutes || 0));
    }

    // --- حالة فارغة ---
    if (filtered.length === 0) {
        sessionsGrid.innerHTML = `
            <div class="text-center py-14 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <p class="text-5xl mb-4">📭</p>
                <p class="text-slate-500 text-lg font-bold">
                    ${sessions.length === 0 ? 'لم يتم تسجيل أي حصص تدريبية بعد.' : 'لا توجد نتائج مطابقة للبحث.'}
                </p>
                <p class="text-slate-400 text-sm mt-1">
                    ${sessions.length === 0 ? 'استخدم النموذج على اليسار لإضافة أول حصة.' : 'جرب تعديل كلمة البحث.'}
                </p>
            </div>`;
        sessionsGrid.classList.remove('hidden');
        sessionsStats.classList.add('hidden');
        return;
    }

    // --- بناء البطاقات ---
    sessionsGrid.innerHTML = filtered.map(s => buildSessionCard(s)).join('');
    sessionsGrid.classList.remove('hidden');

    // --- الإحصاءات ---
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    document.getElementById('statTotal').textContent   = sessions.length;
    document.getElementById('statMinutes').textContent = totalMinutes.toLocaleString();
    sessionsStats.classList.remove('hidden');
}

/* ---- بناء بطاقة حصة واحدة ---- */
function buildSessionCard(s) {
    const dateFormatted = formatDate(s.session_date);
    const truncExercises = (s.exercises_goals || '').length > 120
        ? (s.exercises_goals || '').substring(0, 120) + '...'
        : (s.exercises_goals || '');
    const hasNotes = s.notes && s.notes.trim() !== '';

    return `
    <div class="session-card bg-white border border-slate-200 rounded-2xl p-5 shadow-sm cursor-pointer"
         onclick="openDetailsModal('${s.id}')">
        <!-- رأس البطاقة -->
        <div class="flex items-start justify-between gap-3 mb-3">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                </div>
                <div class="min-w-0">
                    <h3 class="font-black text-slate-800 text-base leading-tight truncate">${s.title || 'بدون عنوان'}</h3>
                    <p class="text-slate-400 text-xs mt-0.5 font-semibold">${dateFormatted}</p>
                </div>
            </div>
            <div class="flex-shrink-0 flex flex-col items-end gap-2">
                <div class="flex items-center gap-1.5 bg-purple-50 border border-purple-100 text-purple-700 px-3 py-1.5 rounded-xl text-xs font-black">
                    🎯 ${s.session_goal || 'غير محدد'}
                </div>
                <div class="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-xl text-xs font-black">
                    🔄 ${s.training_method || 'غير محدد'}
                </div>
                <div class="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-black">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    ${s.duration_minutes || 0} دقيقة
                </div>
            </div>
        </div>

        <!-- نص التمارين (مقتطع) -->
        ${truncExercises ? `
        <p class="text-slate-500 text-sm leading-relaxed border-t border-slate-100 pt-3 mt-2 line-clamp-3 whitespace-pre-line">
            ${escapeHtml(truncExercises)}
        </p>` : ''}

        <!-- الذيل -->
        <div class="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
            <div class="flex items-center gap-2">
                ${hasNotes ? `<span class="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg font-bold">📝 يوجد ملاحظات</span>` : ''}
            </div>
            <span class="text-xs text-blue-600 font-black flex items-center gap-1 hover:underline">
                عرض التفاصيل
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/>
                </svg>
            </span>
        </div>
    </div>`;
}


// ===================================================================
// 3. معالجة إضافة حصة جديدة
// ===================================================================
sessionForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submitSessionBtn');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> جاري الحفظ...`;

    let exercisesText = '';
    const exerciseItems = document.querySelectorAll('.exercise-item');
    exerciseItems.forEach((item, index) => {
        const name = item.querySelector('.exercise-name').value.trim();
        const goal = item.querySelector('.exercise-goal').value.trim();
        const note = item.querySelector('.exercise-note').value.trim();
        
        if (name) {
            exercisesText += `${index + 1}. التمرين: ${name}\n`;
            exercisesText += `   الهدف: ${goal}\n`;
            if (note) exercisesText += `   ملاحظة: ${note}\n`;
            exercisesText += `\n`;
        }
    });

    const duration = parseInt(document.getElementById('sessionDuration').value) || 0;
    if (duration <= 0) {
        alert("يرجى إدخال مدة الحصة بشكل صحيح (يجب أن تكون أكبر من صفر).");
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        return;
    }

    let method = document.getElementById('trainingMethod').value;
    if (method === 'أخرى') {
        method = document.getElementById('manualTrainingMethod').value.trim();
    }

    const currentSessionObj = editingSessionId ? sessions.find(s => s.id === editingSessionId) : null;

    const newSession = {
        session_date:      document.getElementById('sessionDate').value,
        title:             document.getElementById('sessionTitle').value.trim(),
        session_goal:      document.getElementById('sessionGoal').value,
        training_method:   method,
        exercises_goals:   exercisesText.trim(),
        duration_minutes:  duration,
        rating_comprehension: parseInt(document.getElementById('evalComprehension').value) || 3,
        rating_discipline:    parseInt(document.getElementById('evalDiscipline').value) || 3,
        rating_enthusiasm:    parseInt(document.getElementById('evalEnthusiasm').value) || 3,
        notes:             currentSessionObj ? currentSessionObj.notes : ''
    };

    let response;
    if (editingSessionId) {
        response = await _supabase.from('training_sessions').update(newSession).eq('id', editingSessionId);
    } else {
        response = await _supabase.from('training_sessions').insert([newSession]);
    }

    if (response.error) {
        console.error("خطأ في الحفظ:", response.error);
        alert("حدث خطأ أثناء الحفظ: " + response.error.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        return;
    }

    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;

    closeAddSessionModal();
    // تحديث القائمة
    editingSessionId = null;
    fetchSessions();
});


// ===================================================================
// 4. النافذة المنبثقة - عرض التفاصيل
// ===================================================================
function openDetailsModal(id) {
    const s = sessions.find(x => x.id === id);
    if (!s) return;

    currentSessionId = id;

    document.getElementById('detailTitle').textContent    = s.title || 'بدون عنوان';
    document.getElementById('detailDate').textContent     = '📅 ' + formatDate(s.session_date);
    document.getElementById('detailDuration').textContent = `⏱️ ${s.duration_minutes || 0} دقيقة`;
    document.getElementById('detailExercises').textContent = s.exercises_goals || '—';
    document.getElementById('detailGoal').textContent     = s.session_goal || 'غير محدد';
    document.getElementById('detailMethod').textContent   = s.training_method || 'غير محدد';
    
    document.getElementById('detailEvalComprehension').textContent = (s.rating_comprehension || 0) + '/5';
    document.getElementById('detailEvalDiscipline').textContent    = (s.rating_discipline || 0) + '/5';
    document.getElementById('detailEvalEnthusiasm').textContent    = (s.rating_enthusiasm || 0) + '/5';

    const notesSection = document.getElementById('detailNotesSection');
    const notesEl = document.getElementById('detailNotes');

    if (s.notes && s.notes.trim()) {
        notesEl.textContent = s.notes;
        notesSection.classList.remove('hidden');
    } else {
        notesSection.classList.add('hidden');
    }

    document.getElementById('detailsModal').style.display = 'flex';
}

function closeDetailsModal() {
    document.getElementById('detailsModal').style.display = 'none';
    currentSessionId = null;
}

// إغلاق النافذة بالنقر خارجها
window.addEventListener('click', function (e) {
    const modal = document.getElementById('detailsModal');
    const addModal = document.getElementById('addSessionModal');
    if (e.target === modal) closeDetailsModal();
    if (e.target === addModal) closeAddSessionModal();
});


// ===================================================================
// 5. حذف حصة
// ===================================================================
async function deleteSession(id) {
    if (!id) return;
    if (!confirm('هل أنت متأكد من حذف هذه الحصة التدريبية؟ لا يمكن التراجع عن هذا الإجراء.')) return;

    const { error } = await _supabase.from('training_sessions').delete().eq('id', id);

    if (error) {
        console.error("خطأ في الحذف:", error);
        alert("حدث خطأ أثناء الحذف.");
        return;
    }

    closeDetailsModal();
    fetchSessions();
}


// ===================================================================
// 6. الطباعة
// ===================================================================

/* ---- طباعة حصة واحدة (المفتوحة حالياً) ---- */
function printSingleSession() {
    const s = sessions.find(x => x.id === currentSessionId);
    if (!s) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(buildPrintHTML([s], `حصة: ${s.title}`));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 400);
}

/* ---- طباعة جميع الحصص ---- */
function printAllSessions() {
    if (sessions.length === 0) {
        alert('لا توجد حصص لطباعتها.');
        return;
    }

    const sorted = [...sessions].sort((a, b) => new Date(b.session_date) - new Date(a.session_date));
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(buildPrintHTML(sorted, 'سجل الحصص التدريبية الكاملة'));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 400);
}

/* ---- بناء HTML التقرير المطبوع ---- */
function buildPrintHTML(sessionsList, reportTitle) {
    const today = new Date().toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' });
    const totalMinutes = sessionsList.reduce((s, x) => s + (x.duration_minutes || 0), 0);

    const rows = sessionsList.map((s, i) => `
        <div style="border:1px solid #cbd5e1; border-radius:10px; padding:18px; margin-bottom:18px; page-break-inside:avoid;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #e2e8f0; padding-bottom:10px; margin-bottom:12px;">
                <h3 style="font-size:16pt; font-weight:900; color:#1e3a5f; margin:0;">${i + 1}. ${escapeHtml(s.title || 'بدون عنوان')}</h3>
                <div style="display:flex; gap:12px; font-size:10pt; color:#475569; font-weight:700;">
                    <span>📅 ${formatDate(s.session_date)}</span>
                    <span>⏱️ ${s.duration_minutes || 0} دقيقة</span>
                    <span>🎯 ${s.session_goal || 'غير محدد'}</span>
                    <span>🔄 ${s.training_method || 'غير محدد'}</span>
                </div>
            </div>
            <div style="margin-bottom:10px;">
                <p style="font-size:9pt; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin:0 0 6px;">التمارين والأهداف</p>
                ${formatExercisesAsTable(s.exercises_goals)}
            </div>
            <div style="display:flex; gap:16px; margin-bottom:14px;">
                <div style="flex:1; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px; text-align:center;">
                    <span style="font-size:9pt; font-weight:800; color:#64748b; display:block;">الاستيعاب</span>
                    <span style="font-size:12pt; font-weight:900; color:#2563eb;">${s.rating_comprehension || 0}/5</span>
                </div>
                <div style="flex:1; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px; text-align:center;">
                    <span style="font-size:9pt; font-weight:800; color:#64748b; display:block;">الانضباط</span>
                    <span style="font-size:12pt; font-weight:900; color:#059669;">${s.rating_discipline || 0}/5</span>
                </div>
                <div style="flex:1; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px; text-align:center;">
                    <span style="font-size:9pt; font-weight:800; color:#64748b; display:block;">الحماس</span>
                    <span style="font-size:12pt; font-weight:900; color:#d97706;">${s.rating_enthusiasm || 0}/5</span>
                </div>
            </div>
            ${s.notes ? `
            <div>
                <p style="font-size:9pt; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin:0 0 6px;">ملاحظات</p>
                <p style="font-size:11pt; line-height:1.7; color:#334155; font-style:italic; white-space:pre-line; margin:0; background:#fffbeb; padding:10px; border-radius:6px; border:1px solid #fde68a;">${escapeHtml(s.notes)}</p>
            </div>` : ''}
        </div>
    `).join('');

    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>${reportTitle} - قاعة KARATE</title>
    <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing:border-box; margin:0; padding:0; }
        body { font-family:'Tajawal', sans-serif; background:#fff; color:#0f172a; padding:28px 32px; direction:rtl; }
        @media print { body { padding:12px 16px; } }
    </style>
</head>
<body>
    <!-- رأس التقرير -->
    <div style="text-align:center; border-bottom:4px double #1e3a5f; padding-bottom:16px; margin-bottom:24px;">
        <h1 style="font-size:22pt; font-weight:900; color:#1e3a5f; letter-spacing:1px;">🥋 قاعة KARATE</h1>
        <h2 style="font-size:15pt; font-weight:700; color:#334155; margin-top:6px;">${reportTitle}</h2>
        <p style="font-size:10pt; color:#64748b; margin-top:4px;">
            تاريخ الطباعة: ${today} &nbsp;|&nbsp; عدد الحصص: ${sessionsList.length} &nbsp;|&nbsp; إجمالي الوقت: ${totalMinutes} دقيقة
        </p>
    </div>
    <!-- الحصص -->
    ${rows}
    <!-- تذييل -->
    <div style="text-align:center; margin-top:28px; padding-top:12px; border-top:1px solid #e2e8f0; font-size:9pt; color:#94a3b8;">
        تم إنشاء هذا التقرير بواسطة نظام إدارة قاعة KARATE
    </div>
</body>
</html>`;
}


// ===================================================================
// 7. دوال مساعدة
// ===================================================================

/* تحويل نص التمارين إلى جدول للطباعة */
function formatExercisesAsTable(text) {
    if (!text || text.trim() === '' || text === '—') return escapeHtml(text || '—');

    // التحقق مما إذا كان النص يتبع النمط المهيكل (تمرين، هدف، ملاحظة)
    if (!text.includes('التمرين:') && !text.includes('الهدف:')) {
        return `<p style="font-size:11pt; line-height:1.8; color:#1e293b; white-space:pre-line; margin:0; background:#f8fafc; padding:10px; border-radius:6px; border:1px solid #e2e8f0;">${escapeHtml(text)}</p>`;
    }

    const blocks = text.trim().split(/\n\s*\n/);
    let rowsHtml = '';

    blocks.forEach(block => {
        const lines = block.split('\n');
        let name = '', goal = '', note = '';
        
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.match(/^\d*\.?\s*التمرين:/)) {
                name = trimmed.replace(/^\d*\.?\s*التمرين:\s*/, '');
            } else if (trimmed.startsWith('الهدف:')) {
                goal = trimmed.replace(/^الهدف:\s*/, '');
            } else if (trimmed.startsWith('ملاحظة:')) {
                note = trimmed.replace(/^ملاحظة:\s*/, '');
            } else {
                // إلحاق الأسطر المتعددة إن وجدت
                if (note !== '') note += '\n' + trimmed;
                else if (goal !== '') goal += '\n' + trimmed;
                else if (name !== '') name += '\n' + trimmed;
                else name += trimmed;
            }
        });

        if (name || goal || note) {
            rowsHtml += `
                <tr>
                    <td style="padding: 10px; border: 1px solid #cbd5e1; vertical-align: top; white-space: pre-line; color: #1e293b;">${escapeHtml(name)}</td>
                    <td style="padding: 10px; border: 1px solid #cbd5e1; vertical-align: top; white-space: pre-line; color: #1e293b;">${escapeHtml(goal)}</td>
                    <td style="padding: 10px; border: 1px solid #cbd5e1; vertical-align: top; white-space: pre-line; color: #1e293b;">${escapeHtml(note)}</td>
                </tr>
            `;
        }
    });

    if (rowsHtml === '') {
        return `<p style="font-size:11pt; line-height:1.8; color:#1e293b; white-space:pre-line; margin:0; background:#f8fafc; padding:10px; border-radius:6px; border:1px solid #e2e8f0;">${escapeHtml(text)}</p>`;
    }

    return `
        <table style="width: 100%; border-collapse: collapse; font-size: 11pt; background: #fff; margin-top: 5px; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
            <thead style="background: #f8fafc; color: #475569; font-weight: 800;">
                <tr>
                    <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: right; width: 34%;">التمرين</th>
                    <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: right; width: 33%;">الهدف</th>
                    <th style="padding: 10px; border: 1px solid #cbd5e1; text-align: right; width: 33%;">الملاحظة</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>
    `;
}

/* تنسيق التاريخ إلى صيغة عربية */
function formatDate(dateStr) {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr + 'T00:00:00').toLocaleDateString('ar-DZ', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    } catch { return dateStr; }
}

/* هروب HTML لمنع XSS */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}


// ===================================================================
// 8. وظائف عامة مشتركة (نفس باقي صفحات الموقع)
// ===================================================================

/* القائمة المنسدلة للهواتف */
function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    menu.classList.toggle('hidden');
    menu.classList.toggle('flex');
}

/* تطبيق الوضع الليلي */
function applyTheme() {
    const theme = localStorage.getItem('theme') || 'system';
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}
applyTheme();
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if ((localStorage.getItem('theme') || 'system') === 'system') applyTheme();
});

/* إخفاء الهيدر عند التمرير */
let lastScrollTop = 0;
let isScrolling = false;
window.addEventListener('scroll', function () {
    if (!isScrolling) {
        window.requestAnimationFrame(function () {
            const header = document.querySelector('.header-wrapper');
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            if (scrollTop > lastScrollTop && scrollTop > 80) {
                header.classList.add('header-hidden');
            } else {
                header.classList.remove('header-hidden');
            }
            lastScrollTop = scrollTop;
            isScrolling = false;
        });
        isScrolling = true;
    }
});

// ===================================================================
// 9. التشغيل الأولي
// ===================================================================
addExerciseField();
fetchSessions();
