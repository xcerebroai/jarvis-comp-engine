# Security Policy

Jarvis Comp Engine is a private tool for real estate acquisition analysis. Even
though the repository is public, it must never contain secrets or private data.

## Secrets and credentials

- **Do not commit API keys, tokens, or credentials.** Ever.
- **Use `.env.local` locally** for any real keys — it is git-ignored.
- **`.env.example` is safe and must stay blank.** It documents variable *names*
  only; never fill it with real values.
- Provider keys are read from the environment at runtime and are never bundled
  into client code.

## Private data

- **Never paste seller information, private financial data, addresses, or deal
  numbers into public issues, PRs, or discussions.** Redact before sharing.
- Saved analysis history is stored locally in the browser (localStorage) and is
  not uploaded anywhere by this app.

## Boundaries that protect users and the project

- **Do not add scraping code** or automation against Zillow, Redfin, Realtor,
  Trulia, Opendoor, MLS portals, or any site that prohibits automated access.
- **Do not add credential bypasses**, ToS circumvention, or "unofficial API"
  clients. Automated data must come from licensed/compliant providers.

## Reporting a vulnerability

Please report security issues **privately**, not in public issues:

- Use GitHub's **"Report a vulnerability"** (Security → Advisories) if enabled, or
- Contact the repository owner directly.

Include a description, reproduction steps, and impact. Do not include real private
data in the report. Please allow reasonable time for a fix before any public
disclosure.
