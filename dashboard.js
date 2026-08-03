document.addEventListener('DOMContentLoaded', async () => {
    const formatDate = (date) => date.toISOString().split('T')[0];
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    document.getElementById('attendanceStartDate').value = formatDate(firstDayOfMonth);
    document.getElementById('attendanceEndDate').value = formatDate(lastDayOfMonth);

    try {
        // جلب جميع البيانات اللازمة للإحصائيات
        const [athletesRes, paymentsRes] = await Promise.all([
            _supabase.from('athletes').select('*'),
            _supabase.from('payments').select('*')
        ]);

        if (athletesRes.error) throw athletesRes.error;
        if (paymentsRes.error) throw paymentsRes.error;

        const allAthletes = athletesRes.data || [];
        const allPayments = paymentsRes.data || [];

        // تحديث sessionsLimit ديناميكياً
        allAthletes.forEach(a => {
            const subPayments = allPayments.filter(p => p.athlete_id === a.id && (!p.type || p.type === 'subscription'));
            const totalPaid = subPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
            a.sessionsLimit = (totalPaid / 1000) * 12;
        });

        const activeAthletes = allAthletes.filter(a => !a.isArchived);
        const inactiveAthletes = allAthletes.filter(a => a.isArchived);

        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const newThisMonth = activeAthletes.filter(a => a.subDate && a.subDate.startsWith(currentMonth)).length;

        const malesCount = activeAthletes.filter(a => a.gender === 'ذكر').length;
        const femalesCount = activeAthletes.filter(a => a.gender === 'أنثى').length;

        // تحديث العدادات في واجهة المستخدم
        document.getElementById('statTotal').innerText = allAthletes.length;
        document.getElementById('statActive').innerText = activeAthletes.length;
        document.getElementById('statInactive').innerText = inactiveAthletes.length;
        document.getElementById('statNew').innerText = newThisMonth;
        document.getElementById('statMales').innerText = malesCount;
        document.getElementById('statFemales').innerText = femalesCount;

        // حساب توزيع الأعمار للرياضيين النشطين
        let rawAgeGroups = {};
        activeAthletes.forEach(a => {
            if (a.dob) {
                const birthYear = new Date(a.dob).getFullYear();
                const currentYear = new Date().getFullYear();
                const age = currentYear - birthYear;
                const ageLabel = age + ' سنة';
                rawAgeGroups[ageLabel] = (rawAgeGroups[ageLabel] || 0) + 1;
            }
        });

        // ترتيب الفئات العمرية من الأصغر للأكبر
        let ageGroups = {};
        Object.keys(rawAgeGroups).sort((a, b) => parseInt(a) - parseInt(b)).forEach(key => {
            ageGroups[key] = rawAgeGroups[key];
        });

        // رسم المخطط البياني
        const ctxAge = document.getElementById('ageChart');
        if (ctxAge) {
            new Chart(ctxAge.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: Object.keys(ageGroups),
                    datasets: [{
                        label: 'عدد الرياضيين',
                        data: Object.values(ageGroups),
                        backgroundColor: '#6366f1', // لون نيلجي يتوافق مع التصميم
                        borderRadius: 6,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
        }

        // --- فلترة قائمة الرياضيين ---
        const filterYearSelect = document.getElementById('filterYear');
        const filterGenderSelect = document.getElementById('filterGender');
        const filterStatusSelect = document.getElementById('filterStatus');
        const filteredAthletesList = document.getElementById('sortedAthletesList');
        const filteredAthletesCount = document.getElementById('filteredAthletesCount');

        // ملء قائمة السنوات
        const years = [...new Set(allAthletes.map(a => a.dob ? new Date(a.dob).getFullYear() : null).filter(y => y).sort((a, b) => b - a))];
        years.forEach(year => {
            filterYearSelect.innerHTML += `<option value="${year}">${year}</option>`;
        });

        const renderFilteredAthletes = () => {
            const year = filterYearSelect.value;
            const gender = filterGenderSelect.value;
            const status = filterStatusSelect.value;

            const filtered = allAthletes.filter(a => {
                const athleteYear = a.dob ? new Date(a.dob).getFullYear().toString() : null;
                const athleteStatus = a.isArchived ? 'archived' : 'active';

                const yearMatch = (year === 'all') || (athleteYear === year);
                const genderMatch = (gender === 'all') || (a.gender === gender);
                const statusMatch = (status === 'all') || (athleteStatus === status);

                return yearMatch && genderMatch && statusMatch;
            });

            filteredAthletesCount.innerText = filtered.length;

            if (filtered.length === 0) {
                filteredAthletesList.innerHTML = `<div class="p-4 text-center text-slate-500 col-span-full">لا يوجد رياضيون يطابقون معايير البحث.</div>`;
                return;
            }

            filteredAthletesList.innerHTML = filtered.map(a => {
                const age = a.dob ? new Date().getFullYear() - new Date(a.dob).getFullYear() : 'غير معروف';
                const statusClass = a.isArchived ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-600';
                const statusText = a.isArchived ? 'مؤرشف' : 'نشط';
                return `
                    <div class="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
                        <div class="flex items-center gap-3">
                            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(a.firstName)}+${encodeURIComponent(a.lastName)}&background=818cf8&color=fff&rounded=true&font-size=0.4" class="w-10 h-10 rounded-full shadow-sm" alt="Avatar" loading="lazy">
                            <div>
                                <div class="font-bold text-slate-700 text-sm">${a.firstName} ${a.lastName}</div>
                                <div class="text-xs text-slate-500">${age} سنة - ${a.gender}</div>
                            </div>
                        </div>
                        <div class="text-xs font-bold px-2.5 py-1 rounded-full ${statusClass}">${statusText}</div>
                    </div>
                `;
            }).join('');
        };

        filterYearSelect.addEventListener('change', renderFilteredAthletes);
        filterGenderSelect.addEventListener('change', renderFilteredAthletes);
        filterStatusSelect.addEventListener('change', renderFilteredAthletes);
        renderFilteredAthletes(); // العرض الأولي

        // --- إحصائيات الحضور ---
        const sessionCounts = {};
        activeAthletes.forEach(a => {
            if (a.attendanceDates && Array.isArray(a.attendanceDates)) {
                a.attendanceDates.forEach(date => {
                    sessionCounts[date] = (sessionCounts[date] || 0) + 1;
                });
            }
        });

        const sortedDates = Object.keys(sessionCounts).sort();
        
        // آخر 10 حصص
        const last10Dates = sortedDates.slice(-10);
        const last10Counts = last10Dates.map(d => sessionCounts[d]);

        // أعلى وأقل حصة حضوراً
        let highestSessionCount = 0, highestSessionDate = '-';
        let lowestSessionCount = Infinity, lowestSessionDate = '-';
        let totalAttendanceCount = 0;

        sortedDates.forEach(date => {
            const count = sessionCounts[date];
            totalAttendanceCount += count;
            if (count > highestSessionCount) { highestSessionCount = count; highestSessionDate = date; }
            if (count < lowestSessionCount) { lowestSessionCount = count; lowestSessionDate = date; }
        });
        if (sortedDates.length === 0) lowestSessionCount = 0;

        // المتوسط الأسبوعي والشهري (بافتراض 3 حصص أسبوعياً كمعيار)
        let avgPerSession = sortedDates.length > 0 ? (totalAttendanceCount / sortedDates.length) : 0;
        let weeklyAvg = Math.round(avgPerSession * 3);
        let monthlyAvg = Math.round(avgPerSession * 12);

        // نسبة الغياب الإجمالية بناءً على الحد الأقصى للحصص لكل رياضي
        let totalExpected = 0;
        let totalActual = 0;
        activeAthletes.forEach(a => {
            totalExpected += (a.sessionsLimit || 0);
            totalActual += (a.attendance || 0);
        });
        let overallAbsenceRate = totalExpected > 0 ? Math.round(((totalExpected - totalActual) / totalExpected) * 100) : 0;
        if (overallAbsenceRate < 0) overallAbsenceRate = 0;

        document.getElementById('statWeeklyAvg').innerText = weeklyAvg;
        document.getElementById('statMonthlyAvg').innerText = monthlyAvg;
        document.getElementById('statHighestSession').innerText = highestSessionCount;
        document.getElementById('statHighestDate').innerText = highestSessionDate;
        document.getElementById('statLowestSession').innerText = lowestSessionCount;
        document.getElementById('statLowestDate').innerText = lowestSessionDate;
        document.getElementById('statAbsenceRate').innerText = overallAbsenceRate + '%';

        // رسم بياني لآخر 10 حصص
        const ctxAttendance = document.getElementById('attendanceChart');
        if (ctxAttendance) {
            new Chart(ctxAttendance.getContext('2d'), {
                type: 'line',
                data: {
                    labels: last10Dates.length > 0 ? last10Dates : ['لا توجد حصص'],
                    datasets: [{
                        label: 'عدد الحضور',
                        data: last10Counts.length > 0 ? last10Counts : [0],
                        borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 3, fill: true, tension: 0.4,
                        pointBackgroundColor: '#2563eb', pointRadius: 5
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
            });
        }

        // ترتيب الالتزام للرياضيين النشطين
        const commitmentData = activeAthletes.map(a => {
            const limit = a.sessionsLimit || 0;
            const att = a.attendance || 0;
            const absence = Math.max(0, limit - att);
            const absenceRate = limit > 0 ? Math.round((absence / limit) * 100) : 0;
            return { ...a, absence, absenceRate, att };
        });

        const topCommitted = [...commitmentData].sort((a, b) => b.att - a.att).slice(0, 10);
        const leastCommitted = [...commitmentData].sort((a, b) => b.absenceRate - a.absenceRate).slice(0, 10); // الأعلى في نسبة الغياب

        const buildListHtml = (data) => {
            if (data.length === 0) return `<div class="p-4 text-center text-slate-500">لا توجد بيانات.</div>`;
            return data.map(a => `
                <div class="flex items-center justify-between p-3 sm:p-4 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
                    <div class="font-bold text-slate-700 flex-grow text-sm sm:text-base truncate pl-2">${a.firstName} ${a.lastName}</div>
                    <div class="flex items-center gap-4 sm:gap-6 flex-shrink-0">
                        <div class="text-center w-12 sm:w-16">
                            <span class="text-[10px] text-slate-400 block md:hidden mb-0.5">حضور</span>
                            <span class="font-black text-emerald-600 text-sm sm:text-base">${a.att}</span>
                        </div>
                        <div class="text-center w-14 sm:w-20 border-r border-slate-100 md:border-none pr-4 md:pr-0">
                            <span class="text-[10px] text-slate-400 block md:hidden mb-0.5">غياب</span>
                            <div class="flex flex-col items-center">
                                <span class="text-rose-600 font-bold text-sm sm:text-base">${a.absence}</span>
                                <span class="text-[10px] text-slate-400 leading-none mt-1" dir="ltr">${a.absenceRate}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        };

        document.getElementById('topCommittedList').innerHTML = buildListHtml(topCommitted);
        document.getElementById('leastCommittedList').innerHTML = buildListHtml(leastCommitted);

        // --- قائمة الحضور ليوم محدد ---
        const attendanceDatePicker = document.getElementById('attendanceDatePicker');
        const attendanceByDateList = document.getElementById('attendanceByDateList');
        const attendanceByDateCount = document.getElementById('attendanceByDateCount');
        const attendanceByDateCountNumber = document.getElementById('attendanceByDateCountNumber');

        const todayStr = new Date().toISOString().split('T')[0];
        attendanceDatePicker.value = todayStr;

        const renderAttendanceByDate = () => {
            const selectedDate = attendanceDatePicker.value;
            if (!selectedDate) {
                attendanceByDateList.innerHTML = `<div class="p-4 text-center text-slate-500">اختر تاريخاً لعرض قائمة الحضور.</div>`;
                attendanceByDateCount.classList.add('hidden');
                return;
            }

            const attendees = activeAthletes.filter(a => a.attendanceDates && a.attendanceDates.includes(selectedDate));
            
            if (attendees.length === 0) {
                attendanceByDateList.innerHTML = `<div class="p-4 text-center text-slate-500">لا يوجد حضور مسجل في هذا التاريخ.</div>`;
                attendanceByDateCount.classList.add('hidden');
                return;
            }

            attendanceByDateList.innerHTML = attendees.map(a => `<div class="flex items-center justify-between p-3 sm:p-4 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"><div class="font-bold text-slate-700 flex-grow text-sm sm:text-base truncate pl-2">${a.firstName} ${a.lastName}</div><div class="text-center w-24 sm:w-32 md:border-none pr-2 sm:pr-0"><span class="text-[10px] text-slate-400 block md:hidden mb-0.5">الهاتف</span><a href="tel:${a.guardianPhone}" class="text-blue-500 hover:underline dir-ltr inline-block font-bold text-[11px] sm:text-sm whitespace-nowrap">${a.guardianPhone || 'لا يوجد'}</a></div></div>`).join('');
            
            attendanceByDateCountNumber.innerText = attendees.length;
            attendanceByDateCount.classList.remove('hidden');
        };

        attendanceDatePicker.addEventListener('change', renderAttendanceByDate);
        renderAttendanceByDate(); // عرض قائمة اليوم فوراً

        // --- إحصائيات الاشتراكات والدفع ---
        const activeSubsCount = activeAthletes.filter(a => a.attendance < (a.sessionsLimit || 0)).length;
        const expiredSubs = activeAthletes.filter(a => a.attendance >= (a.sessionsLimit || 0));
        const expiredSubsCount = expiredSubs.length;
        
        const latePaymentsCount = expiredSubsCount; // المتأخرون هم نفسهم أصحاب الاشتراكات المنتهية

        const monthlyRevenue = allPayments
            .filter(p => p.date && p.date.startsWith(currentMonth))
            .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

        // حساب الرياضيين الذين جددوا اشتراكاتهم هذا الشهر
        const renewedAthletesThisMonth = new Set(
            allPayments.filter(p => p.date && p.date.startsWith(currentMonth) && (p.type === 'subscription' || !p.type)).map(p => p.athlete_id)
        ).size;
        
        const renewalRate = activeAthletes.length > 0 ? Math.round((renewedAthletesThisMonth / activeAthletes.length) * 100) : 0;

        document.getElementById('statActiveSubs').innerText = activeSubsCount;
        document.getElementById('statExpiredSubs').innerText = expiredSubsCount;
        document.getElementById('statLatePayments').innerText = latePaymentsCount;
        document.getElementById('statMonthlyRevenue').innerText = monthlyRevenue.toLocaleString() + ' د.ج';
        document.getElementById('statRenewalRate').innerText = renewalRate + '%';

        const lateList = document.getElementById('latePaymentsList');
        if (expiredSubs.length === 0) {
            lateList.innerHTML = `<div class="p-4 text-center text-slate-500">لا يوجد رياضيون متأخرون في الدفع حالياً.</div>`;
        } else {
            expiredSubs.sort((a, b) => (b.attendance - (b.sessionsLimit || 0)) - (a.attendance - (a.sessionsLimit || 0)));
            lateList.innerHTML = expiredSubs.map(a => `
                <div class="flex items-center justify-between p-3 sm:p-4 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
                    <div class="font-bold text-slate-700 flex-grow text-sm sm:text-base truncate pl-2">${a.firstName} ${a.lastName}</div>
                    <div class="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                        <div class="text-center w-16 sm:w-24">
                            <span class="text-[10px] text-slate-400 block md:hidden mb-0.5">حصص عليه</span>
                            <span class="bg-rose-100 text-rose-700 font-bold px-2 py-1 rounded text-xs sm:text-sm">${a.attendance - (a.sessionsLimit || 0)}</span>
                        </div>
                        <div class="text-center w-20 sm:w-32 border-r border-slate-100 md:border-none pr-2 sm:pr-0">
                            <span class="text-[10px] text-slate-400 block md:hidden mb-0.5">الهاتف</span>
                            <a href="tel:${a.guardianPhone}" class="text-blue-500 hover:underline dir-ltr inline-block font-bold text-[11px] sm:text-sm whitespace-nowrap">${a.guardianPhone || 'لا يوجد'}</a>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        // --- إحصائيات الحضور الفردي ---
        const individualAttendanceBtn = document.getElementById('runIndividualAttendance');
        const individualAttendanceList = document.getElementById('individualAttendanceList');
        const attendanceStartDateInput = document.getElementById('attendanceStartDate');
        const attendanceEndDateInput = document.getElementById('attendanceEndDate');

        const renderIndividualAttendanceStats = () => {
            const startDate = attendanceStartDateInput.value;
            const endDate = attendanceEndDateInput.value;
            if (!startDate || !endDate) return;

            const attendanceCounts = activeAthletes.map(a => {
                const count = (a.attendanceDates || []).filter(d => d >= startDate && d <= endDate).length;
                return { name: `${a.firstName} ${a.lastName}`, count };
            }).sort((a, b) => b.count - a.count);

            if (attendanceCounts.length === 0) {
                individualAttendanceList.innerHTML = `<div class="p-4 text-center text-slate-500">لا توجد بيانات حضور في هذه الفترة.</div>`;
            } else {
                individualAttendanceList.innerHTML = attendanceCounts.map(item => `<div class="flex items-center justify-between p-3 sm:p-4 bg-white border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"><div class="font-bold text-slate-700 flex-grow text-sm sm:text-base truncate pl-2">${item.name}</div><div class="text-center w-28"><span class="bg-cyan-100 text-cyan-800 font-black px-3 py-1.5 rounded-lg text-sm">${item.count}</span></div></div>`).join('');
            }
        };

        individualAttendanceBtn.addEventListener('click', renderIndividualAttendanceStats);
        attendanceStartDateInput.addEventListener('change', renderIndividualAttendanceStats);
        attendanceEndDateInput.addEventListener('change', renderIndividualAttendanceStats);
        renderIndividualAttendanceStats(); // استدعاء أولي

        // --- منطق طباعة وتصدير قائمة الرياضيين ---
        const exportPdfBtn = document.getElementById('exportPdfBtn');
        const exportExcelBtn = document.getElementById('exportExcelBtn');
        const exportableTableContainer = document.getElementById('exportableTableContainer');
        const loadMoreContainer = document.getElementById('loadMoreContainer');
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        const exportableListCount = document.getElementById('exportableListCount');
        const exportableAthletesTbody = document.getElementById('exportableAthletesTbody');
        const exportFilters = {
            ageRange: document.getElementById('exportAgeRange'),
            gender: document.getElementById('exportGender'),
            status: document.getElementById('exportStatus')
        };
        let currentSort = { key: 'name', order: 'asc' }; // Default sort: Name, Ascending
        let currentlyDisplayedForExport = [];
        let currentlyRenderedCount = 0;
        const RENDER_BATCH_SIZE = 10;

        const filterAthletesForExport = (athletes) => {
            const ageRange = exportFilters.ageRange.value;
            const gender = exportFilters.gender.value;
            const status = exportFilters.status.value;

            return athletes.filter(a => {
                const athleteAge = a.dob ? new Date().getFullYear() - new Date(a.dob).getFullYear() : null;
                const athleteStatus = a.isArchived ? 'archived' : 'active';

                const genderMatch = (gender === 'all') || (a.gender === gender);
                const statusMatch = (status === 'all') || (athleteStatus === status);
                
                let ageMatch = (ageRange === 'all');
                if (!ageMatch && athleteAge !== null) {
                    const [min, max] = ageRange.split('-').map(Number);
                    if (ageRange.includes('+')) {
                        ageMatch = athleteAge >= min;
                    } else {
                        ageMatch = athleteAge >= min && athleteAge <= max;
                    }
                }

                return genderMatch && statusMatch && ageMatch;
            });
        };

        const renderMoreRows = () => {
            const fragment = document.createDocumentFragment();
            const nextBatchEnd = Math.min(currentlyRenderedCount + RENDER_BATCH_SIZE, currentlyDisplayedForExport.length);
            
            for (let i = currentlyRenderedCount; i < nextBatchEnd; i++) {
                const a = currentlyDisplayedForExport[i];
                const age = a.dob ? new Date().getFullYear() - new Date(a.dob).getFullYear() : '؟';
                const statusClass = a.isArchived ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-600';
                const statusText = a.isArchived ? 'مؤرشف' : 'نشط';
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-slate-50 transition-colors';
                tr.innerHTML = `
                    <td class="px-4 py-3 text-center font-bold text-slate-500">${i + 1}</td>
                    <td class="px-4 py-3 font-bold text-slate-700">${a.firstName} ${a.lastName}</td>
                    <td class="px-4 py-3 text-center font-bold text-slate-600">${age}</td>
                    <td class="px-4 py-3 text-center text-sm text-slate-600">${a.gender}</td>
                    <td class="px-4 py-3 text-center"><span class="text-xs font-bold px-2.5 py-1 rounded-full ${statusClass}">${statusText}</span></td>
                `;
                fragment.appendChild(tr);
            }
            exportableAthletesTbody.appendChild(fragment);
            currentlyRenderedCount = nextBatchEnd;

            // إظهار أو إخفاء زر "عرض المزيد"
            if (currentlyRenderedCount < currentlyDisplayedForExport.length) {
                loadMoreContainer.classList.remove('hidden');
            } else {
                loadMoreContainer.classList.add('hidden');
            }
        };

        const renderExportableList = () => {
            let filtered = filterAthletesForExport(allAthletes);

            // تطبيق الفرز
            filtered.sort((a, b) => {
                let valA, valB;
                switch (currentSort.key) {
                    case 'age':
                        valA = a.dob ? new Date().getFullYear() - new Date(a.dob).getFullYear() : (currentSort.order === 'asc' ? Infinity : -Infinity); // Unknown ages to the end
                        valB = b.dob ? new Date().getFullYear() - new Date(b.dob).getFullYear() : (currentSort.order === 'asc' ? Infinity : -Infinity);
                        break;
                    case 'gender':
                        valA = a.gender || '';
                        valB = b.gender || '';
                        break;
                    case 'status':
                        valA = a.isArchived ? 'مؤرشف' : 'نشط';
                        valB = b.isArchived ? 'مؤرشف' : 'نشط';
                        break;
                    case 'name':
                    default:
                        valA = `${a.firstName} ${a.lastName}`;
                        valB = `${b.firstName} ${b.lastName}`;
                        break;
                }

                if (typeof valA === 'string') {
                    return currentSort.order === 'asc' ? valA.localeCompare(valB, 'ar') : valB.localeCompare(valA, 'ar');
                } else {
                    return currentSort.order === 'asc' ? valA - valB : valB - valA;
                }
            });

            currentlyDisplayedForExport = filtered;
            exportableAthletesTbody.innerHTML = ''; // مسح القائمة القديمة
            currentlyRenderedCount = 0;
            exportableTableContainer.scrollTop = 0; // العودة لأعلى الجدول عند الفلترة

            if (filtered.length === 0) {
                exportableAthletesTbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-500">لا يوجد رياضيون يطابقون معايير الفلترة.</td></tr>`;
                loadMoreContainer.classList.add('hidden');
                exportableListCount.textContent = 'الإجمالي: 0';
                return;
            }

            renderMoreRows(); // عرض أول 10 لاعبين
            
            exportableListCount.textContent = `الإجمالي: ${filtered.length}`;
        };

        const updateSortIndicators = () => {
            exportableTableContainer.querySelectorAll('thead th[data-sort]').forEach(th => {
                const indicator = th.querySelector('.sort-indicator');
                if (!indicator) return;

                if (th.dataset.sort === currentSort.key) {
                    indicator.innerHTML = currentSort.order === 'asc' ? '▲' : '▼';
                    th.classList.add('text-blue-600');
                } else {
                    indicator.innerHTML = '';
                    th.classList.remove('text-blue-600');
                }
            });
        };
        exportExcelBtn.addEventListener('click', () => {
            if (currentlyDisplayedForExport.length === 0) {
                alert('لا يوجد رياضيون يطابقون معايير الفلترة للتصدير.');
                return;
            }
            const dataForSheet = currentlyDisplayedForExport.map((a, index) => ({
                '#': index + 1,
                'الاسم الكامل': `${a.firstName} ${a.lastName}`,
                'العمر': a.dob ? new Date().getFullYear() - new Date(a.dob).getFullYear() : 'غير معروف',
                'الجنس': a.gender,
                'الحالة': a.isArchived ? 'مؤرشف' : 'نشط'
            }));

            const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "قائمة الرياضيين");
            XLSX.writeFile(workbook, "قائمة_الرياضيين.xlsx");
        });

        exportPdfBtn.addEventListener('click', () => {
            if (currentlyDisplayedForExport.length === 0) {
                alert('لا يوجد رياضيون يطابقون معايير الفلترة للطباعة.');
                return;
            }

            const tableRows = currentlyDisplayedForExport.map((a, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${a.firstName} ${a.lastName}</td>
                    <td>${a.dob ? new Date().getFullYear() - new Date(a.dob).getFullYear() : 'غير معروف'}</td>
                    <td>${a.gender}</td>
                    <td>${a.isArchived ? 'مؤرشف' : 'نشط'}</td>
                </tr>
            `).join('');

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>قائمة الرياضيين</title>
                        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap" rel="stylesheet">
                        <style>
                            body { font-family: 'Tajawal', sans-serif; direction: rtl; }
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                            th, td { border: 1px solid #ddd; padding: 10px; text-align: right; }
                            th { background-color: #f2f2f2; font-weight: bold; }
                            h1 { text-align: center; }
                            @media print {
                                @page { size: A4; margin: 20mm; }
                                button { display: none; }
                            }
                        </style>
                    </head>
                    <body>
                        <h1>قائمة الرياضيين</h1>
                        <table>
                            <thead><tr><th>#</th><th>الاسم الكامل</th><th>العمر</th><th>الجنس</th><th>الحالة</th></tr></thead>
                            <tbody>${tableRows}</tbody>
                        </table>
                        <button onclick="window.print()" style="display:block; margin: 20px auto; padding: 10px 20px; font-size: 16px;">طباعة</button>
                    </body>
                </html>
            `);
            printWindow.document.close();
        });

        // ربط الأحداث للفلاتر والفرز
        Object.values(exportFilters).forEach(el => el.addEventListener('change', () => {
            renderExportableList();
            updateSortIndicators(); // Update indicators after filter changes
        }));

        loadMoreBtn.addEventListener('click', renderMoreRows);

        // ربط أحداث الفرز برؤوس الجدول
        exportableTableContainer.querySelectorAll('thead th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const sortKey = th.dataset.sort;
                if (currentSort.key === sortKey) {
                    currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.key = sortKey;
                    currentSort.order = 'asc';
                }
                renderExportableList();
                updateSortIndicators();
            });
        });

        renderExportableList(); // العرض الأولي للقائمة
        updateSortIndicators(); // Update indicators for initial render
    } catch (err) {
        console.error('Error fetching dashboard data:', err);
        alert('حدث خطأ فادح أثناء تحميل بيانات الإحصائيات: ' + err.message);
    }
});

function toggleMobileMenu() {
    const menu = document.getElementById("mobileMenu");
    menu.classList.toggle("hidden");
    menu.classList.toggle("flex");
    document.body.classList.toggle("overflow-hidden");
}