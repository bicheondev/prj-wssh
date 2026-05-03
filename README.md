# WebSSH Platform
Production-oriented browser SSH client with backend SSH gateway over WebSocket.

## Architecture diagram (text)
`Browser UI (React + xterm)` -> `REST API (Express auth/hosts/identities)` + `WS Gateway (/ws/terminal)` -> `SSH Session Manager (ssh2 + PTY)` -> `Remote SSH servers`

Persistence: SQLite (`users`, `hosts`, `identities`, `trusted_host_keys`, `sessions`, `audit_logs`, `user_settings`).

## Setup
1. `cp .env.example .env`
2. Fill `JWT_SECRET` and `ENCRYPTION_KEY` with strong values.
3. `npm install`
4. `npm run dev`

## Dev commands
- `npm run dev`
- `npm run build`
- `npm run test`

## Security assumptions
- Backend environment and secret storage are trusted.
- TLS termination is correctly configured in front of backend/frontend.
- Admins intentionally opt in before allowing private/internal network targets.
- Audit logs are protected and retained according to organizational policy.

## Security notes
- Browser never opens direct SSH TCP connections.
- Saved credentials encrypted at rest (AES-256-GCM).
- Passwords hashed (bcrypt).
- API and WebSocket require JWT authentication.
- Network guard blocks localhost/private/internal ranges by default.
- WebSocket message rate limit reduces spam/flood abuse.
- Audit logs exclude command content and secrets.

## Recommended production deployment
- Run backend behind TLS reverse proxy with WebSocket upgrade support.
- Use managed database (Postgres/MySQL) for HA/backup instead of SQLite.
- Put `JWT_SECRET` and `ENCRYPTION_KEY` in KMS/Vault and rotate periodically.
- Enforce outbound firewall rules plus explicit SSH destination allow-list.
- Add centralized logging/alerting for auth failures, rate-limit events, and fingerprint mismatches.

## Current limitations
- Frontend fingerprint confirmation UX is not fully wired; backend emits `fingerprint_required` and blocks until trust record exists.
- Integration tests against a real SSH endpoint are not included in default test run.
- Token revocation list / refresh token lifecycle is not yet implemented.
