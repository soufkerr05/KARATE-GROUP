let athletes = [];
let competitionPoints = [];

// عناصر DOM
const pointsForm = document.getElementById('pointsForm');
const pointDateInput = document.getElementById('pointDate');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const rankingsList = document.getElementById('rankingsList');
const athletesChecklist = document.getElementById('athletesChecklist');
const athleteSearchInput = document.getElementById('athleteSearch');
const selectedAthletesCount = document.getElementById('selectedAthletesCount');

// تعيين التواريخ الافتراضية
const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

const formatDate = (date) => date.toISOString().split('T')[0];

pointDateInput.value = formatDate(today);
startDateInput.value = formatDate(firstDayOfMonth);
endDateInput.value = formatDate(lastDayOfMonth);


async function fetchData() {
    const [athletesRes, pointsRes] = await Promise.all([
        _supabase.from('athletes').select('id, firstName, lastName, isArchived').order('firstName', { ascending: true }),
        _supabase.from('samurai_competition').select('*')
    ]);

    if (athletesRes.error) {
        console.error("خطأ في جلب الرياضيين:", athletesRes.error);
    } else {
        athletes = athletesRes.data || [];
        populateAthletesChecklist();
    }

    if (pointsRes.error) {
        console.error("خطأ في جلب نقاط المسابقة:", pointsRes.error);
    } else {
        competitionPoints = pointsRes.data || [];
    }

    calculateAndRenderRankings();
}

function populateAthletesChecklist() {
    // تصفية الرياضيين النشطين فقط لعرضهم في قائمة الاختيار
    const activeAthletes = athletes.filter(a => !a.isArchived);

    athletesChecklist.innerHTML = activeAthletes.map(a => `
        <label class="athlete-checkbox-item flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-slate-50 transition" data-name="${a.firstName.toLowerCase()} ${a.lastName.toLowerCase()}">
            <input type="checkbox" value="${a.id}" class="athlete-cb w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500">
            <span class="font-bold text-slate-700">${a.firstName} ${a.lastName}</span>
        </label>
    `).join('');

    // ربط حدث البحث والتحديد
    athleteSearchInput.addEventListener('input', filterAthletes);
    athletesChecklist.addEventListener('change', updateSelectedCount);
}

pointsForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const [pointsValue, reasonText] = document.getElementById('pointReason').value.split('|');
    const selectedCheckboxes = document.querySelectorAll('.athlete-cb:checked');

    if (selectedCheckboxes.length === 0) {
        alert('الرجاء تحديد رياضي واحد على الأقل.');
        return;
    }

    const newPoints = Array.from(selectedCheckboxes).map(cb => {
        return {
            athlete_id: cb.value,
            date: document.getElementById('pointDate').value,
            points: parseFloat(pointsValue),
            reason: reasonText,
            notes: document.getElementById('pointNotes').value.trim()
        };
    });

    const { data, error } = await _supabase.from('samurai_competition').insert(newPoints).select();

    if (error) {
        alert('حدث خطأ أثناء حفظ التقييمات: ' + error.message);
        console.error(error);
    } else {
        alert(`تم حفظ التقييم لـ ${data.length} رياضيين بنجاح!`);
        competitionPoints.push(...data);
        pointsForm.reset();
        pointDateInput.value = formatDate(new Date());
        selectedCheckboxes.forEach(cb => cb.checked = false);
        updateSelectedCount();
        calculateAndRenderRankings(); // تحديث الترتيب مباشرة
    }
});

function calculateAndRenderRankings() {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (!startDate || !endDate) {
        rankingsList.innerHTML = `<div class="text-center py-10 text-slate-500">الرجاء تحديد فترة زمنية لعرض الترتيب.</div>`;
        return;
    }

    const pointsInPeriod = competitionPoints.filter(p => p.date >= startDate && p.date <= endDate);

    const scores = {};
    // استخدام جميع الرياضيين في الحساب
    const allAthletesForRanking = athletes; 
    allAthletesForRanking.forEach(a => {
        scores[a.id] = {
            ...a,
            totalPoints: 0,
            pointsData: []
        };
    });

    pointsInPeriod.forEach(p => {
        if (scores[p.athlete_id]) {
            scores[p.athlete_id].totalPoints += parseFloat(p.points);
            scores[p.athlete_id].pointsData.push(p);
        }
    });

    // تصفية الرياضيين النشطين فقط للعرض
    const rankedAthletes = Object.values(scores)
        .filter(a => !a.isArchived)
        .sort((a, b) => b.totalPoints - a.totalPoints);

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
            <div class="flex items-center justify-between p-4 bg-white border ${rank <= 3 ? 'border-blue-200 bg-blue-50/50' : 'border-slate-100'} rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer" onclick="showAthleteDetails(${athlete.id})">
                <div class="flex items-center gap-4">
                    <span class="text-xl font-black text-slate-400 w-8 text-center">${rank}</span>
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(athlete.firstName)}+${encodeURIComponent(athlete.lastName)}&background=10b981&color=fff&rounded=true&font-size=0.4" class="w-12 h-12 rounded-full shadow-sm border-2 border-white" alt="Avatar">
                    <div>
                        <p class="font-bold text-slate-800 text-lg">${athlete.firstName} ${athlete.lastName}</p>
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

function showAthleteDetails(athleteId) {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    const athlete = athletes.find(a => a.id === athleteId);
    const athletePoints = competitionPoints.filter(p => p.athlete_id === athleteId && p.date >= startDate && p.date <= endDate);

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

function closeDetailsModal() {
    document.getElementById('detailsModal').style.display = 'none';
}

function exportToExcel() {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (!startDate || !endDate) {
        alert("الرجاء تحديد فترة زمنية أولاً لتصدير الترتيب.");
        return;
    }

    const pointsInPeriod = competitionPoints.filter(p => p.date >= startDate && p.date <= endDate);
    const scores = {};
    athletes.forEach(a => {
        scores[a.id] = { ...a, totalPoints: 0 };
    });
    pointsInPeriod.forEach(p => {
        if (scores[p.athlete_id]) {
            scores[p.athlete_id].totalPoints += parseFloat(p.points);
        }
    });
    const rankedAthletes = Object.values(scores).sort((a, b) => b.totalPoints - a.totalPoints);

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

function printRankings() {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (!startDate || !endDate) {
        alert("الرجاء تحديد فترة زمنية أولاً لعرض الترتيب ثم طباعته.");
        return;
    }

    const pointsInPeriod = competitionPoints.filter(p => p.date >= startDate && p.date <= endDate);
    const scores = {};
    athletes.forEach(a => {
        scores[a.id] = { ...a, totalPoints: 0 };
    });
    pointsInPeriod.forEach(p => {
        if (scores[p.athlete_id]) {
            scores[p.athlete_id].totalPoints += parseFloat(p.points);
        }
    });
    const rankedAthletes = Object.values(scores).sort((a, b) => b.totalPoints - a.totalPoints);

    const titles = [
        { name: 'الساموراي الصغير', icon: '🏆' },
        { name: 'قلب الأسد', icon: '🥈' },
        { name: 'الفتى الذهبي', icon: '🥉' }
    ];

    const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    const periodMonth = monthNames[new Date(startDate).getMonth()];
    const periodYear = new Date(startDate).getFullYear();
    const reportTitle = `ترتيب مسابقة الساموراي الصغير - ${periodMonth} ${periodYear}`;

    let tableRows = rankedAthletes.map((athlete, index) => {
        const rank = index + 1;
        let titleHtml = '';
        if (rank <= 3 && athlete.totalPoints > 0) {
            const title = titles[rank - 1];
            titleHtml = `<div style="font-size: 1.5em; font-weight: 900; color: #1e3a8a;">${title.icon} ${title.name}</div>`;
        }

        return `
            <tr style="${rank <= 3 ? 'background-color: #eff6ff; border-left: 5px solid #2563eb;' : ''}">
                <td style="padding: 12px; text-align: center; font-size: 1.5em; font-weight: 900;">${rank}</td>
                <td style="padding: 12px;">
                    <div style="font-size: 1.2em; font-weight: 700; color: #1e293b;">${athlete.firstName} ${athlete.lastName}</div>
                    ${titleHtml}
                </td>
                <td style="padding: 12px; text-align: center; font-size: 1.8em; font-weight: 900; color: ${athlete.totalPoints > 0 ? '#166534' : (athlete.totalPoints < 0 ? '#991b1b' : '#475569')};">
                    ${athlete.totalPoints.toFixed(1)}
                </td>
            </tr>
        `;
    }).join('');

    const printHtml = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>${reportTitle}</title>
            <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Tajawal', sans-serif; margin: 20px; color: #333; }
                .header { text-align: center; border-bottom: 3px double #333; padding-bottom: 15px; margin-bottom: 25px; }
                .header h1 { font-size: 24pt; margin: 0; color: #1e3a8a; }
                .header p { font-size: 12pt; color: #666; margin-top: 5px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 10px; }
                thead { background-color: #f2f2f2; font-size: 14pt; }
                tbody tr:nth-child(even) { background-color: #f9f9f9; }
                @media print {
                    @page { size: A4; margin: 1cm; }
                    body { margin: 0; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🥋 قاعة KARATE</h1>
                <p>${reportTitle}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 10%;">المرتبة</th>
                        <th>الرياضي واللقب</th>
                        <th style="width: 20%;">مجموع النقاط</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printHtml);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
}

/**
 * يقوم بمزامنة سجلات الحضور من جدول `athletes` إلى جدول `samurai_competition`.
 * يعالج البيانات على دفعات لتجنب تجميد الواجهة ويظهر شريط تقدم.
 */
async function runAttendanceSync() {
    if (!confirm("سيقوم هذا الإجراء بالبحث عن جميع حصص الحضور القديمة التي لم يتم احتساب نقاطها في المسابقة وإضافتها. هل تريد المتابعة؟")) {
        return;
    }

    // إظهار واجهة التقدم وإخفاء قائمة الترتيب
    const rankingContainer = document.getElementById('rankingContainer');
    const progressContainer = document.getElementById('syncProgressContainer');
    const progressCountEl = document.getElementById('syncProgressCount');
    const totalCountEl = document.getElementById('syncTotalCount');
    const progressBarEl = document.getElementById('syncProgressBar');

    rankingContainer.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    progressCountEl.innerText = '0';
    progressBarEl.style.width = '0%';

    try {
        // 1. جلب جميع البيانات الأولية المطلوبة
        const [athletesRes, competitionPointsRes] = await Promise.all([
            _supabase.from('athletes').select('id, attendanceDates'),
            _supabase.from('samurai_competition').select('athlete_id, date, reason').eq('reason', 'حضور الحصة')
        ]);

        if (athletesRes.error || competitionPointsRes.error) {
            throw new Error(`فشل في جلب البيانات الأولية: ${athletesRes.error?.message || competitionPointsRes.error?.message}`);
        }

        const allAthletes = athletesRes.data || [];
        const existingPoints = competitionPointsRes.data || [];
        totalCountEl.innerText = allAthletes.length;

        // 2. إنشاء مجموعة (Set) من النقاط الموجودة لتسريع البحث
        const existingPointsSet = new Set();
        for (const p of existingPoints) {
            if (p.athlete_id && p.date) existingPointsSet.add(`${p.athlete_id}-${p.date}`);
        }

        // 3. تحديد النقاط الناقصة فقط
        const missingPointsToInsert = [];
        for (const athlete of allAthletes) {
            if (athlete.attendanceDates && Array.isArray(athlete.attendanceDates)) {
                for (const date of athlete.attendanceDates) {
                    if (date && typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        const pointKey = `${athlete.id}-${date}`;
                        if (!existingPointsSet.has(pointKey)) {
                            missingPointsToInsert.push({
                                athlete_id: athlete.id,
                                date: date,
                                points: 0.5,
                                reason: 'حضور الحصة',
                                notes: 'مزامنة تلقائية'
                            });
                        }
                    }
                }
            }
        }

        if (missingPointsToInsert.length === 0) {
            alert("✅ النظام محدّث بالفعل! لا توجد نقاط حضور ناقصة لمزامنتها.");
            rankingContainer.classList.remove('hidden');
            progressContainer.classList.add('hidden');
            return;
        }

        // 4. إرسال النقاط الناقصة على دفعات
        const BATCH_SIZE = 500;
        for (let i = 0; i < missingPointsToInsert.length; i += BATCH_SIZE) {
            const batch = missingPointsToInsert.slice(i, i + BATCH_SIZE);
            const { error: insertError } = await _supabase.from('samurai_competition').insert(batch);

            if (insertError) throw new Error(`فشل في إضافة دفعة من النقاط: ${insertError.message}`);
            
            // تحديث شريط التقدم
            const processedCount = Math.min(i + BATCH_SIZE, missingPointsToInsert.length);
            progressCountEl.innerText = processedCount;
            progressBarEl.style.width = `${(processedCount / missingPointsToInsert.length) * 100}%`;
        }

        alert(`🎉 تمت المزامنة بنجاح! تم إضافة ${missingPointsToInsert.length} نقطة حضور جديدة.`);
        await fetchData(); // إعادة تحميل كل البيانات لعرض الترتيب المحدث

    } catch (err) {
        console.error("❌ حدث خطأ فادح أثناء المزامنة:", err);
        alert("حدث خطأ أثناء المزامنة. يرجى مراجعة الـ console لمزيد من التفاصيل أو إعادة المحاولة.");
    } finally {
        // إخفاء واجهة التقدم وإظهار قائمة الترتيب مجدداً
        rankingContainer.classList.remove('hidden');
        progressContainer.classList.add('hidden');
    }
}

// دوال خاصة بقائمة اختيار الرياضيين
function filterAthletes() {
    const term = athleteSearchInput.value.toLowerCase();
    document.querySelectorAll('.athlete-checkbox-item').forEach(item => {
        const name = item.getAttribute('data-name');
        item.style.display = name.includes(term) ? 'flex' : 'none';
    });
}

function updateSelectedCount() {
    const count = document.querySelectorAll('.athlete-cb:checked').length;
    selectedAthletesCount.innerText = `المحدد: ${count}`;
}



// ===== دوال عامة =====

function toggleMobileMenu() {
    const menu = document.getElementById("mobileMenu");
    menu.classList.toggle("hidden");
    menu.classList.toggle("flex");
    document.body.classList.toggle("overflow-hidden");
}

function applyTheme() {
    const theme = localStorage.getItem('theme') || 'system';
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    fetchData();

    // إغلاق النافذة عند النقر خارجها
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('detailsModal');
        if (event.target === modal) {
            closeDetailsModal();
        }
    });

    // تطبيق الوضع الليلي عند تغييره من النظام
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if ((localStorage.getItem('theme') || 'system') === 'system') applyTheme();
    });

    // إخفاء وإظهار القائمة العلوية عند التمرير
    let lastScrollTop = 0;
    window.addEventListener('scroll', function() {
        const header = document.querySelector('.header-wrapper');
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        if (scrollTop > lastScrollTop && scrollTop > 80) {
            header.classList.add('header-hidden');
        } else {
            header.classList.remove('header-hidden');
        }
        lastScrollTop = scrollTop;
    });
});