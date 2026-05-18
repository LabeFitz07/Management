create extension if not exists pgcrypto;

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.job_roles (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.app_roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.app_user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_role_assignments (
  user_id uuid not null references public.app_user_profiles (user_id) on delete cascade,
  role_id uuid not null references public.app_roles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  employee_id text not null unique,
  full_name text not null,
  email text not null unique,
  phone text not null,
  profile_image_url text,
  department_id uuid not null references public.departments (id) on delete restrict,
  job_role_id uuid not null references public.job_roles (id) on delete restrict,
  status text not null check (status in ('Active', 'On Leave', 'Inactive')),
  start_date date not null,
  created_at timestamptz not null default now()
);

alter table public.staff_members
add column if not exists profile_image_url text;

create table if not exists public.staff_registration_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  phone text not null,
  department text not null,
  role text not null,
  start_date date not null,
  status text not null default 'pending' check (status in ('pending', 'approved')),
  temporary_password text,
  requested_at timestamptz not null default now(),
  approved_at timestamptz
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'completed')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks
add column if not exists created_by uuid references auth.users (id) on delete set null;

create index if not exists tasks_user_status_idx
on public.tasks (user_id, status);

create index if not exists tasks_user_due_date_idx
on public.tasks (user_id, due_date);

create index if not exists tasks_created_by_idx
on public.tasks (created_by);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_user_profiles (user_id, email, full_name)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (user_id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.assign_user_role_by_email(
  target_email text,
  target_full_name text,
  target_role_code text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
  target_role_id uuid;
begin
  select id into target_user_id
  from auth.users
  where lower(email) = lower(target_email);

  if target_user_id is null then
    raise exception 'No auth user found for email %', target_email;
  end if;

  select id into target_role_id
  from public.app_roles
  where code = lower(target_role_code);

  if target_role_id is null then
    raise exception 'No app role found for code %', target_role_code;
  end if;

  insert into public.app_user_profiles (user_id, email, full_name)
  values (target_user_id, lower(target_email), target_full_name)
  on conflict (user_id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name;

  insert into public.user_role_assignments (user_id, role_id)
  values (target_user_id, target_role_id)
  on conflict (user_id, role_id) do nothing;
end;
$$;

create or replace function public.has_app_role(role_codes text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_role_assignments ura
    join public.app_roles ar on ar.id = ura.role_id
    join public.app_user_profiles up on up.user_id = ura.user_id
    where ura.user_id = auth.uid()
      and up.is_active = true
      and ar.code = any(role_codes)
  );
$$;

alter table public.departments enable row level security;
alter table public.job_roles enable row level security;
alter table public.app_roles enable row level security;
alter table public.app_user_profiles enable row level security;
alter table public.user_role_assignments enable row level security;
alter table public.staff_members enable row level security;
alter table public.staff_registration_requests enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "Authorized users can view departments" on public.departments;
create policy "Authorized users can view departments"
on public.departments
for select
to authenticated
using (public.has_app_role(array['admin', 'hr']));

drop policy if exists "Authorized users can insert departments" on public.departments;
create policy "Authorized users can insert departments"
on public.departments
for insert
to authenticated
with check (public.has_app_role(array['admin', 'hr']));

drop policy if exists "Authorized users can view job roles" on public.job_roles;
create policy "Authorized users can view job roles"
on public.job_roles
for select
to authenticated
using (public.has_app_role(array['admin', 'hr']));

drop policy if exists "Authorized users can insert job roles" on public.job_roles;
create policy "Authorized users can insert job roles"
on public.job_roles
for insert
to authenticated
with check (public.has_app_role(array['admin', 'hr']));

drop policy if exists "Users can view their own profile" on public.app_user_profiles;
create policy "Users can view their own profile"
on public.app_user_profiles
for select
to authenticated
using (
  user_id = auth.uid()
  or public.has_app_role(array['admin'])
);

drop policy if exists "Users can update their own profile" on public.app_user_profiles;
create policy "Users can update their own profile"
on public.app_user_profiles
for update
to authenticated
using (
  user_id = auth.uid()
  or public.has_app_role(array['admin'])
)
with check (
  user_id = auth.uid()
  or public.has_app_role(array['admin'])
);

drop policy if exists "Users can view role assignments" on public.user_role_assignments;
create policy "Users can view role assignments"
on public.user_role_assignments
for select
to authenticated
using (
  user_id = auth.uid()
  or public.has_app_role(array['admin'])
);

drop policy if exists "Users can view app roles" on public.app_roles;
create policy "Users can view app roles"
on public.app_roles
for select
to authenticated
using (true);

drop policy if exists "Authorized users can view staff members" on public.staff_members;
create policy "Authorized users can view staff members"
on public.staff_members
for select
to authenticated
using (public.has_app_role(array['admin', 'hr']));

drop policy if exists "Authorized users can insert staff members" on public.staff_members;
create policy "Authorized users can insert staff members"
on public.staff_members
for insert
to authenticated
with check (public.has_app_role(array['admin', 'hr']));

drop policy if exists "Authorized users can update staff members" on public.staff_members;
create policy "Authorized users can update staff members"
on public.staff_members
for update
to authenticated
using (public.has_app_role(array['admin', 'hr']))
with check (public.has_app_role(array['admin', 'hr']));

drop policy if exists "Authorized users can delete staff members" on public.staff_members;
create policy "Authorized users can delete staff members"
on public.staff_members
for delete
to authenticated
using (public.has_app_role(array['admin', 'hr']));

drop policy if exists "Authorized users or owner can view staff members" on public.staff_members;
create policy "Authorized users or owner can view staff members"
on public.staff_members
for select
to authenticated
using (
  public.has_app_role(array['admin', 'hr'])
  or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "Anyone can submit registration requests" on public.staff_registration_requests;
create policy "Anyone can submit registration requests"
on public.staff_registration_requests
for insert
to anon, authenticated
with check (status = 'pending');

drop policy if exists "Admins can view registration requests" on public.staff_registration_requests;
create policy "Admins can view registration requests"
on public.staff_registration_requests
for select
to authenticated
using (public.has_app_role(array['admin', 'hr']));

drop policy if exists "Admins can update registration requests" on public.staff_registration_requests;
create policy "Admins can update registration requests"
on public.staff_registration_requests
for update
to authenticated
using (public.has_app_role(array['admin', 'hr']))
with check (public.has_app_role(array['admin', 'hr']));

drop policy if exists "Users can view their own tasks" on public.tasks;
drop policy if exists "Admins can view all tasks" on public.tasks;
drop policy if exists "Admins and assigned staff can view tasks" on public.tasks;
create policy "Admins and assigned staff can view tasks"
on public.tasks
for select
to authenticated
using (
  public.has_app_role(array['admin'])
  or user_id = auth.uid()
);

drop policy if exists "Users can create their own tasks" on public.tasks;
drop policy if exists "Admins can create assigned tasks" on public.tasks;
create policy "Admins can create assigned tasks"
on public.tasks
for insert
to authenticated
with check (
  public.has_app_role(array['admin'])
  and created_by = auth.uid()
);

drop policy if exists "Users can update their own tasks" on public.tasks;
drop policy if exists "Admins and assigned staff can update tasks" on public.tasks;
create policy "Admins and assigned staff can update tasks"
on public.tasks
for update
to authenticated
using (
  public.has_app_role(array['admin'])
  or user_id = auth.uid()
)
with check (
  public.has_app_role(array['admin'])
  or user_id = auth.uid()
);

drop policy if exists "Users can delete their own tasks" on public.tasks;
drop policy if exists "Admins can delete tasks" on public.tasks;
create policy "Admins can delete tasks"
on public.tasks
for delete
to authenticated
using (public.has_app_role(array['admin']));

insert into public.app_roles (code, name)
values
  ('admin', 'Administrator'),
  ('hr', 'Human Resources'),
  ('staff', 'Staff Member')
on conflict (code) do update
set name = excluded.name;

insert into public.departments (name)
values
  ('Operations'),
  ('Finance'),
  ('Human Resources')
on conflict (name) do nothing;

insert into public.job_roles (title)
values
  ('Operations Supervisor'),
  ('Payroll Specialist'),
  ('Talent Coordinator')
on conflict (title) do nothing;

insert into public.staff_members (
  employee_id,
  full_name,
  email,
  phone,
  profile_image_url,
  department_id,
  job_role_id,
  status,
  start_date
)
values
  (
    'EMP-1001',
    'Alyssa Ramos',
    'alyssa.ramos@staffhub.local',
    '+63 917 555 0131',
    null,
    (select id from public.departments where name = 'Operations'),
    (select id from public.job_roles where title = 'Operations Supervisor'),
    'Active',
    '2024-02-12'
  ),
  (
    'EMP-1002',
    'Miguel Santos',
    'miguel.santos@staffhub.local',
    '+63 918 555 0174',
    null,
    (select id from public.departments where name = 'Finance'),
    (select id from public.job_roles where title = 'Payroll Specialist'),
    'On Leave',
    '2023-09-04'
  ),
  (
    'EMP-1003',
    'Bianca Flores',
    'bianca.flores@staffhub.local',
    '+63 919 555 0126',
    null,
    (select id from public.departments where name = 'Human Resources'),
    (select id from public.job_roles where title = 'Talent Coordinator'),
    'Active',
    '2025-01-20'
  )
on conflict (employee_id) do update
set
  full_name = excluded.full_name,
  email = excluded.email,
  phone = excluded.phone,
  profile_image_url = excluded.profile_image_url,
  department_id = excluded.department_id,
  job_role_id = excluded.job_role_id,
  status = excluded.status,
  start_date = excluded.start_date;

notify pgrst, 'reload schema';
