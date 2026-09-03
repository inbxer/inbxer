# Inbxer direction

Inbxer is building an open-source, AI-powered customer support platform for B2B SaaS teams. It brings conversations, customer context, collaboration, automation, SLAs, reporting, and integrations into one coherent product. This document describes the product direction—not a fixed release schedule. Priorities change as people use the product and show us where support work still feels unnecessarily difficult.

## Product principles

Every improvement should reinforce at least one of these ideas:

- **AI drafts, humans decide.** AI should remove repetitive work without taking ownership away from the support team.
- **Accounts matter more than tickets.** Company context, tiers, history, and relationships belong beside every conversation.
- **One customer history across channels.** New channels should strengthen the shared workflow instead of creating another disconnected tool to watch.
- **Automation must be explainable.** Teams should always be able to see why a rule or agent took an action.
- **Self-hosting is a first-class experience.** The open-source product should remain complete, inspectable, and straightforward to operate.

## Available today

The current product foundation includes:

- A unified conversation workspace for email, Slack, and an embeddable chat widget.
- Customer, company, tier, label, and ownership context beside each thread.
- Six focused AI agents for drafting, summarizing, urgency, labeling, titles, and tone.
- Suggested responses, knowledge sources, AI preferences, and visible activity history.
- Assignments, priorities, internal notes, snippets, tasks, thread linking, and merging.
- Rule-based workflows with triggers, conditions, actions, and execution logs.
- Business-hours-aware SLAs, breach detection, auto-responses, and away mode.
- CSAT and Insights for response time, support volume, and team activity.
- Teams, roles, invitations, passkeys, audit logs, API keys, and a REST API.
- Realtime updates with Laravel Reverb and a Docker Compose deployment path.

## Current focus

Work is currently centered on making the existing foundation dependable for the first public users:

- Improving onboarding and the first-run experience.
- Making AI configuration, knowledge, and review flows easier to understand.
- Strengthening tests, continuous integration, release checks, and upgrade documentation.
- Polishing channel setup, delivery reliability, and failure recovery.
- Improving accessibility, responsive behavior, and interface consistency.
- Expanding operational documentation for secure production deployments.

## Exploring next

These are product directions under consideration. Their order and final shape will be guided by real usage:

- More ways for customer conversations to enter the same support workspace.
- Better multilingual and right-to-left support.
- More flexible data retention, exports, and workspace controls.
- Deeper reporting for workload, quality, and recurring customer issues.
- Extensible workflow actions and integrations for engineering tools.
- Easier managed deployment for teams that do not want to operate the stack themselves.

## How priorities are chosen

Inbxer is still early. A smaller set of reliable, coherent workflows is more valuable than a long list of disconnected features. Work moves forward based on:

1. Problems observed in real support conversations.
2. Reliability, security, and data-protection needs.
3. Feedback shared through issues and discussions.
4. Whether a change improves both the hosted and self-hosted experience.
5. The maintenance cost of supporting the feature well over time.

## Share feedback

If a missing capability is blocking your team, [open an issue](../../issues) with the workflow you are trying to complete and the result you need. Describing the problem is more useful than prescribing a specific implementation.

For security concerns, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
