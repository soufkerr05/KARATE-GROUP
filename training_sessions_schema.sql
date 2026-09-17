CREATE TABLE IF NOT EXISTS training_sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    group_id TEXT,
    group_name TEXT,
    session_date DATE NOT NULL,
    duration INTEGER DEFAULT 60,
    focus_level TEXT DEFAULT 'متوسط',
    type TEXT DEFAULT 'أساسية',
    rating INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_sessions_date ON training_sessions(session_date DESC);