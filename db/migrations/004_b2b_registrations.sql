-- Migration 004: B2B Vendor Registration table
CREATE TABLE IF NOT EXISTS b2b_registrations (
  id                              SERIAL PRIMARY KEY,

  -- Unternehmensdaten
  firmenname                      TEXT NOT NULL,
  rechtsform                      TEXT,
  ust_id_nr                       TEXT,
  handelsregister_nr              TEXT,
  handelsregister_gericht         TEXT,
  strasse                         TEXT,
  plz                             TEXT,
  ort                             TEXT,
  land                            TEXT DEFAULT 'Deutschland',
  website                         TEXT,
  gruendungsjahr                  INTEGER,
  mitarbeiteranzahl               TEXT,
  jahresumsatz                    TEXT,

  -- Kaufmännischer Kontakt
  kontakt_anrede                  TEXT,
  kontakt_vorname                 TEXT,
  kontakt_nachname                TEXT,
  kontakt_position                TEXT,
  kontakt_email                   TEXT NOT NULL,
  kontakt_telefon                 TEXT,

  -- Technischer Kontakt
  tech_vorname                    TEXT,
  tech_nachname                   TEXT,
  tech_email                      TEXT,
  tech_telefon                    TEXT,

  -- Produktkatalog
  kategorien                      TEXT,
  produktanzahl                   TEXT,
  update_frequenz                 TEXT,
  preismodell                     TEXT,
  provision_modell                TEXT,
  provision_satz                  NUMERIC(5,2),
  mindestpreis                    NUMERIC(12,2),
  hoechstpreis                    NUMERIC(12,2),
  versandlaender                  TEXT,
  rueckgaberecht                  TEXT,
  produktbeschreibung             TEXT,

  -- Technische Integration
  integrationsmethode             TEXT,
  feed_url                        TEXT,
  feed_format                     TEXT,
  feed_update_intervall           TEXT,
  api_verfuegbar                  TEXT,
  test_zugang                     TEXT,
  technische_anmerkungen          TEXT,

  -- Vertrag & Unterschrift
  unterschrift_name               TEXT,
  unterschrift_ort                TEXT,
  unterschrift_datum              DATE,

  -- Rechtliche Zustimmungen
  agb_akzeptiert                  BOOLEAN DEFAULT FALSE,
  datenschutz_akzeptiert          BOOLEAN DEFAULT FALSE,
  avv_akzeptiert                  BOOLEAN DEFAULT FALSE,
  qualitaetsrichtlinien_akzeptiert BOOLEAN DEFAULT FALSE,
  wettbewerbsklausel_akzeptiert   BOOLEAN DEFAULT FALSE,

  -- Workflow
  status                          TEXT DEFAULT 'neu',   -- neu | in_pruefung | akzeptiert | abgelehnt | aktiv
  notizen                         TEXT,
  eingegangen_am                  TIMESTAMPTZ DEFAULT NOW(),
  bearbeitet_am                   TIMESTAMPTZ,
  bearbeitet_von                  TEXT
);

CREATE INDEX IF NOT EXISTS idx_b2b_registrations_status ON b2b_registrations(status);
CREATE INDEX IF NOT EXISTS idx_b2b_registrations_email  ON b2b_registrations(kontakt_email);
