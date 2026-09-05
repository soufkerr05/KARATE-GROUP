(function () {
    'use strict';

    const today = () => new Date().toISOString().split('T')[0];
    const monthKey = () => new Date().toISOString().slice(0, 7);
    const money = value => `${Number(value || 0).toLocaleString('ar-DZ')} د.ج`;
    const athleteName = athlete => `${athlete.firstName || ''} ${athlete.lastName || ''}`.trim();
    const escapeHtml = value => String(value ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #snake-launcher{position:fixed;left:18px;bottom:18px;z-index:90;width:58px;height:58px;border:0;border-radius:50%;background:#0f766e;color:#fff;box-shadow:0 10px 25px #0f172a33;cursor:pointer;font-size:26px}
            #snake-panel{position:fixed;left:18px;bottom:88px;z-index:90;width:min(390px,calc(100vw - 36px));height:min(620px,calc(100vh - 120px));display:flex;flex-direction:column;overflow:hidden;background:#fff;border:1px solid #cbd5e1;border-radius:20px;box-shadow:0 20px 50px #0f172a2b;font-family:Tajawal,Cairo,sans-serif;direction:rtl}
            #snake-panel.snake-hidden{display:none}
            .snake-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;background:#115e59;color:#fff}
            .snake-head strong{font-size:18px}.snake-head small{display:block;margin-top:3px;color:#ccfbf1;font-size:11px}
            .snake-close{border:0;background:transparent;color:#fff;font-size:24px;cursor:pointer;line-height:1}
            .snake-messages{flex:1;overflow-y:auto;padding:14px;background:#f8fafc}
            .snake-message{max-width:92%;margin:0 0 10px;padding:10px 12px;border-radius:14px;white-space:pre-line;line-height:1.65;font-size:14px}
            .snake-bot{margin-left:auto;background:#fff;border:1px solid #e2e8f0;color:#1e293b}.snake-user{margin-right:auto;background:#ccfbf1;color:#134e4a}
            .snake-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}.snake-action{border:1px solid #99f6e4;border-radius:9px;background:#f0fdfa;color:#115e59;padding:7px 9px;font:inherit;font-size:12px;cursor:pointer}
            .snake-composer{display:flex;gap:8px;padding:12px;border-top:1px solid #e2e8f0;background:#fff}.snake-composer input{min-width:0;flex:1;padding:11px 12px;border:1px solid #cbd5e1;border-radius:11px;font:inherit;font-size:14px}.snake-composer button{border:0;border-radius:11px;background:#0f766e;color:#fff;padding:0 14px;font:inherit;font-weight:800;cursor:pointer}
            @media(max-width:480px){#snake-launcher{left:14px;bottom:14px}#snake-panel{left:10px;bottom:82px;width:calc(100vw - 20px);height:calc(100vh - 100px)}}
        `;
        document.head.appendChild(style);
    }

    function createUi() {
        const launcher = document.createElement('button');
        launcher.id = 'snake-launcher';
        launcher.type = 'button';
        launcher.title = 'فتح مساعد Snake';
        launcher.setAttribute('aria-label', 'فتح مساعد Snake');
        launcher.textContent = 'س';

        const panel = document.createElement('section');
        panel.id = 'snake-panel';
        panel.className = 'snake-hidden';
        panel.setAttribute('aria-label', 'مساعد Snake');
        panel.innerHTML = `
            <header class="snake-head"><div><strong>Snake</strong><small>مساعد إدارة النادي</small></div><button class="snake-close" type="button" aria-label="إغلاق">×</button></header>
            <div class="snake-messages" aria-live="polite"></div>
            <form class="snake-composer"><input type="text" autocomplete="off" placeholder="اكتب طلبك هنا..." aria-label="طلب المساعد"><button type="submit">إرسال</button></form>`;
        document.body.append(launcher, panel);
        return { launcher, panel, messages: panel.querySelector('.snake-messages'), form: panel.querySelector('form'), input: panel.querySelector('input') };
    }

    function init() {
        if (!window._supabase || document.getElementById('snake-launcher')) return;
        addStyles();
        const ui = createUi();
        let pendingAttendance = null;
        let proactiveChecked = false;

        const addMessage = (text, type = 'bot', actions = []) => {
            const message = document.createElement('div');
            message.className = `snake-message snake-${type}`;
            message.innerHTML = escapeHtml(text);
            if (actions.length) {
                const actionsEl = document.createElement('div');
                actionsEl.className = 'snake-actions';
                actions.forEach(action => {
                    const button = document.createElement('button');
                    button.type = 'button'; button.className = 'snake-action'; button.textContent = action.label;
                    button.addEventListener('click', action.onClick); actionsEl.appendChild(button);
                });
                message.appendChild(actionsEl);
            }
            ui.messages.appendChild(message);
            ui.messages.scrollTop = ui.messages.scrollHeight;
        };

        const fetchData = async () => {
            const [athletesRes, paymentsRes, expensesRes] = await Promise.all([
                _supabase.from('athletes').select('*'),
                _supabase.from('payments').select('*'),
                _supabase.from('expenses').select('*')
            ]);
            if (athletesRes.error) throw athletesRes.error;
            if (paymentsRes.error) throw paymentsRes.error;
            if (expensesRes.error) throw expensesRes.error;
            const athletes = athletesRes.data || [];
            const payments = paymentsRes.data || [];
            athletes.forEach(athlete => {
                const subscriptions = payments.filter(payment => payment.athlete_id === athlete.id && (!payment.type || payment.type === 'subscription'));
                athlete.sessionsLimit = subscriptions.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) / 1000 * 12;
            });
            return { athletes, payments, expenses: expensesRes.data || [] };
        };

        const expiredAthletes = data => data.athletes.filter(athlete => !athlete.isArchived && (athlete.attendance || 0) >= (athlete.sessionsLimit || 0));

        const showExpired = async () => {
            const data = await fetchData();
            const expired = expiredAthletes(data);
            addMessage(expired.length ? `الاشتراكات المنتهية أو الحصص المستنفدة (${expired.length}):\n${expired.map(athlete => `• ${athleteName(athlete)}: ${athlete.attendance || 0}/${athlete.sessionsLimit || 0} حصة`).join('\n')}` : 'لا توجد اشتراكات منتهية حسب الحصص المتاحة حاليًا.');
        };

        const showFinance = async () => {
            const data = await fetchData();
            const currentMonth = monthKey();
            const revenue = data.payments.filter(payment => payment.date?.startsWith(currentMonth)).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
            const expenses = data.expenses.filter(expense => expense.date?.startsWith(currentMonth)).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
            addMessage(`ملخص ${currentMonth}:\n• الإيرادات: ${money(revenue)}\n• المصاريف: ${money(expenses)}\n• الصافي: ${money(revenue - expenses)}`);
        };

        const showAlerts = async () => {
            const data = await fetchData();
            const expired = expiredAthletes(data);
            const lowAttendance = data.athletes.filter(athlete => !athlete.isArchived && (athlete.sessionsLimit || 0) > 0 && ((athlete.attendance || 0) / athlete.sessionsLimit) < 0.5);
            let text = `التنبيهات الحالية (${expired.length + lowAttendance.length}):`;
            if (expired.length) text += `\n• ${expired.length} رياضيون استنفدوا حصصهم.`;
            if (lowAttendance.length) text += `\n• ${lowAttendance.length} رياضيون لديهم حضور أقل من 50% من حصصهم.`;
            if (!expired.length && !lowAttendance.length) text += '\nلا توجد تنبيهات حرجة حسب البيانات الحالية.';
            addMessage(text);
        };

        const findAthlete = async name => {
            const data = await fetchData();
            const normalized = name.trim().toLocaleLowerCase('ar');
            const matches = data.athletes.filter(athlete => athleteName(athlete).toLocaleLowerCase('ar').includes(normalized) || String(athlete.firstName || '').toLocaleLowerCase('ar').includes(normalized));
            return { data, matches };
        };

        const prepareAttendance = async name => {
            const result = await findAthlete(name);
            if (result.matches.length !== 1) {
                addMessage(result.matches.length ? `وجدت أكثر من رياضي مطابق: ${result.matches.map(athleteName).join('، ')}. اكتب الاسم الكامل.` : `لم أجد رياضيًا باسم "${name}".`);
                return;
            }
            const athlete = result.matches[0];
            if ((athlete.attendanceDates || []).includes(today())) {
                addMessage(`الحضور مسجل مسبقًا لـ ${athleteName(athlete)} اليوم.`);
                return;
            }
            pendingAttendance = athlete;
            addMessage(`سأحفظ حضور ${athleteName(athlete)} بتاريخ ${today()}، هل تؤكد؟`, 'bot', [
                { label: 'تأكيد تسجيل الحضور', onClick: confirmAttendance },
                { label: 'إلغاء', onClick: () => { pendingAttendance = null; addMessage('تم إلغاء العملية.'); } }
            ]);
        };

        async function confirmAttendance() {
            if (!pendingAttendance) return;
            const athlete = pendingAttendance;
            pendingAttendance = null;
            const dates = Array.isArray(athlete.attendanceDates) ? [...athlete.attendanceDates, today()] : [today()];
            const cardDates = Array.isArray(athlete.cardAttendanceDates) ? [...athlete.cardAttendanceDates, today()] : [today()];
            const { error } = await _supabase.from('athletes').update({ attendance: (athlete.attendance || 0) + 1, attendanceDates: dates, cardAttendanceDates: cardDates }).eq('id', athlete.id);
            if (error) { addMessage(`تعذر تسجيل الحضور: ${error.message}`); return; }
            addMessage(`تم تسجيل حضور ${athleteName(athlete)} بنجاح بتاريخ ${today()}.`);
        }

        const handleRequest = async request => {
            const text = request.trim();
            const lower = text.toLocaleLowerCase('ar');
            if (!text) return;
            addMessage(text, 'user');
            try {
                if (/(انتهت|منتهية|منتهين|متأخرين).*(اشتراك|اشتراكات|الدفع)|اشتراك.*(منتهي|انتهى)/.test(lower)) return showExpired();
                if (/(إيراد|ايراد|دخل).*(مصروف|مصاريف)|مصروف.*(إيراد|دخل)|المالية|مالي/.test(lower)) return showFinance();
                if (/(تنبيه|تنبيهات|نبهني|تحذير)/.test(lower)) return showAlerts();
                const attendanceMatch = text.match(/(?:سجل|تسجيل|سجّل|سجل لي)\s+(?:حضور\s+)?(.+)/i) || text.match(/حضور\s+(.+)/i);
                if (attendanceMatch) return prepareAttendance(attendanceMatch[1].replace(/^الرياضي(?:ة)?\s+/i, '').replace(/اليوم؟?/g, '').trim());
                addMessage('أستطيع مساعدتك في: عرض الاشتراكات المنتهية، تلخيص الإيرادات والمصاريف، إظهار التنبيهات، أو تسجيل حضور رياضي بعد التأكيد.', 'bot', [
                    { label: 'الاشتراكات المنتهية', onClick: showExpired },
                    { label: 'ملخص المالية', onClick: showFinance },
                    { label: 'التنبيهات', onClick: showAlerts }
                ]);
            } catch (error) {
                addMessage(`تعذر تنفيذ الطلب: ${error.message}`);
            }
        };

        ui.launcher.addEventListener('click', async () => {
            ui.panel.classList.toggle('snake-hidden');
            if (!ui.panel.classList.contains('snake-hidden')) {
                ui.input.focus();
                if (!proactiveChecked) {
                    proactiveChecked = true;
                    await showAlerts();
                }
            }
        });
        ui.panel.querySelector('.snake-close').addEventListener('click', () => ui.panel.classList.add('snake-hidden'));
        ui.form.addEventListener('submit', event => { event.preventDefault(); const value = ui.input.value; ui.input.value = ''; handleRequest(value); });
        addMessage('مرحبًا، أنا Snake. اطلب تقريرًا أو سجّل حضورًا مباشرة من هنا.');
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();