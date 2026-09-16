# Frontend security hardening

Implemented:

- Native tokens, user records, KYC state, and rider status use SecureStore.
- Web bearer tokens are memory-only and disappear on refresh.
- Local cache is never used to override a backend authorization response.
- The Axios interceptor only handles transport concerns.
- Document uploads use the authenticated backend upload endpoint.
- Role aliases are normalized in one module.
- CI checks the production mobile TypeScript project and high-severity advisories.

Remaining architectural work:

- Move web authentication to server-issued Secure, HttpOnly, SameSite cookies.
- Split `services/api.ts` into typed domain clients and validate responses at runtime.
- Expand the generated OpenAPI contract beyond the health endpoint.
- Decompose the largest screens into view, hook, service, and style modules.
- Add unit, integration, and end-to-end tests before enforcing coverage.
- Move mockup/scaffold projects out of the production build graph or document ownership.
