-- Security advisor 27.10.: fixed search_path for the trigger, membership check not callable without sign-in.
-- my_family, join_family and is_member stay callable for signed-in users on purpose: the app and the policies need them.
alter function public.touch_updated_at() set search_path = '';
revoke execute on function public.is_member(uuid) from anon, public;
grant execute on function public.is_member(uuid) to authenticated;
