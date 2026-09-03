<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/logo-dark.svg">
    <img src=".github/assets/logo.svg" alt="Inbxer" width="340">
  </picture>
</p>

<h3 align="center">The open-source, AI-powered customer support platform</h3>

<p align="center">
  Bring email, Slack, and in-app chat into one account-aware queue.<br>
  Let focused AI agents draft, summarize, and organize the work—while your team stays in control.
</p>

<p align="center"><strong>AI drafts. Humans decide. Self-hosted under MIT.</strong></p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-1A79D3.svg" alt="MIT license"></a>
  <img src="https://img.shields.io/badge/PHP-8.3+-777BB4?logo=php&logoColor=white" alt="PHP 8.3 or newer">
  <img src="https://img.shields.io/badge/Laravel-13-FF2D20?logo=laravel&logoColor=white" alt="Laravel 13">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19">
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/contributions-welcome-1F7A4D.svg" alt="Contributions welcome"></a>
</p>

<p align="center">
  <a href="#why-inbxer">Why Inbxer</a> ·
  <a href="#ai-that-assists-not-autopilots">AI agents</a> ·
  <a href="#features">Features</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#contributing">Contributing</a>
</p>

---

## Why Inbxer

Most helpdesks are built around anonymous tickets. B2B SaaS support is different: customers are named accounts with tiers, history, owners, and promises your team needs to keep.

Inbxer keeps the conversation and the customer context together. Messages from every connected channel land in one realtime workspace where support can triage, collaborate, automate repeat work, and stay close to engineering.

- **Account-aware by design** — see the company, tier, owner, history, labels, and open work beside each conversation.
- **One queue across channels** — handle email, Slack, and your embedded chat widget without switching tools.
- **AI with human control** — receive useful drafts and suggestions; nothing reaches a customer until a person decides.
- **Open source and portable** — inspect the entire product, run it on your infrastructure, and keep control of your data.

## AI that assists, not autopilots

Inbxer uses six focused AI agents instead of one generic chatbot. Each agent has a narrow job and produces work your team can review.

| Agent | What it does |
|---|---|
| **Support Reply** | Drafts a response grounded in the current conversation. |
| **Thread Summary** | Condenses long threads so an agent can catch up quickly. |
| **Thread Urgency** | Detects language that may need faster human attention. |
| **Thread Labeling** | Suggests or applies useful labels from conversation context. |
| **Thread Title** | Turns vague subjects into clear, scannable thread titles. |
| **Tone Rules** | Helps keep drafts aligned with your team’s voice and guidelines. |

AI activity is visible and reviewable. Teams can configure knowledge, tone, suggested responses, and automation preferences without giving up control of the final reply.

> **AI drafts. Humans decide.** Inbxer is designed to reduce repetitive work, not remove the person responsible for the customer relationship.

## Features

### Conversations and collaboration

- Unified queues for your threads, unassigned work, labels, tiers, channels, and saved views.
- Assignment, priorities, internal notes, snippets, tasks, linking, merging, and thread locking.
- Realtime conversation and assignment updates through Laravel Reverb.
- Customer and company context available directly beside the conversation.

### Channels

- **Email** — inbound webhook ingestion, threaded replies, and attachments.
- **Slack** — two-way channel sync with reactions and message permalinks.
- **Chat widget** — a lightweight, brandable JavaScript embed with live customization.
- **Extensible adapters** — add more channels without changing the conversation model.

### Automation and operations

- Rule-based workflows with explicit triggers, conditions, actions, and run history.
- Account tiers and business-hours-aware SLA targets with breach detection.
- Auto-responses, away-mode synchronization, labels, snippets, and custom fields.
- CSAT surveys and reporting for queue volume, response time, and team activity.
- Roles, invitations, passkeys, auditability, API keys, and a token-authenticated REST API.

### Open by default

- MIT licensed with no per-seat limit in the self-hosted edition.
- Local or S3-compatible attachment storage.
- Docker Compose deployment with MySQL, Redis, queues, scheduling, and realtime updates.
- A public codebase you can inspect, extend, and operate on your own terms.

## Quick start

The recommended way to run Inbxer is with [Docker](https://docs.docker.com/get-docker/) and the Compose plugin.

```bash
git clone https://github.com/inbxer/inbxer.git
cd inbxer

cp .env.docker.example .env
docker compose up -d --build
docker compose logs -f app
```

Open **http://localhost:8080**.

The first boot generates the application key when needed, runs database migrations, links storage, and caches the application configuration. The stack includes the app, MySQL, Redis, the queue worker, scheduler, and Laravel Reverb.

<details>
<summary><strong>Useful Docker commands</strong></summary>

```bash
# View all service logs
docker compose logs -f

# Run an Artisan command
docker compose exec app php artisan tinker

# Run the test suite
docker compose exec app php artisan test

# Stop the stack while preserving data
docker compose down

# Pull changes and rebuild
git pull
docker compose up -d --build
```

</details>

> Inbxer does not expose public registration by default. Create the first account with a seeder or through `php artisan tinker`, then invite the rest of your team from the workspace settings.

## Local development

### Requirements

- PHP 8.3+
- Composer
- Node.js 20+
- SQLite, MySQL, or PostgreSQL

```bash
git clone https://github.com/inbxer/inbxer.git
cd inbxer

composer install
npm install

cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
php artisan storage:link

composer run dev
```

The development command starts the web server, queue listener, log viewer, and Vite together.

## Configuration

Copy `.env.example` for local development or `.env.docker.example` for Docker. Most installations only need to configure these areas:

| Area | What to set |
|---|---|
| Application | Your public `APP_URL`; keep `APP_DEBUG=false` in production. |
| Data | Database credentials and Redis for queues, cache, and sessions. |
| Email | Mail delivery plus an inbound domain and webhook secret. |
| Realtime | `REVERB_*` credentials and the public WebSocket host. |
| Storage | Local storage for one server, or S3-compatible storage when scaling. |
| Integrations | Add Slack and AI-provider credentials only for the features you enable. |

All available options are documented in the environment templates. Never commit real credentials.

## Architecture

| Layer | Technology |
|---|---|
| Backend | PHP 8.3 · Laravel 13 · Fortify · Reverb |
| Frontend | React 19 · TypeScript · Inertia.js · Tailwind CSS v4 · shadcn/ui |
| Data | MySQL or another Laravel-supported database · Redis |
| Files | Spatie Media Library · local or S3-compatible storage |
| AI | Laravel AI agents with configurable provider credentials |
| Testing | Pest 4 · PHPUnit |

Business logic is organized by domain under `app/Domain`, while the focused AI agents live under `app/Ai/Agents`. Inertia connects the Laravel backend to the React interface without requiring a duplicated application API. Laravel Wayfinder generates typed frontend route helpers directly from backend routes.

```text
app/
├── Ai/Agents/          # Focused AI agents
├── Domain/             # Product domains and business logic
resources/js/
├── components/         # Shared interface components
├── pages/              # Inertia pages
└── routes/             # Generated typed routes
```

## Quality checks

Run the same checks before opening a pull request:

```bash
./vendor/bin/pint --test
npm run lint:check
npm run format:check
npm run types:check
php artisan test
```

## Production notes

- Put the application behind a TLS-terminating reverse proxy or load balancer.
- Proxy Laravel Reverb correctly so browser clients connect over secure WebSockets.
- Use persistent database and attachment backups.
- Use S3-compatible storage when running more than one application instance.
- Keep the queue worker and scheduler running; SLA and automation behavior depends on them.
- Rotate application, channel, API, and AI-provider credentials through your secret manager.

## Contributing

Contributions are welcome—from bug reports and documentation improvements to new channel adapters and product features. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

Please report security vulnerabilities privately using the process in [SECURITY.md](SECURITY.md), not through a public issue.

## License

Inbxer is open source under the [MIT License](LICENSE). Use it, modify it, self-host it, and build on top of it.
