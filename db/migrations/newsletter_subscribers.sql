-- Run this once in production DB
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id              SERIAL PRIMARY KEY,
  email           VARCHAR(255) UNIQUE NOT NULL,
  categories      TEXT[]       DEFAULT '{}',
  token           VARCHAR(64)  UNIQUE,
  confirmed       BOOLEAN      DEFAULT FALSE,
  confirmed_at    TIMESTAMP,
  unsubscribed_at TIMESTAMP,
  ip_address      VARCHAR(45),
  last_sent_at    TIMESTAMP,
  created_at      TIMESTAMP    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_confirmed
  ON newsletter_subscribers (confirmed)
  WHERE confirmed = TRUE AND unsubscribed_at IS NULL;
