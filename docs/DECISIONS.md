# Decision records

## Provider-facing access (DAS Criterion 4)

**Context**: Design provider registration and onboarding in line with the Australian Government Digital Access Standard.

**Decision**: Use a single access point (this app and Provider Finder) and extend the existing **User** and **ClaimedProvider** model. Do not introduce a separate provider portal or a second identity/store for providers.

**Options considered**:
- New provider-only portal and sign-in.
- Reuse existing app, add provider registration and onboarding routes and APIs.

**Outcome**: Reuse chosen to reduce duplication, keep one sign-in, and align with DAS (reuse existing access points and capabilities). Provider registration at `/register/provider`, onboarding at `/onboarding`, entry from Provider Finder.

**Reference**: [PROVIDER_ACCESS.md](PROVIDER_ACCESS.md), [Digital Access Standard](https://www.digital.gov.au/policy/digital-experience/digital-access-standard).
