// جلب البيانات من Supabase
let expenses = [];
const expenseForm = document.getElementById('expenseForm');
const expDateInput = document.getElementById('expDate');
const expensesList = document.getElementById('expensesList');

async function fetchExpenses() {
    const { data, error } = await _supabase.from('expenses').select('*');
    if (error) {
        console.error("خطأ في جلب المصاريف:", error);
    } else {
        expenses = data || [];
        renderExpensesTable();
    }
}

// تعيين تاريخ اليوم افتراضياً
expDateInput.value = new Date().toISOString().split('T')[0];

// عرض قائمة المصاريف
function renderExpensesTable() {
    if (expenses.length === 0) {
        expensesList.innerHTML = `
            <div class="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <img src="https://cdn-icons-png.flaticon.com/512/7486/7486744.png" alt="Empty" class="w-24 h-24 mx-auto mb-4 opacity-60">
                <p class="text-slate-500 text-lg">لا توجد مصاريف مسجلة حالياً.</p>
            </div>
        `;
        return;
    }

    // ترتيب تنازلي حسب التاريخ
    expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

    let html = `<table class="w-full text-right border-collapse bg-white rounded-lg overflow-hidden">
                <thead class="bg-slate-100 text-slate-600 border-b-2 border-slate-200">
                    <tr>
                        <th class="p-4 font-semibold">التاريخ</th>
                        <th class="p-4 font-semibold">التصنيف</th>
                        <th class="p-4 font-semibold">المبلغ (د.ج)</th>
                        <th class="p-4 font-semibold text-center">إجراءات</th>
                    </tr>
                </thead>
                <tbody>`;
    
    expenses.forEach((exp, index) => {
        const details = exp.note ? `<div class="text-sm text-slate-500 mt-1">${exp.note}</div>` : '';
        html += `<tr class="border-b border-slate-100 hover:bg-slate-50 transition duration-200">
                    <td class="p-4 align-middle" data-label="التاريخ">${exp.date}</td>
                    <td class="p-4 align-middle" data-label="التصنيف">
                        <span class="font-bold text-slate-700">${exp.category}</span>
                        ${details}
                    </td>
                    <td class="p-4 align-middle font-black text-red-600" data-label="المبلغ">${parseFloat(exp.amount).toLocaleString()}</td>
                    <td class="p-4 align-middle actions-cell text-center" data-label="إجراءات">
                        <button class="bg-rose-100 hover:bg-rose-200 text-rose-600 font-semibold py-1.5 px-4 rounded shadow-sm transition" onclick="removeExpense(${exp.id})">حذف</button>
                    </td>
                 </tr>`;
    });
    html += `</tbody></table>`;
    expensesList.innerHTML = html;
}

// معالجة إضافة مصروف
expenseForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const newExpense = {
        date: expDateInput.value,
        category: document.getElementById('expCategory').value,
        amount: parseFloat(document.getElementById('expAmount').value),
        note: document.getElementById('expNote').value.trim()
    };

    const { error } = await _supabase.from('expenses').insert([newExpense]);
    if (error) {
        console.error(error);
        alert("حدث خطأ أثناء إضافة المصروف.");
        return;
    }
    
    // تفريغ الحقول
    document.getElementById('expAmount').value = '';
    document.getElementById('expNote').value = '';
    
    fetchExpenses();
});

// حذف مصروف
async function removeExpense(id) {
    if (confirm('هل أنت متأكد من رغبتك في حذف هذا المصروف؟ سيرتفع صافي الدخل في التقرير.')) {
        const { error } = await _supabase.from('expenses').delete().eq('id', id);
        if (error) console.error(error);
        fetchExpenses();
    }
}

fetchExpenses();

// القائمة للهواتف والوضع الليلي
function toggleMobileMenu() {
    const menu = document.getElementById("mobileMenu");
    menu.classList.toggle("hidden");
    menu.classList.toggle("flex");
    document.body.classList.toggle("overflow-hidden");
}
function applyTheme() {
    const theme = localStorage.getItem('theme') || 'system';
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) { document.body.classList.add('dark-mode'); } 
    else { document.body.classList.remove('dark-mode'); }
}
applyTheme();
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if ((localStorage.getItem('theme') || 'system') === 'system') applyTheme(); });

// إخفاء وإظهار القائمة العلوية عند التمرير
let lastScrollTop = 0;
let isScrolling = false;
window.addEventListener('scroll', function() {
    if (!isScrolling) {
        window.requestAnimationFrame(function() {
            const header = document.querySelector('.header-wrapper');
            let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            if (scrollTop > lastScrollTop && scrollTop > 80) { header.classList.add('header-hidden'); } 
            else { header.classList.remove('header-hidden'); }
            lastScrollTop = scrollTop;
            isScrolling = false;
        });
        isScrolling = true;
    }
});