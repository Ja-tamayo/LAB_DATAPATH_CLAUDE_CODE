-- tasks
create policy "tasks: select own"
  on public.tasks for select
  using ((select auth.uid()) = user_id);

create policy "tasks: insert own"
  on public.tasks for insert
  with check ((select auth.uid()) = user_id);

create policy "tasks: update own"
  on public.tasks for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "tasks: delete own"
  on public.tasks for delete
  using ((select auth.uid()) = user_id);

-- profiles
create policy "profiles: select public"
  on public.profiles for select
  using (true);

create policy "profiles: update own"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
