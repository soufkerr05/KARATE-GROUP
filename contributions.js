let contributions = [];

// تعيين تاريخ اليوم كافتراضي
document.getElementById('contribDate').value = new Date().toISOString().split('T')[0];

async function fetchContributions() {
    const { data, error } = await _supabase
        .from('contributions')
        .select('*')
        .order('date', { ascending: false });

    if (error) {
        console.error("خطأ في جلب البيانات:", error);
        return;
    }

    contributions = data || [];
    renderContributions();
}

function renderContributions() {
    const listContainer = document.getElementById('contributionsList');
    let totalVal = 0;

    if (contributions.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <img src="https://cdn-icons-png.flaticon.com/512/7486/7486744.png" alt="Empty" class="w-24 h-24 mx-auto mb-4 opacity-60">
                <p class="text-slate-500 text-lg font-semibold">لم يتم تسجيل أي مساهمات بعد.</p>
            </div>
        `;
        document.getElementById('totalContributionsValue').innerText = '0';
        return;
    }

    let html = `
        <table class="w-full text-right border-collapse bg-white">
            <thead class="bg-slate-100 text-slate-600 border-b-2 border-slate-200">
                <tr>
                    <th class="p-4 font-semibold rounded-tr-lg">التاريخ</th>
                    <th class="p-4 font-semibold">المساهم</th>
                    <th class="p-4 font-semibold">النوع</th>
                    <th class="p-4 font-semibold">القيمة / المبلغ</th>
                    <th class="p-4 font-semibold">التفاصيل</th>
                    <th class="p-4 font-semibold text-center rounded-tl-lg admin-only">إجراءات</th>
                </tr>
            </thead>
            <tbody>
    `;

    contributions.forEach(item => {
        totalVal += parseFloat(item.value || 0);
        
        let typeColor = 'bg-slate-100 text-slate-700 border-slate-200';
        if (item.type === 'مبلغ مالي') typeColor = 'bg-emerald-100 text-emerald-700 border-emerald-200';
        else if (item.type === 'عتاد رياضي') typeColor = 'bg-blue-100 text-blue-700 border-blue-200';
        else typeColor = 'bg-amber-100 text-amber-700 border-amber-200';

        html += `
            <tr class="border-b border-slate-100 hover:bg-slate-50 transition duration-200">
                <td class="p-4 align-middle font-bold text-slate-600" data-label="التاريخ">${item.date}</td>
                <td class="p-4 align-middle font-bold text-slate-800" data-label="المساهم">${item.name}</td>
                <td class="p-4 align-middle" data-label="النوع">
                    <span class="px-3 py-1 rounded-lg text-xs font-black border ${typeColor}">${item.type}</span>
                </td>
                <td class="p-4 align-middle font-black text-emerald-600" data-label="القيمة / المبلغ">${parseFloat(item.value).toLocaleString()} د.ج</td>
                <td class="p-4 align-middle text-sm text-slate-500" data-label="التفاصيل">${item.notes || '-'}</td>
                <td class="p-4 align-middle text-center admin-only" data-label="إجراءات">
                    <button onclick="deleteContribution('${item.id}')" class="text-red-500 hover:text-white hover:bg-red-500 p-2 rounded-lg transition-colors border border-transparent hover:border-red-600 shadow-sm" title="حذف">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    listContainer.innerHTML = html;
    document.getElementById('totalContributionsValue').innerText = totalVal.toLocaleString();
}

document.getElementById('contributionForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const newContribution = {
        date: document.getElementById('contribDate').value,
        name: document.getElementById('contribName').value,
        type: document.getElementById('contribType').value,
        value: parseFloat(document.getElementById('contribValue').value) || 0,
        notes: document.getElementById('contribNote').value
    };

    const { error } = await _supabase.from('contributions').insert([newContribution]);
    if (error) {
        alert('حدث خطأ أثناء الحفظ: ' + error.message);
    } else {
        alert('تم تسجيل المساهمة بنجاح.');
        document.getElementById('contribName').value = '';
        document.getElementById('contribValue').value = '';
        document.getElementById('contribNote').value = '';
        fetchContributions();
    }
});

async function deleteContribution(id) {
    if (confirm('هل أنت متأكد من حذف هذه المساهمة؟')) {
        const { error } = await _supabase.from('contributions').delete().eq('id', id);
        if (error) {
            alert('حدث خطأ أثناء الحذف.');
        } else {
            fetchContributions();
        }
    }
}

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
applyTheme();
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if ((localStorage.getItem('theme') || 'system') === 'system') applyTheme();
});

fetchContributions();