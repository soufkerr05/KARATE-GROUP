// جلب البيانات من Supabase أو إنشاء مصفوفة فارغة
let athletes = [];
let viewMode = 'active'; // تحديد وضع العرض (نشطين أو الأرشيف)
const form = document.getElementById('registerForm');
const listContainer = document.getElementById('athletesList');

async function fetchAthletes() {
    const { data, error } = await _supabase.from('athletes').select('*');
    if (error) {
        console.error("خطأ في جلب بيانات الرياضيين:", error);
    } else {
        athletes = data || [];
        renderTable();
    }
}

// معالجة إرسال النموذج
form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const newAthlete = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        gender: document.getElementById('gender').value,
        dob: document.getElementById('dob').value,
        guardianName: document.getElementById('guardianName').value,
        guardianPhone: document.getElementById('guardianPhone').value,
        subDate: document.getElementById('subDate').value,
        attendance: 0, // يبدأ الحضور بـ 0
        attendanceDates: [], // مصفوفة لتخزين تواريخ الحضور لتجنب التكرار
        sessionsLimit: 12, // عدد الحصص الافتراضي
        isArchived: false, // تحديد أن الرياضي نشط وليس في الأرشيف
        docs: {
            birth: document.getElementById('docBirth') ? document.getElementById('docBirth').checked : false,
            photos: document.getElementById('docPhotos') ? document.getElementById('docPhotos').checked : false,
            medical: document.getElementById('docMedical') ? document.getElementById('docMedical').checked : false,
            guardian: document.getElementById('docGuardian') ? document.getElementById('docGuardian').checked : false
        }
    };

    const { data, error } = await _supabase.from('athletes').insert([newAthlete]);
    if (error) {
        alert("خطأ في الحفظ: " + error.message);
    } else {
        alert("تم تسجيل الرياضي بنجاح في السحابة!");
        form.reset(); 
        closeRegisterModal(); 
        fetchAthletes(); // تحديث القائمة
    }
});

// دالة فتح نافذة التسجيل
function openRegisterModal() {
    document.getElementById('registerModal').style.display = 'block';
}

// دالة إغلاق نافذة التسجيل
function closeRegisterModal() {
    document.getElementById('registerModal').style.display = 'none';
}

// دالة حذف رياضي
async function deleteAthlete(id) {
    if (confirm('هل أنت متأكد من رغبتك في حذف هذا الرياضي؟')) {
        const { error } = await _supabase.from('athletes').delete().eq('id', id);
        if (error) console.error(error);
        fetchAthletes();
    }
}

// دالة تبديل العرض بين النشطين والأرشيف
function switchView(mode) {
    viewMode = mode;
    const btnActive = document.getElementById('btnViewActive');
    const btnArchived = document.getElementById('btnViewArchived');
    
    if (mode === 'active') {
        btnActive.className = "px-4 py-2 rounded-lg text-sm font-bold bg-white text-blue-600 shadow-sm transition-all w-1/2 sm:w-auto";
        btnArchived.className = "px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:text-slate-700 transition-all w-1/2 sm:w-auto";
    } else {
        btnArchived.className = "px-4 py-2 rounded-lg text-sm font-bold bg-white text-blue-600 shadow-sm transition-all w-1/2 sm:w-auto";
        btnActive.className = "px-4 py-2 rounded-lg text-sm font-bold text-slate-500 hover:text-slate-700 transition-all w-1/2 sm:w-auto";
    }
    renderTable();
}

// دالة أرشفة أو استعادة الرياضي
async function toggleArchive(id, status) {
    const action = status ? 'أرشفة' : 'استعادة';
    if (confirm(`هل أنت متأكد من رغبتك في ${action} هذا الرياضي؟`)) {
        const { error } = await _supabase.from('athletes').update({ isArchived: status }).eq('id', id);
        if (error) { 
            console.error("تفاصيل الخطأ:", error); 
            alert('حدث خطأ: ' + error.message + '\n\n(تأكد من أنك قمت بإضافة عمود "isArchived" في جدول athletes على Supabase)'); 
        }
        else { fetchAthletes(); }
    }
}

// دالة مسح جميع البيانات وتصفيرها للبدء من جديد
async function clearAllData() {
    if (confirm('تحذير: هل أنت متأكد من رغبتك في مسح جميع البيانات (الرياضيين، المدفوعات، الحضور، والمخزون) للبدء من جديد يدوياً؟ لا يمكن التراجع عن هذه الخطوة!')) {
        await _supabase.from('athletes').delete().neq('id', 0);
        fetchAthletes();
        alert('تم تصفير النظام ومسح جميع البيانات بنجاح. يمكنك الآن بدء الإدخال يدوياً.');
    }
}

// دالة فتح نافذة تعديل الملف
function editDocs(id) {
    const athlete = athletes.find(a => a.id === id);
    if (athlete) {
        document.getElementById('editAthleteId').value = athlete.id;
        document.getElementById('editAthleteName').innerText = `${athlete.firstName} ${athlete.lastName}`;
        
        document.getElementById('editFirstName').value = athlete.firstName || '';
        document.getElementById('editLastName').value = athlete.lastName || '';
        document.getElementById('editGender').value = athlete.gender || 'ذكر';
        document.getElementById('editDob').value = athlete.dob || '';
        document.getElementById('editGuardianName').value = athlete.guardianName || '';
        document.getElementById('editGuardianPhone').value = athlete.guardianPhone || '';
        document.getElementById('editSubDate').value = athlete.subDate || '';

        const docs = athlete.docs || { birth: false, photos: false, medical: false, guardian: false };
        document.getElementById('editDocBirth').checked = docs.birth;
        document.getElementById('editDocPhotos').checked = docs.photos;
        document.getElementById('editDocMedical').checked = docs.medical;
        document.getElementById('editDocGuardian').checked = docs.guardian;
        
        document.getElementById('editDocsModal').style.display = 'block';
    }
}

// دالة إغلاق نافذة التعديل
function closeEditModal() {
    document.getElementById('editDocsModal').style.display = 'none';
}

// معالجة حفظ التعديلات
document.getElementById('editDocsForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('editAthleteId').value);
    const athlete = athletes.find(a => a.id === id);
    
    if (athlete) {
        const updatedData = {
            firstName: document.getElementById('editFirstName').value,
            lastName: document.getElementById('editLastName').value,
            gender: document.getElementById('editGender').value,
            dob: document.getElementById('editDob').value,
            guardianName: document.getElementById('editGuardianName').value,
            guardianPhone: document.getElementById('editGuardianPhone').value,
            subDate: document.getElementById('editSubDate').value,
            docs: {
                birth: document.getElementById('editDocBirth').checked,
                photos: document.getElementById('editDocPhotos').checked,
                medical: document.getElementById('editDocMedical').checked,
                guardian: document.getElementById('editDocGuardian').checked
            }
        };
        
        const { error } = await _supabase.from('athletes').update(updatedData).eq('id', id);
        if (error) console.error(error);
        
        closeEditModal();
        fetchAthletes();
    }
});

// إغلاق النافذة عند النقر خارجها
window.onclick = function(event) {
    const editModal = document.getElementById('editDocsModal');
    const registerModal = document.getElementById('registerModal');
    if (event.target == editModal) {
        closeEditModal();
    }
    if (event.target == registerModal) {
        closeRegisterModal();
    }
}

// دالة عرض الجدول
function renderTable() {
    let filteredAthletes = athletes.filter(a => viewMode === 'active' ? !a.isArchived : a.isArchived);

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
        const msg = viewMode === 'active' ? 'لا يوجد رياضيين نشطين مسجلين حالياً. قم بإضافة رياضي جديد للبدء.' : 'قائمة الأرشيف فارغة.';
        listContainer.innerHTML = `
            <div class="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                <img src="https://cdn-icons-png.flaticon.com/512/7486/7486744.png" alt="Empty" class="w-24 h-24 mx-auto mb-4 opacity-60 hover:opacity-100 transition">
                <p class="text-slate-500 text-lg font-semibold">${msg}</p>
            </div>
        `;
        return;
    }

    const sortSelect = document.getElementById('sortAthletes');
    const sortValue = sortSelect ? sortSelect.value : 'default';

    let sortedAthletes = [...filteredAthletes];

    switch(sortValue) {
        case 'alpha':
            sortedAthletes.sort((a, b) => (a.firstName + ' ' + a.lastName).localeCompare(b.firstName + ' ' + b.lastName, 'ar'));
            break;
        case 'subDate':
            sortedAthletes.sort((a, b) => new Date(b.subDate) - new Date(a.subDate));
            break;
        case 'dob':
            sortedAthletes.sort((a, b) => new Date(b.dob) - new Date(a.dob)); // الأصغر سناً أولاً
            break;
        case 'expired':
            // حساب عدد الحصص المتجاوزة أو المتبقية وترتيبها بحيث يظهر الأكثر تجاوزاً أولاً
            sortedAthletes.sort((a, b) => (b.attendance - (b.sessionsLimit || 12)) - (a.attendance - (a.sessionsLimit || 12)));
            break;
        case 'default':
        default:
            sortedAthletes.sort((a, b) => b.id - a.id); // الأحدث إضافة أولاً
            break;
    }

    let html = `
        <table class="w-full text-right border-collapse bg-white">
            <thead class="bg-slate-100 text-slate-600 border-b-2 border-slate-200">
                <tr>
                    <th class="p-4 font-semibold rounded-tr-lg">الرياضي</th>
                    <th class="p-4 font-semibold text-center rounded-tl-lg">إجراءات</th>
                </tr>
            </thead>
            <tbody>
    `;

    const rowsHtml = sortedAthletes.map(athlete => {
        const limit = athlete.sessionsLimit || 12;
        const isExpired = athlete.attendance >= limit;
        
        const docs = athlete.docs || { birth: false, photos: false, medical: false, guardian: false };
        let missingDocs = [];
        if (!docs.birth) missingDocs.push('شهادة ميلاد');
        if (!docs.photos) missingDocs.push('صور');
        if (!docs.medical) missingDocs.push('شهادة طبية');
        if (!docs.guardian) missingDocs.push('تصريح الولي');
        
        const docStatus = missingDocs.length === 0 ? '<span style="color: #5cb85c; font-weight: bold;">مكتمل</span>' : `<span style="color: #d9534f; font-size: 12px;">ناقص: ${missingDocs.join('، ')}</span>`;

        return `
            <tr class="athlete-row border-b border-slate-100 hover:bg-slate-50 transition duration-200 ${isExpired ? 'expired-row' : ''}">
                <td class="p-4 align-top" data-label="الرياضي">
                    <div class="flex items-center flex-wrap gap-y-2 mb-3">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(athlete.firstName)}+${encodeURIComponent(athlete.lastName)}&background=0ea5e9&color=fff&rounded=true&font-size=0.4" class="w-12 h-12 ml-3 shadow-md border-2 border-white rounded-full" alt="Avatar">
                        <div class="text-lg font-bold text-slate-800">${athlete.firstName} ${athlete.lastName}</div>
                        ${isExpired ? '<span class="mr-3 bg-red-100 text-red-700 px-2.5 py-1 rounded-lg text-xs font-black border border-red-200 flex items-center gap-1 shadow-sm"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>اشتراك منتهي</span>' : ''}
                    </div>
                    <div class="athlete-details">
                        <div class="mb-1"><span class="font-semibold text-slate-600">الجنس:</span> ${athlete.gender || 'غير محدد'}</div>
                        <div class="mb-1"><span class="font-semibold text-slate-600">تاريخ الميلاد:</span> ${athlete.dob}</div>
                        <div class="mb-1"><span class="font-semibold text-slate-600">اسم الولي:</span> ${athlete.guardianName || 'غير مسجل'}</div>
                        <div class="mb-1"><span class="font-semibold text-slate-600">رقم الهاتف:</span> <a href="tel:${athlete.guardianPhone || ''}" class="text-blue-600 hover:underline">${athlete.guardianPhone || 'غير مسجل'}</a></div>
                        <div class="mb-1"><span class="font-semibold text-slate-600">تاريخ الاشتراك:</span> ${athlete.subDate}</div>
                        <div class="mb-1"><span class="font-semibold text-slate-600">الملف الإداري:</span> ${docStatus}</div>
                    </div>
                </td>
                <td class="p-4 align-middle actions-cell text-center" data-label="إجراءات">
                    <button class="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-1.5 px-4 rounded shadow-sm transition transform hover:-translate-y-0.5 ml-2" onclick="editDocs(${athlete.id})">تعديل</button>
                    ${viewMode === 'active' 
                        ? `<button class="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-1.5 px-4 rounded shadow-sm transition transform hover:-translate-y-0.5 ml-2" onclick="toggleArchive(${athlete.id}, true)">أرشفة</button>`
                        : `<button class="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-1.5 px-4 rounded shadow-sm transition transform hover:-translate-y-0.5 ml-2" onclick="toggleArchive(${athlete.id}, false)">استعادة</button>`
                    }
                    <button class="bg-rose-500 hover:bg-rose-600 text-white font-semibold py-1.5 px-4 rounded shadow-sm transition transform hover:-translate-y-0.5" onclick="deleteAthlete(${athlete.id})">حذف</button>
                </td>
            </tr>
        `;
    }).join('');

    html += rowsHtml + `</tbody></table>`;
    listContainer.innerHTML = html;
}

// عرض الجدول عند تحميل الصفحة لأول مرة
fetchAthletes();

// التحقق من الرابط لفتح نافذة الإضافة تلقائياً إذا تم التوجيه من صفحة أخرى
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('add') === 'true') {
        openRegisterModal();
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});

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