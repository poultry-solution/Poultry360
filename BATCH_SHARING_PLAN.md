# Batch/Farm Data Sharing Feature - Implementation Plan

## 📋 Overview
Enable farmers to share detailed batch/farm data with doctors during chat consultations, allowing doctors to provide data-driven recommendations based on real metrics (feed consumption, medicine usage, mortality rates, etc.).

## 🎯 Core Requirements
1. Farmers can share batch snapshots with doctors via chat
2. Doctors can view comprehensive batch data without database access
3. Shared data is immutable (snapshot, not live)
4. Shareable via direct link (like ChatGPT share feature)
5. Secure access control
6. Beautiful, read-only data visualization

---

## 🏗️ Architecture Design

### Approach: **Hybrid Model** (Best of Both Worlds)

**In-Chat Preview + Dedicated Share Page**

#### Why This Approach?
1. **Immediate Context** - Preview in chat keeps conversation flowing
2. **Deep Analysis** - Full page for comprehensive review
3. **Shareable** - Unique URL for persistent access
4. **Performance** - Don't overload chat with heavy data
5. **Flexibility** - Can be shared outside chat too

---

## 📊 Data Structure

### New Database Models

```prisma
// Shareable batch snapshots
model BatchShare {
  id              String        @id @default(cuid())
  shareToken      String        @unique @default(cuid()) // Public-safe token
  batchId         String
  farmerId        String        // Who created the share
  sharedWithId    String?       // Optional: specific doctor
  conversationId  String?       // Optional: linked to conversation
  messageId       String?       // Optional: linked to message
  
  // Snapshot data (immutable JSON)
  snapshotData    Json          // Full batch data at time of share
  
  // Metadata
  title           String?       // Optional custom title
  description     String?       // Optional note from farmer
  isPublic        Boolean       @default(false) // Public vs private link
  expiresAt       DateTime?     // Optional expiration
  viewCount       Int           @default(0)
  
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  // Relations
  batch           Batch         @relation(fields: [batchId], references: [id])
  farmer          User          @relation("BatchShareOwner", fields: [farmerId], references: [id])
  sharedWith      User?         @relation("BatchShareRecipient", fields: [sharedWithId], references: [id])
  conversation    Conversation? @relation(fields: [conversationId], references: [id])
  
  // Analytics
  views           BatchShareView[]
  
  @@index([shareToken])
  @@index([batchId])
  @@index([conversationId])
}

// Track who viewed the shared data
model BatchShareView {
  id            String      @id @default(cuid())
  shareId       String
  viewerId      String?     // Null if anonymous
  ipAddress     String?
  userAgent     String?
  viewedAt      DateTime    @default(now())
  
  share         BatchShare  @relation(fields: [shareId], references: [id], onDelete: Cascade)
  viewer        User?       @relation("BatchShareViewer", fields: [viewerId], references: [id])
  
  @@index([shareId])
}

// Enhanced Message model
enum MessageType {
  TEXT
  IMAGE
  FILE
  BATCH_SHARE      // New type for batch shares
  FARM_SHARE       // New type for farm shares
}

// Add to Message model
model Message {
  // ... existing fields ...
  
  // New optional reference
  batchShareId    String?
  batchShare      BatchShare? @relation(fields: [batchShareId], references: [id])
}
```

---

## 🔄 User Flow

### Farmer Side (Owner)

```
1. In chat with doctor
2. Click "Share Batch Data" button (📊 icon)
3. Modal opens:
   ├─ Select batch from dropdown
   ├─ Optional: Add title/note
   ├─ Choose expiration (Never, 1 day, 7 days, 30 days)
   └─ Click "Share"
4. System creates:
   ├─ Snapshot of current batch data
   ├─ Unique share token
   └─ Special message in chat
5. Message shows:
   ├─ Batch preview card
   ├─ "View Full Report" button
   └─ Share link
```

### Doctor Side

```
1. Receives special message in chat
2. Sees batch preview card:
   ├─ Batch name/number
   ├─ Key metrics summary
   ├─ Date range
   └─ Current status
3. Click "View Full Report"
4. Opens dedicated page: /share/batch/[shareToken]
5. View comprehensive data:
   ├─ Overview metrics
   ├─ Feed consumption charts
   ├─ Medicine/vaccination history
   ├─ Mortality trends
   ├─ Financial summary
   ├─ Growth data
   └─ AI-powered insights
6. Can add notes/comments (saved to conversation)
```

---

## 🎨 UI/UX Design

### In-Chat Component (Preview Card)

```typescript
<BatchShareCard>
  <Header>
    <Icon>📊</Icon>
    <Title>Batch Data Shared</Title>
    <Badge>Live Snapshot</Badge>
  </Header>
  
  <BatchInfo>
    <Field>Batch: {batchNumber}</Field>
    <Field>Farm: {farmName}</Field>
    <Field>Age: {ageInDays} days</Field>
    <Field>Birds: {currentChicks}/{initialChicks}</Field>
  </BatchInfo>
  
  <QuickStats>
    <Stat>
      <Icon>🌾</Icon>
      <Value>{totalFeed} kg</Value>
      <Label>Feed Used</Label>
    </Stat>
    <Stat>
      <Icon>💊</Icon>
      <Value>{vaccinations}</Value>
      <Label>Vaccinations</Label>
    </Stat>
    <Stat>
      <Icon>📉</Icon>
      <Value>{mortalityRate}%</Value>
      <Label>Mortality</Label>
    </Stat>
    <Stat>
      <Icon>💰</Icon>
      <Value>₹{profit}</Value>
      <Label>P&L</Label>
    </Stat>
  </QuickStats>
  
  <Actions>
    <Button variant="primary">
      View Full Report →
    </Button>
    <Button variant="ghost" onClick={copyLink}>
      📋 Copy Link
    </Button>
  </Actions>
  
  <Footer>
    <Text>Shared {timeAgo} • Expires {expiryDate}</Text>
  </Footer>
</BatchShareCard>
```

### Full Report Page (`/share/batch/[token]`)

```
Layout:
┌─────────────────────────────────────────┐
│  Header: Batch #1234 - Farm ABC         │
│  Status: Active • 45 days • 4,850 birds │
├─────────────────────────────────────────┤
│  Quick Stats Cards (4 columns)          │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐           │
│  │Feed│ │Med │ │Mort│ │P&L │           │
│  └────┘ └────┘ └────┘ └────┘           │
├─────────────────────────────────────────┤
│  Tabs:                                   │
│  [Overview] [Feed] [Health] [Finance]   │
│                                          │
│  Tab Content:                            │
│  • Charts (interactive)                  │
│  • Tables (sortable)                     │
│  • Timeline view                         │
│  • AI Insights panel                     │
├─────────────────────────────────────────┤
│  Doctor Notes Section (if doctor)        │
│  [Add recommendation...]                 │
└─────────────────────────────────────────┘
```

---

## 🔐 Security & Access Control

### Access Levels

1. **Private Share (Default)**
   - Only farmer and specified doctor can access
   - Requires authentication
   - Checks: `userId === farmerId || userId === sharedWithId`

2. **Conversation Share**
   - Linked to specific conversation
   - Only conversation participants can access
   - Checks: `user is in conversation`

3. **Public Share (Optional)**
   - Anyone with link can view
   - Read-only, no sensitive financial details
   - Option to hide: profit/loss, supplier names, customer names

4. **Expired Share**
   - Returns 410 Gone
   - Option to renew (farmer only)

### Security Features

```typescript
// Token-based access
GET /api/batch-share/:shareToken
  ├─ Verify token exists
  ├─ Check expiration
  ├─ Check access permission
  ├─ Log view (analytics)
  └─ Return snapshot data

// Snapshot isolation
- Data is frozen at share time
- No real-time updates
- Can't modify original batch
- Privacy: filter sensitive fields based on viewer
```

---

## 📡 API Endpoints

### Backend Routes

```typescript
// Create share
POST /api/batch-share
Body: {
  batchId: string;
  sharedWithId?: string;
  conversationId?: string;
  title?: string;
  description?: string;
  isPublic?: boolean;
  expiresIn?: '1d' | '7d' | '30d' | 'never';
}
Response: {
  shareId: string;
  shareToken: string;
  shareUrl: string;
}

// Get share (public endpoint)
GET /api/batch-share/:shareToken
Response: {
  share: {
    id: string;
    title: string;
    description: string;
    createdAt: string;
    expiresAt: string;
    snapshotData: BatchSnapshot;
    viewCount: number;
  }
  canAddNotes: boolean;
}

// Add doctor notes
POST /api/batch-share/:shareToken/notes
Body: {
  note: string;
}
Response: {
  noteId: string;
}

// List farmer's shares
GET /api/batch-share/my-shares
Response: {
  shares: BatchShare[];
}

// Revoke share
DELETE /api/batch-share/:shareId
Response: {
  success: boolean;
}

// Renew expired share
POST /api/batch-share/:shareId/renew
Body: {
  expiresIn: string;
}
Response: {
  newExpiresAt: string;
}
```

---

## 📦 Snapshot Data Structure

```typescript
interface BatchSnapshot {
  // Basic Info
  batch: {
    id: string;
    batchNumber: string;
    startDate: string;
    endDate: string | null;
    status: 'ACTIVE' | 'COMPLETED';
    initialChicks: number;
    currentChicks: number;
    ageInDays: number;
  };
  
  // Farm Info
  farm: {
    id: string;
    name: string;
    location: string;
    capacity: number;
  };
  
  // Feed Data
  feed: {
    totalConsumption: number;
    averagePerBird: number;
    feedTypes: {
      type: string;
      quantity: number;
      percentage: number;
    }[];
    timeline: {
      date: string;
      quantity: number;
      feedType: string;
    }[];
  };
  
  // Health Data
  health: {
    totalMortality: number;
    mortalityRate: number;
    mortalityByReason: {
      reason: string;
      count: number;
      percentage: number;
    }[];
    vaccinations: {
      name: string;
      date: string;
      status: string;
      notes: string;
    }[];
    avgWeight: number;
    weightProgress: {
      date: string;
      avgWeight: number;
      sampleCount: number;
    }[];
  };
  
  // Financial Data (conditional based on privacy)
  financials?: {
    totalExpenses: number;
    totalRevenue: number;
    netProfit: number;
    profitMargin: number;
    costPerBird: number;
    revenuePerBird: number;
    expensesByCategory: {
      category: string;
      amount: number;
      percentage: number;
    }[];
  };
  
  // Key Insights
  insights: {
    feedEfficiency: string; // "Good", "Average", "Below Average"
    healthStatus: string;
    recommendations: string[];
    alerts: {
      type: 'warning' | 'info' | 'success';
      message: string;
    }[];
  };
  
  // Metadata
  meta: {
    snapshotDate: string;
    dataCompleteness: number; // 0-100
    lastUpdated: string;
  };
}
```

---

## 🚀 Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- [ ] Database migration (add BatchShare, BatchShareView models)
- [ ] Backend API endpoints (CRUD for shares)
- [ ] Snapshot generation logic
- [ ] Access control middleware
- [ ] Basic token validation

### Phase 2: In-Chat Integration (Week 2)
- [ ] Farmer: "Share Batch" button in chat
- [ ] Farmer: Batch selection modal
- [ ] Frontend: BatchShareCard component
- [ ] WebSocket: Broadcast share message type
- [ ] Doctor: Receive and display share card
- [ ] Copy share link functionality

### Phase 3: Full Report Page (Week 3)
- [ ] Public route: `/share/batch/[token]`
- [ ] Layout and design
- [ ] Overview tab with key metrics
- [ ] Feed consumption tab + charts
- [ ] Health tab (mortality, vaccinations, weight)
- [ ] Financial tab (if permitted)
- [ ] Responsive design

### Phase 4: Advanced Features (Week 4)
- [ ] AI-powered insights generation
- [ ] Doctor notes/recommendations
- [ ] Export as PDF
- [ ] Share analytics (view tracking)
- [ ] Expiration management
- [ ] Share history for farmers
- [ ] Notification when doctor views

### Phase 5: Polish & Optimization (Week 5)
- [ ] Performance optimization (caching)
- [ ] Security audit
- [ ] Error handling
- [ ] Loading states
- [ ] Empty states
- [ ] Mobile optimization
- [ ] Accessibility (WCAG)

---

## 🎯 Key Features

### Farmer Features
✅ Share batch data with one click
✅ Choose what to share (privacy control)
✅ Set expiration dates
✅ View share analytics (who viewed, when)
✅ Revoke access anytime
✅ Share history & management
✅ Copy shareable link
✅ See when doctor views data

### Doctor Features
✅ View comprehensive batch data
✅ See historical trends
✅ Add professional recommendations
✅ Export reports
✅ Compare with industry benchmarks (future)
✅ AI-assisted diagnosis (future)
✅ Save frequent insights as templates (future)

### System Features
✅ Immutable snapshots
✅ Token-based security
✅ Anonymous view tracking
✅ Automatic expiration
✅ Graceful degradation
✅ Audit logging
✅ Rate limiting
✅ CDN caching for static shares

---

## 🔍 Technical Considerations

### Performance
- Snapshot generation can be heavy → Queue/async
- Cache share pages (Redis)
- Lazy load charts
- Paginate large datasets
- Optimize snapshot data size (~50KB limit)

### Scalability
- Store snapshots as compressed JSON
- Use CDN for share pages
- Implement view count throttling
- Archive old shares (>6 months)

### Privacy
- Default: private shares
- Option to exclude financials
- Anonymize customer/supplier names
- Watermark reports with share ID
- Log all access attempts

### Mobile
- Responsive share cards
- Touch-friendly charts
- Simplified mobile view
- Native-like experience
- Offline viewing (cache snapshot)

---

## 🧪 Testing Strategy

### Unit Tests
- Snapshot generation logic
- Access control validation
- Token generation/validation
- Privacy filters
- Data aggregation

### Integration Tests
- Share creation flow
- Share viewing flow
- Doctor notes flow
- Expiration handling
- WebSocket broadcasting

### E2E Tests
- Complete sharing workflow
- Cross-app navigation (chat → share page)
- Permission scenarios
- Mobile responsiveness
- Performance under load

---

## 📈 Success Metrics

### Usage Metrics
- Shares created per week
- Average views per share
- Doctor engagement rate
- Note/recommendation rate
- Share-to-consultation conversion

### Quality Metrics
- Data completeness score
- Page load time (<2s)
- Error rate (<0.1%)
- Mobile vs desktop usage
- Feature adoption rate

---

## 🔮 Future Enhancements

### Short Term (3 months)
- Multi-batch comparison
- Farm-level sharing (multiple batches)
- Share templates (preset configurations)
- Scheduled shares (auto-share weekly)
- Share with multiple doctors

### Medium Term (6 months)
- AI-powered insights
- Industry benchmark comparison
- Predictive analytics
- Video annotations on data
- Collaborative notes (real-time)

### Long Term (12 months)
- Public batch showcase (opt-in)
- Batch performance leaderboard
- Research data contributions
- Integration with IoT sensors
- Mobile app with AR visualization

---

## 🛠️ Tech Stack

### Backend
- **Database**: PostgreSQL (Prisma ORM)
- **API**: Express.js REST + WebSocket
- **Cache**: Redis (snapshot cache)
- **Queue**: Bull/BullMQ (async snapshot generation)
- **Storage**: S3/CloudFront (if storing PDFs)

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI**: Shadcn UI + Tailwind CSS
- **Charts**: Recharts or Chart.js
- **State**: Zustand + TanStack Query
- **Real-time**: Socket.io client

### DevOps
- **Deploy**: Vercel (frontend), Railway/Render (backend)
- **Monitoring**: Sentry (errors), PostHog (analytics)
- **CDN**: Cloudflare (share pages)

---

## 📝 Sample Code Snippets

### Snapshot Generation
```typescript
async function generateBatchSnapshot(batchId: string, privacy: PrivacyOptions): Promise<BatchSnapshot> {
  const [batch, expenses, sales, mortality, feed, vaccinations, weights] = await Promise.all([
    prisma.batch.findUnique({ where: { id: batchId }, include: { farm: true } }),
    prisma.expense.findMany({ where: { batchId } }),
    prisma.sale.findMany({ where: { batchId } }),
    prisma.mortality.findMany({ where: { batchId } }),
    prisma.feedConsumption.findMany({ where: { batchId } }),
    prisma.vaccination.findMany({ where: { batchId } }),
    prisma.birdWeight.findMany({ where: { batchId } })
  ]);
  
  // Calculate metrics
  const totalMortality = mortality.reduce((sum, m) => sum + m.count, 0);
  const currentChicks = batch.initialChicks - totalMortality;
  const ageInDays = differenceInDays(new Date(), batch.startDate);
  
  // Generate insights
  const insights = generateInsights({ batch, feed, mortality, weights });
  
  // Filter based on privacy
  const financials = privacy.includeFinancials ? calculateFinancials(expenses, sales) : null;
  
  return {
    batch: { ... },
    farm: { ... },
    feed: { ... },
    health: { ... },
    financials,
    insights,
    meta: {
      snapshotDate: new Date().toISOString(),
      dataCompleteness: calculateCompleteness({ ... }),
      lastUpdated: batch.updatedAt
    }
  };
}
```

---

## ✅ Acceptance Criteria

### Must Have
- [x] Farmer can share batch data in chat
- [x] Doctor can view shared data
- [x] Data is immutable snapshot
- [x] Secure token-based access
- [x] Mobile responsive
- [x] Load time <3s

### Should Have
- [ ] AI-generated insights
- [ ] Doctor can add notes
- [ ] Export as PDF
- [ ] View analytics
- [ ] Expiration handling

### Nice to Have
- [ ] Compare multiple batches
- [ ] Industry benchmarks
- [ ] Collaborative editing
- [ ] Video annotations
- [ ] Push notifications

---

## 📞 Stakeholder Communication

### For Farmers
"Share your batch performance with veterinarians in one click. Get expert advice based on real data - feed consumption, health records, growth metrics - all in a secure, shareable report."

### For Doctors
"View comprehensive batch health reports shared by farmers. Access detailed feeding patterns, vaccination history, mortality trends, and growth data to provide data-driven recommendations."

### For Product Team
"ChatGPT-style shareable batch reports enable asynchronous veterinary consultations with full data context, reducing back-and-forth questions and improving consultation quality."

---

**Estimated Timeline**: 5 weeks
**Team Size**: 2-3 developers
**Priority**: High (Core consultation feature)
**Dependencies**: Working chat system ✅

---

*Last Updated: 2025-01-05*
*Version: 1.0*

