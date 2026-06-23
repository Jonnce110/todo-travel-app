create extension if not exists pgcrypto;

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.packing_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default '自定义',
  notes text not null default '',
  priority text not null default '标准',
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.todos enable row level security;
alter table public.packing_lists enable row level security;

drop policy if exists "Users can read their own todos" on public.todos;
drop policy if exists "Users can insert their own todos" on public.todos;
drop policy if exists "Users can update their own todos" on public.todos;
drop policy if exists "Users can delete their own todos" on public.todos;

create policy "Users can read their own todos"
  on public.todos for select
  using (auth.uid() = user_id);

create policy "Users can insert their own todos"
  on public.todos for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own todos"
  on public.todos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own todos"
  on public.todos for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can read their own packing lists" on public.packing_lists;
drop policy if exists "Users can insert their own packing lists" on public.packing_lists;
drop policy if exists "Users can update their own packing lists" on public.packing_lists;
drop policy if exists "Users can delete their own packing lists" on public.packing_lists;

create policy "Users can read their own packing lists"
  on public.packing_lists for select
  using (auth.uid() = user_id);

create policy "Users can insert their own packing lists"
  on public.packing_lists for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own packing lists"
  on public.packing_lists for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own packing lists"
  on public.packing_lists for delete
  using (auth.uid() = user_id);

create or replace function public.auto_confirm_new_user()
returns trigger
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  new.email_confirmed_at = coalesce(new.email_confirmed_at, now());
  new.confirmed_at = coalesce(new.confirmed_at, now());
  return new;
end;
$$;

drop trigger if exists auto_confirm_new_user on auth.users;

create trigger auto_confirm_new_user
  before insert on auth.users
  for each row
  execute function public.auto_confirm_new_user();
