# Jana — Islamische Bestattungskasse

Transparenz- und Verwaltungssystem für islamische Bestattungskassen.

## Stack
- **Frontend**: HTML, CSS, Vanilla JS (ES Modules)
- **Backend**: Supabase (Auth + Postgres + Realtime)
- **Hosting**: Netlify

---

## Setup in 5 Schritten

### 1. Supabase vorbereiten

1. Gehe zu [supabase.com](https://supabase.com) → Dein Projekt
2. SQL Editor öffnen → `migrations/001_initial.sql` komplett einfügen → Ausführen
3. Unter **Settings → API**: `Project URL` und `anon public key` kopieren

### 2. Credentials eintragen

Öffne `js/config.js` und ersetze:

```js
const SUPABASE_URL = 'https://DEINE-PROJECT-ID.supabase.co';
const SUPABASE_ANON_KEY = 'DEIN-ANON-KEY';
```

### 3. Ersten Admin-User anlegen

1. Supabase → **Authentication → Users → Invite User** (mit deiner E-Mail)
2. E-Mail bestätigen und Passwort setzen
3. SQL Editor:

```sql
-- Community anlegen
insert into public.communities (name, slug, monthly_fee, payout_amount, admin_id)
values (
  'DEIN COMMUNITY NAME',
  'dein-slug',       -- URL-freundlich, z.B. 'ditib-muenchen-ost'
  5.00,              -- Monatsbeitrag in €
  3500.00,           -- Auszahlungsbetrag pro Todesfall
  'DEINE-USER-UUID'  -- aus Supabase Auth → Users
);

-- Admin-Membership anlegen
insert into public.memberships (profile_id, community_id, role, joined_at)
values (
  'DEINE-USER-UUID',
  (select id from communities where slug = 'dein-slug'),
  'admin',
  current_date
);
```

### 4. Auf Netlify deployen

```bash
# Option A: Netlify CLI
npm install -g netlify-cli
netlify deploy --prod --dir .

# Option B: Netlify Dashboard
# → New Site → GitHub Repo verbinden → Auto-Deploy
```

### 5. Supabase Realtime aktivieren

Supabase → **Database → Replication → 0 tables** → folgende Tabellen aktivieren:
- `payments`
- `transactions`
- `audit_log`

---

## Dateistruktur

```
jana/
├── index.html          Dashboard
├── login.html          Login (Passwort + Magic Link)
├── members.html        Mitgliederverwaltung
├── payments.html       Beitrags-Tracking
├── cases.html          Todesfälle & Auszahlungen
├── transactions.html   Kassenbuch
├── audit.html          Audit-Log (öffentlich, unveränderlich)
├── css/
│   └── main.css        Design System
├── js/
│   ├── config.js       Supabase Credentials (hier eintragen!)
│   ├── client.js       Supabase Client + Hilfsfunktionen
│   ├── auth-guard.js   Auth-Schutz für alle Seiten
│   └── ui.js           Shared UI-Helfer (Toast, Modal, Formatierung)
├── migrations/
│   └── 001_initial.sql Komplette Datenbankstruktur
└── netlify.toml        Netlify Konfiguration
```

---

## Sicherheitskonzept

| Maßnahme | Umsetzung |
|----------|-----------|
| Kein Löschen von Transaktionen | Keine DELETE-Policy auf `transactions` |
| Kein Löschen von Audit-Log | Keine DELETE-Policy auf `audit_log` |
| Kassenstand manipulationssicher | Wird immer live aus Transactions berechnet |
| Multi-Tenancy | Jede Community sieht nur ihre eigenen Daten (RLS) |
| Rollenbasiert | Admin, Kassenwart, Mitglied — unterschiedliche Rechte |
| Datenschutz | Mitglieder sehen Zahlungsstatus, aber keine Adressen/Telefon anderer |

---

## Neue Mitglieder einladen

Gehe zu **Supabase → Authentication → Users → Invite User** mit der E-Mail des neuen Mitglieds.
Nach dem Klick auf den Link in der E-Mail erscheint das Mitglied in der Auth-Tabelle.

Dann in `members.html` → `+ Mitglied hinzufügen` → UUID automatisch verknüpft.

> In einer späteren Version kann dies vollständig über das UI erledigt werden
> (via Supabase Edge Function + Service Role Key).

---

## Lizenz
Privates Projekt. Nicht für kommerzielle Nutzung ohne Genehmigung.
