-- إضافة حالة الطلبات الجديدة مع إبقاء الرياضيين الحاليين نشطين.
ALTER TABLE public.athletes
    ADD COLUMN IF NOT EXISTS "isPending" boolean NOT NULL DEFAULT false;

-- السماح للزوار بإرسال طلبات معلقة فقط.
GRANT INSERT ON TABLE public.athletes TO anon;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'athletes'
          AND policyname = 'Public can submit pending athlete requests'
    ) THEN
        CREATE POLICY "Public can submit pending athlete requests"
            ON public.athletes
            FOR INSERT
            TO anon
            WITH CHECK ("isPending" = true);
    END IF;
END
$$;
