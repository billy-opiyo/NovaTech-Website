# DNS and SSL runbook

## Current repository state

The application already supports the application-side part of multi-tenant
domains:

- platform-host resolution for `localhost`, `{slug}.localhost`, and
  `{slug}.{PLATFORM_DOMAIN}`;
- tenant-scoped custom-domain records and TXT verification instructions;
- verified-domain-first request resolution; and
- SSL status display without claiming that a certificate exists.

The repository now centralizes `PLATFORM_DOMAIN`, uses an HTTPS production
fallback for public URLs, and emits HSTS only in production. No database
migration or live provider credential is required for these source changes.

## Recommended production topology

Use one Vercel project for the Next.js application and configure the platform
domain there:

- apex platform domain: `nuravatech.com`;
- wildcard tenant domain: `*.nuravatech.com`; and
- `www.nuravatech.com` configured as a redirect to the canonical apex domain.

Wildcard domains should use the Vercel nameserver method. Vercel can then
complete DNS-01 validation for wildcard certificates. The exact nameservers,
A records, CNAME targets, and verification records must be copied from the
linked Vercel project's Domain Settings or `vercel domains inspect`; they are
not hardcoded in this repository.

## Required access and values

Before changing production DNS, obtain:

1. access to the registrar or DNS provider for `nuravatech.com`;
2. access to the production Vercel project/team;
3. the final canonical public URL;
4. confirmation that wildcard tenant hosts are desired; and
5. confirmation that `www.nuravatech.com` is available for the apex redirect.

Do not paste Vercel tokens, registrar passwords, or provider secrets into
source control or chat. If automation is desired, use a protected deployment
secret for the Vercel project token and keep registrar access separate.

## Configuration sequence

1. Add `nuravatech.com` and `*.nuravatech.com` to the production
   Vercel project.
2. Add `www.nuravatech.com` to the same project and configure it to redirect
   permanently to `https://nuravatech.com`.
3. Inspect the project-specific DNS instructions.
4. Delegate the domain to Vercel nameservers if wildcard certificates are
   required, or add the exact Vercel A/CNAME/TXT records at the current DNS
   provider for non-wildcard domains.
5. Set production `PLATFORM_DOMAIN` and `NEXT_PUBLIC_APP_URL`.
6. Deploy the application.
7. Confirm that the apex domain, the `www` redirect, a known tenant subdomain, and HTTPS all reach
   the production deployment.
8. For a merchant custom domain, add the hostname to the platform, publish the
   application-provided TXT verification record, then add the hostname to the
   hosting provider's custom-domain configuration. The application must only
   mark it verified after a real DNS check.

## Verification checklist

```powershell
Resolve-DnsName nuravatech.com
Resolve-DnsName -Type CNAME acme.nuravatech.com
Invoke-WebRequest https://nuravatech.com -UseBasicParsing
Invoke-WebRequest https://www.nuravatech.com -UseBasicParsing
Invoke-WebRequest https://acme.nuravatech.com -UseBasicParsing
```

Also verify in the Vercel dashboard or CLI that the domain is valid and its
certificate is issued. DNS propagation, certificate issuance, and custom
domain routing are external checks and must not be represented as complete by
the application until those checks succeed.

## Still intentionally pending

- registrar/DNS changes;
- Vercel project domain attachment and wildcard nameserver delegation;
- custom-domain provider automation for each merchant hostname;
- live certificate verification; and
- production database migration/restore verification, which is intentionally
  scheduled as the second-last launch step.
