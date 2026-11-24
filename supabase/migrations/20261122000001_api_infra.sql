-- API infrastructure tables (P0-11): server-only, RLS enabled, no client policies.

-- Idempotency: same (user_id, key) + same request hash replays the stored
-- response; the API enforces the conflict case and the 24 h window by filter.
create table public.idempotency_keys (
  id uuid primary key default public.uuid_generate_v7(),
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  request_hash text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, key)
);

-- Rate limiting: one row per hit; the API counts hits inside the window.
create table public.rate_limit_hits (
  id bigint generated always as identity primary key,
  identity text not null,
  route text not null,
  created_at timestamptz not null default now()
);
create index rate_limit_hits_window on public.rate_limit_hits (identity, route, created_at);

alter table public.idempotency_keys enable row level security;
alter table public.rate_limit_hits enable row level security;
-- No client policies: service-role only.
