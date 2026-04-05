# distro-web context
Framework: Next.js 14 App Router | State: Zustand | Server data: TanStack Query
Public routes: / catalogue product track coverage faq
Auth routes: /login /register
Buyer routes: /orders /account (require BUYER role)
Admin routes: /admin/* (require ADMIN role, redirect /login if not)

## Key patterns
- Use 'use client' only when needed (interactivity/hooks)
- Auth token in localStorage (web) — SecureStore is mobile only
- Google Maps via @vis.gl/react-google-maps with NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

@./docs/web-architecture.md
