# Self-hosting Authowrite

Authowrite needs three things: the **web app**, **PostgreSQL 16+**, and somewhere to store
**uploaded images** (a local disk or any S3-compatible service).

> This is the V1 guide. A fuller guide (reverse proxies, scaling, monitoring) is planned for V8.

## Installation (Docker Compose)

```bash
git clone https://github.com/ajayda24/authowrite.git
cd authowrite
cp .env.example .env     # then edit it, see below
docker compose up -d
```

The `web` container applies database migrations on every start, then launches the server on
port 3000. Health check: `GET /api/health` → `{"status":"ok"}`.

## Configuration

All settings are environment variables; `.env.example` documents each one.

| Variable                | Required    | Notes                                                                                             |
| ----------------------- | ----------- | ------------------------------------------------------------------------------------------------- |
| `APP_URL`               | yes         | Public URL, e.g. `https://stories.example.org`. Used in emails and auth callbacks.                |
| `BETTER_AUTH_SECRET`    | yes         | Long random string: `openssl rand -base64 32`. Changing it signs everyone out.                    |
| `DATABASE_URL`          | yes         | Set automatically by Compose.                                                                     |
| `STORAGE_DRIVER`        | no          | `local` (default) or `s3`.                                                                        |
| `SMTP_URL`, `MAIL_FROM` | recommended | Needed for password-reset emails. Without SMTP, emails are written to the server log.             |
| `GITHUB_*`, `GOOGLE_*`  | no          | Enable "Continue with GitHub/Google". The callback URL is `APP_URL/api/auth/callback/<provider>`. |
| `POSTGRES_PASSWORD`     | recommended | Compose only: password for the bundled database.                                                  |

## Database setup

Compose runs PostgreSQL for you. To use an existing server instead, remove the `db` service and set
`DATABASE_URL`. Migrations are plain SQL files in `drizzle/` and are applied automatically (set
`SKIP_MIGRATIONS=true` to manage them yourself with `pnpm db:migrate`).

## Storage setup

- **Local (default):** files go to the `uploads` volume (`/data/uploads` in the container).
- **S3-compatible:** set `STORAGE_DRIVER=s3` plus `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`,
  `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`. To try it with the bundled MinIO:
  `STORAGE_DRIVER=s3 docker compose --profile s3 up`.

Files are always served through `/api/files/…`, so you can switch drivers by copying the objects
(same keys) without touching any stories.

## Email setup

Set `SMTP_URL` (e.g. `smtp://user:pass@smtp.example.com:587`) and `MAIL_FROM`. Any SMTP provider
works.

## Backup

Back up both the database and the uploads:

```bash
docker compose exec db pg_dump -U authowrite -Fc authowrite > authowrite-$(date +%F).dump
docker run --rm -v authowrite_uploads:/data -v "$PWD":/backup alpine \
  tar czf /backup/uploads-$(date +%F).tgz -C /data .
```

Restore with `pg_restore --clean -d authowrite` and by extracting the archive into the volume.

## Upgrade

```bash
git pull
docker compose up -d --build
```

Migrations run automatically on start. Back up first, and read the CHANGELOG for notes.

## Migration

Moving to another server means moving the database dump, the uploads (or S3 bucket), and your
`.env`. Stories keep their URLs as long as `APP_URL` stays the same.
