let athletes = [];
let batches = [];
const INSURANCE_PRICE_PER_ATHLETE = 500; // السعر الافتراضي للتأمين

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('batchDate').value = new Date().toISOString().split('T')[0];
    fetchData();

    // بحث في قائمة الرياضيين عند الإضافة
    document.getElementById('searchAthletes').addEventListener('input', function(e) {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.athlete-checkbox-item').forEach(item => {
            const name = item.getAttribute('data-name').toLowerCase();
            item.style.display = name.includes(term) ? 'flex' : 'none';
        });
    });
});

async function fetchData() {
    const [athletesRes, batchesRes] = await Promise.all([
        _supabase.from('athletes').select('id, firstName, lastName').eq('isArchived', false),
        _supabase.from('insurance_batches').select('*').order('batch_date', { ascending: false })
    ]);

    if (athletesRes.error) console.error(athletesRes.error);
    else athletes = athletesRes.data || [];

    if (batchesRes.error) console.error(batchesRes.error);
    else batches = batchesRes.data || [];

    renderBatches();
    populateAthletesSelection();
}

function renderBatches() {
    const grid = document.getElementById('batchesGrid');
    if (batches.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            <p class="text-slate-500 font-bold">لا يوجد دفعات مسجلة حالياً.</p>
        </div>`;
        return;
    }

    grid.innerHTML = batches.map(batch => {
        const athletesCount = Array.isArray(batch.athletes) ? batch.athletes.length : 0;
        return `
        <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition cursor-pointer" onclick="viewBatch(${batch.id})">
            <div class="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
                <div>
                    <p class="text-xs text-slate-400 font-bold mb-1">تاريخ الدفعة</p>
                    <p class="text-lg font-black text-slate-800">${batch.batch_date}</p>
                </div>
                <div class="bg-blue-50 text-blue-600 p-2 rounded-xl">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                </div>
            </div>
            <div class="flex justify-between items-end">
                <div>
                    <p class="text-xs text-slate-500 font-bold">الرياضيين المشمولين</p>
                    <p class="text-xl font-black text-slate-700">${athletesCount} <span class="text-sm font-normal">رياضي</span></p>
                </div>
                <div class="text-left">
                    <p class="text-xs text-emerald-600 font-bold">إجمالي المبلغ</p>
                    <p class="text-xl font-black text-emerald-600">${parseFloat(batch.total_amount).toLocaleString()} <span class="text-sm font-normal">د.ج</span></p>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

function populateAthletesSelection() {
    const list = document.getElementById('athletesSelectionList');
    list.innerHTML = athletes.map(a => `
        <label class="athlete-checkbox-item flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg cursor-pointer hover:bg-slate-100 transition" data-name="${a.firstName} ${a.lastName}">
            <div class="flex items-center gap-3">
                <input type="checkbox" value="${a.id}" data-name="${a.firstName} ${a.lastName}" class="athlete-cb w-5 h-5 text-blue-600 rounded" onchange="updateBatchTotal()">
                <span class="font-bold text-slate-700">${a.firstName} ${a.lastName}</span>
            </div>
        </label>
    `).join('');
}

function updateBatchTotal() {
    const checked = document.querySelectorAll('.athlete-cb:checked');
    document.getElementById('selectedCount').innerText = `المحدد: ${checked.length}`;
    // اقتراح تلقائي للمبلغ
    document.getElementById('batchTotal').value = checked.length * INSURANCE_PRICE_PER_ATHLETE;
}

function openAddBatchModal() {
    document.getElementById('batchForm').reset();
    document.getElementById('batchDate').value = new Date().toISOString().split('T')[0];
    document.querySelectorAll('.athlete-cb').forEach(cb => cb.checked = false);
    updateBatchTotal();
    document.getElementById('addBatchModal').style.display = 'flex';
}

function closeAddBatchModal() {
    document.getElementById('addBatchModal').style.display = 'none';
}

document.getElementById('batchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const checkedCbs = document.querySelectorAll('.athlete-cb:checked');
    if (checkedCbs.length === 0) {
        alert('الرجاء تحديد رياضي واحد على الأقل.');
        return;
    }

    const selectedAthletes = Array.from(checkedCbs).map(cb => ({
        id: cb.value,
        name: cb.getAttribute('data-name')
    }));

    const newBatch = {
        batch_date: document.getElementById('batchDate').value,
        total_amount: parseFloat(document.getElementById('batchTotal').value),
        notes: document.getElementById('batchNotes').value,
        athletes: selectedAthletes
    };

    const btn = document.getElementById('submitBatchBtn');
    btn.disabled = true;
    btn.innerText = 'جاري الحفظ...';

    const { data, error } = await _supabase.from('insurance_batches').insert([newBatch]).select();
    
    btn.disabled = false;
    btn.innerText = 'حفظ الدفعة';

    if (error) {
        console.error(error);
        alert('حدث خطأ أثناء حفظ الدفعة');
    } else {
        closeAddBatchModal();
        fetchData();
    }
});

function viewBatch(id) {
    const batch = batches.find(b => b.id === id);
    if (!batch) return;

    document.getElementById('viewDate').innerText = batch.batch_date;
    document.getElementById('viewTotal').innerText = parseFloat(batch.total_amount).toLocaleString() + ' د.ج';
    
    const notesEl = document.getElementById('viewNotes');
    if (batch.notes) {
        notesEl.innerText = batch.notes;
        notesEl.classList.remove('hidden');
    } else {
        notesEl.classList.add('hidden');
    }

    const athletesArr = Array.isArray(batch.athletes) ? batch.athletes : [];
    document.getElementById('viewCount').innerText = athletesArr.length;
    document.getElementById('viewAthletesList').innerHTML = athletesArr.map(a => `
        <li class="bg-slate-50 border border-slate-100 p-3 rounded-lg font-bold text-slate-700 flex items-center gap-2">
            <span class="w-2 h-2 bg-blue-500 rounded-full inline-block"></span>
            ${a.name}
        </li>
    `).join('');

    document.getElementById('btnDeleteBatch').onclick = async () => {
        if (confirm('هل أنت متأكد من حذف هذه الدفعة؟ لا يمكن التراجع عن هذا الإجراء.')) {
            await _supabase.from('insurance_batches').delete().eq('id', id);
            closeViewBatchModal();
            fetchData();
        }
    };

    document.getElementById('viewBatchModal').style.display = 'flex';
}

function closeViewBatchModal() {
    document.getElementById('viewBatchModal').style.display = 'none';
}

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

// إخفاء وإظهار القائمة العلوية عند التمرير (Scroll)
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