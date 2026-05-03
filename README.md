# WebSSH Gateway Client

Production-structured web SSH client in the same product category as Termius.

## Architecture
- **Frontend (React + Vite + xterm.js):** terminal UX, host sidebar, tabs-ready layout, settings page.
- **Backend (Express + ws + ssh2):** authenticated WebSocket terminal transport, SSH PTY lifecycle, rate limiting, host policy controls.
- **Persistence (SQLite):** host manager storage + encrypted credentials + audit logs.
- **Shared types package:** typed protocol events and models.

## Security model
- Browser never opens raw SSH; SSH runs only in backend gateway.
- Secrets encrypted at rest with AES-256-GCM (`CREDENTIAL_KEY`).
- Passwords/private keys are never plaintext on disk.
- JWT-authenticated WebSocket session required.
- Host outbound policy blocks localhost, loopback, metadata IP, and private/internal ranges unless `ALLOW_PRIVATE_RANGES=true`.
- Audit logs include only connect start/end metadata, never command content or credentials.

## Features implemented
- Host manager persistence and list/create APIs.
- SSH connection (host/port/username + password or private key).
- PTY shell over `ssh2` with resize support.
- Real-time bidirectional streaming over WebSocket.
- Multi-session primitives (`sessionId` routing).
- Session cleanup on disconnect.
- Connection states in UI.
- Theme-ready terminal + settings page scaffold.
- Basic session input history tracked server-side.
- Rate limiting and connection policy controls.

## Environment variables
Backend (`backend/.env`):
- `PORT=8080`
- `JWT_SECRET=` long random secret (min 16)
- `DATA_PATH=./data/app.db`
- `CREDENTIAL_KEY=` 32+ char key
- `ALLOW_PRIVATE_RANGES=false`

## Local setup
1. `npm install`
2. Configure backend env vars.
3. `npm run dev`
4. Open frontend and create hosts via API/UI integration.

## Deployment guide
- Place backend behind TLS reverse proxy (Nginx/Traefik).
- Enforce secure cookies / OIDC SSO for production auth.
- Store `JWT_SECRET` and `CREDENTIAL_KEY` in secret manager (Vault/KMS).
- Use managed Postgres (instead of SQLite) for horizontal scale.
- Add SIEM forwarding for audit log events.
- Restrict egress with firewall + admin allow-list for approved SSH destinations.

## Notes for production hardening
- Add CSRF + refresh token rotation.
- Add RBAC and per-user host scoping.
- Add explicit reconnect token + resume handshake.
- Add host key fingerprint verification and trust-on-first-use prompts.
