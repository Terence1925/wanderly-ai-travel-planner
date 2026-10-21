-- Wanderly schema: profiles, trips, collaborators, chat history, rate limiting.
-- Run in Supabase → SQL Editor (or `supabase db push`).

create extension if not exists pgcrypto;

-- ─── Profiles ──────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are readable by signed-in users"
  on public.profiles for select to authenticated using (true);
create policy "Users update their own profile"
  on public.profiles for update to authenticated using (id = auth.uid());

create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ─── Trips ─────────────────────────────────────────────────────────────
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade,
  title text not null check (char_length(title) <= 120),
  destination text not null check (char_length(destination) <= 80),
  start_date date not null,
  end_date date not null,
  travelers int not null default 1 check (travelers between 1 and 12),
  request jsonb not null,
  itinerary jsonb not null,
  cover_image text,
  is_public boolean not null default false,
  share_slug text unique not null default encode(gen_random_bytes(6), 'hex'),
  invite_code text unique not null default encode(gen_random_bytes(8), 'hex'),
  updated_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index trips_owner_idx on public.trips (owner_id, start_date desc);

create table public.trip_members (
  trip_id uuid not null references public.trips on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'editor' check (role in ('editor', 'viewer')),
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create index trip_members_user_idx on public.trip_members (user_id);

-- SECURITY DEFINER avoids recursive RLS evaluation between trips and trip_members.
create function public.is_trip_member(p_trip_id uuid, p_editor_only boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.trip_members m
    where m.trip_id = p_trip_id and m.user_id = auth.uid()
      and (not p_editor_only or m.role = 'editor')
  );
$$;

create function public.touch_trip()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  -- Only the owner may change ownership, sharing or the invite code.
  if auth.uid() is distinct from old.owner_id then
    new.owner_id := old.owner_id;
    new.is_public := old.is_public;
    new.share_slug := old.share_slug;
    new.invite_code := old.invite_code;
  end if;
  return new;
end;
$$;

create trigger trips_touch before update on public.trips
  for each row execute function public.touch_trip();

alter table public.trips enable row level security;
alter table public.trip_members enable row level security;

create policy "Read own, shared-with-me, or public trips"
  on public.trips for select
  using (is_public or owner_id = auth.uid() or public.is_trip_member(id));
create policy "Create trips as yourself"
  on public.trips for insert to authenticated with check (owner_id = auth.uid());
create policy "Owners and editors update trips"
  on public.trips for update to authenticated
  using (owner_id = auth.uid() or public.is_trip_member(id, true));
create policy "Owners delete trips"
  on public.trips for delete to authenticated using (owner_id = auth.uid());

create policy "Members see co-members"
  on public.trip_members for select to authenticated
  using (user_id = auth.uid() or public.is_trip_member(trip_id)
         or exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid()));
create policy "Owners remove members, members leave"
  on public.trip_members for delete to authenticated
  using (user_id = auth.uid()
         or exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid()));

-- Joining is only possible with the secret invite code.
create function public.join_trip(p_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_trip uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to join a trip';
  end if;
  select id into v_trip from public.trips where invite_code = p_code;
  if v_trip is null then
    raise exception 'Invite link is invalid or expired';
  end if;
  insert into public.trip_members (trip_id, user_id)
  select v_trip, auth.uid()
  where not exists (select 1 from public.trips where id = v_trip and owner_id = auth.uid())
  on conflict do nothing;
  return v_trip;
end;
$$;

-- ─── Chat history ──────────────────────────────────────────────────────
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips on delete cascade,
  user_id uuid references auth.users on delete set null,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 2000),
  created_at timestamptz not null default now()
);

create index chat_messages_trip_idx on public.chat_messages (trip_id, created_at);

alter table public.chat_messages enable row level security;

create policy "Trip participants read chat"
  on public.chat_messages for select to authenticated
  using (exists (
    select 1 from public.trips t
    where t.id = trip_id and (t.owner_id = auth.uid() or public.is_trip_member(t.id))
  ));
create policy "Trip editors write chat"
  on public.chat_messages for insert to authenticated
  with check (exists (
    select 1 from public.trips t
    where t.id = trip_id and (t.owner_id = auth.uid() or public.is_trip_member(t.id, true))
  ));

-- ─── Rate limiting for AI endpoints ────────────────────────────────────
-- Fixed-window counters. Not readable by clients; only reachable through the function.
create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  count int not null
);

alter table public.rate_limits enable row level security;

create function public.consume_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_count int;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update set
    count = case when r.window_start < now() - make_interval(secs => p_window_seconds)
                 then 1 else r.count + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds)
                        then now() else r.window_start end
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_rate_limit(text, int, int) from public;
revoke all on function public.consume_rate_limit(text, int, int) from anon, authenticated;
-- Callable only from the server with the service-role key, so visitors cannot burn the quota.
grant execute on function public.consume_rate_limit(text, int, int) to service_role;

-- ─── Realtime ──────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.trips, public.chat_messages;
