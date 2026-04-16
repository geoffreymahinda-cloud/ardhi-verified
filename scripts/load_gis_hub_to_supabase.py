"""
Ardhi Verified --- Load GIS Hub Data to Supabase (lr_block_lookup)
===================================================================
Reads scraped LR-to-block mappings from gis_hub_output.json
and upserts into the lr_block_lookup table in Supabase.

Uses ON CONFLICT (lr_number, block_number) for deduplication.
Validates LR/block formats against known Kenyan patterns before insert.

Usage:
    python3 scripts/load_gis_hub_to_supabase.py
    python3 scripts/load_gis_hub_to_supabase.py --dry-run

Dependencies:
    pip install supabase python-dotenv
"""

import json
import logging
import os
import re
import sys
from datetime import datetime
from pathlib import Path


SCRIPT_DIR = Path(__file__).parent
INPUT_FILE = SCRIPT_DIR / "gis_hub_output.json"
ERROR_LOG = SCRIPT_DIR / "gis_hub_loader_errors.log"

# Maximum batch size for Supabase upsert (PostgREST limit)
BATCH_SIZE = 100

# -- LOGGING -----------------------------------------------------------------

logger = logging.getLogger("gis_hub_loader")
logger.setLevel(logging.DEBUG)

_fh = logging.FileHandler(ERROR_LOG, encoding="utf-8")
_fh.setLevel(logging.WARNING)
_fh.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
logger.addHandler(_fh)

_sh = logging.StreamHandler()
_sh.setLevel(logging.INFO)
_sh.setFormatter(logging.Formatter("%(message)s"))
logger.addHandler(_sh)


# -- LR / BLOCK VALIDATION ---------------------------------------------------
# These patterns match the NORMALIZED forms produced by scrape_gis_hub.py.
# LR numbers: "LR 1234/56", "IR 12345", "FR 1234/5"
# Block numbers: "45/78", "12/456", "1"

_VALID_LR_PATTERN = re.compile(
    r"^(?:LR|IR|FR)\s+\d{1,6}(?:[/\-]\d{1,6}){0,3}$"
)

_VALID_BLOCK_PATTERN = re.compile(
    r"^\d{1,5}(?:[/\-]\d{1,6}){0,3}$"
)

# Extra sanity: reject obviously bad values
_REJECT_PATTERNS = [
    re.compile(r"^[0\s]+$"),          # all zeros
    re.compile(r"test", re.I),        # test data
    re.compile(r"sample", re.I),      # sample data
    re.compile(r"n/?a", re.I),        # N/A
    re.compile(r"^-+$"),              # dashes
    re.compile(r"null", re.I),        # null
]


def validate_lr_number(lr: str) -> bool:
    """
    Validate that a string looks like a real Kenyan LR number.

    Valid: "LR 1234/56", "LR 209/21922", "IR 12345", "FR 1234"
    Invalid: "LR", "", "test", "0", "N/A"
    """
    if not lr or len(lr) < 4:
        return False

    for pat in _REJECT_PATTERNS:
        if pat.search(lr):
            return False

    if not _VALID_LR_PATTERN.match(lr):
        return False

    return True


def validate_block_number(block: str) -> bool:
    """
    Validate that a string looks like a real Nairobi block number.

    Valid: "45/78", "12/456", "1"
    Invalid: "", "0", "test", "N/A"
    """
    if not block or len(block.strip()) == 0:
        return False

    for pat in _REJECT_PATTERNS:
        if pat.search(block):
            return False

    if not _VALID_BLOCK_PATTERN.match(block):
        return False

    return True


def load_env():
    """Parse .env.local file for Supabase credentials."""
    env_path = SCRIPT_DIR.parent / ".env.local"
    env = {}
    try:
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    env[key.strip()] = value.strip()
    except FileNotFoundError:
        print("ERROR: .env.local not found at {}".format(env_path))
        sys.exit(1)
    return env


def main():
    dry_run = "--dry-run" in sys.argv

    print("=" * 60)
    print("ARDHI VERIFIED -- Load GIS Hub Data to lr_block_lookup")
    if dry_run:
        print("MODE: DRY RUN (no writes to database)")
    print("=" * 60)

    env = load_env()
    supabase_url = env.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = env.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

    if not supabase_url or not supabase_key:
        print("ERROR: Missing SUPABASE_URL or key in .env.local")
        sys.exit(1)

    print("  Supabase URL: {}".format(supabase_url))
    print("  Using key: {}".format(
        "service_role" if env.get("SUPABASE_SERVICE_ROLE_KEY") else "anon"
    ))

    # Load scraped data
    try:
        with open(INPUT_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        print("ERROR: {} not found. Run scrape_gis_hub.py first.".format(INPUT_FILE))
        sys.exit(1)
    except json.JSONDecodeError as e:
        print("ERROR: {} is corrupt: {}".format(INPUT_FILE, e))
        sys.exit(1)

    mappings = data.get("mappings", [])
    print("\n  Mappings in file: {}".format(len(mappings)))

    if not mappings:
        print("  No mappings to load. Exiting.")
        return

    # Validate and filter
    valid = []
    invalid_lr = 0
    invalid_block = 0
    invalid_examples = []  # Keep a few examples for debugging

    for m in mappings:
        lr = m.get("lr_number", "")
        block = m.get("block_number", "")

        lr_ok = validate_lr_number(lr)
        block_ok = validate_block_number(block)

        if lr_ok and block_ok:
            valid.append(m)
        else:
            if not lr_ok:
                invalid_lr += 1
            if not block_ok:
                invalid_block += 1
            if len(invalid_examples) < 10:
                invalid_examples.append({
                    "lr": lr,
                    "block": block,
                    "lr_ok": lr_ok,
                    "block_ok": block_ok,
                })

    # Deduplicate valid mappings before insert
    seen = set()
    deduped = []
    for m in valid:
        key = (m["lr_number"], m["block_number"])
        if key not in seen:
            seen.add(key)
            deduped.append(m)
    dup_count = len(valid) - len(deduped)
    valid = deduped

    print("  Valid unique mappings: {}".format(len(valid)))
    if invalid_lr:
        print("  Skipped (invalid LR): {}".format(invalid_lr))
    if invalid_block:
        print("  Skipped (invalid block): {}".format(invalid_block))
    if dup_count:
        print("  Skipped (duplicate in file): {}".format(dup_count))

    if invalid_examples:
        print("\n  Invalid examples:")
        for ex in invalid_examples[:5]:
            print("    LR={!r} (ok={}) / Block={!r} (ok={})".format(
                ex["lr"], ex["lr_ok"], ex["block"], ex["block_ok"]
            ))
        logger.warning(
            "Rejected %d invalid LR, %d invalid block out of %d total",
            invalid_lr, invalid_block, len(mappings),
        )

    if not valid:
        print("\n  No valid mappings to load. Check the scraper output.")
        return

    # Stats
    unique_lr = len(set(m["lr_number"] for m in valid))
    unique_block = len(set(m["block_number"] for m in valid))

    if dry_run:
        print("\n  DRY RUN -- showing what would be upserted:\n")
        for i, m in enumerate(valid[:20]):
            print("    {:4d}. {} -> Block {} (source: {})".format(
                i + 1,
                m["lr_number"],
                m["block_number"],
                m.get("source_layer", "gis_hub")[:40],
            ))
        if len(valid) > 20:
            print("    ... and {} more".format(len(valid) - 20))

        print("\n  Summary:")
        print("    Unique LR numbers:    {}".format(unique_lr))
        print("    Unique block numbers: {}".format(unique_block))
        print("    Total rows to upsert: {}".format(len(valid)))
        print("\n  Run without --dry-run to write to Supabase.")
        print("=" * 60)
        return

    # Connect to Supabase
    try:
        from supabase import create_client
    except ImportError:
        print("ERROR: supabase package not installed. Run: pip install supabase")
        sys.exit(1)

    print("\n  Connecting to Supabase...")
    supabase = create_client(supabase_url, supabase_key)

    inserted = 0
    skipped = 0
    errors = 0
    error_messages = []

    print("  Upserting {} records in batches of {}...\n".format(len(valid), BATCH_SIZE))

    for batch_start in range(0, len(valid), BATCH_SIZE):
        batch = valid[batch_start:batch_start + BATCH_SIZE]
        rows = []

        for m in batch:
            rows.append({
                "lr_number": m["lr_number"][:100],
                "block_number": m["block_number"][:100],
                "source": "nairobi_gis_hub",
                "source_layer": m.get("source_layer", "")[:200],
                "confidence": 0.85,
                "verified_at": None,
                "created_at": datetime.now().isoformat(),
            })

        try:
            supabase.table("lr_block_lookup").upsert(
                rows, on_conflict="lr_number,block_number"
            ).execute()
            inserted += len(rows)
        except Exception as e:
            error_msg = str(e)
            logger.error("Batch error at offset %d: %s", batch_start, error_msg[:200])

            # Fall back to individual inserts for this failed batch
            for row in rows:
                try:
                    supabase.table("lr_block_lookup").upsert(
                        [row], on_conflict="lr_number,block_number"
                    ).execute()
                    inserted += 1
                except Exception as e2:
                    err2 = str(e2)
                    if "duplicate" in err2.lower() or "conflict" in err2.lower():
                        skipped += 1
                    else:
                        errors += 1
                        if len(error_messages) < 10:
                            error_messages.append(
                                "Row LR={} Block={}: {}".format(
                                    row["lr_number"], row["block_number"], err2[:100]
                                )
                            )
                        logger.error("Row error LR=%s Block=%s: %s",
                                     row["lr_number"], row["block_number"], err2[:200])

        # Progress update
        done = batch_start + len(batch)
        if done % 500 == 0 or done >= len(valid):
            print("    {}/{} processed ({} inserted, {} skipped, {} errors)".format(
                done, len(valid), inserted, skipped, errors
            ))

    # Final summary
    print("\n" + "=" * 60)
    print("  Done!")
    print("  Upserted:  {}".format(inserted))
    print("  Skipped:   {} (duplicates)".format(skipped))
    print("  Errors:    {}".format(errors))
    print("  Total:     {}".format(len(valid)))
    print("")
    print("  Unique LR numbers:    {}".format(unique_lr))
    print("  Unique block numbers: {}".format(unique_block))

    if error_messages:
        print("\n  Error samples:")
        for msg in error_messages[:5]:
            print("    {}".format(msg))
        print("  Full error log: {}".format(ERROR_LOG))

    print("=" * 60)


if __name__ == "__main__":
    main()
