# Test findings

## Open

### Supplier transaction values use text instead of numbers

- Area: Farmer supplier ledger API
- Endpoint: `GET /api/v1/dealers/:id/transactions`
- Severity: Low
- Found: 2026-10-18

`amount`, `quantity`, and `unitPrice` are returned as text values such as
`"500"` and `"5"`. The shared API types define these fields as numbers.
This can break an API user that performs number work without converting them
first.

Suggested fix: convert Prisma decimal fields to numbers before returning the
transaction rows.

### Sales ledger sends number fields as text

- Area: Farmer sales ledger API
- Endpoints: `POST /api/v1/sales`, `GET /api/v1/sales/:id`, and customer data
- Severity: Low
- Found: 2026-10-18

The API sends Prisma decimal fields as text values such as `"600"`, even
though the shared `Sale` API type says `amount`, `quantity`, `weight`,
`paidAmount`, `dueAmount`, and customer `balance` are numbers. The web app
works around this in many places with `Number(...)`, but another API user can
get wrong results if it forgets to convert.

Suggested fix: map decimal fields to numbers in all sales and customer API
responses, or change the shared API types to clearly say they are strings.

### Batch creation reports stock mistakes as a server error

- Area: Farmer batch creation API
- Endpoint: `POST /api/v1/batches`
- Severity: Medium
- Found: 2026-10-18

The batch controller throws an error when a selected chicks item has too little
stock. Its outer error handler sends this back as `500 Internal server error`.
This is a normal user input problem and should return a clear `400` or `409`
response instead. This was confirmed by the API test; no batch, usage, or stock
change was made after the failed request.

Suggested fix: use a typed request error for stock and allocation checks, then
map it to a `4xx` response in the controller.

### Inventory transaction endpoint rejects all JSON dates

- Area: Farmer inventory API
- Endpoint: `POST /api/v1/inventory/:itemId/transactions`
- Severity: Medium
- Found: 2026-10-18

The request schema requires a JavaScript `Date` value. A normal HTTP JSON
request can send only a date string such as `"2026-10-18T00:00:00.000Z"`, which
is rejected with `400` before a transaction can be created. The route comment
says it is for testing, but it cannot be used through the API.

Suggested fix: accept an ISO date string in the request schema and convert it
to `Date` in the controller.
