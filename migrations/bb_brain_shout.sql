-- BB BRAIN SHOUT, 6 Oct 2026 (Fable). Cast from bb_brain_feed_watch.sql and its bb_notify call.
--
-- WHY: the Brain refused to publish on 3, 4 and 6 October. Each time the flag file and the Mac
-- notification went unread for hours; twice ChatGPT read the log before anyone did. The 08:00
-- feed watch only fires after 26 hours. A failed run must reach a phone at once.
--
-- SHAPE: one anon-executable function the Mac calls from brain-agent.sh shout(). It sends ONE
-- bb_notify to THULAIB and SHIARA with a fixed title and the agent's message, then refuses to
-- send again for six hours (the rate limit lives here, not on the Mac, because the Mac is what
-- failed). Anon can call it: the heartbeat already opened that door; the title is fixed so the
-- worst an outsider could do is send one line of their own words every six hours to two phones.
--
-- PROOFS before trusting it (run after apply):
--   1. select * from public.bb_brain_shout('proof: planted failure', true);      -- dry: sent true, rolled back, no phone rings
--   2. a real send is proven by the first real failure; the rate limit is proven by two real calls, not tonight
--   3. select count(*) from public.bb_notify_queue where source_table = 'brain_agent_shout'; -- 0 after the dry run
--   5. select has_function_privilege('anon', 'public.bb_brain_shout(text)', 'execute'); -- true
-- ROLLBACK: drop function public.bb_brain_shout(text, boolean);

create or replace function public.bb_brain_shout(p_message text, p_dry boolean default false)
returns table(sent boolean, why text)
language plpgsql security definer set search_path = public as $$
declare
  v_last timestamptz;
  v_q bigint;
  v_body text;
begin
  select max(created_at) into v_last from public.bb_notify_queue where source_table = 'brain_agent_shout';
  if v_last is not null and v_last > now() - interval '6 hours' then
    return query select false, 'rate-limited: last shout ' || to_char(v_last at time zone 'Asia/Colombo', 'HH24:MI') || ' Colombo'; return;
  end if;
  v_body := 'The Brain did not publish at ' || to_char(now() at time zone 'Asia/Colombo', 'HH24:MI Dy DD Mon') ||
            ' Colombo. Yesterday''s Brain stays live. ' || left(regexp_replace(coalesce(p_message, ''), '[[:cntrl:]]', ' ', 'g'), 300) ||
            ' Fix: open the BB Brain chat and say: brain agent failed.';
  if p_dry then
    begin
      v_q := public.bb_notify('The Digital Brain publish FAILED', v_body, array['THULAIB','SHIARA'],
                              'https://businessboosterlk.github.io/bb-brain/', 'brain_agent_shout');
      if v_q is null then raise exception 'BB_DRY_RUN_NO_ROW'; end if;
      raise exception 'BB_DRY_RUN_ROLLBACK';
    exception
      when others then
        if sqlerrm = 'BB_DRY_RUN_ROLLBACK' then return query select true, 'dry run: the real insert worked and was rolled back'; return; end if;
        raise;
    end;
  end if;
  v_q := public.bb_notify('The Digital Brain publish FAILED', v_body, array['THULAIB','SHIARA'],
                          'https://businessboosterlk.github.io/bb-brain/', 'brain_agent_shout');
  return query select (v_q is not null), case when v_q is null then 'bb_notify returned no row' else 'queued ' || v_q::text end;
end $$;

revoke all on function public.bb_brain_shout(text, boolean) from public;
grant execute on function public.bb_brain_shout(text, boolean) to anon, authenticated;
