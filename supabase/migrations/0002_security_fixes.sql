-- Security fixes found in review. Run after 0001_init.sql (Supabase → SQL Editor).

-- 1. The invite code grants edit access, so it must never be readable through the
--    general trips SELECT (which public share viewers and viewer-role members can use).
--    Column privileges hide it; owners fetch it through get_invite_code().
revoke select on public.trips from anon, authenticated;
grant select (
  id, owner_id, title, destination, start_date, end_date, travelers, request, itinerary,
  cover_image, is_public, share_slug, updated_by, created_at, updated_at
) on public.trips to anon, authenticated;

create function public.get_invite_code(p_trip_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select invite_code from public.trips where id = p_trip_id and owner_id = auth.uid();
$$;

revoke all on function public.get_invite_code(uuid) from public, anon;
grant execute on function public.get_invite_code(uuid) to authenticated;

-- 2. Chat messages must be attributed to the person who sends them.
drop policy "Trip editors write chat" on public.chat_messages;
create policy "Trip editors write chat as themselves"
  on public.chat_messages for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.trips t
      where t.id = trip_id and (t.owner_id = auth.uid() or public.is_trip_member(t.id, true))
    )
  );
