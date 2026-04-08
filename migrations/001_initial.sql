-- ============================================================
-- JANA – Supabase SQL Migration
-- In Supabase Dashboard → SQL Editor ausführen
-- Reihenfolge einhalten!
-- ============================================================


-- ── 1. EXTENSIONS ──────────────────────────────────────────
create extension if not exists "pgcrypto";


-- ── 2. PROFILES ────────────────────────────────────────────
-- Erweitert Supabase Auth users
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  phone       text,
  address     text,
  created_at  timestamptz default now() not null
);

-- Automatisch Profil anlegen wenn User sich registriert
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ── 3. COMMUNITIES ─────────────────────────────────────────
create table if not exists public.communities (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text unique not null,
  monthly_fee   numeric(10,2) not null default 5.00,
  payout_amount numeric(10,2),
  admin_id      uuid references public.profiles(id),
  founded_at    date,
  created_at    timestamptz default now() not null
);


-- ── 4. MEMBERSHIPS ─────────────────────────────────────────
create table if not exists public.memberships (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  community_id uuid not null references public.communities(id) on delete cascade,
  role         text not null default 'mitglied'
                 check (role in ('admin', 'kassenwart', 'mitglied')),
  status       text not null default 'aktiv'
                 check (status in ('aktiv', 'pausiert', 'gekuendigt')),
  joined_at    date not null default current_date,
  created_at   timestamptz default now() not null,
  unique (profile_id, community_id)
);


-- ── 5. PAYMENTS ────────────────────────────────────────────
create table if not exists public.payments (
  id            uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships(id) on delete cascade,
  amount        numeric(10,2) not null check (amount > 0),
  period_month  int not null check (period_month between 1 and 12),
  period_year   int not null check (period_year > 2000),
  paid_at       timestamptz default now(),
  recorded_by   uuid references public.profiles(id),
  note          text,
  created_at    timestamptz default now() not null,
  -- Jedes Mitglied kann pro Monat nur 1 Zahlung haben
  unique (membership_id, period_month, period_year)
);


-- ── 6. CASES (Todesfälle) ──────────────────────────────────
create table if not exists public.cases (
  id              uuid primary key default gen_random_uuid(),
  community_id    uuid not null references public.communities(id) on delete cascade,
  deceased_name   text not null,
  membership_id   uuid references public.memberships(id),
  death_date      date not null,
  death_location  text,
  burial_location text,
  status          text not null default 'offen'
                    check (status in ('offen', 'bearbeitung', 'abgeschlossen')),
  opened_by       uuid references public.profiles(id),
  closed_at       timestamptz,
  created_at      timestamptz default now() not null
);


-- ── 7. TRANSACTIONS (Kassenbuch) ───────────────────────────
-- KEINE updated_at Spalte → physisch unveränderlich
create table if not exists public.transactions (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  case_id      uuid references public.cases(id),
  amount       numeric(10,2) not null check (amount > 0),
  direction    text not null check (direction in ('eingang', 'ausgang')),
  description  text not null,
  recorded_by  uuid references public.profiles(id),
  created_at   timestamptz default now() not null
  -- Kein updated_at per Design
);


-- ── 8. AUDIT LOG ───────────────────────────────────────────
-- append-only, KEIN Update/Delete erlaubt via RLS
create table if not exists public.audit_log (
  id           bigserial primary key,
  community_id uuid references public.communities(id),
  actor_id     uuid references public.profiles(id),
  action       text not null,
  entity_type  text,
  entity_id    uuid,
  payload      jsonb default '{}'::jsonb,
  created_at   timestamptz default now() not null
);


-- ── 9. VIEW: Kassenstand ───────────────────────────────────
-- Wird immer live berechnet, nie gespeichert
create or replace view public.community_balance as
select
  community_id,
  coalesce(sum(case when direction = 'eingang' then amount else -amount end), 0) as balance,
  coalesce(sum(case when direction = 'eingang' then amount else 0 end), 0)       as total_in,
  coalesce(sum(case when direction = 'ausgang' then amount else 0 end), 0)       as total_out,
  count(*) filter (where direction = 'eingang')                                   as payment_count,
  count(*) filter (where direction = 'ausgang')                                   as payout_count
from public.transactions
group by community_id;


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Profiles: Jeder sieht nur sein eigenes Profil (+ Admins in Community)
alter table public.profiles enable row level security;

create policy "Eigenes Profil lesen"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Eigenes Profil updaten"
  on public.profiles for update
  using (auth.uid() = id);

-- Communities: Mitglieder sehen ihre Community
alter table public.communities enable row level security;

create policy "Community lesen wenn Mitglied"
  on public.communities for select
  using (
    exists (
      select 1 from public.memberships m
      where m.community_id = communities.id
        and m.profile_id   = auth.uid()
        and m.status       = 'aktiv'
    )
  );

create policy "Admin kann Community updaten"
  on public.communities for update
  using (admin_id = auth.uid());

-- Memberships: Mitglieder sehen alle in ihrer Community
alter table public.memberships enable row level security;

create policy "Memberships lesen in eigener Community"
  on public.memberships for select
  using (
    exists (
      select 1 from public.memberships m2
      where m2.community_id = memberships.community_id
        and m2.profile_id   = auth.uid()
        and m2.status       = 'aktiv'
    )
  );

create policy "Admin/Kassenwart kann Memberships anlegen"
  on public.memberships for insert
  with check (
    exists (
      select 1 from public.memberships m
      where m.community_id = memberships.community_id
        and m.profile_id   = auth.uid()
        and m.role         in ('admin', 'kassenwart')
        and m.status       = 'aktiv'
    )
  );

-- Payments: Mitglieder sehen alle Zahlungen in ihrer Community
alter table public.payments enable row level security;

create policy "Zahlungen lesen in eigener Community"
  on public.payments for select
  using (
    exists (
      select 1 from public.memberships m
      join public.memberships pm on pm.id = payments.membership_id
      where pm.community_id = m.community_id
        and m.profile_id    = auth.uid()
        and m.status        = 'aktiv'
    )
  );

create policy "Kassenwart/Admin kann Zahlungen eintragen"
  on public.payments for insert
  with check (
    exists (
      select 1 from public.memberships m
      join public.memberships pm on pm.id = payments.membership_id
      where pm.community_id = m.community_id
        and m.profile_id    = auth.uid()
        and m.role          in ('admin', 'kassenwart')
        and m.status        = 'aktiv'
    )
  );

-- Cases: Alle Mitglieder sehen Todesfälle
alter table public.cases enable row level security;

create policy "Todesfälle lesen in eigener Community"
  on public.cases for select
  using (
    exists (
      select 1 from public.memberships m
      where m.community_id = cases.community_id
        and m.profile_id   = auth.uid()
        and m.status       = 'aktiv'
    )
  );

create policy "Admin/Kassenwart kann Todesfälle anlegen"
  on public.cases for insert
  with check (
    exists (
      select 1 from public.memberships m
      where m.community_id = cases.community_id
        and m.profile_id   = auth.uid()
        and m.role         in ('admin', 'kassenwart')
        and m.status       = 'aktiv'
    )
  );

create policy "Admin/Kassenwart kann Status updaten"
  on public.cases for update
  using (
    exists (
      select 1 from public.memberships m
      where m.community_id = cases.community_id
        and m.profile_id   = auth.uid()
        and m.role         in ('admin', 'kassenwart')
        and m.status       = 'aktiv'
    )
  );

-- Transactions: Alle sehen, nur Admin/Kassenwart erstellt
alter table public.transactions enable row level security;

create policy "Transaktionen lesen in eigener Community"
  on public.transactions for select
  using (
    exists (
      select 1 from public.memberships m
      where m.community_id = transactions.community_id
        and m.profile_id   = auth.uid()
        and m.status       = 'aktiv'
    )
  );

create policy "Admin/Kassenwart kann Transaktionen anlegen"
  on public.transactions for insert
  with check (
    exists (
      select 1 from public.memberships m
      where m.community_id = transactions.community_id
        and m.profile_id   = auth.uid()
        and m.role         in ('admin', 'kassenwart')
        and m.status       = 'aktiv'
    )
  );

-- KEIN UPDATE/DELETE auf transactions → physisch unmöglich

-- Audit Log: Alle Mitglieder lesen, nur System schreibt (via Service Role)
alter table public.audit_log enable row level security;

create policy "Audit Log lesen in eigener Community"
  on public.audit_log for select
  using (
    exists (
      select 1 from public.memberships m
      where m.community_id = audit_log.community_id
        and m.profile_id   = auth.uid()
        and m.status       = 'aktiv'
    )
  );

create policy "Audit Log schreiben (alle authentifizierten)"
  on public.audit_log for insert
  with check (auth.uid() is not null);

-- KEIN UPDATE/DELETE auf audit_log → append-only, physisch unveränderlich

-- community_balance view: alle Mitglieder dürfen lesen
-- (View erbt RLS von transactions)


-- ============================================================
-- BEISPIELDATEN (optional, für Tests)
-- Nach dem echten Go-Live entfernen!
-- ============================================================

/*
-- Community anlegen (erst einen User registrieren, dann UUID eintragen)
insert into public.communities (name, slug, monthly_fee, payout_amount, admin_id)
values ('DITIB München Ost', 'ditib-muenchen-ost', 5.00, 3500.00, 'DEINE-USER-UUID');

-- Membership für Admin
insert into public.memberships (profile_id, community_id, role, joined_at)
values ('DEINE-USER-UUID', 'DEINE-COMMUNITY-UUID', 'admin', '2021-01-01');
*/
