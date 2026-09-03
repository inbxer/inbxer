# Security policy

Security reports help keep Inbxer and its users safe. Please report suspected vulnerabilities privately and allow time for investigation before public disclosure.

## Supported versions

Inbxer is currently in its initial public-release stage. Security fixes are provided for the latest published release only.

| Version | Supported |
|---|---|
| Latest release | ✅ |
| Older releases | ❌ |
| Unreleased development branches | Best effort |

Self-hosted operators are responsible for keeping Inbxer and its infrastructure dependencies up to date.

## Report a vulnerability

Use [GitHub Private Vulnerability Reporting](https://github.com/inbxer/inbxer/security/advisories/new) to submit a confidential report.

Please include:

- A clear description of the issue and its potential impact.
- The affected version, commit, feature, or endpoint.
- Reproduction steps or a minimal proof of concept.
- Any conditions required to exploit the issue.
- Suggested remediation, if you have one.

Do not include real customer data, credentials, access tokens, or other secrets in a report. Use synthetic test data and redact logs or screenshots where necessary.

If Private Vulnerability Reporting is unavailable, open a minimal public issue stating only that you need a private security-reporting channel. Do not include vulnerability details in that issue.

## What to expect

The project aims to:

- Acknowledge a complete report within **3 business days**.
- Provide an initial assessment within **7 business days**.
- Share progress when the investigation materially changes.
- Coordinate a fix, release, and disclosure based on severity and complexity.

These are response targets, not contractual service-level guarantees. Reports that cannot be reproduced or fall outside the project’s scope may take longer to assess.

## Disclosure process

Please keep vulnerability details confidential until a fix is available and coordinated disclosure has been agreed. When appropriate, the project will publish a GitHub Security Advisory describing the affected versions, impact, mitigation, and fixed release.

Credit will be offered to reporters who want it, unless disclosure would create additional risk or the report violates this policy.

## Scope

Examples of issues that are generally in scope:

- Authentication or authorization bypasses.
- Cross-workspace or cross-tenant data access.
- Remote code execution, injection, or unsafe file handling.
- Exposure of credentials, tokens, private messages, or attachments.
- Server-side request forgery or privilege escalation.
- Vulnerabilities in the official Docker deployment caused by Inbxer configuration or code.
- AI features that expose protected workspace data across authorization boundaries.

The following are generally out of scope unless they demonstrate a concrete security impact:

- Vulnerabilities that exist only in unsupported or modified deployments.
- Missing security headers without a working exploit.
- Automated scanner output without validation or reproduction steps.
- Rate-limit recommendations that do not lead to unauthorized access or meaningful service impact.
- Social engineering, physical attacks, denial-of-service testing, or attacks against third-party services.
- Reports about secrets already published by a user in their own issue, logs, or configuration.

## Safe harbor

Good-faith research performed under this policy is considered authorized when you:

- Avoid privacy violations, data destruction, service disruption, and access beyond what is needed to demonstrate the issue.
- Use accounts and data you own or have explicit permission to test.
- Stop testing and report the issue if you encounter customer data or gain unintended persistent access.
- Do not demand payment, threaten disclosure, or use a vulnerability for commercial leverage.
- Follow applicable laws and give the project a reasonable opportunity to remediate the issue.

The project will not pursue legal action against researchers who comply with these guidelines. This safe-harbor statement cannot authorize testing of third-party infrastructure or override the rights of other parties.

## Security updates

Security fixes are released through GitHub releases and, where appropriate, GitHub Security Advisories. Watch the repository’s **Security alerts** or **Releases** to receive updates.
