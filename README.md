# Task Management System

A responsive task management web application built with Next.js App Router and Supabase.

## Implemented Features

- Login and modal-based staff signup with profile picture upload and complete profile details
- Self-service account editing for admins and staff, including profile picture, email, and password
- Role-based routing for admin and staff users
- Admin dashboard for assigning, editing, deleting, and tracking staff tasks
- Admin staff-account directory with staff account totals
- Staff dashboard for viewing assigned tasks and updating status
- Task priority and due-date tracking
- Responsive board layout for desktop and mobile
- Assigned task records protected by Supabase RLS

## Tech Stack

- Next.js 16
- React 19
- Tailwind CSS 4
- Supabase Auth and Database
- Server Actions for mutations

## Database Setup

Run `supabase/schema.sql` in Supabase before testing the task workflow. The schema adds the `public.tasks` table, staff profile details, the profile-image storage bucket, assignment metadata, indexes, update trigger, and row-level security policies.

New public signups are created as staff accounts. Use `supabase/seed-admin-hr.sql` after creating an admin auth user to assign the admin role.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, create a staff account or sign in, then use `/portal` to route to the correct dashboard:

- Admin: `/dashboard`
- Staff: `/staff`
