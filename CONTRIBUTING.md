# Contributing

Thanks for contributing to codex-account-orchestrator (CAO).

## Development Setup

Prerequisites:

- Node.js 18+
- Codex CLI available on `PATH`

Install and build:

```bash
npm install
npm run build
```

Link the CLI for local use:

```bash
npm link
cao --help
```

## Development Checks

Run the full check locally:

```bash
npm run test
```

This command builds the project and runs the Node.js test suite.

## Branching & Commits

Recommended branch naming:

- `feature/<description>`
- `fix/<description>`
- `chore/<description>`
- `refactor/<description>`

Commit message style:

- `feat: Add account status command`
- `fix: Handle corrupt status registry safely`
- `docs: Refresh README and usage examples`

## Release Process (Maintainers)

1. Update `CHANGELOG.md` with a new version entry.
2. Bump the `version` in `package.json`.
3. Run `npm run test`.
4. Create a tag on `main`:

```bash
git tag -a vX.Y.Z -m "Release X.Y.Z"
```

5. Create a GitHub Release from the tag.
6. Publishing to npm is handled by the `Publish to npm` workflow on release.
