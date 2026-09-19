const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path'); // استيراد مكتبة المسارات
const open = require('open'); // لاستخدامها في فتح المتصفح تلقائيًا
const session = require('express-session'); // لإدارة جلسات المستخدمين
const bcrypt = require('bcryptjs'); // لتشفير كلمات المرور
const cors = require('cors'); // لاستقبال الطلبات من الواجهة الأمامية
require('dotenv').config(); // لتحميل متغيرات البيئة من ملف .env

const app = express();
// استخدام المنفذ من متغيرات البيئة أو 3000 كقيمة افتراضية
const port = process.env.PORT || 3000; 
const isProduction = process.env.NODE_ENV === 'production';

function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function parseGeneratedSession(outputText) {
    const fencedJson = outputText.match(/```json\s*([\s\S]*?)\s*```/i);
    const candidate = fencedJson ? fencedJson[1] : outputText;
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('لم يرجع Gemini مسودة بصيغة صحيحة.');
    return JSON.parse(candidate.slice(start, end + 1));
}

function isTransientGeminiError(error) {
    const message = String(error?.message || '');
    return [429, 500, 502, 503, 504].some(status => message.includes(String(status))) ||
        message.includes('UNAVAILABLE') || message.includes('high demand');
}

async function generateSessionDraft(ai, prompt) {
    const configuredModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const models = [...new Set([configuredModel, 'gemini-2.5-flash-lite'])];
    let lastError;

    for (const model of models) {
        for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
                return await ai.models.generateContent({
                    model,
                    contents: prompt,
                    config: { responseMimeType: 'application/json' }
                });
            } catch (error) {
                lastError = error;
                if (!isTransientGeminiError(error) || attempt === 1) break;
                await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)));
            }
        }
    }

    throw lastError || new Error('لم يرجع Gemini نتيجة.');
}

// --- إعدادات الخادم ---
// في بيئة الإنتاج، اسمح فقط بالنطاق الخاص بك. في التطوير، اسمح بالوصول المحلي.
const allowedOrigins = isProduction ? [process.env.APP_URL] : [`http://localhost:${port}`, `http://127.0.0.1:${port}`];
app.use(cors({
    origin: function (origin, callback) {
        // السماح بالطلبات التي لا تحمل origin (مثل Postman أو تطبيقات الموبايل) أو الموجودة في القائمة المسموح بها
        const isLocalDevelopmentOrigin = origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
        if (!origin || isLocalDevelopmentOrigin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('غير مسموح به بواسطة سياسة CORS'));
        }
    },
    credentials: true // السماح بإرسال الكوكيز الخاصة بالجلسة
}));
app.use(express.json()); // السماح بقراءة البيانات بصيغة JSON
app.use(session({
    // استخدام مفتاح سري قوي من متغيرات البيئة
    secret: process.env.SESSION_SECRET || 'a-default-secret-key-for-development',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: isProduction, // يجب أن يكون true في الإنتاج (HTTPS)
        httpOnly: true, 
        maxAge: 24 * 60 * 60 * 1000 
    }
}));

// --- الاتصال بقاعدة البيانات ---
const db = new sqlite3.Database('./karate.db', (err) => {
    if (err) {
        console.error("خطأ في الاتصال بقاعدة البيانات:", err.message);
    } else {
        console.log("تم الاتصال بقاعدة بيانات karate.db بنجاح.");
        // إنشاء الجداول عند بدء تشغيل الخادم لأول مرة
        db.serialize(() => {
            db.run(`
                CREATE TABLE IF NOT EXISTS groups (
                    id TEXT PRIMARY KEY, name TEXT NOT NULL, age_range TEXT NOT NULL,
                    belt TEXT NOT NULL, level TEXT DEFAULT '', seniority TEXT DEFAULT '',
                    specialty TEXT DEFAULT 'كاتا وكوميتي', athletes_count INTEGER DEFAULT 0
                );
            `);
            db.all('PRAGMA table_info(groups)', (err, columns = []) => {
                if (err) return console.error('تعذر فحص أعمدة الفئات:', err.message);
                const existing = new Set(columns.map(column => column.name));
                const migrations = [
                    ['level', "ALTER TABLE groups ADD COLUMN level TEXT DEFAULT ''"],
                    ['seniority', "ALTER TABLE groups ADD COLUMN seniority TEXT DEFAULT ''"],
                    ['specialty', "ALTER TABLE groups ADD COLUMN specialty TEXT DEFAULT 'كاتا وكوميتي'"]
                ];
                migrations.filter(([name]) => !existing.has(name)).forEach(([, sql]) => db.run(sql));
            });
            db.run(`
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY, group_id TEXT REFERENCES groups(id), date DATE NOT NULL,
                    duration INTEGER DEFAULT 60, focus_level TEXT DEFAULT 'متوسط', rating INTEGER, title TEXT, content TEXT,
                    notes_full TEXT, ai_generated BOOLEAN DEFAULT FALSE
                );
            `);
            db.run(`
                CREATE TABLE IF NOT EXISTS events (
                    id TEXT PRIMARY KEY, group_id TEXT REFERENCES groups(id), title TEXT NOT NULL,
                    type TEXT NOT NULL, date DATE NOT NULL, notes TEXT
                );
            `);
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'coach'
                );
            `);
            db.run(`
                CREATE TABLE IF NOT EXISTS notes (
                    id TEXT PRIMARY KEY,
                    group_id TEXT NOT NULL,
                    athlete TEXT DEFAULT '',
                    text TEXT NOT NULL,
                    date TEXT NOT NULL
                );
            `);
            db.run(`
                CREATE TABLE IF NOT EXISTS feedback (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL,
                    group_id TEXT NOT NULL,
                    text TEXT NOT NULL,
                    date TEXT NOT NULL
                );
            `);

            // ترقية قواعد البيانات القديمة دون حذف الحصص الموجودة.
            db.all(`PRAGMA table_info(sessions)`, (columnsError, columns) => {
                if (columnsError) {
                    console.error("خطأ في فحص أعمدة جدول الحصص:", columnsError.message);
                    return;
                }

                const existingColumns = new Set(columns.map(column => column.name));
                const missingColumns = [
                    ["focus_level", "TEXT DEFAULT 'متوسط'"],
                    ["notes_full", "TEXT"],
                    ["ai_generated", "BOOLEAN DEFAULT FALSE"]
                ].filter(([name]) => !existingColumns.has(name));

                missingColumns.forEach(([name, definition]) => {
                    db.run(`ALTER TABLE sessions ADD COLUMN ${name} ${definition}`, (alterError) => {
                        if (alterError) console.error(`خطأ في إضافة العمود ${name}:`, alterError.message);
                    });
                });
            });
            // إدخال البيانات الأولية للمجموعات إذا لم تكن موجودة
            const stmt = db.prepare("INSERT OR IGNORE INTO groups (id, name, age_range, belt, athletes_count) VALUES (?, ?, ?, ?, ?)");
            stmt.run('g1', 'البراعم', '5 – 7 سنوات', 'white', 14);
            stmt.run('g2', 'المدارس', '8 – 10 سنوات', 'yellow', 18);
            stmt.run('g3', 'الأشبال', '11 – 13 سنة', 'green', 12);
            stmt.finalize();

            // إضافة مستخدم افتراضي (admin/password) بدور 'admin'
            db.get("SELECT id, role FROM users WHERE username = 'admin'", (err, user) => {
                if (err) return console.error("خطأ في التحقق من المستخدم المدير:", err.message);

                if (!user) {
                    // إذا لم يكن المستخدم موجودًا على الإطلاق، قم بإنشائه
                    const adminPasswordHash = '$2a$10$/G7YcdsD92qVFaSGIEgkI.RZ6JpLFzV2oiqZmdOjJRnzZTrhoqhbe'; // Hash صحيح لكلمة المرور 'password'
                    db.run("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)", ['admin', adminPasswordHash, 'admin']);
                } else if (user.role !== 'admin') {
                    // إذا كان المستخدم موجودًا ولكن دوره ليس 'admin' (لإصلاح قواعد البيانات القديمة)، قم بتحديثه
                    db.run("UPDATE users SET role = 'admin' WHERE id = ?", [user.id]);
                }
            });

            // إضافة مستخدم افتراضي (soufiane/Ayhem) بدور 'coach'
            db.get("SELECT id FROM users WHERE username = 'soufiane'", (err, user) => {
                if (err) return console.error("خطأ في التحقق من المستخدم soufiane:", err.message);

                if (!user) {
                    // Hash لكلمة المرور 'Ayhem'
                    const soufianePasswordHash = '$2a$10$i1FqcGMHX8NeZSDG8UQNE.yrbT.ptoDiyAvaQKNGqqA1nYHlvKt/y'; // Hash صحيح لكلمة المرور 'Ayhem'
                    db.run("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)", ['soufiane', soufianePasswordHash, 'coach']);
                }
            });
        });
    }
});

// --- نقاط النهاية (API Endpoints) ---

// تقديم الصفحة الرئيسية الجديدة متعددة الصفحات
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/training.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.use(express.static(__dirname));

// --- نقاط نهاية المصادقة (Authentication) ---

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'الرجاء إدخال اسم المستخدم وكلمة المرور.' });
    }

    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err) return res.status(500).json({ message: 'خطأ في الخادم.' });
        if (!user) return res.status(401).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة.' });

        bcrypt.compare(password, user.password_hash, (err, isMatch) => {
            if (err) return res.status(500).json({ message: 'خطأ في الخادم.' });
            if (!isMatch) return res.status(401).json({ message: 'اسم المستخدم أو كلمة المرور غير صحيحة.' });

            // حفظ كائن المستخدم الكامل في الجلسة
            req.session.user = { id: user.id, username: user.username, role: user.role };
            res.json({ message: 'تم تسجيل الدخول بنجاح.', user: { id: user.id, username: user.username, role: user.role } });
        });
    });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'فشل تسجيل الخروج.', error: err.message });
        }
        res.clearCookie('connect.sid'); // اسم الكوكي الافتراضي لـ express-session
        res.json({ message: 'تم تسجيل الخروج بنجاح.' });
    });
});

app.get('/api/check-auth', (req, res) => {
    if (req.session.user) {
        res.json({ isAuthenticated: true, user: req.session.user });
    } else {
        res.json({ isAuthenticated: false, user: null });
    }
});

// --- Middleware لحماية المسارات ---
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.status(401).json({ error: 'غير مصرح لك بالوصول. الرجاء تسجيل الدخول.' });
};

const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.status(403).json({ error: 'الوصول محظور. هذه العملية تتطلب صلاحيات مدير.' });
};

// --- نقاط النهاية المحمية ---

// 1. جلب كل المجموعات (محمي)
app.get('/api/groups', async (req, res) => {
    try {
        const rows = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM groups ORDER BY id", [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        res.json(rows);
    } catch (err) {
        res.status(500).json({ "error": err.message });
    }
});

// 2. جلب كل الحصص (محمي)
app.get('/api/sessions', async (req, res) => {
    try {
        const rows = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM sessions ORDER BY date DESC", [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        res.json(rows);
    } catch (err) {
        res.status(500).json({ "error": err.message });
    }
});

// جلب كل الأهداف (محمي)
app.get('/api/events', async (req, res) => {
    try {
        const rows = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM events ORDER BY date ASC", [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        res.json(rows);
    } catch (err) {
        res.status(500).json({ "error": err.message });
    }
});

app.get('/api/notes', async (req, res) => {
    try {
        const rows = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM notes ORDER BY date DESC", [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        res.json(rows);
    } catch (err) {
        res.status(500).json({ "error": err.message });
    }
});

app.post('/api/notes', async (req, res) => {
    const { id, groupId, group_id, athlete, text, date } = req.body;
    const targetGroupId = groupId || group_id;

    if (!id || !targetGroupId || !text || !date) {
        return res.status(400).json({ "error": "بيانات الملاحظة غير مكتملة." });
    }

    try {
        await new Promise((resolve, reject) => {
            db.run('INSERT INTO notes (id, group_id, athlete, text, date) VALUES (?, ?, ?, ?, ?)',
                [id, targetGroupId, athlete || '', text.trim(), date],
                function (err) { if (err) reject(err); else resolve(this); });
        });
        res.status(201).json({ "message": "success", "data": { id, group_id: targetGroupId, athlete: athlete || '', text, date } });
    } catch (err) {
        res.status(500).json({ "error": err.message });
    }
});

app.delete('/api/notes/:id', async (req, res) => {
    try {
        const result = await new Promise((resolve, reject) => {
            db.run('DELETE FROM notes WHERE id = ?', [req.params.id], function (err) {
                if (err) reject(err); else resolve(this);
            });
        });

        if (result.changes === 0) {
            return res.status(404).json({ "error": "الملاحظة غير موجودة." });
        }
        res.json({ "message": "deleted" });
    } catch (err) {
        res.status(500).json({ "error": err.message });
    }
});

app.get('/api/feedback', async (req, res) => {
    try {
        const rows = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM feedback ORDER BY date DESC", [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        res.json(rows);
    } catch (err) {
        res.status(500).json({ "error": err.message });
    }
});

app.post('/api/smart-sessions/generate', async (req, res) => {
    const { groupId, groupIds, date, extraNotes = '', eventId = '' } = req.body;
    const targetGroupIds = [...new Set((Array.isArray(groupIds) ? groupIds : groupId ? [groupId] : []).filter(Boolean))];
    if (targetGroupIds.length === 0 || !date) {
        return res.status(400).json({ error: 'المجموعة والتاريخ مطلوبان.' });
    }
    if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: 'لم يتم إعداد GEMINI_API_KEY في ملف .env.' });
    }

    try {
        const placeholders = targetGroupIds.map(() => '?').join(', ');
        const [groupRows, eventRows, noteRows, feedbackRows, sessionRows] = await Promise.all([
            dbAll(`SELECT id, name, age_range, belt, athletes_count FROM groups WHERE id IN (${placeholders})`, targetGroupIds),
            dbAll(`SELECT id, group_id, title, type, date, notes FROM events WHERE group_id IN (${placeholders}) ORDER BY date ASC`, targetGroupIds),
            dbAll(`SELECT group_id, athlete, text, date FROM notes WHERE group_id IN (${placeholders}) ORDER BY date DESC LIMIT 10`, targetGroupIds),
            dbAll(`SELECT group_id, session_id, text, date FROM feedback WHERE group_id IN (${placeholders}) ORDER BY date DESC LIMIT 10`, targetGroupIds),
            dbAll(`SELECT group_id, date, duration, focus_level, rating, title, content, notes_full, ai_generated FROM sessions WHERE group_id IN (${placeholders}) ORDER BY date DESC LIMIT 10`, targetGroupIds)
        ]);

        if (groupRows.length !== targetGroupIds.length) return res.status(404).json({ error: 'إحدى المجموعات غير موجودة.' });
        const selectedEvents = eventRows.filter(event => eventId && event.id === eventId);
        const context = {
            groups: groupRows,
            requestedDate: date,
            coachRequest: extraNotes,
            selectedGoals: selectedEvents.length ? selectedEvents : eventRows.filter(event => event.date >= date).slice(0, targetGroupIds.length),
            upcomingGoals: eventRows.filter(event => event.date >= date).slice(0, 5),
            coachNotes: noteRows,
            appliedFeedback: feedbackRows,
            previousSessions: sessionRows
        };

        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `أنت مدرب كاراتيه خبير. أنشئ مسودة حصة تدريبية آمنة ومناسبة للعمر، اعتمادًا على السياق التالي. اقرأ الأهداف، ملاحظات المدرب، الملاحظات التطبيقية، والحصص السابقة لتجنب التكرار ومعالجة نقاط الضعف. لا تخترع بيانات غير موجودة.\n\nالسياق:\n${JSON.stringify(context, null, 2)}\n\nأعد JSON فقط بهذا الشكل دون Markdown:\n{"title":"عنوان الحصة","duration":60,"focus_level":"متوسط","exercises":["تمرين 1 مع التكرارات والراحة","تمرين 2"],"notes_full":"سبب اختيار الحصة والتعديلات والسلامة"}\nاجعل الحصة بين 45 و90 دقيقة، واكتب باللغة العربية، واذكر التدرج والإحماء والتهدئة والسلامة.`;
        const result = await generateSessionDraft(ai, prompt);
        const draft = parseGeneratedSession(result.text || '');
        if (!draft.title || !Array.isArray(draft.exercises) || draft.exercises.length === 0) {
            return res.status(502).json({ error: 'مسودة Gemini ناقصة أو غير صالحة.' });
        }
        res.json({ draft: { ...draft, group_id: targetGroupIds[0], group_ids: targetGroupIds, date } });
    } catch (error) {
        console.error('فشل توليد الحصة الذكية:', error);
        const status = isTransientGeminiError(error) ? 503 : 502;
        const message = status === 503
            ? 'خدمة الذكاء الاصطناعي مشغولة مؤقتًا. حاول بعد قليل.'
            : (error.message || 'تعذر توليد الحصة الذكية.');
        res.status(status).json({ error: message });
    }
});

app.post('/api/feedback', async (req, res) => {
    const { id, sessionId, session_id, groupId, group_id, text, date } = req.body;
    const targetSessionId = sessionId || session_id;
    const targetGroupId = groupId || group_id;

    if (!id || !targetSessionId || !targetGroupId || !text || !date) {
        return res.status(400).json({ "error": "بيانات الملاحظة التطبيقية غير مكتملة." });
    }

    try {
        await new Promise((resolve, reject) => {
            db.run('INSERT INTO feedback (id, session_id, group_id, text, date) VALUES (?, ?, ?, ?, ?)',
                [id, targetSessionId, targetGroupId, text.trim(), date],
                function (err) { if (err) reject(err); else resolve(this); });
        });
        res.status(201).json({ "message": "success", "data": { id, session_id: targetSessionId, group_id: targetGroupId, text, date } });
    } catch (err) {
        res.status(500).json({ "error": err.message });
    }
});

app.delete('/api/feedback/:id', async (req, res) => {
    try {
        const result = await new Promise((resolve, reject) => {
            db.run('DELETE FROM feedback WHERE id = ?', [req.params.id], function (err) {
                if (err) reject(err); else resolve(this);
            });
        });

        if (result.changes === 0) {
            return res.status(404).json({ "error": "الملاحظة التطبيقية غير موجودة." });
        }
        res.json({ "message": "deleted" });
    } catch (err) {
        res.status(500).json({ "error": err.message });
    }
});


// 3. إضافة حصة جديدة (محمي)
app.post('/api/events', async (req, res) => {
    const { id, group_id, groupId, title, type, date, notes } = req.body;
    const targetGroupId = group_id || groupId;
    if (!id || !targetGroupId || !title || !type || !date) {
        return res.status(400).json({ error: 'Event data is incomplete.' });
    }
    try {
        await new Promise((resolve, reject) => {
            db.run('INSERT INTO events (id, group_id, title, type, date, notes) VALUES (?, ?, ?, ?, ?, ?)',
                [id, targetGroupId, title, type, date, notes || ''],
                function (err) { if (err) reject(err); else resolve(this); });
        });
        res.status(201).json({ message: 'success', data: { id, group_id: targetGroupId, title, type, date, notes: notes || '' } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/events/:id', async (req, res) => {
    const { type, date } = req.body;
    if (!type || !date) return res.status(400).json({ error: 'Event type and date are required.' });
    try {
        const result = await new Promise((resolve, reject) => {
            db.run('UPDATE events SET type = ?, date = ? WHERE id = ?', [type, date, req.params.id], function (err) {
                if (err) reject(err); else resolve(this);
            });
        });
        if (result.changes === 0) return res.status(404).json({ error: 'Event not found.' });
        res.json({ message: 'success' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/events/:id', async (req, res) => {
    try {
        const result = await new Promise((resolve, reject) => {
            db.run('DELETE FROM events WHERE id = ?', [req.params.id], function (err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
        if (result.changes === 0) return res.status(404).json({ error: 'الهدف غير موجود.' });
        res.json({ message: 'deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/sessions', async (req, res) => {
    const { id, groupId, date, duration, focus_level, rating, content, title, aiGenerated, notes_full } = req.body;
    if (!id || !groupId || !date) {
        return res.status(400).json({ "error": "البيانات المطلوبة غير مكتملة." });
    }

    try {
        await new Promise((resolve, reject) => {
            const sql = `INSERT INTO sessions (id, group_id, date, duration, focus_level, rating, content, title, ai_generated, notes_full)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const params = [id, groupId, date, duration, focus_level || 'متوسط', rating, content, title, aiGenerated, notes_full];
            
            db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
        res.status(201).json({ "message": "success", "data": req.body });
    } catch (err) {
        res.status(500).json({ "error": err.message });
    }
});

app.post('/api/groups', async (req, res) => {
    const { id, name, age_range, ageRange, belt = '', level = '', seniority = '', specialty = 'كاتا وكوميتي', athletes_count = 0 } = req.body;
    const age = age_range || ageRange;
    if (!id || !name || !age || !specialty) {
        return res.status(400).json({ error: 'بيانات الفئة غير مكتملة.' });
    }
    try {
        await new Promise((resolve, reject) => {
            db.run('INSERT INTO groups (id, name, age_range, belt, level, seniority, specialty, athletes_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [id, name.trim(), age, belt, level, seniority, specialty, Number(athletes_count) || 0],
                function (err) { if (err) reject(err); else resolve(this); });
        });
        res.status(201).json({ message: 'success' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// تحديث بيانات الفئة (محمي)
app.put('/api/groups/:id', async (req, res) => {
    const { name, age_range, ageRange, belt, level, seniority, specialty, athletes_count } = req.body;
    const { id } = req.params;

    if (athletes_count !== undefined && (Number.isNaN(Number(athletes_count)) || athletes_count < 0)) {
        return res.status(400).json({ error: 'عدد الرياضيين غير صالح.' });
    }
    
    try {
        const result = await new Promise((resolve, reject) => {
            const fields = [];
            const values = [];
            const updates = { name, age_range: age_range || ageRange, belt, level, seniority, specialty, athletes_count: athletes_count === undefined ? undefined : Number(athletes_count) };
            Object.entries(updates).forEach(([field, value]) => {
                if (value !== undefined) { fields.push(`${field} = ?`); values.push(field === 'name' ? String(value).trim() : value); }
            });
            if (fields.length === 0) return resolve({ changes: 0 });
            values.push(id);
            const sql = `UPDATE groups SET ${fields.join(', ')} WHERE id = ?`;
            db.run(sql, values, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });

        if (result.changes === 0) {
            return res.status(404).json({ "error": "الفئة غير موجودة." });
        }
        res.json({ "message": "success", "changes": result.changes });
    } catch (err) {
        res.status(500).json({ "error": err.message });
    }
});

app.delete('/api/groups/:id', async (req, res) => {
    try {
        const result = await new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('DELETE FROM feedback WHERE group_id = ?', [req.params.id]);
                db.run('DELETE FROM notes WHERE group_id = ?', [req.params.id]);
                db.run('DELETE FROM events WHERE group_id = ?', [req.params.id]);
                db.run('DELETE FROM sessions WHERE group_id = ?', [req.params.id]);
                db.run('DELETE FROM groups WHERE id = ?', [req.params.id], function (err) {
                    if (err) reject(err); else resolve(this);
                });
            });
        });
        if (result.changes === 0) return res.status(404).json({ error: 'الفئة غير موجودة.' });
        res.json({ message: 'deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. حذف حصة تدريبية (محمي)
app.delete('/api/sessions/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await new Promise((resolve, reject) => {
            const sql = `DELETE FROM sessions WHERE id = ?`;
            db.run(sql, id, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });

        if (result.changes === 0) {
            return res.status(404).json({ "error": "الحصة غير موجودة." });
        }
        res.json({ "message": "deleted", "changes": result.changes });
    } catch (err) {
        res.status(500).json({ "error": err.message });
    }
});

// 6. تحديث حصة تدريبية (خاصة للتقييم)
app.put('/api/sessions/:id', async (req, res) => {
    const { id } = req.params;
    const { rating } = req.body;

    if (rating === undefined || rating < 1 || rating > 5) {
        return res.status(400).json({ "error": "تقييم غير صالح. يجب أن يكون بين 1 و 5." });
    }
    
    try {
        const result = await new Promise((resolve, reject) => {
            const sql = `UPDATE sessions SET rating = ? WHERE id = ?`;
            db.run(sql, [rating, id], function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });

        if (result.changes === 0) {
            return res.status(404).json({ "error": "الحصة غير موجودة." });
        }
        res.json({ "message": "success", "changes": result.changes });
    } catch (err) {
        res.status(500).json({ "error": err.message });
    }
});

// --- نقاط نهاية إدارة المستخدمين (محمية للمدير فقط) ---

// 6. جلب كل المستخدمين
app.get('/api/users', isAuthenticated, isAdmin, (req, res) => {
    db.all("SELECT id, username, role FROM users ORDER BY id", [], (err, rows) => {
        if (err) return res.status(500).json({ "error": err.message });
        res.json(rows);
    });
});

// 7. إضافة مستخدم جديد
app.post('/api/users', isAuthenticated, isAdmin, (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: "اسم المستخدم وكلمة المرور مطلوبان." });
    }

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).json({ message: "خطأ في تشفير كلمة المرور." });

        const sql = `INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'coach')`;
        db.run(sql, [username, hash], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ message: "اسم المستخدم هذا موجود بالفعل." });
                }
                return res.status(500).json({ "error": err.message });
            }
            res.status(201).json({ message: "تمت إضافة المدرب بنجاح.", id: this.lastID });
        });
    });
});

// 8. حذف مستخدم
app.delete('/api/users/:id', isAuthenticated, isAdmin, (req, res) => {
    const { id } = req.params;

    // لا تسمح للمدير بحذف نفسه
    if (req.session.user && parseInt(id, 10) === req.session.user.id) {
        return res.status(403).json({ message: "لا يمكنك حذف حساب المدير الخاص بك." });
    }

    db.run(`DELETE FROM users WHERE id = ?`, id, function(err) {
        if (err) return res.status(500).json({ "error": err.message });
        if (this.changes === 0) {
            return res.status(404).json({ "error": "المستخدم غير موجود." });
        }
        res.json({ message: "تم حذف المستخدم بنجاح." });
    });
});

// 9. تحديث كلمة مرور مستخدم
app.put('/api/users/:id/password', isAuthenticated, isAdmin, (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 4) {
        return res.status(400).json({ message: "كلمة المرور يجب أن تكون 4 أحرف على الأقل." });
    }

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).json({ message: "خطأ في تشفير كلمة المرور." });

        const sql = `UPDATE users SET password_hash = ? WHERE id = ?`;
        db.run(sql, [hash, id], function(err) {
            if (err) {
                return res.status(500).json({ "error": err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ "error": "المستخدم غير موجود." });
            }
            res.json({ message: "تم تحديث كلمة المرور بنجاح." });
        });
    });
});

// --- تقديم تطبيق الواجهة الأمامية (React) ---
if (isProduction) {
    // قدم الملفات الثابتة التي تم بناؤها بواسطة React
    app.use(express.static(path.join(__dirname, 'client/dist')));

    // لأي طلب لا يتطابق مع API، أعد توجيه المستخدم إلى index.html الخاص بـ React
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'client/dist', 'index.html'));
    });
}

// --- تشغيل الخادم ---
app.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`الخادم يعمل على المنفذ ${port}`);
    if (!isProduction) {
        console.log(`الواجهة الأمامية لـ React تعمل بشكل منفصل على http://localhost:5173 (أو منفذ آخر)`);
    }
});
