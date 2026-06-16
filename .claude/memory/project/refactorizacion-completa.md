# Refactorización Completa (Junio 2026)

## Qué se hizo
Migración completa de Supabase a Appwrite + refactorización arquitectura feature-first + UI/UX moderna + testing.

## Stack actual
- React 19 + Vite 8 + TypeScript + Tailwind CSS 4
- Appwrite (Auth + Databases + Storage)
- React Router v7 con lazy loading
- TanStack Query v5 (estado servidor)
- Zustand v5 con persist (estado cliente: auth, theme, ui)
- React Hook Form + Zod (formularios y validación)
- Framer Motion (micro-interacciones)
- Vitest + React Testing Library + Playwright (testing)

## Estructura
```
src/
├── features/
│   ├── auth/         # AuthPage, authService
│   └── loans/        # LoanListPage, LoanDetailPage, LoanFormPage, PaymentForm, etc.
├── routes/           # index.tsx (6 rutas lazy), AuthGuard, GuestGuard
├── shared/
│   ├── components/   # Button, Input, Card, Modal, Skeleton, Toast, EmptyState, ErrorBoundary, Spinner
│   ├── store/        # authStore, themeStore, uiStore
│   ├── utils/        # amortization, currency, cn, date
│   ├── lib/          # appwrite client
│   ├── types/        # tipos compartidos
│   └── __tests__/    # 25 tests unitarios (6 test files)
├── App.tsx           # Providers
└── main.tsx          # Entry point
```

## Archivos eliminados
- `App.tsx` (viejo), `index.tsx`, `components/`, `services/supabase.ts`, `types.ts`, `utils/`

## Testing
- 25 tests unitarios pasando (amortization, currency, cn, Button, Input, EmptyState)
- Playwright config para E2E (auth.spec.ts)
- Scripts: `npm run test`, `npm run test:watch`, `npm run test:e2e`

## Decisiones clave
- No se migraron datos de Supabase (servidor caído, 404)
- Variables de entorno con prefijo `VITE_` (Vite, no Next.js)
- Chunk principal ~510kB por appwrite SDK + framer-motion
- Vitest necesita `exclude: ['e2e/**']` en config
