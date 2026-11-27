create schema if not exists private;

create table if not exists private.api_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0),
  updated_at timestamptz not null default now()
);

revoke all on schema private from public, anon, authenticated;
revoke all on private.api_rate_limits from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update, delete on private.api_rate_limits to service_role;

create or replace function public.consume_api_rate_limit(
  p_rate_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, private
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_allowed boolean;
begin
  if p_rate_key is null or length(p_rate_key) < 8 or length(p_rate_key) > 200
     or p_limit < 1 or p_limit > 1000
     or p_window_seconds < 1 or p_window_seconds > 86400 then
    return false;
  end if;

  insert into private.api_rate_limits(rate_key, window_started_at, request_count, updated_at)
  values (p_rate_key, v_now, 1, v_now)
  on conflict (rate_key) do update
    set window_started_at = case
          when private.api_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
            then v_now else private.api_rate_limits.window_started_at end,
        request_count = case
          when private.api_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
            then 1 else private.api_rate_limits.request_count + 1 end,
        updated_at = v_now
  returning request_count <= p_limit into v_allowed;

  delete from private.api_rate_limits
  where updated_at < v_now - interval '2 days';

  return coalesce(v_allowed, false);
end;
$$;

revoke all on function public.consume_api_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, integer, integer) to service_role;
