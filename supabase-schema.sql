-- Run this once in your Supabase project's SQL Editor
-- (Dashboard > SQL Editor > New query > paste > Run).

create extension if not exists pgcrypto;

-- Options people can vote on.
create table if not exists options (
  id uuid primary key default gen_random_uuid(),
  text text not null check (char_length(trim(text)) between 1 and 140),
  created_at timestamptz not null default now()
);

-- One row per voter. Voting again just updates the row (single choice,
-- changeable any time) via upsert on voter_id.
create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references options(id) on delete cascade,
  voter_id text not null unique,
  created_at timestamptz not null default now()
);

-- View the app reads from. security_invoker means it respects the RLS
-- policies of whoever is querying it (the anon key), not the view owner.
create or replace view option_vote_counts
  with (security_invoker = true) as
select
  o.id,
  o.text,
  o.created_at,
  count(v.id) as vote_count
from options o
left join votes v on v.option_id = o.id
group by o.id, o.text, o.created_at
order by o.created_at asc;

grant select on option_vote_counts to anon;

-- Row Level Security: this app has no login, so every policy is
-- deliberately public. Anyone with the link can read, add an option,
-- and cast/change one vote. There's no protection against someone
-- clearing their browser storage and voting again under a new voter_id.
alter table options enable row level security;

create policy "options are publicly readable"
  on options for select
  using (true);

create policy "anyone can add an option"
  on options for insert
  with check (true);

alter table votes enable row level security;

create policy "votes are publicly readable"
  on votes for select
  using (true);

create policy "anyone can cast a vote"
  on votes for insert
  with check (true);

create policy "anyone can change their own vote"
  on votes for update
  using (true)
  with check (true);

-- Seed the three placeholder options, but only if the table is empty
-- (so re-running this script won't create duplicates). Edit or delete
-- these any time from the Table Editor once you have real ideas.
insert into options (text)
select v
from (values
  ('A witty phrase or quote'),
  ('A graphic / symbolic design'),
  ('Something spiritual')
) as seed(v)
where not exists (select 1 from options);
