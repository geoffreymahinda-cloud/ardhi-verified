-- Trigger function: auto-generate verification report PDF
-- when a full HatiScan scan completes (trust_score is set on a full-tier report).
--
-- Calls POST /api/hatiscan/verification-report with the report_number.
-- Requires pg_net extension for async HTTP calls from the database.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION notify_verification_complete()
RETURNS TRIGGER AS $$
DECLARE
  base_url TEXT;
  service_key TEXT;
BEGIN
  -- Only fire for full-tier scans that have a trust score and haven't had a PDF generated yet
  IF NEW.scan_tier = 'full'
     AND NEW.trust_score IS NOT NULL
     AND NEW.report_pdf_generated_at IS NULL
     AND (OLD IS NULL OR OLD.trust_score IS NULL)
  THEN
    -- Read the base URL from app config, defaulting to production
    base_url := coalesce(
      current_setting('app.settings.base_url', true),
      'https://ardhiverified.com'
    );

    service_key := coalesce(
      current_setting('app.settings.service_role_key', true),
      ''
    );

    -- Fire async HTTP request via pg_net
    PERFORM net.http_post(
      url := base_url || '/api/hatiscan/verification-report',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := jsonb_build_object('report_number', NEW.report_number)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on INSERT or UPDATE of trust_score
DROP TRIGGER IF EXISTS trg_verification_report ON hatiscan_reports;

CREATE TRIGGER trg_verification_report
  AFTER INSERT OR UPDATE OF trust_score
  ON hatiscan_reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_verification_complete();
