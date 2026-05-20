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
  first_name text,
  middle_name text,
  last_name text,
  gender text,
  age integer,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  state_province text,
  postal_code text,
  country text,
  department text,
  job_title text,
  start_date date,
  profile_image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint app_user_profiles_age_check check (age is null or (age between 1 and 130))
);

alter table public.app_user_profiles
add column if not exists first_name text,
add column if not exists middle_name text,
add column if not exists last_name text,
add column if not exists gender text,
add column if not exists age integer,
add column if not exists phone text,
add column if not exists address_line1 text,
add column if not exists address_line2 text,
add column if not exists city text,
add column if not exists state_province text,
add column if not exists postal_code text,
add column if not exists country text,
add column if not exists department text,
add column if not exists job_title text,
add column if not exists start_date date,
add column if not exists profile_image_url text;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'staff-profile-images',
  'staff-profile-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'task-submission-files',
  'task-submission-files',
  false,
  26214400,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-works',
    'application/zip',
    'text/plain',
    'text/csv',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'app_user_profiles_age_check'
      and conrelid = 'public.app_user_profiles'::regclass
  ) then
    alter table public.app_user_profiles
    add constraint app_user_profiles_age_check
    check (age is null or (age between 1 and 130));
  end if;
end;
$$;

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
  reviewer_user_id uuid references auth.users (id) on delete set null,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'submitted', 'changes_requested', 'approved')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date date,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks
add column if not exists created_by uuid references auth.users (id) on delete set null,
add column if not exists reviewer_user_id uuid references auth.users (id) on delete set null,
add column if not exists submitted_at timestamptz,
add column if not exists approved_at timestamptz,
add column if not exists approved_by uuid references auth.users (id) on delete set null;

alter table public.tasks
drop constraint if exists tasks_status_check;

update public.tasks
set reviewer_user_id = created_by
where reviewer_user_id is null
  and created_by is not null;

update public.tasks
set
  status = 'approved',
  submitted_at = coalesce(submitted_at, updated_at, created_at, now()),
  approved_at = coalesce(approved_at, updated_at, created_at, now()),
  approved_by = coalesce(approved_by, created_by)
where status = 'completed';

alter table public.tasks
add constraint tasks_status_check
check (status in ('todo', 'in_progress', 'submitted', 'changes_requested', 'approved'));

create table if not exists public.task_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  submitted_by uuid not null references auth.users (id) on delete cascade,
  version integer not null default 1,
  submission_note text not null,
  review_status text not null default 'submitted' check (review_status in ('submitted', 'approved', 'changes_requested')),
  review_note text,
  reviewed_by uuid references auth.users (id) on delete set null,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_submissions_version_positive check (version > 0),
  constraint task_submissions_task_version_unique unique (task_id, version)
);

create table if not exists public.task_submission_files (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.task_submissions (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  uploaded_by uuid not null references auth.users (id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.task_reference_files (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  uploaded_by uuid not null references auth.users (id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  task_id uuid references public.tasks (id) on delete cascade,
  submission_id uuid references public.task_submissions (id) on delete cascade,
  type text not null check (type in ('task_assigned', 'task_submitted', 'task_approved', 'task_changes_requested')),
  title text not null,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists tasks_user_status_idx
on public.tasks (user_id, status);

create index if not exists tasks_user_due_date_idx
on public.tasks (user_id, due_date);

create index if not exists tasks_created_by_idx
on public.tasks (created_by);

create index if not exists tasks_reviewer_status_idx
on public.tasks (reviewer_user_id, status);

create index if not exists task_submissions_task_submitted_at_idx
on public.task_submissions (task_id, submitted_at desc);

create index if not exists task_submissions_review_status_idx
on public.task_submissions (review_status, submitted_at desc);

create index if not exists task_submission_files_task_idx
on public.task_submission_files (task_id, created_at desc);

create index if not exists task_reference_files_task_idx
on public.task_reference_files (task_id, created_at desc);

create index if not exists notifications_recipient_read_idx
on public.notifications (recipient_user_id, is_read, created_at desc);

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

drop trigger if exists set_task_submissions_updated_at on public.task_submissions;
create trigger set_task_submissions_updated_at
before update on public.task_submissions
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_user_profiles (
    user_id,
    email,
    full_name,
    first_name,
    middle_name,
    last_name,
    gender,
    age,
    phone,
    address_line1,
    address_line2,
    city,
    state_province,
    postal_code,
    country,
    department,
    job_title,
    start_date,
    profile_image_url
  )
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'middle_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'gender', ''),
    case
      when new.raw_user_meta_data ->> 'age' ~ '^[0-9]+$'
        and (new.raw_user_meta_data ->> 'age')::integer between 1 and 130
      then (new.raw_user_meta_data ->> 'age')::integer
      else null
    end,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'address_line1', ''),
    nullif(new.raw_user_meta_data ->> 'address_line2', ''),
    nullif(new.raw_user_meta_data ->> 'city', ''),
    nullif(new.raw_user_meta_data ->> 'state_province', ''),
    nullif(new.raw_user_meta_data ->> 'postal_code', ''),
    nullif(new.raw_user_meta_data ->> 'country', ''),
    nullif(new.raw_user_meta_data ->> 'department', ''),
    nullif(new.raw_user_meta_data ->> 'job_title', ''),
    case
      when new.raw_user_meta_data ->> 'start_date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      then (new.raw_user_meta_data ->> 'start_date')::date
      else null
    end,
    nullif(new.raw_user_meta_data ->> 'profile_image_url', '')
  )
  on conflict (user_id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    first_name = excluded.first_name,
    middle_name = excluded.middle_name,
    last_name = excluded.last_name,
    gender = excluded.gender,
    age = excluded.age,
    phone = excluded.phone,
    address_line1 = excluded.address_line1,
    address_line2 = excluded.address_line2,
    city = excluded.city,
    state_province = excluded.state_province,
    postal_code = excluded.postal_code,
    country = excluded.country,
    department = excluded.department,
    job_title = excluded.job_title,
    start_date = excluded.start_date,
    profile_image_url = excluded.profile_image_url;

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

create or replace function public.can_access_task(target_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tasks t
    where t.id = target_task_id
      and (
        public.has_app_role(array['admin', 'hr'])
        or t.user_id = auth.uid()
        or t.created_by = auth.uid()
        or t.reviewer_user_id = auth.uid()
      )
  );
$$;

create or replace function public.can_review_task(target_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tasks t
    where t.id = target_task_id
      and (
        public.has_app_role(array['admin', 'hr'])
        or t.created_by = auth.uid()
        or t.reviewer_user_id = auth.uid()
      )
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
alter table public.task_submissions enable row level security;
alter table public.task_submission_files enable row level security;
alter table public.task_reference_files enable row level security;
alter table public.notifications enable row level security;

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
  or public.has_app_role(array['admin', 'hr'])
);

drop policy if exists "Users can update their own profile" on public.app_user_profiles;
create policy "Users can update their own profile"
on public.app_user_profiles
for update
to authenticated
using (
  user_id = auth.uid()
  or public.has_app_role(array['admin', 'hr'])
)
with check (
  user_id = auth.uid()
  or public.has_app_role(array['admin', 'hr'])
);

drop policy if exists "Users can view role assignments" on public.user_role_assignments;
create policy "Users can view role assignments"
on public.user_role_assignments
for select
to authenticated
using (
  user_id = auth.uid()
  or public.has_app_role(array['admin', 'hr'])
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
  public.can_access_task(id)
);

drop policy if exists "Users can create their own tasks" on public.tasks;
drop policy if exists "Admins can create assigned tasks" on public.tasks;
create policy "Admins can create assigned tasks"
on public.tasks
for insert
to authenticated
with check (
  public.has_app_role(array['admin', 'hr'])
  and created_by = auth.uid()
);

drop policy if exists "Users can update their own tasks" on public.tasks;
drop policy if exists "Admins and assigned staff can update tasks" on public.tasks;
create policy "Admins and assigned staff can update tasks"
on public.tasks
for update
to authenticated
using (
  public.can_access_task(id)
)
with check (
  public.can_access_task(id)
);

drop policy if exists "Users can delete their own tasks" on public.tasks;
drop policy if exists "Admins can delete tasks" on public.tasks;
create policy "Admins can delete tasks"
on public.tasks
for delete
to authenticated
using (
  public.has_app_role(array['admin', 'hr'])
  or created_by = auth.uid()
);

drop policy if exists "Task participants can view submissions" on public.task_submissions;
create policy "Task participants can view submissions"
on public.task_submissions
for select
to authenticated
using (public.can_access_task(task_id));

drop policy if exists "Assigned staff can submit work updates" on public.task_submissions;
create policy "Assigned staff can submit work updates"
on public.task_submissions
for insert
to authenticated
with check (
  submitted_by = auth.uid()
  and exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and t.user_id = auth.uid()
  )
);

drop policy if exists "Task reviewers can update submissions" on public.task_submissions;
create policy "Task reviewers can update submissions"
on public.task_submissions
for update
to authenticated
using (public.can_review_task(task_id))
with check (public.can_review_task(task_id));

drop policy if exists "Task reviewers can delete submissions" on public.task_submissions;
create policy "Task reviewers can delete submissions"
on public.task_submissions
for delete
to authenticated
using (public.can_review_task(task_id));

drop policy if exists "Task participants can view submission files" on public.task_submission_files;
create policy "Task participants can view submission files"
on public.task_submission_files
for select
to authenticated
using (public.can_access_task(task_id));

drop policy if exists "Assigned staff can add submission files" on public.task_submission_files;
create policy "Assigned staff can add submission files"
on public.task_submission_files
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and exists (
    select 1
    from public.task_submissions s
    join public.tasks t on t.id = s.task_id
    where s.id = submission_id
      and s.task_id = task_id
      and s.submitted_by = auth.uid()
      and t.user_id = auth.uid()
  )
);

drop policy if exists "Task reviewers can delete submission files" on public.task_submission_files;
create policy "Task reviewers can delete submission files"
on public.task_submission_files
for delete
to authenticated
using (public.can_review_task(task_id));

drop policy if exists "Task participants can view reference files" on public.task_reference_files;
create policy "Task participants can view reference files"
on public.task_reference_files
for select
to authenticated
using (public.can_access_task(task_id));

drop policy if exists "Task managers can add reference files" on public.task_reference_files;
create policy "Task managers can add reference files"
on public.task_reference_files
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and public.can_review_task(task_id)
);

drop policy if exists "Task managers can delete reference files" on public.task_reference_files;
create policy "Task managers can delete reference files"
on public.task_reference_files
for delete
to authenticated
using (public.can_review_task(task_id));

drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications"
on public.notifications
for select
to authenticated
using (recipient_user_id = auth.uid());

drop policy if exists "Users can update their own notifications" on public.notifications;
create policy "Users can update their own notifications"
on public.notifications
for update
to authenticated
using (recipient_user_id = auth.uid())
with check (recipient_user_id = auth.uid());

drop policy if exists "Task participants can create notifications" on public.notifications;
create policy "Task participants can create notifications"
on public.notifications
for insert
to authenticated
with check (
  actor_user_id = auth.uid()
  and (
    task_id is null
    or public.can_access_task(task_id)
  )
);

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
