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
- `npm run test -w backend`

## Security notes
- Browser never opens direct SSH TCP connections.
- Saved credentials encrypted at rest (AES-256-GCM).
- Passwords hashed (bcrypt).
- API and WebSocket require JWT authentication.
- Network guard blocks localhost/private/internal ranges by default.
- Audit logs exclude command content and secrets.

## Deployment
- Run behind TLS reverse proxy.
- Store secrets in KMS/Vault.
- Set egress policies and keep `ADMIN_ALLOW_PRIVATE_NETWORKS=false` unless explicitly required.

## Known limitations
- Fingerprint trust flow is implemented server-side and emits `fingerprint_required`; frontend confirmation UX wiring must be completed to prompt/approve inline.
- Integration tests against a real SSH endpoint are not run in CI by default; run in controlled env with test SSH container.
