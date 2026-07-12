# Connection Workflow Removal Plan

## Goal

Poultry360 is removing connection-driven workflows because the current connection, consignment, and payment-request flows have become too complex and unusable for users. The product direction is to move these areas toward simpler manual operations.

This document is a high-level roadmap only. Detailed implementation plans should be created phase by phase when execution starts.

## Current Decision

- Remove end-to-end connection-driven workflows.
- Remove connection-dependent consignments and payment-request flows.
- Replace them with manual flows handled directly by users.
- Keep this document high level and use it as the main progress tracker for future conversations.

## Progress Tracker

| Phase | Area | Status | Notes |
|------|------|--------|-------|
| Phase 1 | Farmer -> Dealer connection cleanup | DONE | Main frontend and backend access paths have been removed or disabled |
| Phase 2 | Dealer -> Farmer flow cleanup | DONE | Dealer customer, sales, payment-request, and farmer-account cleanup has mostly been completed |
| Phase 3 | Dealer -> Company flow cleanup | STARTING | Dealer company dashboard cleanup has started and connection-era company UI is being removed |
| Phase 4 | Company -> Dealer flow cleanup | TODO | Final cleanup and regression pass |

## Phase 1: Farmer -> Dealer Connection Cleanup

- Remove farmer-to-dealer connection and verification behavior.
- Remove connection-based farmer request flows tied to dealer approval.
- Replace these flows with direct manual handling where the farmer does not depend on connection approval.
- Farmer supplier-ledger UI has been simplified toward manual-only usage.
- Farmer-side supplier actions now prefer direct purchase/payment handling instead of connection-driven request flows.
- Farmer/dealer verification routes have been disabled at the backend and left in place as explicit placeholders for frontend cleanup tracking.
- Farmer purchase-request, farmer cart, and farmer/dealer payment-request routes have been disabled at the backend and left in place as explicit placeholders.
- Dealer routes used by the farmer supplier-ledger now return only manual supplier data and no longer serve farmer-dealer connection behavior.
- Shared connection/request controllers for removed farmer-side flows have been deleted where they were no longer needed.
- Verify farmer and dealer dashboards still load without broken cards, counts, or action buttons.
- Verify manual farmer/dealer interaction paths still work end to end.
- Identify related backend rules that can be simplified once the replacement flow is confirmed.
- Track data/model cleanup for later if records must be preserved temporarily.
- Update or remove tests that depend on farmer/dealer connection or approval flows.

## Phase 2: Dealer -> Farmer Flow Cleanup

- Remove dealer-side workflows that assume a connected farmer relationship.
- Remove request-based dealer-to-farmer sales or payment approval behavior.
- Replace dealer actions with direct manual entry and confirmation where needed.
- Dealer customer list and customer account pages have been simplified toward manual-only customer handling.
- Dealer home page has been cleaned of old verification/request status UI.
- Dealer sales list and sale detail pages have been cleaned of connected farmer / farmer-account UI branches.
- Dealer-side farmer payment-request and farmer-account route surfaces have been disabled and left as explicit placeholders where useful for frontend cleanup tracking.
- Dealer sales backend now creates and lists only manual customer sales on the main route surface and no longer creates dealer-to-farmer sale requests from those routes.
- Historical connected/account-based sale behavior is being isolated rather than reused by the manual sales flow.
- Verify sales, ledger, and inventory behavior still work after request-flow removal.
- Verify dealer customer management still works for manual farmer/customer records.
- Identify backend validation rules that still assume a connected farmer.
- Track schema/model cleanup for later after behavior is stabilized.
- Update or remove tests tied to dealer-to-farmer request flows.

## Phase 3: Dealer -> Company Flow Cleanup

- Remove dealer-to-company connection and verification behavior.
- Remove dealer-initiated request flows tied to connected company relationships.
- Replace company sourcing or ordering actions with direct manual workflows.
- Dealer company account page has started moving away from request-based payment submission and toward direct payment recording.
- Dealer company dashboard has started shifting into a manual-company hub instead of a mixed manual + connected + verification-request screen.
- Connected company cards, verification request UI, and related dashboard entry points are being removed from the main dealer company page.
- Some dealer-side connected company frontend files and fetchers have already been deleted in the repo and should be treated as part of this cleanup wave.
- Verify dealer pages still support manual company handling without dead actions.
- Verify account, ledger, and purchase/supply behavior still work after flow simplification.
- Identify backend rules that still require a connected company before action is allowed.
- Track model and history cleanup for later if temporary compatibility is needed.
- Update or remove tests tied to dealer-to-company connection/request flows.

## Phase 4: Company -> Dealer Flow Cleanup

- Remove company-side workflows that depend on connected dealers.
- Remove company-side consignment and payment-request flows tied to connection logic.
- Replace these actions with direct manual sales, account, or payment handling.
- Verify company dashboards, dealer lists, and operational pages still work without connection actions.
- Verify ledger, inventory, and sales behavior still work after request-based flow removal.
- Identify backend rules, statuses, and side effects that are no longer needed.
- Track final schema/data cleanup once all replacement flows are active.
- Update or remove tests tied to company-to-dealer connection and request flows.

## Do Not Break

- Authentication and role-based routing must continue to work.
- Manual customer and manual dealer flows must continue to work.
- Sales and ledger behavior must still be correct after request-flow removal.
- Inventory updates must still work correctly.
- Dashboards must not show broken empty states, wrong counts, or dead actions.
- Navigation, buttons, labels, and translations must not reference removed connection flows.
- Any remaining side effects linked to old request workflows must be checked before removal.

## Validation Approach

- Each phase must confirm the affected role dashboards still load correctly.
- Each phase must confirm the replacement manual flow is usable end to end.
- Each phase must confirm removed request and connection actions are no longer reachable.
- Backend tests tied to obsolete request flows should be removed or rewritten.
- Regression checks should focus on manual sales, payments, ledger, inventory, and dashboard usability.

## Open Questions For Future Phases

- Which models should be fully deleted versus kept temporarily unused?
- Should old request history remain visible for reference or audit?
- Should consignment logic be fully removed or retained in a smaller manual/internal form?
- Should payment requests be removed entirely and replaced with direct payment entry only?
- Are there any role-specific reports or analytics that still depend on old connection-based states?
- When moving into dealer -> farmer cleanup, should remaining placeholder routes stay as `410` markers until frontend removal is complete, or should they be fully removed in the same phase?
- Use this document as the restart point for the next conversation; it should remain the compact status source for phase progress and major cleanup decisions.
