# Today’s Requirements — Modular Staff Operations and Account Feature Controls

## Goal for today

Give Super Admin control over a **Dealer Staff Operations** feature for each Dealer account. When enabled, the Dealer owner can use staff-related capabilities and review account activity. When disabled, those capabilities disappear from the Dealer experience and their feature-specific frontend work does not start.

This work must be designed as reusable account-feature infrastructure, so the same pattern can later support Farmer, Hatchery, Company, and future modules without rewriting the feature-control system.

## Important clarification

“Merge Staff Management and Activity Logs” does **not** mean merging their pages, APIs, database tables, or domain models.

It means they are bundled as one admin-controlled product feature:

```text
Dealer Staff Operations
├── Payroll staff management
├── Login-capable staff access and permissions
└── Owner-visible business activity history
```

The existing separation between payroll `Staff` records and login-capable `StaffUser` records must remain. Business audit records also remain a separate, immutable audit domain.

## Existing project foundations to reuse

- Account-feature definitions, per-account overrides, current-account feature endpoint, and Admin account-feature toggle endpoint already exist.
- The Admin account-details page already renders account features and can update them.
- Dealer activity history already uses the account-scoped `BusinessAuditLog` model and prevents staff users from viewing or exporting activity history.
- Current Dealer staff permissions are:
  - financial summaries;
  - cash-in-hand and cash history;
  - staff-management access.
- Dealer navigation already supports feature-gated items and staff-permission-gated items. This pattern should be extended rather than duplicated.

## Scope and behaviour

### 1. Dealer Staff Operations feature

- Add a named account feature for Dealer accounts, **enabled by default** so existing Dealer staff access is preserved until an Admin turns it off.
- Its scope is **payroll staff management, staff-user access/permissions, and the Dealer owner’s activity-history experience**.
- It is one switch in Admin, not multiple loosely related Dealer switches.
- The Dealer owner may use the feature when enabled.
- A login-capable Dealer staff user must never be able to view or export business activity history, even if they have other staff permissions.
- Keep the existing staff-permission model. The feature switch decides whether the product area is available; staff permissions decide what an enabled staff user can see within allowed staff functionality.

### 2. Activity audit requirements

- Record meaningful **successful** Dealer mutations, attributed to the account owner or the acting staff user.
- Prioritise: sales and sale voids/changes, payments and settlements, balance or manual adjustment changes, inventory/product changes, staff-user changes, staff-permission changes, and relevant payroll-staff changes.
- Audit rows are append-only in application behaviour: no user-facing edit or delete path.
- Do not record passwords, tokens, secrets, failed attempts, page views, routine reads, or noisy system activity.
- Existing authentication/security metadata retention rules must remain separate from the immutable business-audit row.
- Turning the feature off hides the Dealer-facing activity experience; it must not corrupt, remove, or alter already recorded audit data. Admin auditing remains independent of this Dealer UI feature.

### 3. Admin control

- In the Admin account-details page, show **Dealer Staff Operations** only for Dealer accounts.
- The Admin can turn it on or off using the existing account-feature mechanism.
- Persist who changed the setting, when it changed, and the on/off state through the existing account-feature record and Admin audit event.
- Refresh or invalidate the affected Admin account-detail feature data after a successful change.
- Keep feature definitions centralized and typed across backend and frontend; do not add role-specific string checks throughout UI components.

### 4. Disabled-state rules (soft hide for this release)

When the Dealer Staff Operations feature is off:

- Hide Staff Operations navigation and entry points, including payroll staff management, staff-user access, and Dealer activity history where it belongs to this bundle.
- Do not render feature-specific buttons, tabs, cards, empty states, or dashboard shortcuts.
- Do not fetch staff, staff-user, or Dealer activity-history data.
- Do not initialize feature-specific React Query polling, subscriptions, or Socket.IO work.
- Do not eagerly import or mount substantial feature-only client components where practical.
- Do not spend this phase adding a comprehensive route-blocking or API-authorization layer solely for the toggle. Existing authorization and ownership checks must stay intact.
- Existing stored data and existing staff accounts must not be deleted or changed merely because the feature is turned off.

When it is turned back on, the normal UI and required queries may initialize again without data loss.

### 5. Frontend feature-loading rules

- Read account features once through the shared query/cache and pass resolved feature state into layout/navigation/provider boundaries.
- Feature configuration must be checked **before** mounting a feature provider, query, poller, subscription, or lazy feature component—not only after it has fetched.
- Audit the protected layout and Dealer layout in particular. Chat is a separate optional feature concern and should not automatically connect for accounts/modules that do not expose chat.
- Reuse a general feature-gate/conditional-provider pattern. Do not create Dealer-only plumbing that later has to be copied to Farmer, Hatchery, or Company.
- Avoid duplicate `/account-features` requests from desktop navigation, mobile navigation, pages, and guards; they should share the same TanStack Query key/cache.

## Delivery phases

### Phase 0 — Confirm current behaviour and coverage

- Inventory existing Dealer staff screens, staff-access screens, activity screen, navigation entries, queries, providers, sockets, and audit writes.
- Identify important successful Dealer mutations that are not yet audited.
- Establish the exact manual test accounts and baseline network behaviour before changes.

### Phase 1 — Define the reusable feature contract

- Add the Dealer Staff Operations feature to the central backend/frontend feature registries.
- Make applicability, default state, labels, and descriptions role-aware in one place.
- Ensure the Admin detail response and mutation support it through the established generic contract.
- Keep the design ready for per-role/module additions without schema redesign.

### Phase 2 — Bundle the Dealer product experience

- Gate all Dealer Staff Operations navigation, pages, links, and actions with the shared feature configuration.
- Preserve existing staff permission checks and the rule that staff cannot access activity history.
- Finish missing high-value activity audit events, without widening logging to noise or sensitive data.

### Phase 3 — Eliminate disabled-feature work

- Move checks to the earliest practical layout/provider/query boundary.
- Ensure an off feature makes no staff/activity requests, polling, subscriptions, or feature-only component loading.
- Review optional-feature initialization more broadly, especially Chat, so the mechanism scales beyond Staff Operations.
- Verify the toggle is reflected after a reasonable refresh/cache-invalidation path; real-time feature-change propagation is not required unless existing architecture already supports it safely.

### Phase 4 — Dealer verification handoff

- Verify code-level invariants, types, linting, and focused automated tests where available.
- I will notify you for manual UI verification only after the implementation is ready, with exact account, toggle state, screens, and network expectations to check.
- Manual testing must cover off → on → off and both owner and staff-user experiences.

### Phase 5 — Extend the same architecture

After Dealer is accepted, add module-specific feature definitions for Farmer, Hatchery, Company, and future modules as required.

- Reuse the feature registry, account override model, feature-gated navigation, conditional provider/query pattern, and audit conventions.
- Keep account data isolated. Do not introduce cross-account workflows, synchronization, or new connection flows.
- Only add module-specific code where the module’s actual staff or activity behaviour differs.

### Phase 6 — Admin account usage data

After feature controls are stable, enrich Admin account details with actual account-owned usage counts.

- Fetch count-only usage summaries from the backend; do not expose unnecessary customer records.
- Initial counts should be role-appropriate, such as companies, farmers, farms, batches, Dealer records/parties, and other relevant owned entities.
- Keep subscription status/checking manual for now.
- Do not add automatic billing, limits, plan enforcement, or subscription recalculation in this work.

## Definition of done for today

1. Super Admin can turn **Dealer Staff Operations** on or off for a Dealer from that account’s Admin details page.
2. With the feature off, the Dealer UI hides the bundled staff/activity functionality and makes no staff/activity-specific network requests or connections.
3. With the feature on, the Dealer owner can use staff management, staff-user access, and activity history normally; staff users still cannot view or export activity history.
4. Meaningful successful Dealer staff actions are attributable in immutable business audit records without sensitive/noisy data.
5. The implementation uses the shared feature-control architecture and does not create a Dealer-only dead end.
6. Automated/code-level checks pass, and I provide a concise manual UI test checklist for you before calling the phase accepted.

## Explicit non-goals for today

- Redesigning or physically merging Staff, StaffUser, and BusinessAuditLog data models.
- Automatic billing, plan limits, or subscription recalculation.
- New cross-account sales, payment, balance-sync, consignment, or connection workflows.
- Deleting existing staff users, payroll records, or audit history when a feature is disabled.
- A full feature-toggle security/route-hardening project beyond existing authorization checks.
