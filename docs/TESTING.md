# HK Camera — Testing Guide

## Overview

**87 tests** across four layers: frontend unit (Vitest), backend integration (Jest + Supertest), E2E (Playwright), plus dedicated smoke and regression suites.

---

## Test Suites

### Frontend Unit Tests (35)

| File | Tests | What it covers |
|------|-------|----------------|
| `src/ml/detection.test.js` | 19 | `parseDetections` (threshold, scaling, multi-class, empty), `preprocessFrame` (shape, normalization, batch dimension), constants |
| `src/hooks/useYoloDetection.react.test.js` | 11 | React hook lifecycle: model loading errors, inference interval, start/stop toggle, cooldown, onDetection/onError callbacks |
| `src/hooks/useYoloDetection.test.js` | 5 | CDN version sync guard, model file integrity |

```bash
cd frontend && npm test
```

### Smoke Tests (4)

Quick production health checks that verify critical pages load with 200 status and correct content. Run against the preview server in CI and against production URLs post-deploy.

| File | Tests | What it covers |
|------|-------|----------------|
| `e2e/smoke.spec.js` | 4 | Landing, pricing, login, register page loads + 404 redirect |

```bash
cd frontend && npm run test:smoke
```

### Regression Tests

#### Frontend Regression (20)

Full user flow E2E covering navigation, auth edge cases, page content, and error boundaries.

| File | Tests | What it covers |
|------|-------|----------------|
| `e2e/regression.spec.js` | 20 | Auth validation (5), navigation & routing (7), page content (5), error boundaries (3) |

```bash
cd frontend && npm run test:regression
```

#### Backend Regression (30)

Comprehensive API tests covering all endpoints with various scenarios and edge cases.

| File | Tests | What it covers |
|------|-------|----------------|
| `src/__tests__/regression.test.js` | 30 | Health & system (2), authentication (14), camera CRUD (9), TURN credentials (2), subscription plans (3) |

```bash
cd backend && npm run test:regression
```

### Backend Integration Tests (30)

| File | Tests | What it covers |
|------|-------|----------------|
| `src/__tests__/auth.test.js` | 13 | Register (success, conflict, invalid), login (valid, wrong password, missing user), refresh (rotation, expired, empty body), me (authenticated, no token, expired, user gone), logout |
| `src/__tests__/cameras.test.js` | 12 | List (auth + unauth), create (success, missing name), get (found, 404, 403 other owner), update, delete, stream-key, rotate stream-key, heartbeat |
| `src/__tests__/turn.test.js` | 3 | STUN-only fallback, Coturn credentials, unauth rejection |
| `src/__tests__/health.test.js` | 1 | Uptime + timestamp |

All external services (PostgreSQL, Redis, Stripe, S3, Socket.IO) are mocked. Tests run in `--runInBand` mode to avoid port conflicts.

```bash
cd backend && npm test
```

### E2E Tests (16 + 20 regression)

| File | Tests | What it covers |
|------|-------|----------------|
| `e2e/landing.spec.js` | 4 | Branding, nav links, login/register navigation |
| `e2e/auth-flow.spec.js` | 5 | Login/register form fields, invalid credential handling, protected route redirect |
| `e2e/pricing.spec.js` | 2 | Heading, back navigation |
| `e2e/protected-routes.spec.js` | 5 | Dashboard/settings/billing/alerts redirect, invalid token rejection |

E2E tests run against the production build (`vite preview`) and hit the live Fly.io backend.

```bash
cd frontend && npm run test:e2e          # all E2E tests (requires preview server)
cd frontend && npm run test:e2e:ci       # CI mode (auto-starts preview)
cd frontend && npm run test:smoke        # smoke tests only
cd frontend && npm run test:regression   # regression tests only
```

---

## CI Pipeline

Every push runs the full test suite via `.github/workflows/ci.yml`:

1. **Frontend job** — lint, npm audit, unit tests, build
2. **Backend job** — npm audit, Prisma generate, integration tests
3. **E2E job** — build, preview server, Playwright E2E + regression tests
4. **Smoke job** — build, preview server, smoke tests
5. **Security job** — HTTP security headers scan

The deploy pipeline (`.github/workflows/deploy.yml`) additionally runs regression tests after frontend deploy and smoke tests against production URLs after both frontend + backend deploy.

---

## Writing New Tests

### Unit Tests
- Place alongside source files: `*.test.js` or `*.spec.js`
- Vitest globals: `describe`, `it`, `expect`, `vi`
- Use `@testing-library/react` for component tests

### Integration Tests (Backend)
- Place in `backend/src/__tests__/`
- Import `{ app, server }` from `'../index'`
- Set up mocks in `backend/src/__tests__/setup.js` (Prisma, Redis, Stripe, etc.)
- Mock `prisma.user.findUnique` in `beforeEach` for any test that needs auth

### E2E Tests
- Place in `frontend/e2e/`
- Use Playwright's `test` and `expect` from `@playwright/test`
- Public routes can be tested directly
- Protected routes redirect to `/login` when unauthenticated
- Run with `CI=true playwright test` for automated preview server

---

## Test Mocks

### Prisma Mock
Defined in `backend/src/__tests__/setup.js` as `global.mockPrisma`. All models (`user`, `camera`, `alert`, `recording`, `plan`, `subscription`, `refreshToken`) are stubbed with `jest.fn()`. The mock is exported via `mockPrisma` in the `config/database` module mock.

### Stripe Mock
`jest.mock('stripe')` returns a constructor that produces a mock instance with `checkout.sessions.create`, `billingPortal.sessions.create`, `subscriptions.*`, `webhooks.constructEvent`, and `customers.create`.

### Socket.IO Mock
`getIO()` returns a mock object: `{ to: () => ({ emit: jest.fn() }) }`.
