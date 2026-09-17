import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const EVENT_TYPES = {
    beltExam: { label: "امتحان تدرّج الأحزمة", color: "var(--color-gold)" },
    wilaya: { label: "بطولة ولائية", color: "var(--color-primary)" },
    national: { label: "بطولة وطنية", color: "var(--color-secondary)" },
    exhibition: { label: "استعراض", color: "#8E6FC7" },
    internal: { label: "منافسة داخل القاعة", color: "#4CAF93" }
};

function daysUntil(iso) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(iso + "T00:00:00");
    return Math.round((target - today) / 86400000);
}

function fmtDate(iso) {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("ar-DZ", { day: "2-digit", month: "long", year: "numeric" });
}

function EventTimelineItem({ event, groupName }) {
    const type = EVENT_TYPES[event.type];
    const d = daysUntil(event.date);
    const countdown = d < 0 ? "انتهى" : d === 0 ? "اليوم" : `بعد ${d} يوم`;
    return (
        <div className="t-item" style={{ '--type-color': type.color }}>
            <span className="t-dot"></span>
            <div className="t-card">
                <div className="t-top">
                    <span className="t-title">{event.title}</span>
                    <span className="t-badge" style={{ background: type.color }}>{type.label}</span>
                </div>
                <div className="t-meta">{groupName} · {fmtDate(event.date)}</div>
                <div className="t-countdown">{countdown}</div>
            </div>
        </div>
    );
}

function SessionRow({ session, groupName }) {
    const d = new Date(session.date + "T00:00:00");
    const day = d.toLocaleDateString("ar-DZ", { day: "2-digit" });
    const month = d.toLocaleDateString("ar-DZ", { month: "short" });
    const titleText = session.title || "حصة تدريبية";

    return (
        <div className="session-card">
            <div className="session-row">
                <div className="session-date"><b>{day}</b><span>{month}</span></div>
                <div className="session-body">
                    <div className="session-title">
                        <span>{titleText}</span>
                        <span className="session-group-tag">{groupName}</span>
                        {session.focus_level && (
                            <span className="focus-badge">تركيز {session.focus_level}</span>
                        )}
                        {session.ai_generated && (
                            <span className="ai-badge">
                                <svg viewBox="0 0 24 24"><path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z"/></svg>
                                ذكاء اصطناعي
                            </span>
                        )}
                    </div>
                    <div className="session-meta">{session.duration} دقيقة · {session.content}</div>
                </div>
                <div className="stars" style={{ flexShrink: 0 }}>
                    {session.rating > 0 ? `${session.rating} ★` : <span style={{ fontSize: '11.5px', color: 'var(--color-muted)', fontWeight: 700 }}>بانتظار التقييم</span>}
                </div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { api } = useAuth();
    const [stats, setStats] = useState({ groups: 0, sessions: 0, nextEvent: '—' });
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [recentSessions, setRecentSessions] = useState([]);
    const [groups, setGroups] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [groupsRes, sessionsRes, eventsRes] = await Promise.all([
                    api.get('/groups'),
                    api.get('/sessions'),
                    api.get('/events')
                ]);

                const groupsData = groupsRes.data;
                const sessionsData = sessionsRes.data;
                const eventsData = eventsRes.data;

                setGroups(groupsData);

                const thisMonth = new Date().getMonth();
                const sessionsThisMonth = sessionsData.filter(s => new Date(s.date).getMonth() === thisMonth).length;

                const upcoming = eventsData.filter(e => daysUntil(e.date) >= 0).sort((a, b) => new Date(a.date) - new Date(b.date));
                setUpcomingEvents(upcoming.slice(0, 4));

                setStats({
                    groups: groupsData.length,
                    sessions: sessionsThisMonth,
                    nextEvent: upcoming[0] ? upcoming[0].title : 'لا يوجد'
                });

                setRecentSessions(sessionsData.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4));

            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            }
        };

        fetchData();
    }, [api]);

    const getGroupName = (groupId) => groups.find(g => g.id === groupId)?.name || '—';

    return (
        <div id="view-dashboard" className="view active">
            <div className="grid stats-grid">
                <div className="card stat-card">
                    <span className="stat-icon" style={{ background: 'var(--color-primary)' }}><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17.5" cy="8.5" r="2.2"/></svg></span>
                    <div><p className="stat-label">مجموعات نشطة</p><p className="stat-value">{stats.groups}</p></div>
                </div>
                <div className="card stat-card">
                    <span className="stat-icon" style={{ background: 'var(--color-secondary)' }}><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18"/><path d="M8.5 15l2 2 4.5-4.5"/></svg></span>
                    <div><p className="stat-label">حصص هذا الشهر</p><p className="stat-value">{stats.sessions}</p></div>
                </div>
                <div className="card stat-card">
                    <span className="stat-icon" style={{ background: 'var(--color-gold)' }}><svg viewBox="0 0 24 24"><path d="M6 3v18"/><path d="M6 4h12l-2.5 3.5L18 11H6"/></svg></span>
                    <div><p className="stat-label">الهدف القادم</p><p className="stat-value" style={{ fontSize: '15px' }}>{stats.nextEvent}</p></div>
                </div>
            </div>

            <div className="grid two-col">
                <div className="card">
                    <div className="section-title"><h3>الأهداف القادمة</h3></div>
                    <div className="timeline">
                        {upcomingEvents.length > 0 ? (
                            upcomingEvents.map(event => <EventTimelineItem key={event.id} event={event} groupName={getGroupName(event.group_id)} />)
                        ) : <p>لا توجد أهداف قادمة.</p>}
                    </div>
                </div>
                <div className="card">
                    <div className="section-title"><h3>آخر الحصص المسجَّلة</h3></div>
                    <div>
                        {recentSessions.length > 0 ? (
                            recentSessions.map(session => <SessionRow key={session.id} session={session} groupName={getGroupName(session.group_id)} />)
                        ) : <p>لا توجد حصص مسجلة بعد.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}