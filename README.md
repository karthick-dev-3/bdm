# Tamil Nadu Apple iPhone Distribution — BDM Copilot & Executive Command Center

An enterprise-grade commercial operations platform designed for Apple iPhone distribution across Tamil Nadu, built to bridge the trust and visibility gap between field Business Development Managers (BDMs) and sales leadership.

---

## 1. Executive Summary & Core Diagnosis

We distribute Apple iPhones across 12 territories in Tamil Nadu (Chennai, Madurai, Karur, Tirupur, Vellore, Thanjavur, Dindigul, Coimbatore, Trichy, Tirunelveli, Erode, Salem). 

### The Real Data Reality (From the 4 Master CSVs)
1. **The Active Network Contraction**:
   - Master has **820 registered retail outlets**, but in July 2026, **only 285 outlets billed** us (down 38.8% from 466 in February 2026).
   - **328 outlets (40% of the network)** have **never billed a single rupee** across the entire 6-month historical dataset.
2. **The "Fabricated Log" & Wasted Time Sinkhole**:
   - Out of 5,904 recorded visits across 3 months, **2,434 visits (41.2% of all field visits!)** were paid to these 328 ghost outlets that generate zero revenue.
   - 2,262 visits have completely empty remarks, and 811 have blank durations. Over 2,300 logs repeat canned phrases (*"discussed scheme"*, *"will order next week"*, *"shop closed"*).
   - Over 680 visits have logged durations $\le$ 5 minutes.
3. **The "Madurai Shared-Wall" Location Problem**:
   - In congested markets like Madurai, Karur, and Chennai, outlets share physical building walls.
   - The engine identified **20 coordinate clusters** where 2 to 4 retail outlets share identical GPS coordinates down to the 4th decimal place (e.g., `OA0284` & `OA0798`, `OA0471` & `OA0810`, `OA0007` & `OA0806`). Basic GPS radius verification alone is incapable of distinguishing which counter a BDM is standing in.
4. **Master Data Duplicates**:
   - Multiple stores are registered twice with slightly altered names or trailing spaces, artificially inflating official territory coverage numbers.

---

## 2. Core Philosophy: Build for the BDM First

A field sales tool that acts purely as an intrusive tracking device will inevitably be gamed. If logging is cumbersome, BDMs will falsify check-ins or rush through them at the end of the day.

**This solution succeeds because it serves as an indispensable field copilot:**
- **Zero-Prep Counter Dossier**: When a BDM taps a counter, they immediately see its 6-month billing trajectory, credit terms (`COD`, `15`, `30`, `45 days`), overdue risk, and notes from the prior visit. The BDM sits with the shop owner as a prepared business advisor.
- **Frictionless 45-Second Audit**: No endless typing on small mobile keyboards. BDMs use 1-tap outcome chips, format-tailored 5-point checkpoints, and structured order commitment logging.
- **Dynamic Beat Prioritization**: Surfaces high-yield counters first:
  - *Revenue At Risk* (Historic billers $\ge$ ₹5L that dropped in July).
  - *Payment Critical* (Approaching credit limits; collect before billing).
  - *Routine Active* (Consistent replenishers).
  - *Dormant Diagnostic* (Triage quiet counters).

---

## 3. The 5-Point Dynamic Checklist by Outlet Type

In accordance with management guidance, the checklist covers core commercial themes (*MoM performance, growth blockers, distributor support, footfalls, sales growth, debt collection, and order booking*), strictly capped at **5 actionable checkpoints tailored by format**:

| Outlet Type | Empirical Profile (from CSVs) | The 5 Format-Specific Checklist Items | Operational Rationale |
| :--- | :--- | :--- | :--- |
| **Multi-Yard** *(43 outlets)* | Largest format. Highest avg billing (~₹11.8L/mo). Major volume driver and credit risk. | 1. **Outstanding & Credit Limit Reconciliation**<br>2. **Tier-1 Inventory & Hero SKU Depth**<br>3. **Apple Dedicated Bay & Floor Share**<br>4. **Volume Slab & Sell-Out Scheme Alignment**<br>5. **Firm Bulk Purchase Indent Booking** | Multi-Yards don't suffer from low footfall; their volume stalls on credit blockages, distributor slab payouts, and competing brand promoter encroachment. |
| **Premium Reseller** *(111 outlets)* | Dedicated Apple experience counter (Avg ₹10.3L/mo). Custodians of Apple brand equity. | 1. **Live Demo Device & Visual Merchandising Audit**<br>2. **MoM Sales Trend & Pro/Pro Max Mix**<br>3. **Staff Financing & Consumer Pitch Readiness**<br>4. **Zero-Stock Outage Alerts on Fast Movers**<br>5. **Immediate Dedicated Assortment Replenishment** | These stores sell Apple exclusively. Their sales velocity depends on immaculate demo hardware uptime, consumer financing (EMI/cashbacks), and zero-stockouts on hero colors/storage. |
| **General Trade** *(444 outlets)* | Neighborhood multi-brand mobile store. Bulk of network (Avg ₹9.3L/mo). 180+ dropped counters. | 1. **Billing Trajectory & Inactivity Diagnostic**<br>2. **Payment Collection & Credit Clearance**<br>3. **Margin Grievances & Competitor Sourcing**<br>4. **Local Walk-in Demand & Footfall Trend**<br>5. **Firm Order / Revival Date Commitment** | This tier accounts for the greatest drop-off in active billers. The visit must diagnose why orders stopped (grey market sourcing, distributor dispute, closed shop) and recover overdue money before fresh supply. |
| **Mobile Specialist** *(222 outlets)* | Tech-savvy multi-brand counter (Avg ₹8.5L/mo). Fierce counter competition with Android OEMs. | 1. **Counter Share Defense vs Competing Brands**<br>2. **Cash Counter & POS Visibility**<br>3. **Customer Trade-In & Buyback Schemes**<br>4. **Credit Window Adherence & Settlement**<br>5. **Fast-Moving SKU Order Placement** | Android brands push aggressive shopkeeper margins here. The BDM must defend Apple shelf space, push trade-ins, and clear credit cycles. |

---

## 4. Inactivity & Commercial Health Taxonomy

1. **Active**: Billed within the last 30 days (July 2026).
2. **At-Risk / Fading**: Billed in June 2026 but zero or steep drop in July.
3. **Dormant**: Last billed 61 to 180 days ago (Feb–May 2026).
4. **Ghost / Unactivated**: 0 bills on record across all 6 months (328 counters).

When visiting quiet counters, BDMs are prompted to capture one of 5 structured diagnostic reasons:
- `Procuring from Parallel / Grey Distributor`
- `Credit / Outstanding Dispute`
- `Low Demand / Counter Unsold Stock`
- `Permanently Closed / Relocated`
- `Never Traded (Ghost Record)`

---

## 5. Master Data Mess Handling (Source CSVs Untouched)

As required, **the 4 raw CSV files (`outlets.csv`, `billing-monthly.csv`, `visit-log.csv`, `bdms.csv`) are 100% untouched.**

The application implements an **In-Memory Canonical Normalization & Deduplication Engine**:
1. **Duplicate Suspects Registry**:
   - Isolates twin accounts sharing identical coordinates or trade names (e.g., `OA0471` & `OA0810`, `OA0284` & `OA0798`).
   - Dynamically calculates the true deduplicated network (~514 true unique counters) while preserving legacy codes.
2. **Town Name Harmonization**:
   - Maps raw variations (`Madras` $\to$ `Chennai`, `Cbe` $\to$ `Coimbatore`, `Nellai` $\to$ `Tirunelveli`, `Tanjore` $\to$ `Thanjavur`) to the 12 canonical BDM territories without altering underlying rows.
3. **Missing Coordinates Flagging**:
   - Identifies the 108 outlets with blank lat/long and enables field BDMs to update verified coordinates during counter visits.

---

## 6. Visit Trust & Forensics Algorithm

Every logged visit is evaluated by an automated **Trust Score (0–100%)**:
- **Dwell Time Check**: Visits $\le$ 5 minutes without a recorded closed status or purchase order receive a 30-point penalty (flagged as *"Drive-by Visit"*). Missing durations receive a 25-point penalty.
- **Remarks Check**: Completely blank remarks receive a 30-point penalty. Known repetitive template remarks receive a 15-point penalty.
- **Zero-Billing Sinkhole Penalty**: Visits to counters with zero billing over 6 months receive a 15-point penalty.
- **Shared-Wall Proximity Flag**: Identifies adjacent shops that cannot be differentiated by GPS alone, enforcing counter-code verification and owner confirmation.

---

## 7. Project Architecture & Tech Stack

```
bdm/
├── bdms.csv                   # Master BDM directory (12 reps, 12 territories)
├── billing-monthly.csv        # 6 months of billing (Feb-Jul 2026, 2,142 rows)
├── outlets.csv                # 820 registered retail counters
├── visit-log.csv              # 5,904 historical field visit logs
├── src/
│   ├── types/
│   │   └── data.ts            # Full TypeScript domain models
│   ├── services/
│   │   ├── dataLoader.ts      # CSV ingestion, data enrichment, deduplication
│   │   ├── checklistDefinitions.ts # 5-point format checklists & rationale
│   │   ├── townNormalizer.ts  # Dynamic territory & alias mapping
│   │   ├── trustEngine.ts     # Trust score computation & forensics
│   │   ├── prioritization.ts  # Beat priority engine (4 tiers)
│   │   └── auditStore.ts      # Local offline persistence for visits & audits
│   ├── components/
│   │   ├── layout/
│   │   │   └── Navbar.tsx     # Mode toggle (Executive vs Field App), sync badge
│   │   ├── dashboard/
│   │   │   ├── OverviewKPIs.tsx         # Network KPI cards
│   │   │   ├── RevenueTrendChart.tsx    # 6-month attrition & volume charts
│   │   │   ├── BDMPerformanceTable.tsx  # 12 BDM scorecard with ghost waste %
│   │   │   ├── TrustForensicsLab.tsx    # Wall-sharing & drive-by inspector
│   │   │   ├── DataHygieneCenter.tsx    # Living deduplication & alias matrix
│   │   │   └── RevivalPlaybook.tsx      # High-value fallen billers triage
│   │   └── fieldApp/
│   │       ├── MobileShell.tsx          # Smartphone frame & beat selector
│   │       ├── CounterCard.tsx          # Counter card with 6M sparklines
│   │       ├── CounterDossierModal.tsx  # Commercial dossier & history table
│   │       ├── ChecklistModal.tsx       # Tailored 5-point checklist & order booking
│   │       └── AuditCounterModal.tsx    # GPS & ground reality audit
│   ├── styles/
│   │   └── index.css          # Apple Enterprise Obsidian Design System
│   ├── App.tsx                # App root with state management
│   ├── main.tsx               # DOM entry point
│   └── vite-env.d.ts          # Vite asset declarations
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### Production Tech Stack
- **Framework**: React 19 + TypeScript + Vite 6
- **Styling**: Vanilla CSS Apple Enterprise Design System (Obsidian Slate `#0B0F17`, Apple Cobalt `#0A84FF`, Tactical Emerald `#30D158`, Amber `#FF9F0A`, Crimson `#FF453A`)
- **Data Ingestion**: Streaming CSV parsing via PapaParse with embedded raw bundling
- **Icons**: Lucide React
- **Local Persistence**: LocalStorage & IndexedDB with optimistic UI updates

---

## 8. Verification & Running Locally

### Development Server
```bash
npm install
npm run dev -- --port 3000
```
Open `http://localhost:3000/` in your browser.

### Production Build Verification
```bash
npm run build
npm run preview -- --port 3000
```
The build compiles in under 12 seconds with 0 TypeScript errors.
