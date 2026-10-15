-- Aurora site schema. Run in the Supabase SQL editor. All writes happen server-side with the service-role key.
create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  license_key text not null unique,
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('stripe','paypal')),
  provider_sub_id text not null,
  provider_customer_id text,
  plan text not null check (plan in ('bundle','facebook','instagram','tiktok')),
  status text not null,
  current_period_end timestamptz,
  launch_price boolean not null default false,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (provider, provider_sub_id)
);
create index if not exists subscriptions_user_idx on public.subscriptions(user_id);
-- Devices that have used a license: caps sharing of one license across many machines.
create table if not exists public.activations (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.licenses(id) on delete cascade,
  install_id text not null,
  product text not null,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique (license_id, install_id)
);
-- Stripe/PayPal events already processed (webhook idempotency).
create table if not exists public.webhook_events (
  id text primary key,
  provider text not null,
  received_at timestamptz not null default now()
);
alter table public.licenses enable row level security;
alter table public.subscriptions enable row level security;
alter table public.activations enable row level security;
alter table public.webhook_events enable row level security;
-- No public policies: the browser never reads these tables directly; the site's API routes use the service role.
