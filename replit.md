# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: Firebase Firestore (client-side, no Replit DB)
- **Auth**: Firebase Authentication
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Applications

### Birth Of Dream (`artifacts/bod-app`)
- **Type**: React + Vite SPA
- **Preview path**: `/`
- **Description**: Premium ClickUp-style project management SaaS app
- **Auth**: Firebase Auth — admin.bod@gmail.com / admin@123
- **Database**: Firebase Firestore (collections: users, spaces, tasks, senders, spaces/{id}/data subcollection, tasks/{id}/activity subcollection)

#### Features
- **Auth**: Sign In + Sign Up pages; auto-creates Firestore user doc on first login
- **Admin gate**: Dashboard route is admin-only; non-admins redirect to /spaces
- **Spaces**: Admin can create/manage spaces; members only see spaces where their UID is in `space.memberIds`
- **Space sub-pages**: Each space has 5 tabs — Overview, Tasks, Timeline, Members, Data
  - **Overview**: Stats, completion breakdown, upcoming deadlines, member list
  - **Tasks**: Task grid with filters; all space members (not just admin) can create tasks
  - **Timeline**: Tasks sorted by deadline with days-remaining indicator
  - **Members**: Admin can add/remove members per-space; task stats per member
  - **Data**: Folders + links tree structure; admin can create folders, add links, organize by folder
- **Task creation**: Multi-assignee (space members only); status, priority, deadline, est. hours, sender
- **Task detail**: Progress slider, description editor, activity log/comments, Send Reminder button (visible to all)
- **Send Reminder**: POST to https://n8n.bodhosting.com/webhook/task-reminder with task payload
- **Sender field**: Person who delivered the task from a manager
- **Sidebar**: Dark logo container (`bg-[#1a1a3e]`); collapse toggle moved above logo; spaces submenu
- **Global search**: Cmd+K modal — searches tasks and spaces
- **Dark/light mode**: ThemeContext with localStorage persistence
- **Firestore index fix**: Tasks filtered by spaceId use client-side sort to avoid composite index requirement

#### Admin access
- Email: admin.bod@gmail.com
- Identified by email OR role === 'admin' in Firestore users collection
- Admin sees all spaces; members see only spaces where their UID is in `space.memberIds`
- Auto-creates user doc with role='admin' if no doc exists yet

#### Key Hooks
- `useSpaces` — filters by `memberIds array-contains` for non-admins
- `useTasks(spaceId)` — where-only query; client-side sort to avoid composite index
- `useAllTasks` — single orderBy query for dashboard
- `useMembers` — all users from Firestore
- `useSenders` — all senders from Firestore
- `useSpaceData(spaceId)` — subcollection `spaces/{id}/data`; client-side sort

#### n8n Integration
- "Send Reminder" button visible to all authenticated users on task detail page
- Sends POST to https://n8n.bodhosting.com/webhook/task-reminder
- Payload: { taskId, taskTitle, assigneeIds, deadline, spaceId, spaceTitle }

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
