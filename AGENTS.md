# Code Review Rules

## TypeScript
- Use const/let, never var
- Prefer interfaces over types
- No `any` types, use `unknown`
- Always use strict TypeScript

## React
- Use functional components with `FC` type
- Named exports for components
- Framer Motion for animations
- TanStack Query for data fetching
- Zustand for global state
- React Hook Form + Zod for forms

## Styling
- Tailwind CSS utility classes
- Dark mode via `dark:` prefix
- No inline styles
- Use shared components (Button, Card, Input, etc.)

## Architecture
- Feature-first: `features/[name]/components/`, `hooks/`, `services/`, `types/`, `store/`
- Shared code in `shared/components/`, `hooks/`, `lib/`, `types/`, `store/`
- Max 500 lines per file, max 50 lines per function
- camelCase for variables/functions, PascalCase for components, kebab-case for files

## Validation
- Always validate user input with Zod schemas
- Form validation in `shared/schemas/`

## Data
- Appwrite for backend (Databases, Auth, Storage)
- Never expose secrets in client code
- Always set collection permissions via Appwrite Permissions API
