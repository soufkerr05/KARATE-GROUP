-- شغّل هذا الترحيل مرة واحدة في Supabase SQL Editor.
-- يحتفظ بالسجل الحالي ويضيف تواريخ الحضور التي تمت عبر البطاقة فقط.
ALTER TABLE public.athletes
ADD COLUMN IF NOT EXISTS "cardAttendanceDates" JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.athletes."cardAttendanceDates" IS
'تواريخ الحضور التي تمت عبر بطاقة QR وتمنح نقطة في مسابقة الساموراي';