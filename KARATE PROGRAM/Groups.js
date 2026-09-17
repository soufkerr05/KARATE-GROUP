import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const BELT_COLORS = {
    white: "#EDEBE2", yellow: "#F2C230", orange: "#E8823C",
    green: "#2F9E5C", blue: "#2E74B5", brown: "#7A5230", black: "#1F1F1F"
};
const BELT_LABELS = {
    white: "أبيض", yellow: "أصفر", orange: "برتقالي", green: "أخضر",
    blue: "أزرق", brown: "بني", black: "أسود"
};

function GroupCard({ group, onUpdate }) {
    const [count, setCount] = useState(group.athletes_count);
    const [isEditing, setIsEditing] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        onUpdate(group.id, count);
        setIsEditing(false);
    };

    return (
        <div className="card group-card">
            <div className="group-top">
                <div className="group-avatar" style={{ '--belt-color': BELT_COLORS[group.belt] }}>{group.athletes_count}</div>
                <div>
                    <p className="group-name">{group.name}</p>
                    <p className="group-sub">{group.age_range}</p>
                    <span className="belt-chip">
                        <span className="belt-swatch" style={{ '--belt-color': BELT_COLORS[group.belt] }}></span>
                        الحزام السائد: {BELT_LABELS[group.belt]}
                    </span>
                </div>
            </div>
            <details className="inline-edit" onToggle={(e) => setIsEditing(e.target.open)}>
                <summary>تعديل عدد الرياضيين</summary>
                {isEditing && (
                    <form className="inline-edit-form" onSubmit={handleSubmit}>
                        <label style={{ fontSize: '12.5px', fontWeight: 700 }}>العدد الجديد</label>
                        <input type="number" min="0" value={count} onChange={(e) => setCount(Number(e.target.value))} required />
                        <button className="btn btn-primary btn-sm" type="submit">حفظ</button>
                    </form>
                )}
            </details>
        </div>
    );
}

export default function Groups() {
    const { api } = useAuth();
    const [groups, setGroups] = useState([]);
    const [error, setError] = useState('');

    const fetchGroups = useCallback(async () => {
        try {
            setError('');
            const response = await api.get('/groups');
            setGroups(response.data);
        } catch (err) {
            setError('فشل تحميل بيانات المجموعات.');
            console.error(err);
        }
    }, [api]);

    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

    const handleUpdateAthletesCount = async (groupId, newCount) => {
        try {
            await api.put(`/groups/${groupId}`, { athletes_count: newCount });
            fetchGroups(); // إعادة تحميل البيانات بعد التحديث
        } catch (err) {
            console.error("Failed to update athletes count", err);
            setError('فشل تحديث عدد الرياضيين.');
        }
    };

    return (
        <div id="view-groups" className="view active">
            <div className="view-head">
                <h2>المجموعات</h2>
                <p>المجموعات العمرية للفريق، حسب الخطة السنوية الرسمية.</p>
            </div>
            {error && <p style={{ color: 'var(--color-secondary)' }}>{error}</p>}
            <div className="grid stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))' }}>
                {groups.map(group => (
                    <GroupCard key={group.id} group={group} onUpdate={handleUpdateAthletesCount} />
                ))}
            </div>
        </div>
    );
}