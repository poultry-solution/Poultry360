You are working on the Poultry360 audit and action-tracking feature.

The goal is to record meaningful human actions so business owners and administrators can investigate who did what, when, and to which record. This is not intended to be a general debug log.

Visibility:
- Staff activity is visible only to the relevant business owner.
- An owner/user can see the actions performed by users below them within their account scope.
- Owners can see all audit activity belonging to their account.
- Super Admin can see audit activity across all accounts and all admin actions.
- Anyone who can view a set of audit records can export those records from the UI.
- Staff cannot view their own audit history.

Audit records should be immutable and should contain structured, useful information such as actor, actor type/role, account scope, action, target entity and ID, relevant safe values such as amount or quantity when applicable, timestamp, and a concise action description. Do not store passwords, tokens, credentials, or sensitive secrets. Do not add full before/after snapshots for now.

Only successful, meaningful business actions should be audited. Do not audit page views, exports, failed actions, token refreshes, expired sessions, notifications, or other system-generated activity. Login/logout auditing is a later phase.

The work should be delivered in phases:

Phase 1 — Core business audit trail:
- Staff actions visible to the Dealer owner.
- User/owner actions visible according to account hierarchy.
- Super Admin visibility across all accounts.
- Cover important actions such as sales, payments, balance changes, inventory changes, Broiler settlements, staff management/permission changes, and relevant admin actions.
- Records are immutable.
- Logs older than 10 days are archived. Archived logs do not need to be shown in the normal owner UI, but access should not be unnecessarily blocked at this stage.
- Users who can view logs can export them from the UI in CSV, Excel, and PDF formats.

Phase 2 — Chat auditing:
- Audit successful message sent and message deleted actions.
- Include the actor, conversation/message reference, account scope, timestamp, and relevant safe metadata.
- Do not audit every chat read/view event.

Phase 3 — Authentication auditing:
- Add admin-visible login and logout records.
- Admins should be able to identify which user or staff member logged in or logged out, their actor type, and the time.
- Do not include token refreshes, expired sessions, or failed authentication attempts.
- Do not expose authentication logs to normal users or staff.

Phase 4 — Device and location metadata:
- Add automatically available metadata such as IP address, browser/device information, and estimated location where practical.
- This is intended for future misuse investigation and operational features such as finding nearby dealers.
- No user-entered device/location information is required.
- This phase is postponed until the earlier audit phases are complete.

Keep the first implementation minimal, account-scoped, privacy-conscious, and extensible so additional audited actions and metadata can be added later without redesigning the whole feature.

---

## Phase 2 — Minimal Chat Audit Implementation Plan

**Goal:** Add only two immutable activity events: a successful message send and a successful
message delete. Do not change chat behaviour or add a separate chat-audit screen.

### Scope

- Reuse `BusinessAuditLog`; no new audit table, permission, or export format is needed.
- Instrument only `POST /messages` and `DELETE /messages/:messageId` in
  `messageController`.
- A successful send writes `chat.message.sent`. A successful soft delete writes
  `chat.message.deleted`.
- Use `businessType: "CHAT"`, `businessId: conversationId`, `targetType: "Message"`, and
  `targetId: messageId`. The actor and account scope come from the authenticated sender.
- Store safe metadata only: message type, whether the message has text, whether it has an
  attachment, attachment size when available, and deletion state. Never store message text,
  attachment URLs/keys, filenames, tokens, or message contents.

### Behaviour and visibility

- Create the message/soft-delete and its audit event in the same database transaction. Broadcast
  the socket event only after that transaction succeeds.
- Do not audit reads, message fetches/searches, edits, attachment uploads, failed sends/deletes,
  socket broadcasts, or exports.
- Existing 10-day archival applies automatically.
- Super Admin can already see these events in the global Activity page. The event is scoped to the
  sending user's account for future account activity views. Do not add Farmer/Doctor activity
  pages in this minimal phase; Dealer staff are not chat participants in the current chat model.

### Checks

- A sent text message and a sent attachment message each create one safe audit event.
- A successful delete creates one event; a failed or repeated delete creates none.
- Audit rows contain the correct actor, conversation ID, message ID, action, and timestamp, but
  contain no message content or attachment reference.
- Run backend build and a focused message-controller/API test after implementation.

---

## Phase 3 — Authentication Audit Implementation Plan

**Goal:** Record only completed normal-user and Dealer-staff logins and authenticated logouts in
the existing immutable audit trail.

- Reuse `BusinessAuditLog`; do not add a new table or store passwords, tokens, refresh cookies,
  session IDs, IP addresses, browser data, or location data.
- Write `auth.login.succeeded` only after valid normal-user or staff credentials. Write
  `auth.logout.succeeded` only after a valid bearer token identifies the normal user or staff
  member. Do not audit registration, refreshes, expired sessions, failed authentication, or
  unauthenticated logout requests.
- Login and logout events identify the actor and use `User` or `StaffUser` as the target. Staff
  events retain the owning Dealer account scope.
- Authentication events are available only through the Super Admin Activity page and its exports.
  Dealer-owner activity queries and exports permanently exclude `auth.*` events; staff remains
  unable to access activity history.

---

## Phase 4 — Sign-in Security Metadata

- Successful normal-user and Dealer-staff sign-ins store only IP address, browser family,
  operating-system family, device type, and optional country/region from explicitly trusted
  infrastructure headers. No logout or ordinary business action stores this metadata.
- Security metadata is a separate one-to-one record for the immutable authentication audit event.
  It is available only to Super Admin, is exportable from the existing Admin Activity page, and is
  permanently deleted after 30 days while the audit event remains.
- No raw user-agent, device ID, browser version, precise location, client geolocation, or external
  geo-IP lookup is used. Trusted location headers are ignored unless `TRUST_PROXY_HOPS` is enabled.


  Phase 4 — Device and location metadata:
- Add automatically available metadata such as IP address, browser/device information, and estimated location where practical.
- This is intended for future misuse investigation and operational features such as finding nearby dealers.
- No user-entered device/location information is required.
- This phase is postponed until the earlier audit phases are complete.
