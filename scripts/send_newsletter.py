#!/usr/bin/env python3
"""
send_newsletter.py — sends up to DAILY_LIMIT emails per run via SMTP or Resend.

Usage:
  python send_newsletter.py --subject "Beste Deals diese Woche" --template deals

Env vars required (set in .env or export before running):
  SMTP_HOST       e.g. smtp.brevo.com
  SMTP_PORT       e.g. 587
  SMTP_USER       your SMTP login
  SMTP_PASS       your SMTP password
  FROM_EMAIL      newsletter@preisgucken.de
  BASE_URL        https://www.preisgucken.de
  DATABASE_URL    postgresql://user:pass@host/dbname

Install deps:
  pip install psycopg2-binary python-dotenv
"""

import os
import sys
import argparse
import smtplib
import time
import psycopg2
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

SMTP_HOST   = os.environ["SMTP_HOST"]
SMTP_PORT   = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER   = os.environ["SMTP_USER"]
SMTP_PASS   = os.environ["SMTP_PASS"]
FROM_EMAIL  = os.environ.get("FROM_EMAIL", "newsletter@preisgucken.de")
BASE_URL    = os.environ.get("BASE_URL", "https://www.preisgucken.de")
DATABASE_URL = os.environ["DATABASE_URL"]

DAILY_LIMIT = 20          # max emails per run
DELAY_SECS  = 3           # seconds between sends (avoid spam triggers)


# ── Email templates ────────────────────────────────────────────────────────────

def build_html(subscriber: dict, template: str) -> tuple[str, str]:
    """Returns (subject, html_body) for the given template."""
    unsubscribe_url = f"{BASE_URL}/api/newsletter/unsubscribe?token={subscriber['token']}"
    impressum_url   = f"{BASE_URL}/impressum"

    footer = f"""
      <hr style="border:none;border-top:1px solid #eee;margin:32px 0 16px"/>
      <p style="color:#aaa;font-size:11px;text-align:center;line-height:1.6">
        preisgucken.de™ · Preise vergleichen &amp; sparen<br/>
        Du erhältst diese E-Mail, weil du dich für unseren Newsletter angemeldet hast.<br/>
        <a href="{unsubscribe_url}" style="color:#aaa">Abmelden</a> ·
        <a href="{impressum_url}" style="color:#aaa">Impressum</a>
      </p>
    """

    if template == "deals":
        subject = "🔥 Die besten Deals der Woche – preisgucken.de"
        html = f"""
        <div style="font-family:sans-serif;max-width:560px;margin:auto;color:#222">
          <div style="background:#1A3A6B;padding:20px 24px;border-radius:8px 8px 0 0">
            <h1 style="color:#fff;margin:0;font-size:22px">preisgucken.de™</h1>
            <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:14px">Preise vergleichen &amp; sparen</p>
          </div>
          <div style="border:1px solid #eee;border-top:none;padding:24px;border-radius:0 0 8px 8px">
            <h2 style="color:#1A3A6B;margin-top:0">Die besten Deals dieser Woche 🛒</h2>
            <p>Hallo,</p>
            <p>wir haben diese Woche wieder die besten Preise für dich zusammengestellt.
               Schau jetzt rein und spare bares Geld:</p>

            <a href="{BASE_URL}/?utm_source=newsletter&utm_medium=email&utm_campaign=weekly-deals"
               style="display:inline-block;background:#F07D00;color:#fff;padding:14px 28px;
                      border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;margin:16px 0">
              Jetzt Deals entdecken →
            </a>

            <h3 style="color:#1A3A6B;margin-top:24px">Was ist neu?</h3>
            <ul style="line-height:2">
              <li>Täglich neue Angebote von top Händlern</li>
              <li>Preisvergleich auf einen Blick</li>
              <li>Preisalarm – wir benachrichtigen dich automatisch</li>
            </ul>

            <p style="margin-top:24px">Viel Spaß beim Sparen!<br/>
            <strong>Dein preisgucken.de™ Team</strong></p>
          </div>
          {footer}
        </div>
        """

    elif template == "welcome":
        subject = "Willkommen bei preisgucken.de™ – so sparst du am meisten"
        html = f"""
        <div style="font-family:sans-serif;max-width:560px;margin:auto;color:#222">
          <div style="background:#1A3A6B;padding:20px 24px;border-radius:8px 8px 0 0">
            <h1 style="color:#fff;margin:0;font-size:22px">preisgucken.de™</h1>
            <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:14px">Willkommen!</p>
          </div>
          <div style="border:1px solid #eee;border-top:none;padding:24px;border-radius:0 0 8px 8px">
            <h2 style="color:#1A3A6B;margin-top:0">Schön, dass du dabei bist! 🎉</h2>
            <p>Hallo,</p>
            <p>deine E-Mail-Adresse ist jetzt bestätigt. Ab sofort bekommst du die besten Deals
               direkt in dein Postfach.</p>

            <h3 style="color:#1A3A6B">So holst du das Meiste raus:</h3>
            <ol style="line-height:2">
              <li><strong>Preisalarm stellen</strong> – wir melden uns wenn dein Wunschpreis erreicht wird</li>
              <li><strong>Kategorien erkunden</strong> – Möbel, Elektronik, Gesundheit &amp; mehr</li>
              <li><strong>Täglich schauen</strong> – neue Angebote kommen jeden Tag</li>
            </ol>

            <a href="{BASE_URL}/?utm_source=newsletter&utm_medium=email&utm_campaign=welcome"
               style="display:inline-block;background:#F07D00;color:#fff;padding:14px 28px;
                      border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;margin:16px 0">
              Jetzt Angebote entdecken →
            </a>

            <p style="margin-top:24px">Viel Spaß beim Sparen!<br/>
            <strong>Dein preisgucken.de™ Team</strong></p>
          </div>
          {footer}
        </div>
        """

    else:
        raise ValueError(f"Unknown template: {template}")

    return subject, html


# ── DB helpers ─────────────────────────────────────────────────────────────────

def get_subscribers(limit: int) -> list[dict]:
    """Fetch confirmed, subscribed users who haven't been sent this batch yet."""
    conn = psycopg2.connect(DATABASE_URL)
    cur  = conn.cursor()
    cur.execute(
        """SELECT id, email, token, categories
           FROM newsletter_subscribers
           WHERE confirmed = TRUE
             AND unsubscribed_at IS NULL
             AND last_sent_at < NOW() - INTERVAL '6 days'
           ORDER BY last_sent_at ASC NULLS FIRST
           LIMIT %s""",
        (limit,)
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [{"id": r[0], "email": r[1], "token": r[2], "categories": r[3]} for r in rows]


def mark_sent(subscriber_id: int):
    conn = psycopg2.connect(DATABASE_URL)
    cur  = conn.cursor()
    cur.execute(
        "UPDATE newsletter_subscribers SET last_sent_at = NOW() WHERE id = %s",
        (subscriber_id,)
    )
    conn.commit()
    cur.close()
    conn.close()


# ── SMTP sender ────────────────────────────────────────────────────────────────

def send_email(to: str, subject: str, html: str) -> bool:
    msg = MIMEMultipart("alternative")
    msg["From"]    = f"preisgucken.de™ <{FROM_EMAIL}>"
    msg["To"]      = to
    msg["Subject"] = subject
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(FROM_EMAIL, [to], msg.as_string())
        return True
    except Exception as e:
        print(f"  ✗ SMTP error for {to}: {e}")
        return False


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Send newsletter batch")
    parser.add_argument("--template", default="deals",
                        choices=["deals", "welcome"],
                        help="Email template to use")
    parser.add_argument("--limit", type=int, default=DAILY_LIMIT,
                        help=f"Max emails to send (default: {DAILY_LIMIT})")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would be sent without actually sending")
    args = parser.parse_args()

    print(f"\n{'[DRY RUN] ' if args.dry_run else ''}Newsletter send — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"Template: {args.template} | Limit: {args.limit}\n")

    # Add last_sent_at column if not exists (safe to run multiple times)
    conn = psycopg2.connect(DATABASE_URL)
    cur  = conn.cursor()
    cur.execute("""
        ALTER TABLE newsletter_subscribers
        ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMP
    """)
    conn.commit()
    cur.close()
    conn.close()

    subscribers = get_subscribers(args.limit)
    print(f"Found {len(subscribers)} subscriber(s) to contact.\n")

    sent = 0
    for sub in subscribers:
        subject, html = build_html(sub, args.template)

        if args.dry_run:
            print(f"  [DRY] Would send '{subject}' → {sub['email']}")
            continue

        print(f"  → Sending to {sub['email']} ...", end=" ", flush=True)
        ok = send_email(sub["email"], subject, html)
        if ok:
            mark_sent(sub["id"])
            sent += 1
            print("✓")
        time.sleep(DELAY_SECS)

    print(f"\nDone. {sent}/{len(subscribers)} emails sent.")


if __name__ == "__main__":
    main()
