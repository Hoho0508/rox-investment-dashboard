# Repository Guidelines

## Project Structure & Module Organization

This repository is currently an empty project scaffold. Keep the root directory limited to project-wide configuration and documentation. As the project grows, place application code in `src/`, automated tests in `tests/`, and static resources in `assets/`. Mirror source paths in the test tree where practical; for example, test `src/auth/session.*` with `tests/auth/session.test.*`. Document any new top-level directory in the README.

## Build, Test, and Development Commands

No build system, package manager, or test runner is configured yet. When introducing one, expose a small, predictable command set and update this guide in the same change. Preferred entry points are:

- `make setup` or the ecosystem equivalent: install development dependencies.
- `make test`: run the complete automated test suite.
- `make lint`: run formatting and static-analysis checks.
- `make run`: start the project locally.

Do not document commands until their configuration files and scripts exist and have been verified locally.

## Coding Style & Naming Conventions

Follow the standard formatter for the chosen language and commit its configuration. Use spaces rather than tabs unless the language convention requires otherwise. Choose descriptive names: `snake_case` for Python modules and functions, `camelCase` for JavaScript or TypeScript variables, and `PascalCase` for classes and components. Keep modules focused, avoid unexplained abbreviations, and run formatting and linting before committing.

## Testing Guidelines

Add tests with every behavior change or bug fix. Keep tests deterministic and independent of external services; use fixtures or mocks when necessary. Name test files according to the selected framework, such as `test_session.py` or `session.test.ts`. Once tooling is selected, define the exact test command and any coverage threshold here and in continuous integration.

## Commit & Pull Request Guidelines

There is no existing commit history from which to infer a convention. Use short, imperative commit subjects, optionally following Conventional Commits, for example `feat: add session validation` or `fix: handle missing config`. Keep commits narrowly scoped. Pull requests should explain the change and motivation, list verification performed, link relevant issues, and include screenshots for visible UI changes. Call out breaking changes, migrations, or new configuration explicitly.

## Security & Configuration

Never commit credentials, tokens, private keys, or local environment files. Provide sanitized examples such as `.env.example`, and add generated files and secrets to `.gitignore` before introducing project tooling.
