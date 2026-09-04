// جلب البيانات من Supabase
let athletes = [];
const attendanceList = document.getElementById('attendanceList');
const sessionDateInput = document.getElementById('sessionDate');
const attendanceForm = document.getElementById('attendanceForm');
let qrScanner = null;
let qrScannerRunning = false;
let lastQrValue = '';
let lastQrScanTime = 0;
let qrScanInProgress = false;
let qrScanResultTimeout = null;

async function fetchAthletes() {
    const [athletesRes, paymentsRes] = await Promise.all([
        _supabase.from('athletes').select('*'),
        _supabase.from('payments').select('*')
    ]);
    if (athletesRes.error) {
        console.error("خطأ في جلب بيانات الرياضيين:", athletesRes.error);
    } else {
        const allAthletes = athletesRes.data || [];
        const allPayments = paymentsRes.data || [];
        
        allAthletes.forEach(a => {
            const subPayments = allPayments.filter(p => p.athlete_id === a.id && (!p.type || p.type === 'subscription'));
            const totalPaid = subPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
            a.sessionsLimit = (totalPaid / 1000) * 12;
        });

        athletes = allAthletes.filter(a => !a.isArchived); // إخفاء الرياضيين في الأرشيف
        renderAttendanceTable();
    }
}

function setQrStatus(message, isError = false) {
    const status = document.getElementById('qrScanStatus');
    if (status) {
        status.textContent = message;
        status.className = `text-center text-sm font-bold mt-3 ${isError ? 'text-red-700' : 'text-indigo-800'}`;
    }
}

function showQrScanResult(isSuccess, athleteName, message, resultType = 'error') {
    const result = document.getElementById('qrScanResult');
    const icon = document.getElementById('qrScanResultIcon');
    const name = document.getElementById('qrScanResultName');
    const resultMessage = document.getElementById('qrScanResultMessage');
    if (!result || !icon || !name || !resultMessage) return;

    const isAlreadyRegistered = resultType === 'already-registered';
    const resultColors = isSuccess
        ? ['border-emerald-200', 'bg-emerald-50', 'text-emerald-600', 'text-emerald-800', 'text-emerald-700']
        : isAlreadyRegistered
            ? ['border-amber-300', 'bg-amber-50', 'text-amber-500', 'text-amber-900', 'text-amber-800']
            : ['border-red-200', 'bg-red-50', 'text-red-600', 'text-red-800', 'text-red-700'];
    result.className = `mt-3 rounded-2xl border-2 p-4 text-center ${resultColors.join(' ')}`;
    icon.textContent = isSuccess ? '✓' : isAlreadyRegistered ? '!' : '✕';
    icon.className = `text-5xl leading-none ${resultColors[2]}`;
    name.textContent = athleteName || 'رياضي غير معروف';
    name.className = `mt-2 text-xl font-black ${resultColors[3]}`;
    resultMessage.textContent = message;
    resultMessage.className = `mt-1 text-sm font-bold ${resultColors[4]}`;
    result.classList.remove('hidden');
    clearTimeout(qrScanResultTimeout);
    qrScanResultTimeout = setTimeout(() => {
        result.classList.add('hidden');
    }, 5000);
}

async function markQrAttendance(rawValue) {
    const scannedValue = String(rawValue || '').trim();
    let athleteId = scannedValue.replace(/^karate-athlete:/i, '').trim();

    try {
        const parsedUrl = new URL(scannedValue);
        athleteId = parsedUrl.searchParams.get('athlete') || parsedUrl.searchParams.get('id') || athleteId;
    } catch (_) {
        // المحتوى ليس رابطًا، لذلك نتابع بالصيغة النصية العادية.
    }

    try {
        const parsedJson = JSON.parse(athleteId);
        athleteId = String(parsedJson.id || parsedJson.athlete_id || athleteId);
    } catch (_) {
        // المحتوى ليس JSON، لذلك نستخدم المعرف كما هو.
    }

    athleteId = String(athleteId).trim();
    const sessionDate = sessionDateInput.value;
    let athlete = athletes.find(item => String(item.id) === athleteId);

    if (!athlete && athleteId) {
        const { data, error } = await _supabase.from('athletes').select('*').eq('id', athleteId).maybeSingle();
        if (!error && data) athlete = data;
    }

    if (!athlete) {
        setQrStatus(`لم يتم العثور على الرياضي. القيمة المقروءة: ${scannedValue}`, true);
        showQrScanResult(false, '', 'لم يتم العثور على الرياضي');
        return false;
    }
    const athleteName = `${athlete.firstName} ${athlete.lastName}`.trim();
    if (athlete.attendanceDates?.includes(sessionDate)) {
        const message = 'تم تسجيل الحضور اليوم مسبقًا';
        setQrStatus(`${message}: ${athleteName}.`, true);
        showQrScanResult(false, athleteName, message, 'already-registered');
        return false;
    }

    const attendanceDates = Array.isArray(athlete.attendanceDates) ? [...athlete.attendanceDates, sessionDate] : [sessionDate];
    const cardAttendanceDates = Array.isArray(athlete.cardAttendanceDates) ? [...athlete.cardAttendanceDates, sessionDate] : [sessionDate];
    const { error: athleteError } = await _supabase.from('athletes').update({
        attendance: (athlete.attendance || 0) + 1,
        attendanceDates,
        cardAttendanceDates
    }).eq('id', athlete.id);

    if (athleteError) {
        setQrStatus(`تعذر تسجيل الحضور: ${athleteError.message}`, true);
        showQrScanResult(false, athleteName, 'تعذر تسجيل الحضور');
        return false;
    }

    const { data: pointRecord, error: pointError } = await _supabase.from('samurai_competition').insert([{
        athlete_id: athlete.id,
        date: sessionDate,
        points: 1.0,
        reason: 'حضور بالبطاقة QR - الساموراي الصغير',
        notes: `حضور بالبطاقة ليوم ${sessionDate}`
    }]).select().single();
    if (pointError) {
        setQrStatus(`تم الحضور لكن تعذر إضافة نقطة كاملة للمسابقة: ${pointError.message}`, true);
        showQrScanResult(false, athleteName, 'تم الحضور لكن تعذرت إضافة النقطة');
    } else {
        const message = 'تم تسجيل الحضور وإضافة نقطة كاملة';
        setQrStatus(`${message}: ${athleteName}.`, false);
        showQrScanResult(true, athleteName, message);
    }
    await fetchAthletes();
    return Boolean(pointRecord) && !pointError;
}

function playQrSuccessSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = 880;
        gain.gain.setValueAtTime(0.12, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.18);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.18);
    } catch (error) {
        console.warn('تعذر تشغيل صوت تأكيد QR:', error);
    }
}

async function stopQrScanner() {
    if (qrScanner && qrScannerRunning) {
        await qrScanner.stop();
    }
    qrScannerRunning = false;
}

async function closeQrScanner() {
    const panel = document.getElementById('qrScannerPanel');
    const button = document.getElementById('toggleQrScanner');
    try {
        if (qrScanner) await stopQrScanner();
    } catch (error) {
        console.warn('تعذر إيقاف الكاميرا، سيتم إغلاق واجهة الماسح:', error);
    } finally {
        qrScanner = null;
        qrScannerRunning = false;
        panel?.classList.add('hidden');
        document.body.classList.remove('scanner-open');
        if (button) button.textContent = 'فتح الماسح';
    }
}

async function startQrScanner() {
    const cameraFacing = document.getElementById('qrCameraFacing')?.value || 'environment';
    qrScanner = new Html5Qrcode('qrReader');
    await qrScanner.start({ facingMode: cameraFacing }, { fps: 10, qrbox: { width: 220, height: 220 } }, async decodedText => {
        const now = Date.now();
        if (qrScanInProgress || (decodedText === lastQrValue && now - lastQrScanTime < 2500)) return;
        lastQrValue = decodedText;
        lastQrScanTime = now;
        qrScanInProgress = true;
        try {
            const attendanceRegistered = await markQrAttendance(decodedText);
            if (attendanceRegistered) playQrSuccessSound();
        } finally {
            qrScanInProgress = false;
        }
    }, () => {});
    qrScannerRunning = true;
}

async function toggleQrScanner() {
    const panel = document.getElementById('qrScannerPanel');
    const button = document.getElementById('toggleQrScanner');
    if (!panel || !button) return;
    if (qrScannerRunning) {
        await closeQrScanner();
        return;
    }
    if (!window.Html5Qrcode) {
        setQrStatus('تعذر تحميل مكتبة الكاميرا. تحقق من اتصال الإنترنت.', true);
        return;
    }
    panel.classList.remove('hidden');
    document.body.classList.add('scanner-open');
    button.textContent = 'إغلاق الماسح';
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        await audioContext.resume();
        await startQrScanner();
    } catch (error) {
        qrScanner = null;
        panel.classList.add('hidden');
        document.body.classList.remove('scanner-open');
        button.textContent = 'فتح الماسح';
        setQrStatus(`تعذر تشغيل الكاميرا: ${error.message}`, true);
    }
}

async function changeQrCamera() {
    if (!qrScannerRunning) return;
    await stopQrScanner();
    try {
        await startQrScanner();
        setQrStatus('تم تبديل الكاميرا. وجّهها نحو رمز البطاقة.', false);
    } catch (error) {
        setQrStatus(`تعذر تبديل الكاميرا: ${error.message}`, true);
    }
}

async function switchQrCamera() {
    const cameraSelect = document.getElementById('qrCameraFacing');
    if (!cameraSelect) return;
    cameraSelect.value = cameraSelect.value === 'environment' ? 'user' : 'environment';
    await changeQrCamera();
}

document.getElementById('toggleQrScanner')?.addEventListener('click', toggleQrScanner);
document.getElementById('qrCameraFacing')?.addEventListener('change', changeQrCamera);
document.getElementById('closeQrScanner')?.addEventListener('click', closeQrScanner);
document.getElementById('switchQrCamera')?.addEventListener('click', switchQrCamera);

// تعيين تاريخ اليوم كافتراضي للحصة
sessionDateInput.value = new Date().toISOString().split('T')[0];
fetchAthletes();

// تحديث القائمة عند تغيير تاريخ الحصة لمنع التكرار في نفس اليوم
sessionDateInput.addEventListener('change', renderAttendanceTable);

// دالة إلغاء الحضور لتاريخ الحصة المحدد
async function removeAttendanceForDate(id) {
    const sessionDate = sessionDateInput.value;
    const athlete = athletes.find(a => a.id === id);
    
    if (athlete && athlete.attendanceDates && athlete.attendanceDates.includes(sessionDate)) {
        if (confirm(`هل أنت متأكد من إلغاء حضور هذا الرياضي لتاريخ ${sessionDate}؟`)) {
            athlete.attendanceDates = athlete.attendanceDates.filter(d => d !== sessionDate);
            athlete.cardAttendanceDates = Array.isArray(athlete.cardAttendanceDates)
                ? athlete.cardAttendanceDates.filter(d => d !== sessionDate)
                : [];
            if (athlete.attendance > 0) athlete.attendance--;
            
            const { error } = await _supabase.from('athletes').update({
                attendanceDates: athlete.attendanceDates,
                cardAttendanceDates: athlete.cardAttendanceDates,
                attendance: athlete.attendance
            }).eq('id', id);
            
            if (error) console.error(error);
            fetchAthletes();
        }
    }
}

// دالة حذف حصة معينة من سجل الحضور (من النافذة المنبثقة)
async function deleteAttendanceHistory(athleteId, dateStr) {
    const athlete = athletes.find(a => a.id === athleteId);
    if (athlete && athlete.attendanceDates && athlete.attendanceDates.includes(dateStr)) {
        if (confirm(`هل أنت متأكد من حذف الحصة بتاريخ ${dateStr} من سجل هذا الرياضي؟`)) {
            // إزالة التاريخ من المصفوفة وتقليل عدد الحضور
            athlete.attendanceDates = athlete.attendanceDates.filter(d => d !== dateStr);
            athlete.cardAttendanceDates = Array.isArray(athlete.cardAttendanceDates)
                ? athlete.cardAttendanceDates.filter(d => d !== dateStr)
                : [];
            if (athlete.attendance > 0) athlete.attendance--;
            
            // تحديث قاعدة البيانات
            const { error } = await _supabase.from('athletes').update({
                attendanceDates: athlete.attendanceDates,
                cardAttendanceDates: athlete.cardAttendanceDates,
                attendance: athlete.attendance
            }).eq('id', athleteId);
            
            if (error) {
                console.error(error);
                alert("حدث خطأ أثناء الحذف.");
            } else {
                // تحديث الواجهة والنافذة المنبثقة مباشرة
                renderAttendanceTable();
                showAthleteHistory(athleteId);
            }
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
                li.className = 'flex justify-between items-center';
                li.innerHTML = `
                    <div>
                        <span class="font-bold text-slate-700">الحصة ${index + 1}:</span> <span class="text-slate-600 ml-2">${date}</span>
                    </div>
                    <button class="bg-red-100 hover:bg-red-200 text-red-600 p-1.5 rounded-lg transition-colors shadow-sm admin-only" onclick="deleteAttendanceHistory(${athlete.id}, '${date}')" title="حذف الحصة">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                `;
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
    let filteredAthletes = [...athletes];
    const sessionDate = sessionDateInput.value;

    // تحديث عداد حضور اليوم
    const attendedTodayCount = athletes.filter(a => a.attendanceDates && a.attendanceDates.includes(sessionDate)).length;
    const todayAttendanceCountEl = document.getElementById('todayAttendanceCount');
    if (todayAttendanceCountEl) {
        todayAttendanceCountEl.innerText = attendedTodayCount;
    }

    // فلترة الرياضيين الذين لم يكونوا مشتركين بعد في تاريخ الحصة المحدد
    if (sessionDate) {
        filteredAthletes = filteredAthletes.filter(a => 
            !a.subDate || new Date(a.subDate) <= new Date(sessionDate));
    }

    // الترتيب
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        const sortValue = sortSelect.value;
        if (sortValue === 'alpha') {
            filteredAthletes.sort((a, b) => (a.firstName + ' ' + a.lastName).localeCompare(b.firstName + ' ' + b.lastName, 'ar'));
        } else if (sortValue === 'expired') {
            filteredAthletes.sort((a, b) => (b.attendance - (b.sessionsLimit || 0)) - (a.attendance - (a.sessionsLimit || 0)));
        } else if (sortValue === 'attended') {
            filteredAthletes.sort((a, b) => {
                const aAttended = a.attendanceDates && a.attendanceDates.includes(sessionDate) ? 1 : 0;
                const bAttended = b.attendanceDates && b.attendanceDates.includes(sessionDate) ? 1 : 0;
                return bAttended - aAttended;
            });
        } else if (sortValue === 'not_attended') {
            filteredAthletes.sort((a, b) => {
                const aAttended = a.attendanceDates && a.attendanceDates.includes(sessionDate) ? 1 : 0;
                const bAttended = b.attendanceDates && b.attendanceDates.includes(sessionDate) ? 1 : 0;
                return aAttended - bAttended;
            });
        } else if (sortValue === 'subDate') {
            filteredAthletes.sort((a, b) => {
                if (!a.subDate) return 1;
                if (!b.subDate) return -1;
                return new Date(b.subDate) - new Date(a.subDate);
            });
        }
    }
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value.trim() !== '') {
        const searchTerm = searchInput.value.trim().toLowerCase();
        filteredAthletes = filteredAthletes.filter(a => {
            const fullName = `${a.firstName || ''} ${a.lastName || ''}`.toLowerCase();
            const reversedName = `${a.lastName || ''} ${a.firstName || ''}`.toLowerCase();
            const guardianName = (a.guardianName || '').toLowerCase();
            const phone = (a.guardianPhone || '').toLowerCase();
            
            return fullName.includes(searchTerm) || 
                   reversedName.includes(searchTerm) || 
                   guardianName.includes(searchTerm) || 
                   phone.includes(searchTerm);
        });
    }

    if (filteredAthletes.length === 0) {
        const emptyMessage = athletes.length === 0 ? "لا يوجد رياضيين مسجلين حالياً." : "لا توجد نتائج مطابقة للبحث أو الفلتر.";
        attendanceList.innerHTML = `
            <div class="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <img src="https://cdn-icons-png.flaticon.com/512/7486/7486744.png" alt="Empty" class="w-24 h-24 mx-auto mb-4 opacity-60">
                <p class="text-slate-500 text-lg">${emptyMessage}</p>
            </div>
        `;
        document.querySelectorAll('#attendanceForm button').forEach(btn => btn.style.display = 'none');
        return;
    } else {
        document.querySelectorAll('#attendanceForm button').forEach(btn => btn.style.display = '');
    }

    let html = `
        <div class="hidden md:flex justify-between items-center px-4 py-3 bg-slate-50 text-slate-500 text-sm font-semibold rounded-lg mb-3 border border-slate-100">
            <div class="flex-grow">الاسم واللقب</div>
            <div class="w-32 text-center">حالة الاشتراك</div>
            <div class="w-32 text-center admin-only">تأكيد الحضور</div>
        </div>
        <div class="flex flex-col gap-3">
    `;

    filteredAthletes.forEach(athlete => {
        if (!athlete.attendanceDates) athlete.attendanceDates = [];
        const limit = athlete.sessionsLimit || 0;
        const isExpired = athlete.attendance >= limit;
        const remainingSessions = Math.max(0, limit - athlete.attendance);
        const owedSessions = athlete.attendance - limit;
        const owedText = owedSessions > 0 ? `-${owedSessions}` : '0';
        const alreadyAttended = athlete.attendanceDates.includes(sessionDate);
        html += `
            <div class="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white border ${isExpired ? 'border-red-200' : 'border-slate-100'} rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer ${isExpired ? 'bg-red-50/30' : ''}" onclick="toggleAttendanceCheckbox(event, 'checkbox-${athlete.id}')">
                
                <div class="flex items-center mb-4 md:mb-0 flex-grow">
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(athlete.firstName)}+${encodeURIComponent(athlete.lastName)}&background=${isExpired ? 'ef4444' : '10b981'}&color=fff&rounded=true&font-size=0.4" class="w-12 h-12 ml-4 shadow-sm border-2 border-white rounded-full hidden sm:block" alt="Avatar">
                    <div class="flex flex-col">
                        <span class="clickable-name text-lg font-bold text-slate-800 cursor-pointer hover:text-blue-600 transition-colors" onclick="showAthleteHistory(${athlete.id})">${athlete.firstName} ${athlete.lastName}</span>
                        ${isExpired ? '<span class="text-xs text-red-500 font-bold mt-0.5">تجاوز الحد المسموح للحصص</span>' : ''}
                    </div>
                </div>

                <div class="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
                    
                    <!-- حالة الاشتراك -->
                    <div class="text-center w-auto md:w-32 md:border-r border-slate-100 md:pr-4">
                        <span class="text-[10px] text-slate-400 block md:hidden mb-1 font-bold">حالة الاشتراك</span>
                        <div class="inline-flex flex-col items-center">
                            <span class="px-3 py-1 rounded-full text-xs font-black ${isExpired ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}">
                                ${isExpired ? `منتهي (عليه: ${owedText})` : `ساري (متبقي: ${remainingSessions})`}
                            </span>
                            ${alreadyAttended ? '<span class="text-[10px] text-blue-600 font-bold mt-1.5">(تم التسجيل)</span>' : ''}
                        </div>
                    </div>

                    <!-- الحضور -->
                    <div class="flex flex-col items-center justify-center w-auto md:w-32 admin-only">
                        <span class="text-[10px] text-slate-400 block md:hidden mb-1 font-bold">تأكيد الحضور</span>
                        <div class="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                            <input type="checkbox" id="checkbox-${athlete.id}" name="athlete_attendance" value="${athlete.id}" ${alreadyAttended ? 'disabled checked' : ''} class="w-6 h-6 text-emerald-600 bg-white border-gray-300 rounded focus:ring-emerald-500 focus:ring-2 cursor-pointer shadow-sm">
                            ${alreadyAttended ? `<button type="button" class="bg-slate-400 hover:bg-rose-500 text-white font-bold py-1 px-2.5 rounded transition text-xs" onclick="removeAttendanceForDate(${athlete.id})" title="إلغاء الحضور">إلغاء</button>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div>`;
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
                Promise.all([
                    _supabase.from('athletes').update({
                        attendance: athlete.attendance,
                        attendanceDates: athlete.attendanceDates
                    }).eq('id', id),
                    _supabase.from('samurai_competition').insert([{
                        athlete_id: id,
                        date: sessionDate,
                        points: 0.5,
                        reason: 'حضور يدوي - الساموراي الصغير',
                        notes: `حضور يدوي ليوم ${sessionDate}`
                    }])
                ])
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

// دالة لتحديد مربع الحضور عند الضغط على البطاقة ككل
function toggleAttendanceCheckbox(event, checkboxId) {
    if (localStorage.getItem('karate_role') === 'athlete') return;
    // تجاهل الضغط إذا كان على زر الإلغاء، أو اسم الرياضي، أو المربع نفسه (لتجنب التحديد المزدوج)
    if (event.target.closest('button') || event.target.closest('.clickable-name') || event.target.tagName === 'INPUT') {
        return;
    }
    const checkbox = document.getElementById(checkboxId);
    if (checkbox && !checkbox.disabled) {
        checkbox.checked = !checkbox.checked;
    }
}

// دالة لتحديد / إلغاء تحديد الكل
function toggleAllCheckboxes() {
    const checkboxes = document.querySelectorAll('input[name="athlete_attendance"]:not(:disabled)');
    const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !allChecked);
}

// إغلاق النافذة عند النقر خارجها
window.addEventListener('click', function(event) {
    const modal = document.getElementById('historyModal');
    if (event.target === modal) {
        modal.style.display = "none";
    }
});

// عرض الجدول عند التحميل