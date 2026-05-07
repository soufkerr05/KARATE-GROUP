// جلب البيانات من Supabase
let athletes = [];
const paymentForm = document.getElementById('paymentForm');
const athleteSelect = document.getElementById('athleteSelect');
const payDateInput = document.getElementById('payDate');
const paymentsList = document.getElementById('paymentsList');

async function fetchAthletes() {
    const [athletesRes, paymentsRes] = await Promise.all([
        _supabase.from('athletes').select('*'),
        _supabase.from('payments').select('*')
    ]);

    if (athletesRes.error) {
        console.error("خطأ في جلب بيانات الرياضيين:", athletesRes.error);
    } else {
        const allAthletes = athletesRes.data || [];
        athletes = allAthletes.filter(a => !a.isArchived); // إخفاء الرياضيين في الأرشيف
        const allPayments = paymentsRes.data || [];
        
        // دمج المدفوعات مع الرياضيين للعرض
        athletes.forEach(a => {
            a.payments = allPayments.filter(p => p.athlete_id === a.id);
        });

        renderSelect();
        renderPaymentsTable();
    }
}

// تعيين تاريخ اليوم افتراضياً
payDateInput.value = new Date().toISOString().split('T')[0];

// إظهار وإخفاء حقول الدفع الإضافية
const checkUniform = document.getElementById('checkUniform');
const uniformAmountContainer = document.getElementById('uniformAmountContainer');
if (checkUniform && uniformAmountContainer) {
    checkUniform.addEventListener('change', function() {
        if (this.checked) {
            uniformAmountContainer.classList.remove('hidden');
        } else {
            uniformAmountContainer.classList.add('hidden');
            document.getElementById('uniformAmount').value = 0;
        }
    });
}

const checkInsurance = document.getElementById('checkInsurance');
const insuranceAmountContainer = document.getElementById('insuranceAmountContainer');
if (checkInsurance && insuranceAmountContainer) {
    checkInsurance.addEventListener('change', function() {
        if (this.checked) {
            insuranceAmountContainer.classList.remove('hidden');
            document.getElementById('insuranceAmount').value = 500;
        } else {
            insuranceAmountContainer.classList.add('hidden');
            document.getElementById('insuranceAmount').value = 0;
        }
    });
}

// دالة لتعبئة قائمة اختيار الرياضيين
function renderSelect() {
    athleteSelect.innerHTML = '<option value="">-- اختر الولي / الرياضي --</option>';
    
    // تجميع الرياضيين حسب الولي لتجنب الحلقات المتداخلة (O(N) بدلاً من O(N^2))
    const groupedAthletes = new Map();
    athletes.forEach(a => {
        const key = (a.guardianName && a.guardianName.trim() !== '') ? a.guardianName.trim() : a.id;
        if (!groupedAthletes.has(key)) { groupedAthletes.set(key, []); }
        groupedAthletes.get(key).push(a);
    });

    const fragment = document.createDocumentFragment();
    groupedAthletes.forEach((siblings, key) => {
        if (siblings.length > 0) {
            const a = siblings[0];
            const limit = a.sessionsLimit || 12;
            const remaining = limit - a.attendance;
            const athleteNames = siblings.map(x => x.firstName).join(' و ');
            
            const opt = document.createElement('option');
            opt.value = a.id;
            opt.textContent = typeof key === 'string' ? `${key} (عن: ${athleteNames}) | متبقي: ${remaining} حصة للواحد` : `${a.firstName} ${a.lastName} | متبقي: ${remaining} حصة`;
            fragment.appendChild(opt);
        }
    });
    athleteSelect.appendChild(fragment);
}

// عرض قائمة المدفوعات أسفل النموذج
function renderPaymentsTable() {
    if (athletes.length === 0) {
        paymentsList.innerHTML = `
            <div class="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <img src="https://cdn-icons-png.flaticon.com/512/7486/7486744.png" alt="Empty" class="w-24 h-24 mx-auto mb-4 opacity-60">
                <p class="text-slate-500 text-lg">لا يوجد رياضيين مسجلين حالياً.</p>
            </div>
        `;
        return;
    }
    let html = `<table class="w-full text-right border-collapse bg-white rounded-lg overflow-hidden">
                <thead class="bg-slate-100 text-slate-600 border-b-2 border-slate-200">
                    <tr><th class="p-4 font-semibold">اسم الولي (اضغط لعرض السجل)</th></tr>
                </thead>
                <tbody>`;

    const groupedAthletes = new Map();
    athletes.forEach(a => {
        const key = (a.guardianName && a.guardianName.trim() !== '') ? a.guardianName.trim() : a.id;
        if (!groupedAthletes.has(key)) { groupedAthletes.set(key, []); }
        groupedAthletes.get(key).push(a);
    });

    let rowsHtml = '';
    groupedAthletes.forEach((siblings, key) => {
        if (siblings.length > 0) {
            const a = siblings[0];
            const athleteNames = siblings.map(x => x.firstName).join(' و ');
            const displayName = typeof key === 'string' ? `${key} (عن: ${athleteNames})` : `${a.firstName} ${a.lastName}`;
            const avatarName = typeof key === 'string' ? key : a.firstName;
            rowsHtml += `<tr class="border-b border-slate-100 hover:bg-slate-50 transition duration-200">
                        <td class="p-4" data-label="اسم الولي">
                            <div class="flex items-center">
                                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(avatarName.split(' ')[0])}&background=f59e0b&color=fff&rounded=true&font-size=0.4" class="w-10 h-10 ml-3 shadow-sm border border-slate-200 rounded-full hidden sm:block" alt="Avatar">
                                <span class="clickable-name text-lg" onclick="showAthletePayments(${a.id})">${displayName}</span>
                            </div>
                        </td>
                     </tr>`;
        }
    });
    html += rowsHtml + `</tbody></table>`;
    paymentsList.innerHTML = html;
}

// دالة إظهار النافذة المنبثقة لسجل المدفوعات
function showAthletePayments(id) {
    const selectedAthlete = athletes.find(a => a.id === id);
    if (selectedAthlete) {
        let targetAthletes = [selectedAthlete];
        if (selectedAthlete.guardianName && selectedAthlete.guardianName.trim() !== '') {
            targetAthletes = athletes.filter(a => a.guardianName === selectedAthlete.guardianName);
        }
        const athleteNames = targetAthletes.map(x => x.firstName).join(' و ');
        const displayName = selectedAthlete.guardianName ? `${selectedAthlete.guardianName} (عن: ${athleteNames})` : `${selectedAthlete.firstName} ${selectedAthlete.lastName}`;

        document.getElementById('modalAthleteNamePayments').innerHTML = `💰 سجل مدفوعات: <span class="text-amber-600 ml-1">${displayName}</span>`;
        const list = document.getElementById('modalPaymentsList');
        if (selectedAthlete.payments && selectedAthlete.payments.length > 0) {
            const typeNames = {
                'subscription': 'اشتراك شهري',
                'uniform': 'بدلة رياضية',
                'insurance': 'تأمين رياضي'
            };
            list.innerHTML = `<ul class="history-list">` + selectedAthlete.payments.map((p, index) => {
                const totalAmount = parseFloat(p.amount) * targetAthletes.length;
                const pType = p.type || 'subscription';
                const typeLabel = `<span class="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-xs mr-2 font-bold">${typeNames[pType]}</span>`;
                return `<li class="flex justify-between items-center">${p.date}: دفع <strong class="text-amber-600 mr-2">${totalAmount}</strong> ${typeLabel}
                <button type="button" class="bg-rose-100 hover:bg-rose-200 text-rose-600 font-semibold py-1 px-3 rounded shadow-sm transition text-sm float-left" onclick="removePayment(${selectedAthlete.id}, ${p.id})">إلغاء</button>
                <div style="clear: both;"></div></li>`
            }).join('') + `</ul>`;
        } else {
            list.innerHTML = '<p style="color:#aaa; text-align: center; padding: 10px;">لا يوجد مدفوعات مسجلة.</p>';
        }
        document.getElementById('paymentsModal').style.display = 'block';
    }
}

// دالة إغلاق نافذة المدفوعات
function closePaymentsModal() {
    document.getElementById('paymentsModal').style.display = 'none';
}

// دالة إلغاء الدفع في حال الخطأ
async function removePayment(athleteId, paymentId) {
    const selectedAthlete = athletes.find(a => a.id === athleteId);
    if (!selectedAthlete || !selectedAthlete.payments) return;
    const payment = selectedAthlete.payments.find(p => p.id === paymentId);
    if (!payment) return;

        let targetAthletes = [selectedAthlete];
        if (selectedAthlete.guardianName && selectedAthlete.guardianName.trim() !== '') {
            targetAthletes = athletes.filter(a => a.guardianName === selectedAthlete.guardianName);
        }

        const pType = payment.type || 'subscription';
        const splitAmount = parseFloat(payment.amount);
        const sessionsToDeduct = (splitAmount / 1000) * 12;

        let confirmMsg = `هل أنت متأكد من إلغاء هذا الدفع؟`;
        if (pType === 'subscription') confirmMsg += ` سيتم خصم ${sessionsToDeduct} حصة من رصيد كل رياضي مرتبط.`;

        if (confirm(confirmMsg)) {
        const paymentIdsToDelete = [];
        const updatePromises = [];
        
            targetAthletes.forEach(athlete => {
                if (athlete.payments) {
                    const matchingPayment = athlete.payments.find(p => p.date === payment.date && p.type === pType && parseFloat(p.amount) === splitAmount);
                    if (matchingPayment) {
                        paymentIdsToDelete.push(matchingPayment.id);
                        if (pType === 'subscription') {
                            athlete.sessionsLimit = Math.max(12, (athlete.sessionsLimit || 12) - sessionsToDeduct);
                            updatePromises.push(_supabase.from('athletes').update({ sessionsLimit: athlete.sessionsLimit }).eq('id', athlete.id));
                        }
                    }
                }
            });
            
            await _supabase.from('payments').delete().in('id', paymentIdsToDelete);
            if (updatePromises.length > 0) await Promise.all(updatePromises);
            
            await fetchAthletes(); // تحديث القائمة المنسدلة والجدول من السحابة
            showAthletePayments(athleteId);
        }
}

// معالجة إرسال نموذج الدفع
paymentForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = parseInt(athleteSelect.value);
    
    const subAmount = parseFloat(document.getElementById('subAmount').value) || 0;
    const uniformAmount = document.getElementById('checkUniform').checked ? (parseFloat(document.getElementById('uniformAmount').value) || 0) : 0;
    const insuranceAmount = document.getElementById('checkInsurance').checked ? (parseFloat(document.getElementById('insuranceAmount').value) || 0) : 0;
    const payDate = payDateInput.value;

    if (subAmount === 0 && uniformAmount === 0 && insuranceAmount === 0) {
        alert('الرجاء إدخال مبلغ دفع واحد على الأقل.');
        return;
    }

    if (subAmount > 0 && subAmount % 1000 !== 0) {
        alert('عذراً، يجب أن يكون مبلغ الاشتراك الشهري من مضاعفات 1000.');
        return;
    }

    const selectedAthlete = athletes.find(a => a.id === id);
    if (selectedAthlete) {
        // البحث عن الإخوة بذكاء (الذين لديهم نفس اسم الولي المطابق تماماً)
        let targetAthletes = [selectedAthlete];
        if (selectedAthlete.guardianName && selectedAthlete.guardianName.trim() !== '') {
            targetAthletes = athletes.filter(a => a.guardianName === selectedAthlete.guardianName);
        }

        const brothersCount = targetAthletes.length;
        let messages = [];

        // معالجة كل نوع دفع وتسجيله كعملية منفصلة لتظهر في التقرير والسجل
        if (subAmount > 0) {
            const splitSub = subAmount / brothersCount;
            const addedSessions = (splitSub / 1000) * 12;
            targetAthletes.forEach(athlete => {
                if (!athlete.payments) athlete.payments = [];
                athlete.payments.push({ amount: splitSub, date: payDate, type: 'subscription' });
                athlete.sessionsLimit = (athlete.sessionsLimit || 12) + addedSessions;
            });
            messages.push(`اشتراك شهري (${subAmount} د.ج) -> إجمالي ${addedSessions} حصة مضافة`);
        }

        if (uniformAmount > 0) {
            const splitUni = uniformAmount / brothersCount;
            targetAthletes.forEach(athlete => {
                if (!athlete.payments) athlete.payments = [];
                athlete.payments.push({ amount: splitUni, date: payDate, type: 'uniform' });
            });
            messages.push(`بدلة رياضية (${uniformAmount} د.ج)`);
        }

        if (insuranceAmount > 0) {
            const splitIns = insuranceAmount / brothersCount;
            targetAthletes.forEach(athlete => {
                if (!athlete.payments) athlete.payments = [];
                athlete.payments.push({ amount: splitIns, date: payDate, type: 'insurance' });
            });
            messages.push(`تأمين رياضي (${insuranceAmount} د.ج)`);
        }

        const insertPromises = [];
        const updatePromises = [];
        
        const totalAmount = subAmount + uniformAmount + insuranceAmount;
        if (targetAthletes.length > 1) {
            const siblingNames = targetAthletes.map(a => a.firstName).join(' و ');
            alert(`تم تسجيل دفع مبلغ إجمالي ${totalAmount} د.ج من طرف الولي ${selectedAthlete.guardianName}.\nتم التقسيم على الإخوة (${siblingNames})\nالتفاصيل:\n- ` + messages.join('\n- '));
        } else {
            alert(`تم تسجيل دفع مبلغ إجمالي ${totalAmount} د.ج لصالح الرياضي ${selectedAthlete.firstName}.\nالتفاصيل:\n- ` + messages.join('\n- '));
        }
        
        if (subAmount > 0) {
            const splitSub = subAmount / brothersCount;
            const addedSessions = (splitSub / 1000) * 12;
            targetAthletes.forEach(athlete => {
                insertPromises.push(_supabase.from('payments').insert([{ athlete_id: athlete.id, amount: splitSub, date: payDate, type: 'subscription' }]));
                athlete.sessionsLimit = (athlete.sessionsLimit || 12) + addedSessions;
                updatePromises.push(_supabase.from('athletes').update({ sessionsLimit: athlete.sessionsLimit }).eq('id', athlete.id));
            });
        }

        if (uniformAmount > 0) {
            const splitUni = uniformAmount / brothersCount;
            targetAthletes.forEach(athlete => {
                insertPromises.push(_supabase.from('payments').insert([{ athlete_id: athlete.id, amount: splitUni, date: payDate, type: 'uniform' }]));
            });
        }

        if (insuranceAmount > 0) {
            const splitIns = insuranceAmount / brothersCount;
            targetAthletes.forEach(athlete => {
                insertPromises.push(_supabase.from('payments').insert([{ athlete_id: athlete.id, amount: splitIns, date: payDate, type: 'insurance' }]));
            });
        }

        await Promise.all([...insertPromises, ...updatePromises]);

        // تصفير الحقول
        document.getElementById('subAmount').value = 0;
        document.getElementById('uniformAmount').value = 0;
        document.getElementById('insuranceAmount').value = 0;
        document.getElementById('checkUniform').checked = false;
        document.getElementById('checkInsurance').checked = false;
        document.getElementById('uniformAmountContainer').classList.add('hidden');
        document.getElementById('insuranceAmountContainer').classList.add('hidden');

        fetchAthletes();
    }
});

// إغلاق النافذة عند النقر خارجها
window.addEventListener('click', function(event) {
    const modal = document.getElementById('paymentsModal');
    if (event.target == modal) {
        closePaymentsModal();
    }
});

fetchAthletes();

// دالة إظهار القائمة المنسدلة للهواتف
function toggleMobileMenu() {
    const menu = document.getElementById("mobileMenu");
    menu.classList.toggle("hidden");
    menu.classList.toggle("flex");
    document.body.classList.toggle("overflow-hidden");
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
let isScrolling = false;
window.addEventListener('scroll', function() {
    if (!isScrolling) {
        window.requestAnimationFrame(function() {
            const header = document.querySelector('.header-wrapper');
            let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
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