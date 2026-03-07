# PRAAN Activity Management System (Frontend)

Next.js + Bootstrap 5 frontend implementing the SRS (v1.3) with role-based flows and premium light/dark UI.

## Stack

- Next.js (App Router) + TypeScript
- Bootstrap 5 + Bootstrap Icons
- Chart.js + react-chartjs-2

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Demo login

- Username: `admin` (role: Admin)
- Username: `fatema` (role: Manager)
- Username: `rahim` (role: User)
- Password for all demo users: `123456`

## Implemented modules

- Authentication: Login + Registration
- Role-based app shell + navigation + theme/language toggle
- Dashboard: KPI cards, analytics charts, calendar with details modal
- Previous Entries / My Activities: search, filters, pagination, CSV export, details modal tabs
- New Activity: single-page grouped form, dynamic participant categories, financial auto-calc, uploads, AI narrative, sticky live summary, save draft, submit flow
- Files module: searchable library by entry attachments
- Notifications module
- Login log and user/audit log pages
- Admin module (users, mapping view, settings scaffold)
- Profile page

## Data and state

- Mock SRS-aligned data models in `lib/types.ts`
- Mock datasets and reference mappings in `lib/mockData.ts`
- Client persistence via `localStorage`

## Notes

- Export DOCX/PDF/ZIP actions are wired as UI actions and can be connected to backend APIs from `lib` service layer.
- The current build is frontend-first with mock integration points, ready to connect to production APIs.