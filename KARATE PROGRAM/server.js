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

// --- إعدادات الخادم ---
// في بيئة الإنتاج، اسمح فقط بالنطاق الخاص بك. في التطوير، اسمح بالوصول المحلي.
const allowedOrigins = isProduction ? [process.env.APP_URL] : [`http://localhost:${port}`, `http://127.0.0.1:${port}`];
app.use(cors({
    origin: function (origin, callback) {
        // السماح بالطلبات التي لا تحمل origin (مثل Postman أو تطبيقات الموبايل) أو الموجودة في القائمة المسموح بها
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
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
                    belt TEXT NOT NULL, athletes_count INTEGER DEFAULT 0
                );
            `);
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

// تقديم الموقع الرئيسي وصفحة الحصص من نفس الخادم
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/training.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'index_4.html'));
});

app.use(express.static(path.join(__dirname, '..')));

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

// 4. تحديث عدد الرياضيين في مجموعة (محمي)
app.put('/api/groups/:id', async (req, res) => {
    const { athletes_count } = req.body;
    const { id } = req.params;

    if (athletes_count === undefined || athletes_count < 0) {
        return res.status(400).json({ "error": "عدد الرياضيين غير صالح." });
    }
    
    try {
        const result = await new Promise((resolve, reject) => {
            const sql = `UPDATE groups SET athletes_count = ? WHERE id = ?`;
            db.run(sql, [athletes_count, id], function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });

        if (result.changes === 0) {
            return res.status(404).json({ "error": "المجموعة غير موجودة." });
        }
        res.json({ "message": "success", "changes": result.changes });
    } catch (err) {
        res.status(500).json({ "error": err.message });
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
