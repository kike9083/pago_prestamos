# SDD-001: Refactorización Completa — Gestor de Préstamos

> **Estado**: APROBADO
> **Fecha**: 2026-06-16
> **Proyecto**: Gestor de Préstamos

---

## 1. Objetivo

Transformar la app actual en una aplicación **profesional, escalable y con una experiencia de usuario moderna**, aplicando las mejores prácticas de arquitectura React, UI/UX de nivel producción y patrones de desarrollo sostenibles.

---

## 2. Diagnóstico del Estado Actual

### Problemas Identificados

| # | Problema | Severidad | Impacto |
|---|----------|-----------|---------|
| 1 | **DashboardPage.tsx: 911 líneas** — todo en un solo archivo | 🔴 Crítica | Mantenibilidad, debugging |
| 2 | **Sin enrutamiento** — navegación con useState | 🔴 Crítica | No hay URLs, no hay deep linking, no hay back button |
| 3 | **Sin separación de capas** — UI + lógica + API mezcladas | 🔴 Crítica | Testing imposible, acoplamiento máximo |
| 4 | **Sin estado global** — todo en useState local | 🟡 Alta | Prop drilling, duplicación de lógica |
| 5 | **Sin manejo de errores** — try/catch sueltos sin feedback visual | 🟡 Alta | Experiencia de usuario frágil |
| 6 | **Sin validación con librería** — validación manual inline | 🟡 Alta | Inconsistencias, código verboso |
| 7 | **Sin skeleton loading** — solo spinners genéricos | 🟡 Media | UX pobre en carga |
| 8 | **Sin animaciones/transiciones** | 🟢 Media | Sensación de app poco pulida |
| 9 | **Sin testing** | 🟢 Media | Riesgo de regresiones |
| 10 | **Iconos SVG inline** en ui.tsx | 🟢 Baja | Bundle size, mantenibilidad |
| 11 | **Sin accesibilidad** — falta ARIA, roles, focus management | 🟢 Media | Exclusión de usuarios |

---

## 3. Stack Propuesto

| Capa | Tecnología | Motivo |
|------|-----------|--------|
| Framework | React 19 + TypeScript | Ya existe |
| Bundler | Vite 8 | Ya existe |
| Routing | React Router v7 | Routing declarativo, loaders, SPA |
| Estado Servidor | TanStack Query v5 | Caching, refetch, mutations, loading states |
| Estado Cliente | Zustand | Tema, UI state, preferencias |
| Validación | Zod + React Hook Form | Ya hay Zod, añadimos RHF para formularios |
| UI Base | Radix UI (primitives headless) | Accesibilidad garantizada |
| Estilos | Tailwind CSS 4 + clsx/twMerge | Ya existe |
| Animaciones | Framer Motion | Transiciones profesionales |
| Iconos | Lucide React | Librería completa, tree-shakeable |
| Fechas | date-fns | Manipulación robusta de fechas |
| Testing | Vitest + React Testing Library | Testing unitario de componentes |
| E2E | Playwright | Ya recomendado en SaaS Factory |
| Backend | Appwrite | Ya migrado |

---

## 4. Arquitectura Feature-First Refactorizada

```
src/
├── main.tsx                       # Entry point (antes index.tsx)
├── App.tsx                        # Providers + Router
├── index.css                      # Estilos globales + Tailwind
│
├── routes/                        # Definición de rutas
│   └── index.tsx                  # createBrowserRouter
│
├── features/                      # Cada feature autocontenida
│   ├── auth/
│   │   ├── pages/
│   │   │   └── AuthPage.tsx       # Login/Register page
│   │   ├── components/
│   │   │   ├── LoginForm.tsx      # Formulario login
│   │   │   └── RegisterForm.tsx   # Formulario registro
│   │   ├── hooks/
│   │   │   └── useAuth.ts         # Hook de autenticación
│   │   └── services/
│   │       └── authService.ts     # Llamadas a Appwrite Auth
│   │
│   ├── loans/
│   │   ├── pages/
│   │   │   ├── LoanListPage.tsx   # Dashboard con lista
│   │   │   └── LoanDetailPage.tsx # Detalle del préstamo
│   │   ├── components/
│   │   │   ├── LoanCard.tsx       # Tarjeta individual
│   │   │   ├── LoanForm.tsx       # Crear/Editar préstamo
│   │   │   ├── PaymentForm.tsx    # Registrar pago
│   │   │   ├── PaymentHistory.tsx # Tabla de pagos
│   │   │   ├── PaymentRow.tsx     # Fila de pago
│   │   │   ├── DeleteConfirm.tsx  # Modal confirmación
│   │   │   ├── SummaryCards.tsx   # Cards de resumen
│   │   │   └── ProgressBar.tsx    # Barra de progreso
│   │   ├── hooks/
│   │   │   ├── useLoans.ts        # Query loans
│   │   │   ├── useLoan.ts         # Query single loan
│   │   │   ├── usePayments.ts     # Query payments
│   │   │   ├── useCreateLoan.ts   # Mutation crear
│   │   │   ├── useUpdateLoan.ts   # Mutation editar
│   │   │   ├── useDeleteLoan.ts   # Mutation eliminar
│   │   │   ├── useCreatePayment.ts# Mutation pago
│   │   │   └── useUpdatePayment.ts# Mutation editar pago
│   │   ├── services/
│   │   │   └── loanService.ts     # Llamadas a Appwrite DB
│   │   └── schemas/
│   │       └── loanSchema.ts      # Zod schemas
│   │
│   └── layout/
│       ├── components/
│       │   ├── AppLayout.tsx      # Layout con sidebar/header
│       │   ├── Sidebar.tsx
│       │   ├── Header.tsx
│       │   └── MobileNav.tsx
│       └── hooks/
│           └── useLayout.ts
│
├── shared/                        # Código reutilizable
│   ├── components/                # UI primitives (antes components/ui.tsx)
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Spinner.tsx
│   │   ├── Skeleton.tsx           # NUEVO: skeleton loading
│   │   ├── Toast.tsx              # NUEVO: notificaciones
│   │   ├── EmptyState.tsx         # NUEVO: estado vacío
│   │   └── ErrorBoundary.tsx      # NUEVO: boundary de errores
│   │
│   ├── hooks/
│   │   ├── useMediaQuery.ts       # Responsive detection
│   │   └── useDebounce.ts         # Debounce para inputs
│   │
│   ├── lib/
│   │   └── appwrite/
│   │       └── client.ts          # Cliente Appwrite (ya existe)
│   │
│   ├── utils/
│   │   ├── amortization.ts        # Cálculos (ya existe)
│   │   ├── currency.ts            # Formato moneda
│   │   └── date.ts                # Formato fechas
│   │
│   ├── types/
│   │   └── index.ts               # Tipos (ya existe)
│   │
│   └── store/
│       ├── themeStore.ts          # Zustand: tema claro/oscuro
│       └── uiStore.ts             # Zustand: UI state global
│
└── styles/
    └── animations.css             # Keyframes personalizados
```

---

## 5. Modelo de Datos (Appwrite Collections)

### Colección: `loans`

| Atributo | Tipo | Requerido | Notas |
|----------|------|-----------|-------|
| `$id` | string (auto) | — | Document ID |
| `user_id` | string(36) | ✅ | FK al usuario |
| `name` | string(255) | ✅ | Nombre del préstamo |
| `initial_amount` | double | ✅ | Monto original |
| `current_balance` | double | ✅ | Saldo actual |
| `interest_rate` | double | ✅ | Tasa quincenal % |
| `term_months` | integer | ✅ | Plazo en meses |
| `start_date` | string(10) | ✅ | YYYY-MM-DD |
| `suggested_payment` | double | ✅ | Pago sugerido |
| `last_payment_date` | string(10) | ❌ | YYYY-MM-DD nullable |

### Colección: `payments`

| Atributo | Tipo | Requerido | Notas |
|----------|------|-----------|-------|
| `$id` | string (auto) | — | Document ID |
| `loan_id` | string(36) | ✅ | FK al préstamo |
| `user_id` | string(36) | ✅ | FK al usuario |
| `payment_date` | string(10) | ✅ | YYYY-MM-DD |
| `amount_paid` | double | ✅ | Monto total pagado |
| `interest_paid` | double | ✅ | Porción de intereses |
| `principal_paid` | double | ✅ | Porción de capital |
| `balance_after_payment` | double | ✅ | Saldo resultante |

---

## 6. Mapa de Rutas

| Ruta | Página | Componente | Protegida |
|------|--------|-----------|-----------|
| `/` | Redirección a `/loans` si auth, si no `/auth` | — | — |
| `/auth` | Login / Registro | `AuthPage` | No |
| `/loans` | Dashboard con lista de préstamos | `LoanListPage` | Sí |
| `/loans/new` | Crear nuevo préstamo | `LoanForm` | Sí |
| `/loans/:id` | Detalle del préstamo + pagos | `LoanDetailPage` | Sí |
| `/loans/:id/edit` | Editar préstamo | `LoanForm` | Sí |

### Protección de Rutas
- `<AuthGuard />` — wrapper que verifica sesión y redirige a `/auth`
- Si no hay sesión en `/loans/*` → redirect a `/auth`
- Si hay sesión en `/auth` → redirect a `/loans`

---

## 7. Flujo de Datos (TanStack Query)

### Queries (lectura)

| Query Key | Función | Dependencias | staleTime |
|-----------|---------|-------------|-----------|
| `['loans', userId]` | `getLoans(userId)` | `userId` | 30s |
| `['loan', loanId]` | `getLoan(loanId)` | `loanId` | 30s |
| `['payments', loanId]` | `getPayments(loanId)` | `loanId` | 30s |

### Mutations (escritura)

| Mutation | Función | Invalidación |
|----------|---------|-------------|
| `createLoan` | `createLoan(data)` | `['loans', userId]` |
| `updateLoan` | `updateLoan(id, data)` | `['loans', userId]`, `['loan', id]` |
| `deleteLoan` | `deleteLoan(id)` | `['loans', userId]` |
| `createPayment` | `createPayment(data)` | `['loan', loanId]`, `['payments', loanId]` |
| `updatePayment` | `updatePayment(id, data)` | `['loan', loanId]`, `['payments', loanId]` |

### Optimistic Updates
- `createPayment`: actualizar UI inmediatamente, rollback si falla
- `deleteLoan`: ocultar card inmediatamente, rollback si falla

---

## 8. Diseño UI/UX

### Design System

- **Paleta**: Indigo como primario (mantener la actual `#4f46e5`)
- **Tipografía**: Inter (system font stack como fallback)
- **Border radius**: `rounded-xl` (12px) para cards, `rounded-lg` (8px) para botones
- **Sombras**: `shadow-sm` para cards, `shadow-md` para modales
- **Espaciado**: Sistema 4px base (Tailwind default)

### Componentes Visuales Clave

| Componente | Estado | Descripción |
|-----------|--------|-------------|
| `Skeleton` | Loading | Placeholder animado shimmer |
| `EmptyState` | Vacío | Ilustración + texto + CTA |
| `Toast` | Success/Error | Notificación temporal esquina superior |
| `ErrorBoundary` | Error | Fallback UI con botón reintentar |
| `SummaryCard` | Normal | Card con métrica, icono, color, tendencia |

### Micro-interacciones

| Elemento | Animación | Framework |
|----------|-----------|-----------|
| Transición entre rutas | Fade + slide | Framer Motion |
| Aparición de loan cards | Stagger fade up | Framer Motion |
| Registro de pago | Checkmark + confetti | CSS |
| Eliminación | Slide out + fade | Framer Motion |
| Hover en cards | Scale 1.02 + shadow | Tailwind + Framer |
| Loading skeletons | Shimmer animation | CSS |
| Toast appear | Slide from right | Framer Motion |

### Estados de UI por Componente

Cada componente de datos debe manejar 4 estados:

```
┌─────────────┐
│   LOADING   │  → Skeleton / Shimmer
├─────────────┤
│    DATA     │  → Contenido normal
├─────────────┤
│   EMPTY     │  → EmptyState con CTA
├─────────────┤
│   ERROR     │  → Mensaje + botón reintentar
└─────────────┘
```

### Responsive Design

| Breakpoint | Layout |
|-----------|--------|
| < 640px (mobile) | Sidebar oculto, navegación bottom tab |
| 640-1024px (tablet) | Sidebar colapsable |
| > 1024px (desktop) | Sidebar fijo, layout completo |

---

## 9. Plan de Implementación (Fases)

---

### Fase 1: Base Arquitectónica
**Objetivo**: Establecer la nueva arquitectura sin romper funcionalidad existente

**Tareas**:
- [ ] Instalar nuevas dependencias (react-router-dom, @tanstack/react-query, react-hook-form, @hookform/resolvers, framer-motion, lucide-react, date-fns, zustand, clsx, tailwind-merge)
- [ ] Crear estructura `src/features/`, `src/shared/`, `src/routes/`
- [ ] Migrar `lib/appwrite/client.ts` a `src/shared/lib/appwrite/client.ts`
- [ ] Renombrar `index.tsx` → `main.tsx` con BrowserRouter
- [ ] Crear `routes/index.tsx` con las 6 rutas definidas
- [ ] Implementar `AuthGuard` wrapper
- [ ] Configurar TanStack Query client en App.tsx
- [ ] Configurar Framer Motion AnimatePresence
- [ ] Crear `shared/store/themeStore.ts` y `uiStore.ts`
- [ ] Migrar `types.ts` a `shared/types/`
- [ ] Migrar `utils/` a `shared/utils/`

**Validación**:
- [ ] `npm run dev` inicia sin errores
- [ ] Las rutas `/auth` y `/loans` funcionan
- [ ] Navegar a `/loans` sin sesión redirige a `/auth`

---

### Fase 2: Shared Components + Design System
**Objetivo**: Crear la biblioteca de componentes UI reutilizables

**Tareas**:
- [ ] Reemplazar iconos SVG inline por `lucide-react`
- [ ] Crear `Button.tsx` con variantes (primary, secondary, danger, ghost) + loading state + icon support
- [ ] Crear `Input.tsx` con label, error message, icon prefix
- [ ] Crear `Card.tsx` con variante (default, interactive, bordered)
- [ ] Crear `Modal.tsx` con overlay animado, focus trap, close on ESC
- [ ] Crear `Skeleton.tsx` con variantes (text, card, table-row)
- [ ] Crear `Toast.tsx` con stack de notificaciones, auto-dismiss
- [ ] Crear `EmptyState.tsx` con icono, título, descripción, CTA
- [ ] Crear `ErrorBoundary.tsx` y `ErrorFallback.tsx`
- [ ] Crear `Spinner.tsx` (mantener, mejorar)
- [ ] Eliminar `components/ui.tsx`

**Validación**:
- [ ] Todos los componentes renderizan correctamente
- [ ] Son responsive
- [ ] Soportan tema claro/oscuro
- [ ] Son accesibles (roles ARIA, focus visible)

---

### Fase 3: Feature Auth
**Objetivo**: Refactorizar autenticación con routing

**Tareas**:
- [ ] Crear `services/authService.ts` con `login()`, `register()`, `logout()`, `getCurrentUser()`
- [ ] Crear `hooks/useAuth.ts` con TanStack Query + contexto
- [ ] Crear `LoginForm.tsx` con React Hook Form + Zod
- [ ] Crear `RegisterForm.tsx` con React Hook Form + Zod
- [ ] Crear `AuthPage.tsx` con tabs animados
- [ ] Eliminar `components/AuthPage.tsx`

**Validación**:
- [ ] Login funciona y redirige a `/loans`
- [ ] Registro funciona y redirige a `/loans`
- [ ] Errores de formulario se muestran inline
- [ ] Loading state en botón de submit

---

### Fase 4: Feature Loans — Lista + Dashboard
**Objetivo**: Refactorizar la lista de préstamos con TanStack Query

**Tareas**:
- [ ] Crear `services/loanService.ts` con todas las operaciones CRUD
- [ ] Crear hooks:
  - `useLoans(userId)` — TanStack Query
  - `useCreateLoan()` — TanStack Mutation
  - `useUpdateLoan()` — TanStack Mutation
  - `useDeleteLoan()` — TanStack Mutation
- [ ] Crear `schemas/loanSchema.ts` — Zod schemas para Loan
- [ ] Crear `SummaryCards.tsx` con animación de conteo
- [ ] Crear `LoanCard.tsx` con hover scale, progress bar animada
- [ ] Crear `LoanListPage.tsx` con grid responsive, estados loading/empty/error
- [ ] Extraer lógica de cálculo de progreso global a un hook

**Validación**:
- [ ] Lista de préstamos se carga con skeleton
- [ ] Cards tienen hover interactivo
- [ ] Crear préstamo desde dashboard funciona
- [ ] Eliminar préstamo con confirmación funciona

---

### Fase 5: Feature Loans — Detalle + Pagos
**Objetivo**: Refactorizar detalle del préstamo y registro de pagos

**Tareas**:
- [ ] Crear hooks:
  - `useLoan(loanId)` — TanStack Query
  - `usePayments(loanId)` — TanStack Query
  - `useCreatePayment()` — TanStack Mutation (optimistic update)
  - `useUpdatePayment()` — TanStack Mutation
- [ ] Crear `LoanDetailPage.tsx` con tabs (Resumen, Pagos, Editar)
- [ ] Crear `PaymentForm.tsx` con cálculo en vivo del breakdown
- [ ] Crear `PaymentHistory.tsx` con tabla responsive
- [ ] Crear `PaymentRow.tsx` con formato de moneda y fecha
- [ ] Crear `LoanForm.tsx` para crear y editar (reutilizable)
- [ ] Crear `DeleteConfirm.tsx`
- [ ] Crear `ProgressBar.tsx` con animación
- [ ] Migrar cálculos de amortización a `shared/utils/amortization.ts`

**Validación**:
- [ ] Detalle del préstamo carga con skeleton
- [ ] Registro de pago funciona con desglose en vivo
- [ ] Editar último pago funciona
- [ ] Editar préstamo funciona
- [ ] Eliminar préstamo borra todo

---

### Fase 6: Layout + Navegación
**Objetivo**: Crear layout profesional con sidebar

**Tareas**:
- [ ] Crear `AppLayout.tsx` con sidebar fijo + main content
- [ ] Crear `Sidebar.tsx` con enlaces a rutas, activo resaltado
- [ ] Crear `Header.tsx` con breadcrumbs, nombre usuario, dark mode toggle, logout
- [ ] Crear `MobileNav.tsx` con bottom tab navigation
- [ ] Implementar dark mode toggle con persistencia en localStorage
- [ ] Implementar transiciones entre rutas con Framer Motion
- [ ] Responsive: sidebar colapsable en tablet, bottom nav en mobile

**Validación**:
- [ ] Sidebar muestra enlaces correctos
- [ ] Ruta activa se resalta en sidebar
- [ ] Dark mode toggle funciona y persiste
- [ ] Mobile: bottom nav visible, sidebar oculto

---

### Fase 7: UX + Animaciones + Pulido
**Objetivo**: Llevar la experiencia de usuario al nivel profesional

**Tareas**:
- [ ] Implementar Toast notifications para todas las operaciones:
  - "Préstamo creado exitosamente" (success)
  - "Pago registrado" (success)
  - "Error al guardar" (error)
- [ ] Animaciones de entrada para lista de préstamos (stagger)
- [ ] Animaciones de transición entre rutas
- [ ] Skeleton loading para todas las páginas
- [ ] Mejorar feedback visual en formularios
- [ ] Añadir confirmación con animación para acciones destructivas
- [ ] Implementar `ErrorBoundary` global
- [ ] Implementar lazy loading de rutas con `React.lazy()`
- [ ] Añadir meta tags y título dinámico por página

**Validación**:
- [ ] Toasts aparecen y desaparecen suavemente
- [ ] Cards aparecen con stagger
- [ ] Transiciones entre rutas son suaves
- [ ] Skeleton se muestra durante carga
- [ ] Errores capturados por ErrorBoundary

---

### Fase 8: Testing + QA
**Objetivo**: Garantizar estabilidad con tests

**Tareas**:
- [ ] Configurar Vitest + React Testing Library
- [ ] Testear `shared/utils/amortization.ts` (cálculos puros)
- [ ] Testear LoanCard component (render, props, empty state)
- [ ] Testear AuthPage flows (login, register, error states)
- [ ] Testear PaymentForm (cálculo en vivo, validación)
- [ ] E2E: Playwright test de flujo completo (registro → crear préstamo → pagar)
- [ ] E2E: Playwright test de edición y eliminación

**Validación**:
- [ ] `npm run test` pasa todos los tests
- [ ] `npm run build` exitoso
- [ ] Playwright test de flujo completo pasa

---

## 10. Criterios de Éxito

- [ ] DashboardPage.tsx original de 911 líneas ELIMINADO (reemplazado por archivos <200 líneas cada uno)
- [ ] 6 rutas funcionando con React Router
- [ ] TanStack Query manejando todo el estado del servidor
- [ ] React Hook Form + Zod en todos los formularios
- [ ] Skeleton loading en todas las vistas de datos
- [ ] Toast notifications en todas las operaciones
- [ ] Dark mode funcional con persistencia
- [ ] Layout responsive (mobile + tablet + desktop)
- [ ] Animaciones en transiciones y micro-interacciones
- [ ] `npm run build` exitoso
- [ ] Auditoría Lighthouse > 90 en Performance, Accessibility, Best Practices

---

## 11. Anti-Patrones a Evitar

- ❌ NO mantener el archivo gigante DashboardPage.tsx
- ❌ NO mezclar lógica de negocio en componentes
- ❌ NO usar useState para datos del servidor (usar TanStack Query)
- ❌ NO validar formularios manualmente (usar React Hook Form)
- ❌ NO hardcodear estilos inline (usar Tailwind clases)
- ❌ NO ignorar estados de carga/error/vacío
- ❌ NO crear dependencias circulares entre features
- ❌ NO poner tipos de Appwrite en componentes (usar interfaces propias)
- ❌ NO olvidar cleanup de efectos y subscriptions

---

## 12. Aprendizajes (Self-Annealing)

### 2026-06-16: Migración Supabase → Appwrite completada
- **Contexto**: Se migró el backend antes de la refactorización
- **Impacto**: Los services de Appwrite ya están creados, solo falta abstraerlos en `loanService.ts`
- **Referencia**: `lib/appwrite/client.ts`, colecciones `loans` y `payments` en Appwrite

---

*SDD aprobado. Listo para ejecución por fases.*
