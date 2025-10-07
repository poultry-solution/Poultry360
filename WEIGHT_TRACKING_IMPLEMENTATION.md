# Weight Tracking System Implementation

## Overview
This document outlines the implementation of the batch weight tracking system that replaces the static `initialWeight` field with a dynamic `currentWeight` field and maintains a complete weight history for growth analysis.

---

## Database Schema Changes

### 1. Batch Model Updates
**File:** `apps/backend/prisma/schema.prisma`

#### Removed:
- `initialChickWeight` - Static initial weight field

#### Added:
- `currentWeight` - Decimal (6,2), nullable
  - Denormalized field for quick access to latest weight
  - Automatically updated when new weight records are added
  - Computed from sales when sales exist
  - Manually entered when no sales exist

---

### 2. BirdWeight Model Enhancements

#### New Fields:
```prisma
model BirdWeight {
  id          String       @id @default(cuid())
  date        DateTime
  avgWeight   Decimal      @db.Decimal(6, 2)  // kg per bird
  sampleCount Int          // Number of birds weighed
  source      WeightSource @default(MANUAL)   // NEW: Track data source
  notes       String?      // NEW: Optional notes
  batchId     String
  batch       Batch
  createdAt   DateTime
  updatedAt   DateTime
}
```

#### New Enum:
```prisma
enum WeightSource {
  MANUAL   // Farmer manually entered weight
  SALE     // Computed from sale transactions
  SYSTEM   // System-calculated estimate
}
```

---

## Backend Implementation

### Controllers Needed

#### 1. `addBirdWeight` - Manual Weight Entry
**Endpoint:** `POST /api/batches/:batchId/weights`

**Request Body:**
```typescript
{
  date: Date,
  avgWeight: number,      // kg per bird
  sampleCount: number,    // birds weighed
  notes?: string
}
```

**Logic:**
1. Validate batch exists and user has access
2. Create BirdWeight record with `source: MANUAL`
3. Update batch's `currentWeight` with the new value
4. Return the created weight record

---

#### 2. `getBirdWeights` - Fetch Weight History
**Endpoint:** `GET /api/batches/:batchId/weights`

**Query Params:**
- `startDate` (optional): Filter from date
- `endDate` (optional): Filter to date
- `source` (optional): Filter by source type

**Response:**
```typescript
{
  weights: [
    {
      id: string,
      date: Date,
      avgWeight: number,
      sampleCount: number,
      source: "MANUAL" | "SALE" | "SYSTEM",
      notes: string,
      createdAt: Date
    }
  ],
  currentWeight: number,  // Latest weight
  growthRate: number,     // kg per day average
  totalGrowth: number     // kg gained since first record
}
```

**Logic:**
1. Fetch all BirdWeight records for the batch
2. Sort by date (newest first)
3. Calculate growth metrics:
   - Growth rate = (latest - earliest) / days
   - Total growth = latest - earliest
4. Return weights and analytics

---

#### 3. `updateBirdWeight` - Edit Weight Record
**Endpoint:** `PUT /api/batches/:batchId/weights/:weightId`

**Request Body:**
```typescript
{
  avgWeight?: number,
  sampleCount?: number,
  notes?: string,
  date?: Date
}
```

**Logic:**
1. Validate weight record exists and user has access
2. Only allow updating MANUAL entries
3. Update the weight record
4. If this was the latest weight, update batch's `currentWeight`

---

#### 4. Update Sale Controller
**File:** `apps/backend/src/controller/saleController.ts`

**Modify `createSale` function:**

When a sale is created:
1. Calculate average weight: `totalWeight / quantity`
2. Create a BirdWeight record with:
   ```typescript
   {
     date: saleDate,
     avgWeight: totalWeight / quantity,
     sampleCount: quantity,
     source: "SALE",
     notes: `Auto-computed from sale #${saleId}`
   }
   ```
3. Update batch's `currentWeight` to this new value

---

## Frontend Implementation

### 1. Weight Entry Form
**Location:** Batch detail page - Growth/Weight tab

**UI Components:**
```typescript
// Manual weight entry form
<WeightEntryForm>
  <DatePicker label="Date" />
  <NumberInput label="Average Weight (kg)" step={0.01} />
  <NumberInput label="Sample Count" />
  <Textarea label="Notes (optional)" />
  <Button>Record Weight</Button>
</WeightEntryForm>
```

---

### 2. Weight History Table
**Display:**
- Date
- Weight (kg)
- Sample Size
- Source (Badge: Manual/Sale/System)
- Notes
- Actions (Edit for MANUAL entries)

**Features:**
- Sort by date
- Filter by source
- Export to CSV
- Visual indicators for data source

---

### 3. Growth Chart
**Visualization:**
- Line chart showing weight over time
- X-axis: Date
- Y-axis: Weight (kg)
- Different colors for different sources:
  - Manual: Blue
  - Sale: Green
  - System: Gray
- Growth rate annotation
- Trend line

**Metrics Panel:**
```typescript
<MetricsCard>
  Current Weight: {currentWeight} kg
  Growth Rate: {growthRate} kg/day
  Total Growth: {totalGrowth} kg
  Days Active: {daysActive}
  Records: {weightCount}
</MetricsCard>
```

---

### 4. Batch Overview Integration
**Location:** Batch detail header

```typescript
// Show current weight with indicator
<CurrentWeightDisplay>
  {currentWeight ? (
    <>
      <Weight>{currentWeight} kg</Weight>
      <LastUpdated>
        {latestWeightSource === "SALE" 
          ? "From latest sale" 
          : "Manually recorded"
        }
      </LastUpdated>
    </>
  ) : (
    <EmptyState>
      <Button onClick={openWeightForm}>
        Record First Weight
      </Button>
    </EmptyState>
  )}
</CurrentWeightDisplay>
```

---

## Business Logic

### Current Weight Determination

**Priority Order:**
1. **If sales exist:** Use latest sale's computed weight
2. **If manual weights exist:** Use latest manual entry
3. **If no data:** Show empty state, prompt for input

### Automatic Updates

**When Sale is Created:**
```typescript
1. Compute avgWeight = saleWeight / soldBirds
2. Create BirdWeight record (source: SALE)
3. Update batch.currentWeight = avgWeight
```

**When Manual Weight is Added:**
```typescript
1. Create BirdWeight record (source: MANUAL)
2. If no sales after this date:
   - Update batch.currentWeight = avgWeight
3. Else:
   - Keep currentWeight from latest sale
```

**When Weight is Deleted:**
```typescript
1. Delete BirdWeight record
2. Recalculate batch.currentWeight from remaining records
3. Use latest record by date
```

---

## Growth Analytics

### Key Metrics

**1. Growth Rate (kg/day)**
```typescript
const firstWeight = weights[weights.length - 1]
const lastWeight = weights[0]
const days = daysBetween(firstWeight.date, lastWeight.date)
const growthRate = (lastWeight.avgWeight - firstWeight.avgWeight) / days
```

**2. Average Daily Gain (ADG)**
```typescript
const adg = totalGrowth / daysActive
```

**3. Expected Weight (Projection)**
```typescript
const expectedWeight = currentWeight + (growthRate * daysUntilTarget)
```

**4. Growth Consistency**
```typescript
// Standard deviation of growth rates between consecutive measurements
const consistency = calculateStandardDeviation(growthRates)
```

---

## API Routes

### New Routes
```typescript
// Weight management
POST   /api/batches/:batchId/weights          // Add weight record
GET    /api/batches/:batchId/weights          // Get weight history
PUT    /api/batches/:batchId/weights/:id      // Update weight
DELETE /api/batches/:batchId/weights/:id      // Delete weight

// Analytics
GET    /api/batches/:batchId/growth-analytics // Growth metrics
GET    /api/batches/:batchId/weight-chart     // Chart data
```

---

## Migration Plan

### Step 1: Database Migration
```bash
cd apps/backend
npx prisma migrate dev --name add_weight_tracking_system
```

This will:
- Add `currentWeight` to Batch
- Remove `initialChickWeight` from Batch
- Add `source` and `notes` to BirdWeight
- Create `WeightSource` enum

### Step 2: Data Migration Script
Create a script to migrate existing data:

```typescript
// migrate-weights.ts
async function migrateWeights() {
  const batches = await prisma.batch.findMany({
    include: { birdWeights: true, sales: true }
  })
  
  for (const batch of batches) {
    let currentWeight = null
    
    // If sales exist, use latest sale
    if (batch.sales.length > 0) {
      const latestSale = batch.sales.sort((a, b) => 
        b.date.getTime() - a.date.getTime()
      )[0]
      
      currentWeight = latestSale.weight / latestSale.quantity
      
      // Create weight record from sale
      await prisma.birdWeight.create({
        data: {
          batchId: batch.id,
          date: latestSale.date,
          avgWeight: currentWeight,
          sampleCount: latestSale.quantity,
          source: "SALE",
          notes: "Migrated from sale data"
        }
      })
    }
    // Otherwise use latest manual weight if exists
    else if (batch.birdWeights.length > 0) {
      const latest = batch.birdWeights.sort((a, b) => 
        b.date.getTime() - a.date.getTime()
      )[0]
      currentWeight = latest.avgWeight
    }
    
    // Update batch with current weight
    await prisma.batch.update({
      where: { id: batch.id },
      data: { currentWeight }
    })
  }
}
```

### Step 3: Backend Implementation
1. Create weight controller
2. Add routes
3. Update sale controller
4. Add validation schemas

### Step 4: Frontend Implementation
1. Add weight entry form
2. Create weight history table
3. Build growth chart
4. Update batch overview

---

## Benefits

1. **Historical Tracking**: Complete weight history for analysis
2. **Growth Analytics**: Calculate growth rates, ADG, projections
3. **Data Source Transparency**: Know where each weight came from
4. **Flexibility**: Manual entry + automatic from sales
5. **Performance**: Denormalized currentWeight for quick access
6. **Audit Trail**: Track all weight changes with timestamps

---

## Future Enhancements

1. **AI/ML Predictions**: Predict future weights based on growth trends
2. **Benchmarking**: Compare against breed standards
3. **Alerts**: Notify if growth rate drops below threshold
4. **Batch Comparison**: Compare growth across batches
5. **Export Reports**: PDF/Excel reports with growth analytics
6. **Mobile App**: Quick weight entry from farm
7. **Integration**: Connect with smart scales for automatic recording

---

## Notes

- All weights stored in kilograms (kg)
- Weight precision: 2 decimal places (0.01 kg = 10g)
- Dates stored with time for accurate sorting
- Source field enables filtering and trust scoring
- Notes field for context (feed change, disease, etc.)

