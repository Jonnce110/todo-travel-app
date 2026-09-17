create extension if not exists pgcrypto;

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  sort_order bigint not null default 0,
  created_at timestamptz not null default now()
);

alter table public.todos
  add column if not exists sort_order bigint;

with ranked_todos as (
  select id, row_number() over (partition by user_id order by created_at desc) as position
  from public.todos
  where sort_order is null
)
update public.todos
set sort_order = ranked_todos.position
from ranked_todos
where public.todos.id = ranked_todos.id;

alter table public.todos
  alter column sort_order set default 0,
  alter column sort_order set not null;

create table if not exists public.packing_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default '自定义',
  notes text not null default '',
  priority text not null default '标准',
  items jsonb not null default '[]'::jsonb,
  list_type text not null default 'working',
  sort_order bigint not null default 0,
  created_at timestamptz not null default now()
);

alter table public.packing_lists
  add column if not exists sort_order bigint,
  add column if not exists list_type text;

update public.packing_lists
set list_type = 'working'
where list_type is null;

with ranked_packing_lists as (
  select id, row_number() over (partition by user_id order by created_at desc) as position
  from public.packing_lists
  where sort_order is null
)
update public.packing_lists
set sort_order = ranked_packing_lists.position
from ranked_packing_lists
where public.packing_lists.id = ranked_packing_lists.id;

alter table public.packing_lists
  alter column list_type set default 'working',
  alter column list_type set not null,
  alter column sort_order set default 0,
  alter column sort_order set not null;

alter table public.packing_lists
  drop constraint if exists packing_lists_list_type_check;

alter table public.packing_lists
  add constraint packing_lists_list_type_check check (list_type in ('working', 'template'));

create table if not exists public.bucket_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text,
  target_date date,
  created_at timestamptz not null default now()
);

alter table public.bucket_items
  add column if not exists category text,
  add column if not exists target_date date;

alter table public.todos enable row level security;
alter table public.packing_lists enable row level security;
alter table public.bucket_items enable row level security;

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

drop policy if exists "Users can read their own bucket items" on public.bucket_items;
drop policy if exists "Users can insert their own bucket items" on public.bucket_items;
drop policy if exists "Users can update their own bucket items" on public.bucket_items;
drop policy if exists "Users can delete their own bucket items" on public.bucket_items;

create policy "Users can read their own bucket items"
  on public.bucket_items for select
  using (auth.uid() = user_id);

create policy "Users can insert their own bucket items"
  on public.bucket_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own bucket items"
  on public.bucket_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own bucket items"
  on public.bucket_items for delete
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
