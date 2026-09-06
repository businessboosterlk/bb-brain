-- bb_brain_feed_watch.sql (prepared 2026-09-06, NOT APPLIED: schema changes wait for Thulaib's go)
--
-- WHY. On 2026-09-06 the 07:15 brain feed died and the agent shouted into a file and a Mac
-- notification that nobody read for thirteen hours (L-BRAIN-014). A shout has to reach a phone.
-- The estate already has bb_notify and the push queue, so this adds the smallest piece that lets a
-- Mac-side script be missed: a heartbeat row the agent stamps after every green publish and a
-- watcher on pg_cron that phones THULAIB and SHIARA when the stamp is over 26 hours old.
--
-- SHAPE. Mirrors bb_brain_morning: SECURITY DEFINER, search_path pinned, execute revoked from
-- anon, a p_dry that exercises the real insert inside a rolled-back block, no money figure, no
-- secret. The ONE public door is bb_brain_heartbeat, which can only stamp the single row. Residual:
-- someone with the public key could fake a heartbeat and suppress one alert. It cannot send.
--
-- APPLY through the Supabase MCP as migration name bb_brain_feed_watch. ROLLBACK is at the end.
-- PROVE after applying, in this order:
--   1. select public.bb_brain_heartbeat('proof');            -- stamps now, returns the time
--   2. select * from public.bb_brain_feed_watch(true);       -- dry: stale false, nothing queued
--   3. update public.bb_brain_heartbeat set published_at = now() - interval '30 hours';
--      select * from public.bb_brain_feed_watch(true);       -- dry: stale true, queued true, rolled back
--   4. select public.bb_brain_heartbeat('proof-restored');   -- back to fresh
--   5. select jobname, schedule from cron.job where jobname = 'bb-brain-feed-watch';
--   6. select has_function_privilege('anon', 'public.bb_brain_feed_watch(boolean)', 'execute'); -- false
--   7. select has_function_privilege('anon', 'public.bb_brain_heartbeat(text)', 'execute');     -- true
--   Then run ~/bb-brain/brain-agent.sh once and read "ok heartbeat recorded" in agent.log.

create table if not exists public.bb_brain_heartbeat (
  id            smallint primary key default 1 check (id = 1),
  published_at  timestamptz not null default now(),
  commit        text,
  note          text
);
insert into public.bb_brain_heartbeat (id, published_at, commit, note)
values (1, now(), null, 'created by the migration; the agent stamps this row after every green publish')
on conflict (id) do nothing;
alter table public.bb_brain_heartbeat enable row level security;
revoke all on public.bb_brain_heartbeat from public, anon, authenticated;

create or replace function public.bb_brain_heartbeat(p_commit text default null)
returns timestamptz
language plpgsql
security definer
set search_path to 'public'
as $function$
/* THE HEARTBEAT (2026-09-06). Called by brain-agent.sh after a green publish, with the public
   key, so it is the one public door in this file. It can only stamp the single row. */
declare v_at timestamptz;
begin
  update public.bb_brain_heartbeat
     set published_at = now(), commit = left(coalesce(p_commit, ''), 40), note = 'agent'
   where id = 1
  returning published_at into v_at;
  return v_at;
end $function$;
revoke all on function public.bb_brain_heartbeat(text) from public;
grant execute on function public.bb_brain_heartbeat(text) to anon, authenticated;

create or replace function public.bb_brain_feed_watch(p_dry boolean default false)
returns table(stale boolean, age_hours numeric, queued boolean)
language plpgsql
security definer
set search_path to 'public'
as $function$
/* THE WATCHER (2026-09-06). pg_cron, 02:30 UTC daily (08:00 Colombo), after both feeds
   (07:15 and 21:30 Colombo) have had their chance. Over 26 hours since the last green publish
   means at least one feed died, so THULAIB and SHIARA get one line on the phone. p_dry runs the
   real bb_notify inside a rolled-back block. No money figure, no secret, anon revoked.
   Remove with: select cron.unschedule('bb-brain-feed-watch'); drop function bb_brain_feed_watch; */
declare v_at timestamptz; v_age numeric; v_stale boolean; v_q bigint; v_body text;
begin
  select published_at into v_at from public.bb_brain_heartbeat where id = 1;
  v_age := round(extract(epoch from (now() - coalesce(v_at, now() - interval '999 hours'))) / 3600, 1);
  v_stale := v_age > 26;
  v_body := 'Its last green publish was ' || v_age || ' hours ago ('
         || to_char(coalesce(v_at, now()) at time zone 'Asia/Colombo', 'Dy DD Mon HH24:MI') || ' Colombo). '
         || 'Yesterday''s brain is still live. Wake the Mac, open the BB Brain chat and say: brain agent failed.';
  if not v_stale then
    return query select false, v_age, false; return;
  end if;
  if p_dry then
    begin
      v_q := public.bb_notify('The Digital Brain did not feed', v_body, array['THULAIB','SHIARA'],
                              'https://businessboosterlk.github.io/bb-brain/', 'brain_feed_watch');
      if v_q is null then raise exception 'BB_DRY_RUN_NO_ROW'; end if;
      raise exception 'BB_DRY_RUN_ROLLBACK';
    exception
      when others then
        if sqlerrm = 'BB_DRY_RUN_ROLLBACK' then return query select true, v_age, true; return; end if;
        raise;
    end;
  end if;
  v_q := public.bb_notify('The Digital Brain did not feed', v_body, array['THULAIB','SHIARA'],
                          'https://businessboosterlk.github.io/bb-brain/', 'brain_feed_watch');
  return query select true, v_age, (v_q is not null);
end $function$;
revoke all on function public.bb_brain_feed_watch(boolean) from public, anon, authenticated;

select cron.schedule('bb-brain-feed-watch', '30 2 * * *', $$select public.bb_brain_feed_watch(false)$$);

-- ROLLBACK (run as a separate migration named bb_brain_feed_watch_rollback):
--   select cron.unschedule('bb-brain-feed-watch');
--   drop function if exists public.bb_brain_feed_watch(boolean);
--   drop function if exists public.bb_brain_heartbeat(text);
--   drop table if exists public.bb_brain_heartbeat;
