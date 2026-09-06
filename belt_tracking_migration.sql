-- إضافة بيانات تتبع الحزام والترقية.
ALTER TABLE public.athletes
    ADD COLUMN IF NOT EXISTS "currentBelt" text NOT NULL DEFAULT 'أبيض',
    ADD COLUMN IF NOT EXISTS "beltAttendance" integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "lastBeltDate" date;

-- ضمان تهيئة السجلات القديمة بالقيم الافتراضية.
UPDATE public.athletes
SET "currentBelt" = COALESCE(NULLIF("currentBelt", ''), 'أبيض'),
    "beltAttendance" = COALESCE("beltAttendance", 0)
WHERE "currentBelt" IS NULL
   OR "currentBelt" = ''
   OR "beltAttendance" IS NULL;
