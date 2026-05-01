// جلب البيانات من Supabase
let athletes = [];
const attendanceList = document.getElementById('attendanceList');
const sessionDateInput = document.getElementById('sessionDate');
const attendanceForm = document.getElementById('attendanceForm');

async function fetchAthletes() {
    const { data, error } = await _supabase.from('athletes').select('*');
    if (error) {
        console.error("خطأ في جلب بيانات الرياضيين:", error);
    } else {
        athletes = data || [];
        renderAttendanceTable();
    }
}

// تعيين تاريخ اليوم كافتراضي للحصة
sessionDateInput.value = new Date().toISOString().split('T')[0];

// تحديث القائمة عند تغيير تاريخ الحصة لمنع التكرار في نفس اليوم
sessionDateInput.addEventListener('change', renderAttendanceTable);

// دالة إلغاء الحضور لتاريخ الحصة المحدد
async function removeAttendanceForDate(id) {
    const sessionDate = sessionDateInput.value;
    const athlete = athletes.find(a => a.id === id);
    
    if (athlete && athlete.attendanceDates && athlete.attendanceDates.includes(sessionDate)) {
        if (confirm(`هل أنت متأكد من إلغاء حضور هذا الرياضي لتاريخ ${sessionDate}؟`)) {
            athlete.attendanceDates = athlete.attendanceDates.filter(d => d !== sessionDate);
            if (athlete.attendance > 0) athlete.attendance--;
            
            const { error } = await _supabase.from('athletes').update({
                attendanceDates: athlete.attendanceDates,
                attendance: athlete.attendance
            }).eq('id', id);
            
            if (error) console.error(error);
            fetchAthletes();
        }
    }
}

// دالة إظهار النافذة المنبثقة بسجل حضور اللاعب
function showAthleteHistory(id) {
    const athlete = athletes.find(a => a.id === id);
    if (athlete) {
        document.getElementById('modalAthleteName').innerHTML = `📅 سجل حضور: <span class="text-emerald-600 ml-1">${athlete.firstName} ${athlete.lastName}</span>`;
        const list = document.getElementById('modalAttendanceList');
        list.innerHTML = '';
        list.classList.add('history-list');
        if (athlete.attendanceDates && athlete.attendanceDates.length > 0) {
            athlete.attendanceDates.forEach((date, index) => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="font-bold text-slate-700">الحصة ${index + 1}:</span> <span class="text-slate-600 ml-2">${date}</span>`;
                list.appendChild(li);
            });
        } else {
            list.innerHTML = '<li class="text-center text-slate-500">لم يحضر أي حصة بعد في هذا الاشتراك.</li>';
        }
        document.getElementById('historyModal').style.display = 'block';
    }
}

// دالة إغلاق النافذة المنبثقة
function closeModal() {
    document.getElementById('historyModal').style.display = 'none';
}

// دالة عرض قائمة الرياضيين لاختيار الحضور
function renderAttendanceTable() {
    if (athletes.length === 0) {
        attendanceList.innerHTML = `
            <div class="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <img src="https://cdn-icons-png.flaticon.com/512/7486/7486744.png" alt="Empty" class="w-24 h-24 mx-auto mb-4 opacity-60">
                <p class="text-slate-500 text-lg">لا يوجد رياضيين مسجلين حالياً.</p>
            </div>
        `;
        document.querySelector('#attendanceForm button').style.display = 'none';
        return;
    }

    const sessionDate = sessionDateInput.value;

    let html = `
        <table class="w-full text-right border-collapse bg-white rounded-lg overflow-hidden">
            <thead class="bg-slate-100 text-slate-600 border-b-2 border-slate-200">
                <tr>
                    <th class="p-4 font-semibold">الاسم واللقب</th>
                    <th class="p-4 font-semibold text-center">حالة الاشتراك</th>
                    <th class="p-4 font-semibold text-center">حاضر؟</th>
                </tr>
            </thead>
            <tbody>
    `;

    athletes.forEach(athlete => {
        if (!athlete.attendanceDates) athlete.attendanceDates = [];
        const limit = athlete.sessionsLimit || 12;
        const isExpired = athlete.attendance >= limit;
        const alreadyAttended = athlete.attendanceDates.includes(sessionDate);
        html += `
            <tr class="border-b border-slate-100 hover:bg-slate-50 transition duration-200 ${isExpired ? 'expired-row' : ''}">
                <td class="p-4 align-middle" data-label="الاسم واللقب">
                    <div class="flex items-center">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(athlete.firstName)}+${encodeURIComponent(athlete.lastName)}&background=10b981&color=fff&rounded=true&font-size=0.4" class="w-10 h-10 ml-3 shadow-sm border border-slate-200 rounded-full hidden sm:block" alt="Avatar">
                        <span class="clickable-name text-lg" onclick="showAthleteHistory(${athlete.id})">${athlete.firstName} ${athlete.lastName}</span>
                    </div>
                </td>
                <td class="p-4 align-middle text-center" data-label="حالة الاشتراك">
                    <span class="px-3 py-1 rounded-full text-sm font-bold ${isExpired ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}">${isExpired ? 'منتهي' : 'ساري'} (${athlete.attendance} / ${limit})</span>
                    ${alreadyAttended ? '<br><small class="text-blue-600 font-bold">(تم تسجيل حضوره)</small>' : ''}
                </td>
                <td class="p-4 align-middle checkbox-cell actions-cell text-center" data-label="حاضر؟">
                    <input type="checkbox" name="athlete_attendance" value="${athlete.id}" ${alreadyAttended ? 'disabled' : ''} ${alreadyAttended ? 'checked' : ''} class="w-6 h-6 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer align-middle mr-2">
                    ${alreadyAttended ? `<button type="button" class="bg-slate-400 hover:bg-slate-500 text-white font-semibold py-1 px-3 rounded shadow-sm transition mr-3 text-sm" onclick="removeAttendanceForDate(${athlete.id})">إلغاء</button>` : ''}
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    attendanceList.innerHTML = html;
}

// معالجة إرسال نموذج الحضور الجماعي
attendanceForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const checkboxes = document.querySelectorAll('input[name="athlete_attendance"]:checked');
    const sessionDate = sessionDateInput.value;
    let updatedCount = 0;
    const updatePromises = [];

    checkboxes.forEach(cb => {
        const id = parseInt(cb.value);
        const athlete = athletes.find(a => a.id === id);
        if (!athlete.attendanceDates) athlete.attendanceDates = [];

        if (athlete && !athlete.attendanceDates.includes(sessionDate)) {
            athlete.attendance++;
            athlete.attendanceDates.push(sessionDate);
            updatedCount++;
            
            updatePromises.push(
                _supabase.from('athletes').update({
                    attendance: athlete.attendance,
                    attendanceDates: athlete.attendanceDates
                }).eq('id', id)
            );
        }
    });

    if (updatedCount > 0) {
        await Promise.all(updatePromises); // تنفيذ جميع التحديثات دفعة واحدة
        alert(`تم تسجيل حضور ${updatedCount} رياضيين بنجاح في تاريخ ${sessionDateInput.value}.`);
        
        // إلغاء تحديد المربعات وتحديث الجدول
        checkboxes.forEach(cb => cb.checked = false);
        fetchAthletes();
    } else {
        alert('لم يتم تحديد أي رياضي لتسجيل حضوره.');
    }
});

// إغلاق النافذة عند النقر خارجها
window.onclick = function(event) {
    const modal = document.getElementById('historyModal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// عرض الجدول عند التحميل
fetchAthletes();

// دالة إظهار القائمة المنسدلة للهواتف
function toggleMobileMenu() {
    const menu = document.getElementById("mobileMenu");
    menu.classList.toggle("hidden");
    menu.classList.toggle("flex");
}

// تطبيق الوضع الليلي عند التحميل
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

// إخفاء وإظهار القائمة العلوية عند التمرير (Scroll)
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