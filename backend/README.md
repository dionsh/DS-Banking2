# DS Banking — Backend (partial reference copy)

This folder is a **partial, reference-only copy** of the DS Banking PHP API.

The real backend runs as a hosted service (PHP + MySQL) and the mobile app
talks to it over HTTPS — see `API_BASE` in [`../src/config.js`](../src/config.js).
**You do not need to run this folder to use the app.**

## What's here

A selection of the API **endpoint** files, so you can see how the app and the
server communicate (request shapes, responses, the money/ledger flow, etc.).

## What's intentionally left out

To keep the hosted service secure, the following are **not** included in this
public copy:

- `config.php` — database connection.
- All `*_db.php` helpers — table schemas, the ledger/house-account logic, and
  the cashback/savings/subscriptions engine.
- `login.php` / `signup.php` — authentication.
- `nova_ai.php` — the NOVA assistant's provider logic and system prompt.
- Infrastructure and secrets — `ca.pem`, the `database/` folder, `Dockerfile`,
  and deployment scripts.

Because those files are missing, the endpoints here will reference helpers that
are not present. **This copy is for reading, not for running.**
