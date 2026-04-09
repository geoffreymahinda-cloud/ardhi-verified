#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Ardhi Verified — Weekly Scraper Cron Job
# ═══════════════════════════════════════════════════════════
# Run this weekly to keep the intelligence database current.
#
# Install:
#   chmod +x scripts/cron_scrape.sh
#   crontab -e
#   Add: 0 2 * * 0 cd /Users/geoffreymahinda/Desktop/ardhi-verified && ./scripts/cron_scrape.sh >> scripts/cron.log 2>&1
#
# This runs every Sunday at 2 AM.
# ═══════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$SCRIPT_DIR/cron.log"

echo ""
echo "═══════════════════════════════════════════"
echo "ARDHI SCRAPER CRON — $(date)"
echo "═══════════════════════════════════════════"

cd "$PROJECT_DIR" || exit 1

# Step 1: Scrape ELC court cases (all 44 stations)
echo "[$(date +%H:%M)] Starting ELC scraper..."
python3 scripts/scrape_elc.py
echo "[$(date +%H:%M)] ELC scraper complete."

# Step 2: Load ELC data to Supabase
echo "[$(date +%H:%M)] Loading ELC data to Supabase..."
python3 scripts/load_elc_to_supabase.py
echo "[$(date +%H:%M)] ELC data loaded."

# Step 3: Scrape High Court + Court of Appeal + Supreme Court
echo "[$(date +%H:%M)] Starting courts scraper..."
python3 scripts/scrape_courts.py
echo "[$(date +%H:%M)] Courts scraper complete."

# Step 4: Load courts data to Supabase
echo "[$(date +%H:%M)] Loading courts data to Supabase..."
python3 scripts/load_elc_to_supabase.py
echo "[$(date +%H:%M)] Courts data loaded."

# Step 4b: Load full judgement texts to Supabase
if [ -f "scripts/elc_judgements.json" ]; then
  echo "[$(date +%H:%M)] Loading judgement texts to Supabase..."
  python3 scripts/load_judgements_to_supabase.py
  echo "[$(date +%H:%M)] Judgement texts loaded."
fi

# Step 5: Scrape gazette notices (if script exists)
if [ -f "scripts/scrape_gazette.py" ]; then
  echo "[$(date +%H:%M)] Starting gazette scraper..."
  python3 scripts/scrape_gazette.py
  echo "[$(date +%H:%M)] Gazette scraper complete."

  if [ -f "scripts/load_gazette_to_supabase.py" ]; then
    echo "[$(date +%H:%M)] Loading gazette data to Supabase..."
    python3 scripts/load_gazette_to_supabase.py
    echo "[$(date +%H:%M)] Gazette data loaded."
  fi
fi

echo ""
echo "═══════════════════════════════════════════"
echo "ALL SCRAPERS COMPLETE — $(date)"
echo "═══════════════════════════════════════════"
