-- Storage bucket for HatiScan verification report PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('hatiscan-reports', 'hatiscan-reports', false)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can read their own reports (matched by submitter_email in metadata)
CREATE POLICY "Authenticated read own reports"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'hatiscan-reports'
        AND auth.role() = 'authenticated'
    );

-- Service role can insert/update/delete (for PDF generation)
CREATE POLICY "Service role full access"
    ON storage.objects FOR ALL
    USING (
        bucket_id = 'hatiscan-reports'
        AND auth.role() = 'service_role'
    );

-- Add report_pdf_url column to track generated PDFs
ALTER TABLE hatiscan_reports
    ADD COLUMN IF NOT EXISTS report_pdf_url TEXT,
    ADD COLUMN IF NOT EXISTS report_pdf_generated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS report_pdf_emailed_to TEXT;
