# Repository Guidelines

## Project Structure & Module Organization

This repository contains a Next.js App Router application. Keep the root directory limited to project-wide configuration and documentation. Place pages and API routes in `src/app/`, reusable UI in `src/components/`, domain and infrastructure code in `src/lib/`, and shared domain types in `src/types/`. Keep Prisma schema, migrations, and seed data in `prisma/`, command-line utilities in `scripts/`, and automated tests in `tests/`. Mirror source responsibilities in the test tree where practical. Document any new top-level directory in the README.

## Build, Test, and Development Commands

Use the pinned pnpm version declared in `package.json`; do not mix package managers or create another lockfile.

- `pnpm install`: install dependencies.
- `pnpm dev`: start the local Next.js development server.
- `pnpm format:check`: verify Prettier formatting without changing files.
- `pnpm lint`: run ESLint with zero warnings allowed.
- `pnpm typecheck`: run TypeScript without emitting files.
- `pnpm test`: run deterministic Vitest unit tests.
- `pnpm test:e2e`: run Playwright desktop and mobile end-to-end tests.
- `pnpm build`: produce a local production build without deploying it.
- `pnpm check`: run formatting, lint, typecheck, and unit tests together.
- `pnpm db:generate`, `pnpm db:deploy`, and `pnpm db:seed`: prepare a configured PostgreSQL database.

## Coding Style & Naming Conventions

Follow the standard formatter for the chosen language and commit its configuration. Use spaces rather than tabs unless the language convention requires otherwise. Choose descriptive names: `snake_case` for Python modules and functions, `camelCase` for JavaScript or TypeScript variables, and `PascalCase` for classes and components. Keep modules focused, avoid unexplained abbreviations, and run formatting and linting before committing.

## Testing Guidelines

Add tests with every behavior change or bug fix. Keep tests deterministic and independent of external services; use fixtures or mocks when necessary. Name Vitest files `*.test.ts` and Playwright files `*.spec.ts`. Run `pnpm check` for every change and `pnpm test:e2e` for user-visible flows. No numeric coverage threshold is configured yet; critical authentication, scheduling, provider fallback, report, and scoring rules must have direct tests.

## Commit & Pull Request Guidelines

There is no existing commit history from which to infer a convention. Use short, imperative commit subjects, optionally following Conventional Commits, for example `feat: add session validation` or `fix: handle missing config`. Keep commits narrowly scoped. Pull requests should explain the change and motivation, list verification performed, link relevant issues, and include screenshots for visible UI changes. Call out breaking changes, migrations, or new configuration explicitly.

## Security & Configuration

Never commit credentials, tokens, private keys, or local environment files. Use only sanitized placeholders in `.env.example`. Read FinMind credentials only from `process.env.FINMIND_API_TOKEN`; missing or failed live data must fall back safely to clearly labelled Mock data. Keep authentication, cron, session, and database secrets server-side. Generated Prisma clients, test output, build output, and local databases remain ignored by Git.
