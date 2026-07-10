import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const { firmenname, emailKontakt, vornameKontakt, nachnameKontakt } = body;

  if (!firmenname || !emailKontakt) {
    return NextResponse.json({ error: "Pflichtfelder fehlen" }, { status: 400 });
  }

  try {
    await query(
      `INSERT INTO b2b_registrations (
        firmenname, rechtsform, ust_id_nr, handelsregister_nr, handelsregister_gericht,
        strasse, plz, ort, land, website, gruendungsjahr, mitarbeiteranzahl, jahresumsatz,
        kontakt_anrede, kontakt_vorname, kontakt_nachname, kontakt_position,
        kontakt_email, kontakt_telefon,
        tech_vorname, tech_nachname, tech_email, tech_telefon,
        kategorien, produktanzahl, update_frequenz, preismodell, provision_modell,
        provision_satz, mindestpreis, hoechstpreis, versandlaender, rueckgaberecht,
        produktbeschreibung, integrationsmethode, feed_url, feed_format,
        feed_update_intervall, api_verfuegbar, test_zugang, technische_anmerkungen,
        unterschrift_name, unterschrift_ort, unterschrift_datum,
        agb_akzeptiert, datenschutz_akzeptiert, avv_akzeptiert,
        qualitaetsrichtlinien_akzeptiert, wettbewerbsklausel_akzeptiert,
        status, eingegangen_am
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
        $14,$15,$16,$17,$18,$19,$20,$21,$22,$23,
        $24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,
        $35,$36,$37,$38,$39,$40,$41,$42,$43,$44,
        $45,$46,$47,$48,$49,
        'neu', NOW()
      )`,
      [
        body.firmenname, body.rechtsform, body.ustIdNr, body.handelsregisterNr, body.handelsregisterGericht,
        body.strasse, body.plz, body.ort, body.land, body.website, body.gruendungsjahr,
        body.mitarbeiteranzahl, body.jahresumsatz,
        body.anredeKontakt, body.vornameKontakt, body.nachnameKontakt, body.positionKontakt,
        body.emailKontakt, body.telefonKontakt,
        body.vornameTech, body.nachnameTech, body.emailTech, body.telefonTech,
        body.kategorien?.join(", "), body.produktanzahl, body.updateFrequenz,
        body.preismodell, body.provisionModell, body.provisionSatz,
        body.mindestpreis || null, body.hoechstpreis || null,
        body.versandlaender?.join(", "), body.rueckgaberecht, body.produktbeschreibung,
        body.integrationsmethode, body.feedUrl, body.feedFormat,
        body.feedUpdateIntervall, body.apiVerfuegbar, body.testZugang,
        body.technischeAnmerkungen,
        body.unterschriftName, body.unterschriftOrt, body.unterschriftDatum,
        body.agbGelesen, body.datenschutzGelesen, body.avvAkzeptiert,
        body.qualitaetsrichtlinienAkzeptiert, body.wettbewerbsklauselAkzeptiert,
      ]
    );

    // Notify B2B team by email (fire and forget)
    try {
      const { sendB2BNotification } = await import("@/lib/email");
      await sendB2BNotification({
        firmenname,
        kontakt: `${vornameKontakt} ${nachnameKontakt}`,
        email: emailKontakt,
      });
    } catch {
      // email failure should not block the response
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("b2b-registrierung error:", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
