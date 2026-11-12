-- Personal Storytelling Website — Supabase setup
-- Run this in a NEW Supabase project's SQL Editor.
-- This creates tables, indexes, row-level security policies and a count function.
-- WARNING: Administrator access is NOT automatically granted. See README.md.

create extension if not exists pgcrypto;

create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (length(slug) between 1 and 100 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 2 and 180),
  subtitle text not null default '' check (char_length(subtitle) <= 240),
  excerpt text not null check (char_length(excerpt) between 2 and 350),
  body text not null check (char_length(body) >= 10),
  category text not null default 'Short Stories' check (category in ('Short Stories', 'Novellas')),
  cover_image text,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.story_likes (
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 50),
  body text not null check (char_length(trim(body)) between 3 and 1500),
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create index stories_published_date_idx on public.stories(published,published_at desc);
create index comments_story_idx on public.comments(story_id,approved,created_at);
create index comments_user_idx on public.comments(user_id);
create index likes_user_idx on public.story_likes(user_id);

-- Function runs as table owner to check the admins table without recursive RLS.
create function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$ select exists(select 1 from public.admins a where a.user_id = (select auth.uid())); $$;

-- Public visitors can get a story's like count but not a list of users who liked it.
create function public.story_like_count(target_story_id uuid)
returns integer
language sql stable security definer
set search_path = ''
as $$
  select case when exists (
    select 1 from public.stories s where s.id = target_story_id and s.published
  ) then (select count(*)::integer from public.story_likes l where l.story_id = target_story_id)
  else 0 end;
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.story_like_count(uuid) from public;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.story_like_count(uuid) to anon, authenticated;

alter table public.admins enable row level security;
alter table public.stories enable row level security;
alter table public.story_likes enable row level security;
alter table public.comments enable row level security;

revoke all on table public.admins from anon,authenticated;
revoke all on table public.stories from anon,authenticated;
revoke all on table public.story_likes from anon,authenticated;
revoke all on table public.comments from anon,authenticated;

grant select on public.admins to authenticated;
grant select on public.stories to anon,authenticated;
grant insert,update,delete on public.stories to authenticated;
grant select,insert,delete on public.story_likes to authenticated;
grant select on public.comments to anon,authenticated;
grant insert,update,delete on public.comments to authenticated;

create policy "Admins can see their own editor access" on public.admins
for select to authenticated using (user_id = (select auth.uid()));

create policy "Public can read published stories and admins see drafts" on public.stories
for select to anon,authenticated using (published = true or (select public.is_admin()));
create policy "Only admins can create stories" on public.stories
for insert to authenticated with check ((select public.is_admin()));
create policy "Only admins can edit stories" on public.stories
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Only admins can delete stories" on public.stories
for delete to authenticated using ((select public.is_admin()));

create policy "Readers can see only their own likes" on public.story_likes
for select to authenticated using (user_id = (select auth.uid()));
create policy "Readers can like published stories once" on public.story_likes
for insert to authenticated with check (
  user_id = (select auth.uid()) and
  exists (select 1 from public.stories s where s.id = story_id and s.published = true)
);
create policy "Readers can unlike their own likes" on public.story_likes
for delete to authenticated using (user_id = (select auth.uid()));

create policy "Readers see approved public comments" on public.comments
for select to anon,authenticated using (
  approved = true and exists(
    select 1 from public.stories s where s.id = story_id and s.published = true
  )
);
create policy "Readers see own pending comments and admins see all" on public.comments
for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Signed in readers can submit comments for review" on public.comments
for insert to authenticated with check (
  user_id = (select auth.uid()) and approved = false and
  exists (select 1 from public.stories s where s.id = story_id and s.published = true)
);
create policy "Only admins can approve and edit comments" on public.comments
for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Only admins can remove comments" on public.comments
for delete to authenticated using ((select public.is_admin()));

-- To make your first signed-in user an ADMIN, after using your own email to
-- sign in at /admin.html and copying your UUID from Authentication > Users:
-- insert into public.admins(user_id) values ('YOUR-USER-UUID-HERE');
