-- حساب الزوار للعرض فقط
-- البريد المقترح: visitor@karate-group.com
-- كلمة المرور المقترحة: KarateVisitor2026!
-- أنشئ المستخدم أولاً من Supabase Dashboard > Authentication > Users
-- ثم نفذ الاستعلام التالي لمنحه صلاحية العرض فقط.

UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role":"viewer"}'::jsonb
WHERE email = 'visitor@karate-group.com';

SELECT email, raw_user_meta_data->>'role' AS role
FROM auth.users
WHERE email = 'visitor@karate-group.com';