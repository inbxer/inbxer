# Contributing to Inbxer

Thanks for taking the time to contribute. This guide covers the basics of getting a change from idea to merged PR.

## Getting set up

Follow the [local development](README.md#local-development) steps in the README, or use the [Docker quick start](README.md#quick-start) if you'd rather not install PHP/Node locally.

## Before you open a PR

Run the same checks CI runs:

```bash
./vendor/bin/pint          # PHP code style (auto-fixes)
npm run lint                # ESLint (auto-fixes)
npm run types:check          # TypeScript, no emit
php artisan test              # Pest suite
```

A PR with failing style checks or tests will need another pass before review, so it's faster to catch these locally first.

## Making changes

- **Keep PRs focused.** One fix or one feature per PR is easier to review and easier to revert if something goes wrong.
- **Match existing patterns.** Inbxer organizes backend code by domain (`app/Domain/{Thread,Channel,Team,...}`) rather than Laravel's default flat structure — new code should follow the same shape as its neighbors.
- **Add tests.** New behavior needs a Pest test; bug fixes need a regression test that fails without the fix.
- **Regenerate typed routes if you touch routing.** After changing `routes/web.php` or `routes/api.php`, run:
  ```bash
  php artisan wayfinder:generate --with-form
  ```
- **No unrelated formatting churn.** Avoid reformatting files you didn't otherwise need to touch — it makes diffs harder to review.

## Commit messages

Write commit messages that explain *why*, not just *what* — the diff already shows what changed.

## Reporting bugs

Open an issue with:
- What you expected to happen, and what happened instead
- Steps to reproduce
- Relevant environment details (PHP version, browser, Docker vs. manual install)

## Reporting security issues

Please **do not** open a public issue for security vulnerabilities — see [SECURITY.md](SECURITY.md) instead.

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
