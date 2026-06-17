create table if not exists contents (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  content_type text,
  goal text,
  tone text,
  draft text,
  content text not null,
  is_high_performance boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contents_channel_created_at
on contents (channel, created_at desc);

create index if not exists idx_contents_high_performance_created_at
on contents (is_high_performance, created_at desc);
