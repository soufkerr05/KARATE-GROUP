// ===================================================================
// مسابقة الساموراي الصغير - samurai_competition.js
// إدارة وعرض ترتيب الرياضيين بناءً على النقاط المكتسبة.
// ===================================================================

// --- المتغيرات العامة (Global State) ---
let athletes = [];
let competitionPoints = [];

// --- عناصر DOM (Cached DOM Elements) ---
const pointsForm = document.getElementById('pointsForm');
const pointDateInput = document.getElementById('pointDate');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const rankingsList = document.getElementById('rankingsList');
const athletesChecklist = document.getElementById('athletesChecklist');
const athleteSearchInput = document.getElementById('athleteSearch');
const selectedAthletesCount = document.getElementById('selectedAthletesCount');
const rankingContainer = document.getElementById('rankingContainer'); // حاوية قائمة الترتيب
const syncProgressContainer = document.getElementById('syncProgressContainer'); // حاوية شريط التقدم
const syncProgressCountEl = document.getElementById('syncProgressCount'); // عداد التقدم
const syncTotalCountEl = document.getElementById('syncTotalCount'); // إجمالي العناصر
const syncProgressBarEl = document.getElementById('syncProgressBar'); // شريط التقدم
const loadingState = document.getElementById('loadingState'); // New: Loading indicator

// --- الدوال المساعدة (Helper Functions) ---

// تعيين التواريخ الافتراضية
const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

const formatDate = (date) => date.toISOString().split('T')[0];
/**
 * يضبط التواريخ الافتراضية لحقول التاريخ (تاريخ اليوم، بداية ونهاية الشهر الحالي).
 */
function setDefaultDates() {
    pointDateInput.value = formatDate(today);
    startDateInput.value = formatDate(firstDayOfMonth);
    endDateInput.value = formatDate(lastDayOfMonth);
}

/**
 * يقوم بفلترة الرياضيين في قائمة الاختيار بناءً على نص البحث.
 */
function filterAthletes() {
    const term = athleteSearchInput.value.toLowerCase();
    document.querySelectorAll('.athlete-checkbox-item').forEach(item => {
        const name = item.getAttribute('data-name');
        item.style.display = name.includes(term) ? 'flex' : 'none';
    });
}

/**
 * يحدّث عدد الرياضيين المحددين في قائمة الاختيار.
 */
function updateSelectedCount() {
    const count = document.querySelectorAll('.athlete-cb:checked').length;
    selectedAthletesCount.innerText = `المحدد: ${count}`;
}

// --- دوال جلب البيانات (Data Fetching) ---

/**
 * يجلب جميع الرياضيين وجميع نقاط المسابقة من Supabase.
 * يحدّث المتغيرات العامة `athletes` و `competitionPoints`.
 */
async function fetchInitialData() {
    console.log("Fetching initial data...");
    rankingContainer.classList.add('hidden'); // Hide rankings while loading
    loadingState.classList.remove('hidden'); // Show loading indicator

    const [athletesRes, pointsRes] = await Promise.all([
        _supabase.from('athletes').select('id, firstName, lastName, isArchived').order('firstName', { ascending: true }), // جلب جميع الرياضيين (نشطين ومؤرشفين)
        _supabase.from('samurai_competition').select('*')
    ]);

    if (athletesRes.error) {
        console.error("خطأ في جلب الرياضيين:", athletesRes.error);
        alert("خطأ في جلب بيانات الرياضيين: " + athletesRes.error.message);
    } else {
        athletes = athletesRes.data || [];
        console.log(`Fetched ${athletes.length} athletes.`);
    }

    if (pointsRes.error) {
        console.error("خطأ في جلب نقاط المسابقة:", pointsRes.error);
        alert("خطأ في جلب نقاط المسابقة: " + pointsRes.error.message);
    } else {
        competitionPoints = pointsRes.data || [];
        console.log(`Fetched ${competitionPoints.length} competition points.`);
    }

    // بعد جلب البيانات، قم بتحديث عناصر الواجهة
    renderAthletesChecklist();
    renderRankings();

    loadingState.classList.add('hidden'); // Hide loading indicator
    rankingContainer.classList.remove('hidden'); // Show rankings container
}

// --- دوال العرض (UI Rendering) ---

/**
 * يملأ قائمة اختيار الرياضيين في نموذج إضافة/خصم النقاط.
 * يتم عرض الرياضيين النشطين فقط.
 */
function renderAthletesChecklist() {
    const activeAthletes = athletes.filter(a => !a.isArchived);

    athletesChecklist.innerHTML = activeAthletes.map(a => `
        <label class="athlete-checkbox-item flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-slate-50 transition" data-name="${a.firstName.toLowerCase()} ${a.lastName.toLowerCase()}">
            <input type="checkbox" value="${a.id}" class="athlete-cb w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500">
            <span class="font-bold text-slate-700">${a.firstName} ${a.lastName}</span>
        </label>
    `).join('');

    // ربط معالجات الأحداث
    athleteSearchInput.addEventListener('input', filterAthletes);
    athletesChecklist.addEventListener('change', updateSelectedCount);
    updateSelectedCount(); // تحديث العدد الأولي
}

/**
 * يحسب نقاط جميع الرياضيين ضمن فترة زمنية معينة ويعيدها مرتبة.
 * @param {string} startDate - تاريخ البداية (YYYY-MM-DD).
 * @param {string} endDate - تاريخ النهاية (YYYY-MM-DD).
 * @returns {Array<Object>} مصفوفة مرتبة من الرياضيين مع مجموع نقاطهم وتفاصيل النقاط.
 */
function calculateScoresAndRankings(startDate, endDate) {
    const scores = {};

    // تهيئة النقاط لجميع الرياضيين (بما في ذلك المؤرشفين، حيث قد تكون نقاطهم ذات صلة بالسياق التاريخي أو إعادة التفعيل)
    athletes.forEach(a => {
        scores[a.id] = {
            ...a,
            totalPoints: 0,
            pointsData: [] // قائمة مفصلة بالنقاط لهذا الرياضي في الفترة
        };
    });

    // تصفية النقاط ضمن الفترة المحددة
    const pointsInPeriod = competitionPoints.filter(p => p.date >= startDate && p.date <= endDate);

    // تجميع النقاط لكل رياضي
    pointsInPeriod.forEach(p => {
        // التأكد من أن athlete_id يتم التعامل معه كرقم للبحث المتسق
        const athleteId = parseInt(p.athlete_id, 10);
        if (scores[athleteId]) {
            scores[athleteId].totalPoints += parseFloat(p.points);
            scores[athleteId].pointsData.push(p);
        }
    });

    // تحويل كائن النقاط إلى مصفوفة، تصفية الرياضيين المؤرشفين للعرض، ثم الفرز
    const rankedAthletes = Object.values(scores)
        .filter(a => !a.isArchived) // عرض الرياضيين النشطين فقط في قائمة الترتيب الرئيسية
        .sort((a, b) => b.totalPoints - a.totalPoints); // الفرز تنازلياً حسب مجموع النقاط

    return rankedAthletes;
}

/**
 * يعرض قائمة الترتيب في الواجهة بناءً على الفترة الزمنية المحددة.
 */
function renderRankings() {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (!startDate || !endDate) {
        rankingsList.innerHTML = `<div class="text-center py-10 text-slate-500">الرجاء تحديد فترة زمنية لعرض الترتيب.</div>`;
        return;
    }

    const rankedAthletes = calculateScoresAndRankings(startDate, endDate);

    if (rankedAthletes.length === 0) {
        rankingsList.innerHTML = `<div class="text-center py-10 text-slate-500">لا توجد بيانات لعرضها في هذه الفترة.</div>`;
        return;
    }

    const titles = [
        { name: 'الساموراي الصغير', icon: '🏆', color: 'bg-yellow-400 text-yellow-900' },
        { name: 'قلب الأسد', icon: '🥈', color: 'bg-slate-300 text-slate-800' },
        { name: 'الفتى الذهبي', icon: '🥉', color: 'bg-amber-500 text-amber-900' }
    ];

    rankingsList.innerHTML = rankedAthletes.map((athlete, index) => {
        const rank = index + 1;
        let titleHtml = '';
        if (rank <= 3 && athlete.totalPoints > 0) {
            const title = titles[rank - 1];
            titleHtml = `<span class="text-xs font-bold ${title.color} px-2 py-1 rounded-full shadow-sm">${title.icon} ${title.name}</span>`;
        }

        return `
            <div class="ranking-item flex items-center justify-between p-4 bg-white border ${rank <= 3 ? 'border-blue-200 bg-blue-50/50' : 'border-slate-100'} rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer" data-athlete-id="${athlete.id}">
                <div class="flex items-center gap-4">
                    <span class="text-xl font-black text-slate-400 w-8 text-center">${rank}</span>
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(athlete.firstName)}+${encodeURIComponent(athlete.lastName)}&background=10b981&color=fff&rounded=true&font-size=0.4" class="w-12 h-12 rounded-full shadow-sm border-2 border-white" alt="Avatar">
                    <div class="flex items-center gap-2 flex-wrap">
                        <p class="font-bold text-slate-800 text-lg whitespace-nowrap">${athlete.firstName} ${athlete.lastName}</p>
                        ${titleHtml}
                    </div>
                </div>
                <div class="text-2xl font-black ${athlete.totalPoints > 0 ? 'text-emerald-600' : (athlete.totalPoints < 0 ? 'text-red-600' : 'text-slate-500')}">
                    ${athlete.totalPoints.toFixed(1)}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * يعرض نافذة منبثقة تحتوي على سجل نقاط مفصل لرياضي معين.
 * @param {number} athleteId - معرّف الرياضي.
 */
function showAthleteDetails(athleteId) {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    const athlete = athletes.find(a => a.id === athleteId);
    // تصفية النقاط للرياضي المحدد والفترة الزمنية، مع التأكد من تحويل athlete_id إلى رقم
    const athletePoints = competitionPoints.filter(p => parseInt(p.athlete_id, 10) === athleteId && p.date >= startDate && p.date <= endDate);

    if (!athlete) return;

    document.getElementById('modalAthleteName').innerText = `سجل نقاط: ${athlete.firstName} ${athlete.lastName}`;
    const listEl = document.getElementById('modalPointsList');

    if (athletePoints.length === 0) {
        listEl.innerHTML = '<p class="text-center text-slate-500">لا توجد نقاط مسجلة لهذا الرياضي في الفترة المحددة.</p>';
    } else {
        listEl.innerHTML = athletePoints.sort((a,b) => new Date(b.date) - new Date(a.date)).map(p => {
            const isPositive = p.points > 0;
            return `
                <div class="flex justify-between items-start p-3 rounded-lg ${isPositive ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'} border mb-2">
                    <div>
                        <p class="font-bold ${isPositive ? 'text-emerald-800' : 'text-red-800'}">${p.reason}</p>
                        <p class="text-xs text-slate-500 mt-1">${p.date}${p.notes ? ` - ${p.notes}`: ''}</p>
                    </div>
                    <div class="font-black text-lg ${isPositive ? 'text-emerald-600' : 'text-red-600'}">
                        ${isPositive ? '+' : ''}${parseFloat(p.points).toFixed(1)}
                    </div>
                </div>
            `;
        }).join('');
    }

    document.getElementById('detailsModal').style.display = 'flex';
}

/**
 * يغلق نافذة تفاصيل الرياضي المنبثقة.
 */
function closeDetailsModal() {
    document.getElementById('detailsModal').style.display = 'none';
}

// --- معالجات الأحداث (Event Handlers) ---

/**
 * يتعامل مع إرسال نموذج إضافة/خصم النقاط.
 * @param {Event} e - حدث الإرسال.
 */
function exportToExcel() {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (!startDate || !endDate) {
        alert("الرجاء تحديد فترة زمنية أولاً لتصدير الترتيب.");
        return;
    }

    const rankedAthletes = calculateScoresAndRankings(startDate, endDate);

    const titles = ['الساموراي الصغير', 'قلب الأسد', 'الفتى الذهبي'];

    const dataForExport = rankedAthletes.map((athlete, index) => {
        const rank = index + 1;
        let title = '';
        if (rank <= 3 && athlete.totalPoints > 0) {
            title = titles[rank - 1];
        }
        return {
            'المرتبة': rank,
            'الاسم الكامل': `${athlete.firstName} ${athlete.lastName}`,
            'اللقب': title,
            'مجموع النقاط': athlete.totalPoints.toFixed(1)
        };
    });

    if (dataForExport.length === 0) {
        alert('لا توجد بيانات لتصديرها في الفترة المحددة.');
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataForExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "ترتيب الساموراي");

    // تصدير الملف
    XLSX.writeFile(workbook, `ترتيب_مسابقة_الساموراي_الصغير.xlsx`);
}

async function printRankings() {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (!startDate || !endDate) {
        alert("الرجاء تحديد فترة زمنية أولاً لعرض الترتيب ثم طباعته.");
        return;
    }

    try {
        const rankedAthletes = calculateScoresAndRankings(startDate, endDate);

        const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
        const periodMonth = monthNames[new Date(startDate).getMonth()];
        const periodYear = new Date(startDate).getFullYear();
        const reportTitleText = `ترتيب مسابقة الساموراي الصغير - ${periodMonth} ${periodYear}`;

        const titles = ["الساموراي الصغير", "قلب الأسد", "الفتى الذهبي"];

        let topThreeBodyHtml = '';
        rankedAthletes.slice(0, 3).forEach((athlete, index) => {
            if (athlete.totalPoints > 0) { // فقط إذا كان لديه نقاط
                topThreeBodyHtml += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${athlete.firstName} ${athlete.lastName} - <span class="title-underline">${titles[index]}</span></td>
                        <td>${athlete.totalPoints.toFixed(1)}</td>
                    </tr>`;
            }
        });

        const remainingAthletes = rankedAthletes.slice(3);
        const midPoint = Math.ceil(remainingAthletes.length / 2);

        let rankingBody1Html = '';
        remainingAthletes.slice(0, midPoint).forEach((athlete, index) => {
            const rank = index + 4;
            rankingBody1Html += `<tr><td>${athlete.totalPoints.toFixed(1)}</td><td>${athlete.firstName} ${athlete.lastName}</td><td>${rank}</td></tr>`;
        });

        let rankingBody2Html = '';
        remainingAthletes.slice(midPoint).forEach((athlete, index) => {
            const rank = index + 4 + midPoint;
            rankingBody2Html += `<tr><td>${athlete.totalPoints.toFixed(1)}</td><td>${athlete.firstName} ${athlete.lastName}</td><td>${rank}</td></tr>`;
        });

        // القالب الكامل مع الأنماط المضمنة
        const finalHtml = `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>ترتيب مسابقة الساموراي الصغير</title>
                <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
                <style>
                    /* --- الإعدادات العامة --- */
                    body {
                        font-family: 'Tajawal', 'Cairo', sans-serif;
                        background-color: #f0f2f5;
                        margin: 0;
                        padding: 20px;
                        display: flex;
                        justify-content: center;
                        color: #333;
                    }

                    .page-container {
                        background-color: #fff;
                        width: 210mm; /* عرض ورقة A4 */
                        min-height: 297mm; /* ارتفاع ورقة A4 */
                        padding: 20px;
                        box-shadow: 0 0 15px rgba(0,0,0,0.1);
                        box-sizing: border-box;
                    }

                    /* --- زر الطباعة (مخفي في الطباعة) --- */
                    .print-button { display: none; }

                    /* --- العناوين --- */
                    h1 {
                        text-align: center;
                        font-size: 24px;
                        font-weight: 800;
                        color: #1e3a8a;
                        margin-bottom: 25px;
                        border-bottom: 2px solid #eee;
                        padding-bottom: 15px;
                    }

                    /* --- جدول المراكز الثلاثة الأولى --- */
                    .top-three-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 1.2em; }
                    .top-three-table th, .top-three-table td { border: 1px solid #ccc; padding: 12px; text-align: center; }
                    .top-three-table th { background-color: #e9ecef; font-weight: 700; }
                    .top-three-table tbody tr { background-color: #f8f9fa; }
                    .title-underline { font-weight: bold; text-decoration: underline; text-decoration-color: #007bff; text-decoration-thickness: 2px; text-underline-offset: 4px; }

                    /* --- حاوية الجدولين المتجاورين --- */
                    .main-tables-container { display: flex; justify-content: space-between; gap: 20px; }
                    .ranking-column { width: 49%; }

                    /* --- جداول الترتيب الرئيسية --- */
                    .ranking-table { width: 100%; border-collapse: collapse; font-size: 10pt; }
                    .ranking-table th, .ranking-table td { border: 1px solid #ccc; padding: 6px 8px; text-align: right; }
                    .ranking-table th { background-color: #f2f2f2; font-weight: 700; }
                    .ranking-table td:first-child, .ranking-table th:first-child { text-align: center; font-weight: bold; width: 15%; } /* عمود النقاط */
                    .ranking-table td:last-child, .ranking-table th:last-child { text-align: center; width: 15%; font-weight: bold; background-color: #f8f9fa; } /* عمود الترتيب */

                    /* --- إعدادات الطباعة --- */
                    @media print {
                        @page { size: A4; margin: 1cm; }
                        body { background-color: #fff; padding: 0; margin: 0; font-size: 9.5pt; }
                        .page-container { width: 100%; min-height: auto; box-shadow: none; padding: 0; }
                        h1 { font-size: 20pt; }
                        .top-three-table { font-size: 11pt; }
                        .ranking-table { font-size: 9pt; }
                        .ranking-table td, .ranking-table th { padding: 4px 6px; }
                    }
                </style>
            </head>
            <body>
                <div class="page-container">
                    <h1>${reportTitleText}</h1>

                    <!-- جدول المراكز الثلاثة الأولى -->
                    <table class="top-three-table">
                        <thead>
                            <tr>
                                <th style="width: 15%;">المركز</th>
                                <th>الاسم واللقب</th>
                                <th style="width: 20%;">النقاط</th>
                            </tr>
                        </thead>
                        <tbody id="top-three-body">
                            ${topThreeBodyHtml}
                        </tbody>
                    </table>

                    <!-- حاوية الجدولين المتجاورين -->
                    <div class="main-tables-container">
                        <!-- الجدول الأيمن -->
                        <div class="ranking-column">
                            <table class="ranking-table">
                                <thead>
                                    <tr>
                                        <th>النقاط</th>
                                        <th>الاسم</th>
                                        <th>الترتيب</th>
                                    </tr>
                                </thead>
                                <tbody id="ranking-body-1">
                                    ${rankingBody1Html}
                                </tbody>
                            </table>
                        </div>
                        <!-- الجدول الأيسر -->
                        <div class="ranking-column">
                            <table class="ranking-table">
                                <thead>
                                    <tr>
                                        <th>النقاط</th>
                                        <th>الاسم</th>
                                        <th>الترتيب</th>
                                    </tr>
                                </thead>
                                <tbody id="ranking-body-2">
                                    ${rankingBody2Html}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(finalHtml);
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); }, 500);

    } catch (error) {
        console.error("Error printing rankings:", error);
        alert("حدث خطأ أثناء تحضير التقرير للطباعة.");
    }
}





/**
 * يقوم بمزامنة سجلات الحضور من جدول `athletes` إلى جدول `samurai_competition`.
 * يعالج البيانات على دفعات لتجنب تجميد الواجهة ويظهر شريط تقدم للمستخدم.
 */
async function runAttendanceSync() {
    if (!confirm("سيقوم هذا الإجراء بمزامنة نقاط الحضور بناءً على الفترة الزمنية المحددة في الصفحة. هل تريد المتابعة؟")) {
        return;
    }

    // إظهار واجهة التقدم وإخفاء قائمة الترتيب الرئيسية
    const rankingContainer = document.getElementById('rankingContainer');
    const progressContainer = document.getElementById('syncProgressContainer');
    const progressCountEl = document.getElementById('syncProgressCount');
    const totalCountEl = document.getElementById('syncTotalCount');
    const progressBarEl = document.getElementById('syncProgressBar');

    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    if (!startDate || !endDate) {
        alert("الرجاء تحديد فترة زمنية أولاً (من تاريخ - إلى تاريخ) قبل بدء المزامنة.");
        return;
    }

    rankingContainer.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    progressCountEl.innerText = '0';
    progressBarEl.style.width = '0%';
    
    try {
        // 1. جلب البيانات المطلوبة
        const [athletesRes, pointsRes] = await Promise.all([
            _supabase.from('athletes').select('id, cardAttendanceDates').filter('isArchived', 'is', 'false'),
            _supabase.from('samurai_competition').select('athlete_id, date').in('reason', ['حضور بالبطاقة QR', 'حضور بالبطاقة QR - الساموراي الصغير'])
        ]);

        if (athletesRes.error || pointsRes.error) {
            throw new Error(`فشل في جلب البيانات: ${athletesRes.error?.message || pointsRes.error?.message}`);
        }

        const activeAthletes = athletesRes.data || [];
        const existingPoints = pointsRes.data || [];
        totalCountEl.innerText = activeAthletes.length;

        // 2. إنشاء مجموعة (Set) من نقاط الحضور الموجودة لتسريع البحث
        // المفتاح هو `athlete_id-date`
        const existingPointsSet = new Set(existingPoints.map(p => `${p.athlete_id}-${p.date}`));

        // 3. تحديد نقاط الحضور الناقصة بدقة
        const missingPointsToInsert = [];
        activeAthletes.forEach((athlete, index) => {
            const attendanceInPeriod = (athlete.cardAttendanceDates || []).filter(d => d >= startDate && d <= endDate);

            attendanceInPeriod.forEach(attDate => {
                const pointKey = `${athlete.id}-${attDate}`;
                if (!existingPointsSet.has(pointKey)) {
                    missingPointsToInsert.push({
                        athlete_id: athlete.id,
                        date: attDate, // استخدام تاريخ الحضور الفعلي
                        points: 0.5,
                        reason: 'حضور بالبطاقة QR - الساموراي الصغير',
                        notes: `مزامنة آلية`
                    });
                }
            });

            // تحديث واجهة التقدم لكل رياضي تتم معالجته
            progressCountEl.innerText = index + 1;
            progressBarEl.style.width = `${((index + 1) / activeAthletes.length) * 100}%`;
        });

        if (missingPointsToInsert.length === 0) {
            alert("✅ النظام محدّث بالفعل! لا توجد نقاط حضور ناقصة لمزامنتها.");
            rankingContainer.classList.remove('hidden');
            progressContainer.classList.add('hidden');
            return;
        }

        // 4. إرسال النقاط الناقصة على دفعات
        const BATCH_SIZE = 500;
        totalCountEl.innerText = missingPointsToInsert.length; // تحديث الإجمالي ليعكس عدد النقاط
        progressCountEl.innerText = '0';

        for (let i = 0; i < missingPointsToInsert.length; i += BATCH_SIZE) {
            const batch = missingPointsToInsert.slice(i, i + BATCH_SIZE);
            const { error: insertError } = await _supabase.from('samurai_competition').insert(batch);

            if (insertError) throw new Error(`فشل في إضافة دفعة من النقاط: ${insertError.message}`);
            
            const processedCount = Math.min(i + BATCH_SIZE, missingPointsToInsert.length);
            progressCountEl.innerText = processedCount;
            progressBarEl.style.width = `${(processedCount / missingPointsToInsert.length) * 100}%`;
        }

        alert(`🎉 تمت المزامنة بنجاح! تم إضافة ${missingPointsToInsert.length} نقطة حضور جديدة.`);
        await fetchInitialData(); // إعادة تحميل كل البيانات لعرض الترتيب المحدث

    } catch (err) {
        console.error("❌ حدث خطأ فادح أثناء المزامنة:", err);
        alert("حدث خطأ أثناء المزامنة. يرجى مراجعة الـ console لمزيد من التفاصيل أو إعادة المحاولة.");
    } finally {
        // إخفاء واجهة التقدم وإظهار قائمة الترتيب مجدداً
        rankingContainer.classList.remove('hidden');
        progressContainer.classList.add('hidden');
    }
}

// --- التهيئة (Initialization) وربط معالجات الأحداث ---

/**
 * يربط معالجات الأحداث لعناصر DOM بعد تحميل الصفحة.
 */
function attachEventListeners() {
    // ربط معالجات الأحداث للأزرار
    document.getElementById('filterButton').addEventListener('click', renderRankings);
    document.getElementById('printRankingsButton').addEventListener('click', printRankings);
    document.getElementById('exportExcelButton').addEventListener('click', exportToExcel);
    document.getElementById('syncAttendanceButton').addEventListener('click', runAttendanceSync);

    // معالج حدث لإرسال نموذج النقاط
    pointsForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const [pointsValueStr, reasonText] = document.getElementById('pointReason').value.split('|');
        const pointsValue = parseFloat(pointsValueStr);
        const selectedCheckboxes = document.querySelectorAll('.athlete-cb:checked');

        if (selectedCheckboxes.length === 0) {
            alert('الرجاء تحديد رياضي واحد على الأقل.');
            return;
        }

        const newPointsRecords = Array.from(selectedCheckboxes).map(cb => {
            return {
                athlete_id: parseInt(cb.value, 10), // التأكد من أن athlete_id رقم صحيح
                date: document.getElementById('pointDate').value,
                points: pointsValue,
                reason: reasonText,
                notes: document.getElementById('pointNotes').value.trim()
            };
        });

        const { data, error } = await _supabase.from('samurai_competition').insert(newPointsRecords).select();

        if (error) {
            alert('حدث خطأ أثناء حفظ التقييمات: ' + error.message);
            console.error(error);
        } else {
            alert(`تم حفظ التقييم لـ ${data.length} رياضيين بنجاح!`);
            competitionPoints.push(...data); // تحديث الحالة المحلية
            pointsForm.reset();
            pointDateInput.value = formatDate(new Date()); // إعادة ضبط التاريخ لتاريخ اليوم
            selectedCheckboxes.forEach(cb => cb.checked = false); // إلغاء تحديد جميع المربعات
            updateSelectedCount();
            renderRankings(); // تحديث الترتيب
        }
    });

    // إغلاق النافذة المنبثقة عند النقر خارجها
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('detailsModal');
        if (event.target === modal) {
            closeDetailsModal();
        }
    });

    // Event delegation for ranking items
    rankingsList.addEventListener('click', (event) => {
        const rankingItem = event.target.closest('.ranking-item');
        if (rankingItem) {
            const athleteId = parseInt(rankingItem.dataset.athleteId, 10);
            if (!isNaN(athleteId)) {
                showAthleteDetails(athleteId);
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setDefaultDates(); // ضبط التواريخ الافتراضية
    fetchInitialData(); // جلب البيانات الأولية
    attachEventListeners(); // Attach all event listeners
});