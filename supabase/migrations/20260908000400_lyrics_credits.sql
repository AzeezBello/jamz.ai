-- Metering for AI-written lyrics.
--
-- An LLM call costs real money, so it goes through the same ledger as song
-- generation rather than being quietly free. Charged up front and refunded if
-- the provider fails, which is the same contract as a generation job — the
-- user is never left paying for something they did not receive.

create or replace function lyrics_cost()
returns int
language sql
immutable
as $$
  select 1;
$$;

create or replace function debit_lyrics_credit(p_idempotency_key text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  -- Roll the daily allowance forward first, so a user who has not generated
  -- today is not told they are broke.
  perform grant_daily_credits(v_user);

  return apply_credit_delta(
    v_user, -lyrics_cost(), 'lyrics_debit', 'lyrics', null, p_idempotency_key
  );
end;
$$;

create or replace function refund_lyrics_credit(p_idempotency_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  -- Keyed off the original debit, so a retry cannot pay out twice.
  perform apply_credit_delta(
    v_user, lyrics_cost(), 'lyrics_refund', 'lyrics', null,
    'refund:' || p_idempotency_key
  );
end;
$$;

grant execute on function lyrics_cost()                  to authenticated;
grant execute on function debit_lyrics_credit(text)      to authenticated;
grant execute on function refund_lyrics_credit(text)     to authenticated;
