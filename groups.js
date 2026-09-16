let groups = [];
let athletes = [];
let selectedAthleteIds = new Set();
let selectedGroupIds = new Set();

const $ = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
const athleteName = athlete => `${athlete.firstName || ''} ${athlete.lastName || ''}`.trim();

function setStatus(message, type = 'success') {
    const status = $('pageStatus');
    status.textContent = message;
    status.className = `mb-6 rounded-xl p-4 text-sm font-bold ${type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`;
}

function setEditorVisibility(isVisible) {
    $('groupEditor').classList.toggle('hidden', !isVisible);
    $('groupsLayout').classList.toggle('lg:grid-cols-1', !isVisible);
    $('groupsLayout').classList.toggle('lg:grid-cols-[minmax(0,1fr)_380px]', isVisible);
    $('newGroupButton').textContent = isVisible ? 'إخفاء فوج جديد' : '+ فوج جديد';
    $('newGroupButton').setAttribute('aria-expanded', String(isVisible));
}

function resetEditor() {
    $('groupForm').reset();
    $('groupId').value = '';
    selectedAthleteIds = new Set();
    $('editorTitle').textContent = 'فوج جديد';
    $('deleteGroupButton').classList.add('hidden');
    renderAthletes();
    setEditorVisibility(false);
}

function renderAthletes() {
    const query = ($('athleteSearch').value || '').trim().toLocaleLowerCase('ar');
    const visibleAthletes = athletes.filter(athlete => !athlete.isArchived && athleteName(athlete).toLocaleLowerCase('ar').includes(query));
    $('athletesList').innerHTML = visibleAthletes.length ? visibleAthletes.map(athlete => {
        const id = String(athlete.id);
        return `<label class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-blue-50 cursor-pointer"><input type="checkbox" value="${id}" class="athlete-checkbox w-4 h-4 accent-blue-600" ${selectedAthleteIds.has(id) ? 'checked' : ''}><span class="font-bold text-slate-700">${escapeHtml(athleteName(athlete))}</span></label>`;
    }).join('') : '<p class="text-sm text-slate-500 py-3 text-center">لا يوجد رياضيون مطابقون.</p>';
    document.querySelectorAll('.athlete-checkbox').forEach(input => input.addEventListener('change', event => {
        if (event.target.checked) selectedAthleteIds.add(event.target.value);
        else selectedAthleteIds.delete(event.target.value);
        updateSelectedCount();
    }));
    updateSelectedCount();
}

function updateSelectedCount() {
    $('selectedCount').textContent = `${selectedAthleteIds.size} محدد`;
}

function updateSelectedGroupsCount() {
    $('selectedGroupsCount').textContent = `${selectedGroupIds.size} فوج محدد`;
}

function renderGroups() {
    $('groupsList').innerHTML = groups.length ? groups.map(group => `
        <article class="group relative bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:border-blue-300 hover:shadow-lg transition-colors">
            <div class="flex items-start justify-between gap-3"><div class="flex items-start gap-3"><input type="checkbox" data-group-checkbox="${group.id}" class="group-checkbox mt-1 h-5 w-5 accent-blue-600" ${selectedGroupIds.has(String(group.id)) ? 'checked' : ''} aria-label="تحديد ${escapeHtml(group.name)}"><div><h2 class="text-xl font-black text-slate-800">${escapeHtml(group.name)}</h2><p class="text-sm text-blue-600 font-bold mt-1">${escapeHtml(group.goal) || 'هدف غير محدد'}</p></div></div><span class="rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-black">${group.memberCount} رياضي</span></div>
            <dl class="mt-4 space-y-2 text-sm"><div class="flex gap-2"><dt class="font-black text-slate-500">الموقع:</dt><dd class="text-slate-700">${escapeHtml(group.location) || 'غير محدد'}</dd></div><div class="flex gap-2"><dt class="font-black text-slate-500">الظروف:</dt><dd class="text-slate-700">${escapeHtml(group.circumstances) || 'غير محددة'}</dd></div></dl>
            <p class="mt-4 border-t border-slate-100 pt-3 text-xs font-bold text-slate-400">مرّر المؤشر لعرض قائمة الرياضيين</p>
            <div class="invisible absolute inset-x-4 top-full z-30 mt-2 translate-y-1 rounded-2xl border border-blue-100 bg-white p-4 opacity-0 shadow-xl transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                <h3 class="mb-3 text-sm font-black text-slate-700">رياضيّو الفوج (${group.memberCount})</h3>
                ${group.memberAthletes.length ? `<ul class="space-y-1.5">${group.memberAthletes.map(athlete => `<li class="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700"><span class="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs text-blue-700">${escapeHtml((athlete.firstName || '?').charAt(0))}</span><span>${escapeHtml(athleteName(athlete))}</span>${athlete.isArchived ? '<span class="mr-auto text-xs font-bold text-slate-400">أرشيف</span>' : ''}</li>`).join('')}</ul>` : '<p class="text-sm text-slate-400">لم يتم اختيار رياضيين لهذا الفوج.</p>'}
            </div>
            ${group.notes ? `<p class="mt-3 text-sm text-slate-500 border-t border-slate-100 pt-3">${escapeHtml(group.notes)}</p>` : ''}
            <button type="button" data-edit-group="${group.id}" class="mt-5 w-full rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold py-2.5">تعديل الفوج والرياضيين</button>
        </article>`).join('') : '<div class="md:col-span-2 bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500 font-bold">لا توجد أفواج بعد. أنشئ أول فوج من النموذج.</div>';
    document.querySelectorAll('[data-edit-group]').forEach(button => button.addEventListener('click', () => editGroup(Number(button.dataset.editGroup))));
    document.querySelectorAll('[data-group-checkbox]').forEach(checkbox => checkbox.addEventListener('change', event => {
        if (event.target.checked) selectedGroupIds.add(event.target.value);
        else selectedGroupIds.delete(event.target.value);
        updateSelectedGroupsCount();
    }));
    updateSelectedGroupsCount();
}

function getSelectedGroups() {
    return groups.filter(group => selectedGroupIds.has(String(group.id)));
}

function requireSelectedGroups() {
    const selected = getSelectedGroups();
    if (!selected.length) {
        setStatus('حدد فوجًا واحدًا على الأقل قبل التصدير.', 'error');
        return null;
    }
    return selected;
}

function csvCell(value) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function exportToExcel() {
    const selected = requireSelectedGroups();
    if (!selected) return;
    const rows = [['اسم الفوج', 'الهدف', 'الموقع', 'الظروف', 'الملاحظات', 'عدد الرياضيين', 'الرياضيون']];
    selected.forEach(group => rows.push([
        group.name,
        group.goal,
        group.location,
        group.circumstances,
        group.notes,
        group.memberCount,
        group.memberAthletes.map(athleteName).join('، ')
    ]));
    const csv = '\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `افواج-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    setStatus(`تم تصدير ${selected.length} فوج إلى ملف Excel.`);
}

function exportToPdf() {
    const selected = requireSelectedGroups();
    if (!selected) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        setStatus('تعذر فتح نافذة PDF. اسمح بالنوافذ المنبثقة ثم حاول مرة أخرى.', 'error');
        return;
    }
    const cards = selected.map(group => `<section class="group"><h2>${escapeHtml(group.name)}</h2><p><b>الهدف:</b> ${escapeHtml(group.goal) || 'غير محدد'} | <b>الموقع:</b> ${escapeHtml(group.location) || 'غير محدد'} | <b>الظروف:</b> ${escapeHtml(group.circumstances) || 'غير محددة'}</p><p><b>الملاحظات:</b> ${escapeHtml(group.notes) || 'لا توجد'}</p><h3>الرياضيون (${group.memberCount})</h3><ul>${group.memberAthletes.length ? group.memberAthletes.map(athlete => `<li>${escapeHtml(athleteName(athlete))}${athlete.isArchived ? ' (أرشيف)' : ''}</li>`).join('') : '<li>لا يوجد رياضيون</li>'}</ul></section>`).join('');
    printWindow.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>تقرير الأفواج</title><style>@page{size:auto;margin:8mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172033;margin:0;padding:0;font-size:11px}h1{text-align:center;margin:0 0 10px;font-size:20px}.groups-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;align-items:start}.group{border:1px solid #cbd5e1;border-radius:7px;padding:8px;margin:0;break-inside:avoid}.group h2{margin:0 0 4px;color:#1d4ed8;font-size:15px}.group p{margin:3px 0;line-height:1.35}.group h3{border-top:1px solid #e2e8f0;padding-top:5px;margin:6px 0 3px;font-size:12px}.group ul{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:10px;row-gap:1px;margin:0;padding-right:18px}.group li{margin:1px 0;line-height:1.25}@media print{body{margin:0;padding:0}.groups-grid{gap:6px}.group{break-inside:avoid}}</style></head><body><h1>تقرير الأفواج</h1><main class="groups-grid">${cards}</main></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => printWindow.print();
    setStatus(`تم تجهيز ${selected.length} فوج للطباعة والحفظ بصيغة PDF.`);
}

function selectAllGroups() {
    selectedGroupIds = new Set(groups.map(group => String(group.id)));
    renderGroups();
}

function clearSelectedGroups() {
    selectedGroupIds = new Set();
    renderGroups();
}

async function loadData() {
    const [groupsResponse, athletesResponse] = await Promise.all([
        _supabase.from('athlete_groups').select('*').order('created_at', { ascending: false }),
        _supabase.from('athletes').select('id, firstName, lastName, isArchived').order('firstName', { ascending: true })
    ]);
    if (groupsResponse.error || athletesResponse.error) {
        setStatus('تعذر تحميل الأفواج. شغّل ملف groups_schema.sql في Supabase ثم أعد تحميل الصفحة.', 'error');
        return;
    }
    athletes = athletesResponse.data || [];
    const membershipsResponse = await _supabase.from('athlete_group_members').select('group_id, athlete_id');
    if (membershipsResponse.error) { setStatus('تعذر تحميل أعضاء الأفواج: ' + membershipsResponse.error.message, 'error'); return; }
    groups = (groupsResponse.data || []).map(group => {
        const memberIds = membershipsResponse.data.filter(member => member.group_id === group.id).map(member => member.athlete_id);
        const memberAthletes = memberIds.map(memberId => athletes.find(athlete => athlete.id === memberId)).filter(Boolean).sort((first, second) => athleteName(first).localeCompare(athleteName(second), 'ar'));
        return { ...group, memberIds, memberAthletes, memberCount: memberAthletes.length };
    });
    renderGroups();
    renderAthletes();
}

function editGroup(id) {
    const group = groups.find(item => item.id === id);
    if (!group) return;
    $('groupId').value = group.id;
    $('groupName').value = group.name || '';
    $('groupGoal').value = group.goal || '';
    $('groupLocation').value = group.location || '';
    $('groupCircumstances').value = group.circumstances || '';
    $('groupNotes').value = group.notes || '';
    selectedAthleteIds = new Set(group.memberIds.map(String));
    setEditorVisibility(true);
    $('editorTitle').textContent = 'تعديل الفوج';
    $('deleteGroupButton').classList.remove('hidden');
    renderAthletes();
    group.memberIds.forEach(id => { const checkbox = document.querySelector(`#athletesList input[value="${id}"]`); if (checkbox) checkbox.checked = true; });
    updateSelectedCount();
    $('groupEditor').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function saveGroup(event) {
    event.preventDefault();
    const payload = { name: $('groupName').value.trim(), goal: $('groupGoal').value.trim(), location: $('groupLocation').value.trim(), circumstances: $('groupCircumstances').value.trim(), notes: $('groupNotes').value.trim() };
    const groupId = Number($('groupId').value);
    const response = groupId ? await _supabase.from('athlete_groups').update(payload).eq('id', groupId).select().single() : await _supabase.from('athlete_groups').insert(payload).select().single();
    if (response.error) { setStatus('تعذر حفظ الفوج: ' + response.error.message, 'error'); return; }
    const savedGroupId = response.data.id;
    const selectedIds = [...selectedAthleteIds].map(Number);
    const removeResponse = await _supabase.from('athlete_group_members').delete().eq('group_id', savedGroupId);
    if (removeResponse.error) { setStatus('تم حفظ بيانات الفوج لكن تعذر تحديث الرياضيين: ' + removeResponse.error.message, 'error'); return; }
    if (selectedIds.length) {
        const insertResponse = await _supabase.from('athlete_group_members').insert(selectedIds.map(athleteId => ({ group_id: savedGroupId, athlete_id: athleteId })));
        if (insertResponse.error) { setStatus('تم حفظ الفوج لكن تعذر إضافة الرياضيين: ' + insertResponse.error.message, 'error'); return; }
    }
    setStatus('تم حفظ الفوج وتحديث الرياضيين بنجاح.');
    resetEditor();
    await loadData();
}

async function deleteGroup() {
    const groupId = Number($('groupId').value);
    if (!groupId || !confirm('هل تريد حذف هذا الفوج؟ لن يتم حذف الرياضيين.')) return;
    const response = await _supabase.from('athlete_groups').delete().eq('id', groupId);
    if (response.error) { setStatus('تعذر حذف الفوج: ' + response.error.message, 'error'); return; }
    setStatus('تم حذف الفوج دون حذف أي رياضي.');
    resetEditor();
    loadData();
}

$('groupForm').addEventListener('submit', saveGroup);
$('newGroupButton').addEventListener('click', () => {
    const isVisible = !$('groupEditor').classList.contains('hidden');
    if (isVisible) {
        resetEditor();
        return;
    }
    resetEditor();
    setEditorVisibility(true);
    $('groupEditor').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
$('deleteGroupButton').addEventListener('click', deleteGroup);
$('athleteSearch').addEventListener('input', renderAthletes);
$('selectAllGroupsButton').addEventListener('click', selectAllGroups);
$('clearGroupsButton').addEventListener('click', clearSelectedGroups);
$('exportExcelButton').addEventListener('click', exportToExcel);
$('exportPdfButton').addEventListener('click', exportToPdf);
loadData();