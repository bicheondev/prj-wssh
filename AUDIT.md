# Prototype Audit and Rebuild Notes

## What was broken/incomplete in prototype
- Fake auth accepted arbitrary usernames and issued tokens without password verification.
- Host ownership and route auth were missing.
- WebSocket auth was shallow and session mapping was incomplete.
- No schema for users, identities, trusted host fingerprints, settings, or robust session/audit tracking.
- Network guard only did regex checks; no DNS resolution defense against SSRF/rebinding.
- Frontend flows were demo-only (localStorage host/session assumptions, placeholder pages).

## What was replaced
- Rebuilt backend auth using hashed passwords and JWT-protected API/WebSocket.
- Replaced DB schema with production entities: users, hosts, identities, trusted_host_keys, sessions, audit_logs, user_settings.
- Reimplemented SSH session gateway with per-user session limits, timeout, PTY lifecycle, websocket cleanup.
- Added encrypted credential vault model for identities and connect flows.
- Added server-side target validation with DNS lookup + private/internal range blocking.
- Replaced minimal frontend shell with production layout scaffolding for sidebar/topbar/terminal/right-panel and terminal component integration.

## Why
These changes were required to meet core security and architecture requirements: real auth, encrypted secrets, SSRF defenses, user isolation, and server-owned SSH lifecycle.
