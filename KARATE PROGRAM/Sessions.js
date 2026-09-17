import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

function SessionRow({ session, groupName, onDelete, onUpdateRating }) {
    const d = new Date(session.date + "T00:00:00");
    const day = d.toLocaleDateString("ar-DZ", { day: "2-digit" });
    const month = d.toLocaleDateString("ar-DZ", { month: "short" });
    const titleText = session.title || "حصة تدريبية";

    return (
        <div className="session-card">
            <details className="session-details">
                <summary className="session-row">
                    <div className="session-date"><b>{day}</b><span>{month}</span></div>
                    <div className="session-body">
                        <div className="session-title">
                            <span>{titleText}</span>
                            <span className="session-group-tag">{groupName}</span>
                        </div>
                        <div className="session-meta">{session.duration} دقيقة · {session.content}</div>
                    </div>
                    {session.rating > 0 ? (
                        <div style={{color: 'var(--color-gold)'}}>{session.rating} ★</div>
                    ) : (
                        <select className="rate-select" value="" onChange={(e) => onUpdateRating(session.id, e.target.value)}>
                            <option value="">تقييم</option>
                            {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    )}
                    <button className="delete-btn" onClick={() => onDelete(session.id)} title="حذف الحصة">
                        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </summary>
                <div className="session-details-content">
                    <h4>تمارين الحصة</h4>
                    <ul>{session.content.split('·').map((ex, i) => <li key={i}>{ex.trim()}</li>)}</ul>
                    {session.notes_full && <><h4>ملاحظات المدرب</h4><p>{session.notes_full}</p></>}
                </div>
            </details>
        </div>
    );
}

export default function Sessions() {
    const { api } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [groups, setGroups] = useState([]);
    const [error, setError] = useState('');
    const [activeFilter, setActiveFilter] = useState('all'); // 'all' or group.id

    const fetchSessions = useCallback(async () => {
        try {
            const [sessionsRes, groupsRes] = await Promise.all([api.get('/sessions'), api.get('/groups')]);
            setSessions(sessionsRes.data);
            setGroups(groupsRes.data);
        } catch (err) {
            setError('فشل تحميل البيانات.');
            console.error(err);
        }
    }, [api]);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    const handleAddSession = async (e) => {
        e.preventDefault();
        const form = e.target;
        const newSession = {
            id: `s_${Date.now()}`,
            groupId: form.elements['se-group'].value,
            date: form.elements['se-date'].value,
            duration: Number(form.elements['se-duration'].value),
            focus_level: form.elements['se-focus'].value,
            rating: Number(form.elements['se-rating'].value),
            content: form.elements['se-content'].value.trim(),
            aiGenerated: false,
            title: '',
            notes_full: ''
        };
        try {
            await api.post('/sessions', newSession);
            form.reset();
            fetchSessions();
        } catch (err) {
            setError('فشل إضافة الحصة.');
        }
    };

    const handleDelete = async (sessionId) => {
        if (window.confirm('هل أنت متأكد من حذف هذه الحصة؟')) {
            try {
                await api.delete(`/sessions/${sessionId}`);
                fetchSessions();
            } catch (err) {
                setError('فشل حذف الحصة.');
            }
        }
    };

    const handleUpdateRating = async (sessionId, rating) => {
        try {
            await api.put(`/sessions/${sessionId}`, { rating: Number(rating) });
            fetchSessions();
        } catch (err) {
            setError('فشل تحديث التقييم.');
        }
    };

    const getGroupName = (groupId) => groups.find(g => g.id === groupId)?.name || '—';

    const filteredSessions = sessions.filter(session => {
        if (activeFilter === 'all') return true;
        return session.group_id === activeFilter;
    });

    return (
        <div id="view-sessions" className="view active">
            <div className="view-head">
                <h2>سجلّ الحصص التدريبية</h2>
                <p>الحصص المضافة يدويًا أو المولَّدة بالذكاء الاصطناعي.</p>
            </div>
            {error && <p style={{ color: 'var(--color-secondary)' }}>{error}</p>}
            <div className="grid two-col">
                <div className="card" style={{alignSelf: 'start'}}>
                    <div className="section-title"><h3>إضافة حصة يدويًا</h3></div>
                    <form id="sessionForm" className="form-grid" onSubmit={handleAddSession}>
                        <div className="field"><label>المجموعة</label><select id="se-group" name="se-group">{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
                        <div className="field"><label>التاريخ</label><input type="date" id="se-date" name="se-date" defaultValue={new Date().toISOString().slice(0, 10)} required /></div>
                        <div className="field"><label>المدة (دقائق)</label><input type="number" id="se-duration" name="se-duration" defaultValue="60" min="15" /></div>
                        <div className="field"><label>مستوى التركيز</label><select id="se-focus" name="se-focus"><option value="متوسط">متوسط</option><option value="منخفض">منخفض</option><option value="عالٍ">عالٍ</option></select></div>
                        <div className="field"><label>التقييم</label><select id="se-rating" name="se-rating">{[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                        <div className="field full"><label>محتوى الحصة</label><textarea id="se-content" name="se-content" placeholder="إحماء، تقنيات، كاتا..."></textarea></div>
                        <div className="field full form-actions"><button type="submit" className="btn btn-primary">حفظ الحصة</button></div>
                    </form>
                </div>
                <div className="card" style={{alignSelf: 'start'}}>
                    <div className="section-title">
                        <h3>الحصص المسجَّلة</h3>
                        <div className="filter-pills">
                            <button className={`pill ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveFilter('all')}>الكل</button>
                            {groups.map(g => (
                                <button key={g.id} className={`pill ${activeFilter === g.id ? 'active' : ''}`} onClick={() => setActiveFilter(g.id)}>{g.name}</button>
                            ))}
                        </div>
                    </div>
                    <div>
                        {filteredSessions.length > 0 ? (
                            filteredSessions.map(s => <SessionRow key={s.id} session={s} groupName={getGroupName(s.group_id)} onDelete={handleDelete} onUpdateRating={handleUpdateRating} />)
                        ) : <p>لا توجد حصص مسجلة لهذه المجموعة.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}