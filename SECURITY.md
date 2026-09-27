# Security policy

## Reporting a vulnerability

Please **do not** open a public issue for security problems. Report them privately through
[GitHub security advisories](https://github.com/ajayda24/authowrite/security/advisories/new).
Include the steps to reproduce, the impact, and the affected version or commit.

We aim to acknowledge reports within 3 days and to ship a fix, or a mitigation plan, within 30 days.
We credit reporters who wish to be named.

## Supported versions

Only the latest release on `main` receives security fixes during the 0.x series.

## Hardening checklist for self-hosters

- Set a unique `BETTER_AUTH_SECRET` and a strong `POSTGRES_PASSWORD`.
- Serve over HTTPS and set `APP_URL` to the HTTPS URL.
- Configure SMTP so password resets work.
- Back up the database and uploads regularly (see `docs/self-hosting.md`).
