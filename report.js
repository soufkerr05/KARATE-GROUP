// استرجاع البيانات
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const reportContainer = document.getElementById('reportContainer');
const reportTitle = document.getElementById('reportTitle');
const reportTableContainer = document.getElementById('reportTableContainer');
const reportTotal = document.getElementById('reportTotal');
const reportExpenses = document.getElementById('reportExpenses');
const reportNetIncome = document.getElementById('reportNetIncome');

// تعيين بداية ونهاية الشهر الحالي كافتراضي
const today = new Date();
const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

const formatDate = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

startDateInput.value = formatDate(firstDay);
endDateInput.value = formatDate(lastDay);

// جلب وعرض ملخص اليوم الحالي تلقائياً
async function fetchTodaySummary() {
    const todayStr = formatDate(new Date());
    document.getElementById('todayDateDisplay').innerText = todayStr;
    
    // جلب بيانات اليوم فقط باستخدام eq بدلاً من جلب كل البيانات
    const [paymentsRes, expensesRes, kimonoRes] = await Promise.all([
        _supabase.from('payments').select('amount').eq('date', todayStr),
        _supabase.from('expenses').select('amount').eq('date', todayStr),
        _supabase.from('kimono_paid').select('value').eq('date', todayStr)
    ]);
    
    let todayIncome = 0;
    if (paymentsRes.data) {
        paymentsRes.data.forEach(p => todayIncome += parseFloat(p.amount || 0));
    }
    
    let todayExp = 0;
    if (expensesRes.data) {
        expensesRes.data.forEach(e => todayExp += parseFloat(e.amount || 0));
    }
    if (kimonoRes.data) {
        kimonoRes.data.forEach(k => todayExp += parseFloat(k.value || 0));
    }
    
    document.getElementById('todayIncome').innerText = `${todayIncome.toLocaleString()} د.ج`;
    document.getElementById('todayExpenses').innerText = `${todayExp.toLocaleString()} د.ج`;
    document.getElementById('todaySummaryContainer').classList.remove('hidden');
}

// دالة توليد التقرير
async function generateReport() {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    
    if (!startDate || !endDate) {
        alert("الرجاء اختيار فترة التقرير (من - إلى).");
        return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
        alert("تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية.");
        return;
    }

    // جلب البيانات من Supabase
    const [athletesRes, kimonoPaidRes, expensesRes, paymentsRes] = await Promise.all([
        _supabase.from('athletes').select('id, firstName, lastName, guardianName'),
        _supabase.from('kimono_paid').select('date, value'),
        _supabase.from('expenses').select('*'),
        _supabase.from('payments').select('*')
    ]);
    const athletes = athletesRes.data || [];
    const kimonoPaidData = kimonoPaidRes.data || [];
    const generalExpenses = expensesRes.data || [];
    const allPayments = paymentsRes.data || [];

    const filterType = document.getElementById('reportFilter') ? document.getElementById('reportFilter').value : 'all';

    // 1. حساب إجمالي الدخل من اشتراكات ومدفوعات الرياضيين
    let totalIncome = 0;
    let incomeData = [];
    
    allPayments.forEach(payment => {
        if (payment.date && payment.date >= startDate && payment.date <= endDate) {
            const pType = payment.type || 'subscription';
            
            if (filterType === 'all' || filterType === 'incomes' || filterType === pType) {
                const athlete = athletes.find(a => a.id === payment.athlete_id) || {};
                const gName = athlete.guardianName || athlete.firstName || 'غير معروف';
                const fName = athlete.firstName || '';
                const lName = athlete.lastName || '';
                
                incomeData.push({
                    name: `${gName} (عن: ${fName} ${lName})`,
                    amount: parseFloat(payment.amount),
                    date: payment.date,
                    type: pType
                });
                totalIncome += parseFloat(payment.amount);
            }
        }
    });

    // 2. حساب إجمالي المصاريف من مدفوعات البدلات
    let expenseData = [];
    let totalExpensesValue = 0;
    kimonoPaidData.forEach(payment => {
        if (payment.date && payment.date >= startDate && payment.date <= endDate) {
            if (filterType === 'all' || filterType === 'expenses') {
                totalExpensesValue += parseFloat(payment.value || 0);
                expenseData.push({
                    name: 'دفع مستحقات لتاجر البدلات',
                    amount: parseFloat(payment.value || 0),
                    date: payment.date,
                    type: 'kimono_merchant'
                });
            }
        }
    });
    
    // حساب إجمالي المصاريف العامة (العتاد، الشهادات، إلخ)
    generalExpenses.forEach(exp => {
        if (exp.date && exp.date >= startDate && exp.date <= endDate) {
            if (filterType === 'all' || filterType === 'expenses') {
                totalExpensesValue += parseFloat(exp.amount || 0);
                expenseData.push({
                    name: exp.note ? `${exp.category} - ${exp.note}` : exp.category,
                    amount: parseFloat(exp.amount),
                    date: exp.date,
                    type: 'general'
                });
            }
        }
    });

    // 3. حساب صافي الدخل
    const netIncome = totalIncome - totalExpensesValue;

    // عرض النتائج
    if (startDate === endDate) {
        reportTitle.innerText = `التقرير المالي ليوم: ${startDate}`;
    } else {
        reportTitle.innerText = `التقرير المالي للفترة من ${startDate} إلى ${endDate}`;
    }
    
    let html = '';

    // جدول المداخيل
    if (incomeData.length > 0) {
        incomeData.sort((a, b) => new Date(a.date) - new Date(b.date));
        const typeLabels = {
            'subscription': '<span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-200">اشتراك شهري</span>',
            'uniform': '<span class="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold border border-indigo-200">بدلة رياضية</span>',
            'insurance': '<span class="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold border border-emerald-200">تأمين رياضي</span>'
        };
        
        html += `<h3 class="text-xl font-bold text-emerald-700 mb-3 mt-6 border-r-4 border-emerald-500 pr-2">جدول المداخيل</h3>
                 <table class="w-full text-right border-collapse bg-white mb-8">
                    <thead class="bg-indigo-50 text-indigo-800 border-b-2 border-indigo-200">
                        <tr>
                            <th class="p-4 font-semibold">تاريخ الدفع</th>
                            <th class="p-4 font-semibold">الدافع (الرياضي)</th>
                            <th class="p-4 font-semibold">نوع الدفع</th>
                            <th class="p-4 font-semibold">المبلغ المدفوع (د.ج)</th>
                        </tr>
                    </thead>
                    <tbody>`;
        incomeData.forEach(item => {
            const avatarName = item.name.split(' ')[0];
            html += `<tr class="border-b border-slate-100 hover:bg-slate-50 transition duration-200">
                        <td class="p-4" data-label="تاريخ الدفع">${item.date}</td>
                        <td class="p-4 font-medium text-slate-700" data-label="الدافع (الرياضي)">
                            <div class="flex items-center">
                                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(avatarName)}&background=4f46e5&color=fff&rounded=true&font-size=0.4" class="w-8 h-8 ml-2 shadow-sm rounded-full hidden sm:block" alt="Avatar">
                                <span>${item.name}</span>
                            </div>
                        </td>
                        <td class="p-4 align-middle" data-label="نوع الدفع">${typeLabels[item.type] || '<span class="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold border border-gray-200">غير محدد</span>'}</td>
                        <td class="p-4 font-bold text-indigo-600" data-label="المبلغ المدفوع">${item.amount.toLocaleString()}</td>
                     </tr>`;
        });
        html += `</tbody></table>`;
    } else if (filterType === 'all' || filterType === 'incomes' || filterType === 'subscription' || filterType === 'insurance' || filterType === 'uniform') {
        html += '<p class="text-slate-500 mb-8 mt-6 border-r-4 border-slate-300 pr-2">لا توجد مداخيل مسجلة في هذه الفترة.</p>';
    }

    // جدول المصاريف
    if (expenseData.length > 0) {
        expenseData.sort((a, b) => new Date(a.date) - new Date(b.date));
        const expTypeLabels = {
            'kimono_merchant': '<span class="bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-bold border border-slate-300">بدلات التاجر</span>',
            'general': '<span class="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold border border-red-200">مصروف عام</span>'
        };
        
        html += `<h3 class="text-xl font-bold text-red-700 mb-3 border-r-4 border-red-500 pr-2">جدول المصاريف</h3>
                 <table class="w-full text-right border-collapse bg-white mb-8">
                    <thead class="bg-red-50 text-red-800 border-b-2 border-red-200">
                        <tr>
                            <th class="p-4 font-semibold">تاريخ الصرف</th>
                            <th class="p-4 font-semibold">البيان (السبب)</th>
                            <th class="p-4 font-semibold">نوع المصروف</th>
                            <th class="p-4 font-semibold">المبلغ المصروف (د.ج)</th>
                        </tr>
                    </thead>
                    <tbody>`;
        expenseData.forEach(item => {
            html += `<tr class="border-b border-slate-100 hover:bg-red-50/30 transition duration-200">
                        <td class="p-4" data-label="تاريخ الصرف">${item.date}</td>
                        <td class="p-4 font-bold text-slate-700" data-label="البيان">${item.name}</td>
                        <td class="p-4 align-middle" data-label="نوع المصروف">${expTypeLabels[item.type] || '<span class="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold border border-gray-200">غير محدد</span>'}</td>
                        <td class="p-4 font-black text-red-600" data-label="المبلغ المصروف">${item.amount.toLocaleString()}</td>
                     </tr>`;
        });
        html += `</tbody></table>`;
    } else if (filterType === 'all' || filterType === 'expenses') {
        html += '<p class="text-slate-500 mb-8 border-r-4 border-slate-300 pr-2">لا توجد مصاريف مسجلة في هذه الفترة.</p>';
    }

    reportTableContainer.innerHTML = html;

    // 4. تحديث خانات الإجماليات
    reportTotal.querySelector('span.font-black').innerText = `${totalIncome.toLocaleString()} د.ج`;
    reportExpenses.querySelector('span.font-black').innerText = `${totalExpensesValue.toLocaleString()} د.ج`;
    reportNetIncome.innerText = `${netIncome.toLocaleString()} د.ج`;

    // تغيير لون صافي الدخل بناءً على القيمة
    const netIncomeContainer = document.getElementById('netIncomeContainer');
    netIncomeContainer.classList.remove('bg-slate-100', 'bg-green-100', 'bg-red-100');
    reportNetIncome.classList.remove('text-blue-600', 'text-green-600', 'text-red-600');
    if (netIncome > 0) {
        netIncomeContainer.classList.add('bg-green-100');
        reportNetIncome.classList.add('text-green-600');
    } else if (netIncome < 0) {
        netIncomeContainer.classList.add('bg-red-100');
        reportNetIncome.classList.add('text-red-600');
    } else {
        netIncomeContainer.classList.add('bg-slate-100');
        reportNetIncome.classList.add('text-blue-600');
    }

    reportContainer.style.display = 'block';
}

// عرض ملخص اليوم عند فتح الصفحة مباشرة
fetchTodaySummary();

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