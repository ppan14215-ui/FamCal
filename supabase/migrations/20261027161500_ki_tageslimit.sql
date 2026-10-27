-- Cost guard (Julian 27.10.): how often each person asked Claude per day. The function verstehen counts up before every call.
create table public.ai_usage (
  user_id uuid not null references auth.users on delete cascade,
  day date not null default current_date,
  calls int not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
create policy "Eigene Nutzung sehen" on public.ai_usage for select using (user_id = auth.uid());

-- Counts one call for the signed-in person and returns today's total. Only the count, nothing else, can change here.
create function public.count_ai_call() returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.ai_usage (user_id, day, calls) values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update set calls = public.ai_usage.calls + 1
  returning calls into n;
  return n;
end $$;
revoke execute on function public.count_ai_call() from anon, public;
grant execute on function public.count_ai_call() to authenticated;
