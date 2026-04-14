# Windows Development Notes — OGDEN Atlas

Notes specific to running the Atlas dev stack on Windows with WSL2.

---

## WSL2 Redis — Dynamic IP Problem

When Redis runs **inside WSL2**, its host is not reachable at `localhost` from
Windows. WSL2 uses a virtual network with a **randomly-assigned IP that changes
on every Windows restart**. This means `REDIS_URL=redis://localhost:6379` in
`apps/api/.env` will silently break after a reboot.

### How to get the current URL

A helper script resolves the current WSL2 IP:

```bash
bash infrastructure/wsl-redis-url.sh
# → redis://172.28.144.1:6379  (example — IP will differ on your machine)
```

### Export it into your current shell before starting the API

```bash
export REDIS_URL=$(bash infrastructure/wsl-redis-url.sh)
```

Then start the API as normal (`pnpm --filter @ogden/api dev` or equivalent).
The exported variable overrides the value in `.env` for that shell session.

### When `localhost` does work

`redis://localhost:6379` is correct when Redis is running **natively on
Windows** (e.g., via the Windows Redis MSI or a Windows Service). If you are
running Redis via `wsl redis-server` or a WSL2 Docker container, use the
dynamic-IP approach above.

---

## PostgreSQL Setup

Run `infrastructure/db-setup.sql` once to create the `ogden_atlas` database,
the `ogden_app` user, and the required extensions:

```bash
psql -U postgres -f infrastructure/db-setup.sql
```

After running it, copy `apps/api/.env.example` to `apps/api/.env` and replace
`CHANGE_ME` with your actual password.

The script is idempotent — safe to re-run if you need to verify the setup.
