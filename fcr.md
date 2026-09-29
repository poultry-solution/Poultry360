# FCR review report

This report explains how Feed Conversion Ratio (FCR) works in the Farmer module today.

No code was changed during this review.

## What FCR means

FCR normally means:

```text
feed used ÷ bird weight gained
```

The current batch page uses this formula:

```text
Initial weight = initial chicks × 0.05 kg

Current birds = initial chicks - sale mortality - other mortality

Current live weight = latest average bird weight × current birds

Weight gain = max(0, current live weight - initial weight)

FCR = total feed used ÷ weight gain
```

The value `0.05 kg` means 50 grams per day-old chick.

The database comment describes a different formula: feed used divided by current live weight. The real code uses weight gain instead. See [schema.prisma:1540](/home/sidd/ideas/Poultry360/apps/backend/prisma/schema.prisma:1540) and [batchController.ts:1469](/home/sidd/ideas/Poultry360/apps/backend/src/controller/batchController.ts:1469).

## Data flow

1. The farmer records feed through an expense.
2. The backend creates a `FeedConsumption` row either from selected feed inventory or from the Feed expense quantity.
3. Batch analytics adds all feed quantities for the batch.
4. The latest `BirdWeight` row is selected by date.
5. Mortality rows are used to work out the bird count.
6. The API returns `fcr`, `fcrData`, and, for completed broiler batches, `fcrAfterSales`.
7. The batch page shows FCR rounded to two decimal places.

Main files:

- Feed creation: [expenseController.ts:495](/home/sidd/ideas/Poultry360/apps/backend/src/controller/expenseController.ts:495)
- Feed model: [schema.prisma:1319](/home/sidd/ideas/Poultry360/apps/backend/prisma/schema.prisma:1319)
- Weight model: [schema.prisma:1334](/home/sidd/ideas/Poultry360/apps/backend/prisma/schema.prisma:1334)
- Mortality model: [schema.prisma:1240](/home/sidd/ideas/Poultry360/apps/backend/prisma/schema.prisma:1240)
- Batch analytics route: [batchRoutes.ts:50](/home/sidd/ideas/Poultry360/apps/backend/src/router/batchRoutes.ts:50)
- Batch analytics API call: [batchQueries.ts:100](/home/sidd/ideas/Poultry360/apps/frontend/src/fetchers/batches/batchQueries.ts:100)
- FCR display: [OverviewTab.tsx:138](/home/sidd/ideas/Poultry360/apps/frontend/src/components/batches/tabs/OverviewTab.tsx:138)

## Important findings

### 1. Closed batches can show no current FCR

When a batch is closed, the remaining birds are recorded as `BATCH_CLOSURE` mortality.

The FCR queries exclude only `SLAUGHTERED_FOR_SALE`. They do not exclude `BATCH_CLOSURE`.

This can produce:

```text
current birds = 0
current weight = 0
weight gain = 0
FCR = null
```

This affects both the batch detail calculation and the dashboard batch-performance calculation.

### 2. After-sales FCR is not a full final FCR

The current after-sales formula is:

```text
total feed ÷ (total sold weight - initial total chick weight)
```

It does not include:

- Birds still present when the batch was closed
- Weight of birds that died
- The correct initial weight for only the sold birds

Example:

```text
100 chicks
5 natural deaths
20 birds sold at 2 kg = 40 kg sold weight
75 birds closed
500 kg feed
initial weight = 100 × 0.05 = 5 kg

Current after-sales FCR = 500 ÷ (40 - 5) = 14.29
```

This is not a valid full-flock final FCR because the 75 closed birds are ignored.

Code: [batchController.ts:1524](/home/sidd/ideas/Poultry360/apps/backend/src/controller/batchController.ts:1524)

### 3. Sale edits can leave old weight data

A chicken sale creates:

- A sale row
- A mortality row
- A bird-weight row based on the sold birds

But:

- Editing a sale does not update its mortality count.
- Editing a sale does not update its generated bird weight.
- Deleting a sale removes the mortality row but not the generated bird-weight row.

This can make FCR use old weight or old bird-count data.

Code: [salesController.ts:1056](/home/sidd/ideas/Poultry360/apps/backend/src/controller/salesController.ts:1056)

### 4. The latest weight may belong to sold birds

The calculation selects the newest weight record only.

A sale-generated weight represents the sold birds. The FCR code may then multiply that weight by the remaining live birds. This can give the wrong current live weight.

### 5. Feed rows are not linked to expenses

`FeedConsumption` has no `expenseId`.

Possible effects:

- Editing an expense does not update feed consumption.
- Changing the expense date does not update feed consumption.
- Changing the expense quantity leaves the old feed row.
- Deleting one feed expense can delete all feed rows for that batch and date.

Two feed expenses on the same date can therefore be removed together. This can make FCR too low.

Code: [expenseController.ts:890](/home/sidd/ideas/Poultry360/apps/backend/src/controller/expenseController.ts:890)

### 6. Feed units are not enforced

`FeedConsumption.quantity` has no unit field.

An inventory item may use `kg`, `bag`, `sack`, or another unit. FCR needs feed weight, normally kilograms, but the code simply adds the stored numbers.

The batch-share page assumes the value is kilograms: [batchShareController.ts:52](/home/sidd/ideas/Poultry360/apps/backend/src/controller/batchShareController.ts:52).

If a farmer records feed in bags, the FCR is not valid.

### 7. FCR has no date range

The main FCR queries use all rows for the batch. They do not limit data to:

```text
batch start date through batch end date
```

Feed, mortality, sales, or weights recorded before the batch or after it ended can change the result.

### 8. Different APIs use different mortality rules

The batch detail API uses:

```text
initial birds - sale mortality - all other mortality
```

The dashboard batch-performance API uses:

```text
initial birds - mortality where reason is not SLAUGHTERED_FOR_SALE
```

The dashboard version includes `BATCH_CLOSURE`, so the same batch can show different bird counts and FCR values in different places.

### 9. Dashboard FCR is also calculated for Layer batches

The batch detail page shows FCR only for Broiler batches.

The dashboard batch-performance endpoint does not filter out Layer batches before calculating FCR.

Also, the overall dashboard `feedConversionRatio` is hard-coded to `0`.

Code: [dashboardController.ts:1146](/home/sidd/ideas/Poultry360/apps/backend/src/controller/dashboardController.ts:1146) and [dashboardController.ts:686](/home/sidd/ideas/Poultry360/apps/backend/src/controller/dashboardController.ts:686).

### 10. Sample count is ignored

`BirdWeight.sampleCount` is stored but not used in FCR.

The calculation assumes the average weight from a small sample represents every current bird.

### 11. Duplicate and tie risks exist

The database does not prevent:

- Multiple feed rows for the same date
- Multiple weight rows for the same date
- Multiple sale-generated weight rows
- Duplicate requests creating duplicate feed records

If two weight rows have the same date, the selected latest row may not be predictable because there is no second sort field.

### 12. Rounding is different in different places

- Feed and sale weight use two decimal places.
- Average weight uses two decimal places.
- Batch analytics returns the raw FCR number.
- The batch page rounds it to two decimals.
- Dashboard performance rounds it in the backend and returns a string.

The displayed value may look the same while the underlying values are slightly different.

### 13. Missing and zero values

The current code returns no FCR when:

- No weight exists
- Feed total is zero or negative
- Weight gain is zero or negative

Negative weight gain is silently changed to zero with `max(0, value)`. This hides bad data instead of showing a data error.

The database does not enforce positive feed quantity, so direct or old records with zero or negative values can still affect totals.

### 14. Shared API type does not match the real response

The backend returns fields such as:

```text
currentAvgWeight
totalFeedConsumption
fcrAfterSales
```

The shared type expects `avgWeight` and does not define all returned fields. It also does not allow the backend status `not_applicable`.

Source: [index.ts:1400](/home/sidd/ideas/Poultry360/packages/shared-types/src/index.ts:1400)

The current frontend uses the raw response, so this may not fail today. It can fail later if the shared schema is used for validation.

## Example of the active-batch calculation

```text
Initial chicks: 100
Natural deaths: 5
Sold birds: 0
Latest average weight: 2.00 kg
Feed consumed: 190 kg

Initial weight = 100 × 0.05 = 5 kg
Current birds = 100 - 5 = 95
Current live weight = 95 × 2.00 = 190 kg
Weight gain = 190 - 5 = 185 kg

FCR = 190 ÷ 185 = 1.03
```

This result is reasonable only when:

- All feed quantities are kilograms.
- The latest weight represents the remaining live birds.
- All records belong to the batch period.
- Feed rows are not duplicated or stale.

## Farmer analytics page

The Farmer analytics page does not currently show FCR directly.

It shows feed totals and feed trends. Its feed and mortality date filters are not the same as the batch FCR API. For example, the flock comparison feed total is not limited by the selected date range, while the operations feed trend is date-filtered.

Relevant code: [farmerAnalyticsController.ts:736](/home/sidd/ideas/Poultry360/apps/backend/src/controller/farmerAnalyticsController.ts:736) and [farmerAnalyticsController.ts:958](/home/sidd/ideas/Poultry360/apps/backend/src/controller/farmerAnalyticsController.ts:958).

## Final assessment

The current FCR is a rough estimate for an active Broiler batch. It should not be treated as a reliable final production FCR.

The highest-risk problems are:

1. `BATCH_CLOSURE` is counted as mortality.
2. After-sales FCR ignores remaining birds.
3. Sale edits and deletes can leave stale weight data.
4. Feed rows can become stale or be deleted in groups.
5. Feed units are not enforced.
6. Different APIs use different rules.
