import { ChecklistItem, OutletType } from '../types/data';

/**
 * 5-Point Tailored Checklist Taxonomy per Outlet Type
 * 
 * Rules:
 * - Strictly capped at 5 actionable items per counter type.
 * - Tailored to the empirical revenue and operational profile of each format.
 */
export const OUTLET_CHECKLISTS: Record<OutletType, { title: string; subtitle: string; rationale: string; items: ChecklistItem[] }> = {
  'Multi-Yard': {
    title: 'Multi-Yard Key Account Protocol',
    subtitle: 'High-volume anchor counter (Avg ₹11.8L/mo). Protect credit line & secure hero SKU depth.',
    rationale: 'Multi-Yards generate the highest volume (~₹11.8L/mo) and carry high credit exposure. Checkpoints prioritize credit line protection, Tier-1 hero SKU depth, floor bay dominance, and preventing competing brand promoter encroachment.',
    items: [
      {
        id: 'my_credit_recon',
        category: 'Commercial',
        title: 'Outstanding & Credit Limit Reconciliation',
        description: 'Verify current aging balance against 30/45-day credit window; address any pending settlement before taking fresh indent.'
      },
      {
        id: 'my_stock_depth',
        category: 'Inventory',
        title: 'Hero SKU Depth & Fast-Mover Cover',
        description: 'Audit 14-day stock cover for top fast-moving iPhone models (Base & Pro series) to prevent weekend stock-outs.'
      },
      {
        id: 'my_bay_share',
        category: 'Branding',
        title: 'Apple Dedicated Bay & Floor Prominence',
        description: 'Check prime floor visibility, ensure clean uninterrupted branding, and check for competitor brand promoter encroachment.'
      },
      {
        id: 'my_scheme_slabs',
        category: 'Market',
        title: 'Volume Slab & Sell-Out Scheme Alignment',
        description: 'Review store progress toward quarterly volume milestone incentives and confirm distributor trade scheme support.'
      },
      {
        id: 'my_order_booking',
        category: 'Commitment',
        title: 'Firm Bulk Indent Commitment',
        description: 'Lock in weekly stock replenishment indent with agreed delivery dispatch schedule and payment terms.'
      }
    ]
  },

  'Premium Reseller': {
    title: 'Apple Dedicated Reseller Protocol',
    subtitle: 'Exclusive Apple destination (Avg ₹10.3L/mo). Brand experience, demo compliance & model mix.',
    rationale: 'These stores sell Apple exclusively. Their sales velocity depends on immaculate live demo hardware uptime, active consumer financing pitches (EMI/cashbacks), and zero-stockouts on hero Pro/Max colors and storage.',
    items: [
      {
        id: 'pr_demo_compliance',
        category: 'Branding',
        title: 'Live Demo Device & Visual Merchandising Audit',
        description: 'Inspect live interactive demo devices (powered on, updated iOS, clean display glass, functioning security tethers).'
      },
      {
        id: 'pr_model_mix',
        category: 'Commercial',
        title: 'MoM Sales Trend & Pro/Pro Max Mix',
        description: 'Analyze MoM sales performance with store lead; evaluate if high-margin Pro tiers are matching historical sell-through.'
      },
      {
        id: 'pr_financing_readiness',
        category: 'Market',
        title: 'Store Staff Financing & Pitch Knowledge',
        description: 'Verify staff actively pitch Apple trade-in, zero-cost EMI, and instant bank cashbacks to walk-in customers.'
      },
      {
        id: 'pr_zero_outages',
        category: 'Inventory',
        title: 'Zero Outage on Fast-Moving Storage/Colors',
        description: 'Identify any zero-stock occurrences in trending colorways or base storage variants that result in walk-out lost sales.'
      },
      {
        id: 'pr_replenish_indent',
        category: 'Commitment',
        title: 'Dedicated Assortment Replenishment',
        description: 'Book immediate replacement units for sold inventory to maintain uninterrupted 100% catalog availability.'
      }
    ]
  },

  'General Trade': {
    title: 'General Trade Network Protocol',
    subtitle: 'Neighborhood mobile shop (Bulk of network, avg ₹9.3L/mo). Diagnose drop-offs, recover debt & counter grey supply.',
    rationale: 'This tier accounts for the highest drop-off in active billers. The visit must diagnose why orders ceased (grey-market sub-dealer sourcing, distributor dispute, closed shop), collect overdue receivables, and lock a firm replenishment commitment.',
    items: [
      {
        id: 'gt_dormancy_diag',
        category: 'Commercial',
        title: 'Performance Trajectory & Inactivity Diagnostic',
        description: 'Review 6-month billing history with owner. If quiet or declining, uncover exact cause (parallel supply, closed, disputes).'
      },
      {
        id: 'gt_payment_collection',
        category: 'Commercial',
        title: 'Payment Collection & Credit Clearance',
        description: 'Collect outstanding payments for pending invoices against COD/15/30-day terms prior to booking new stock.'
      },
      {
        id: 'gt_margin_grievance',
        category: 'Market',
        title: 'Margin Grievances & Competitor Sourcing',
        description: 'Investigate if owner is buying from unauthorized sub-dealers or grey market due to credit terms or margin differences.'
      },
      {
        id: 'gt_walkin_demand',
        category: 'Market',
        title: 'Local Walk-in Demand & Footfall Trend',
        description: 'Gauge footfall trends, local festival/student demand shifts, and competitive brand marketing activity.'
      },
      {
        id: 'gt_order_commitment',
        category: 'Commitment',
        title: 'Firm Order / Revival Date Commitment',
        description: 'Secure purchase order or agree on a specific verified callback date for the next replenishment cycle.'
      }
    ]
  },

  'Mobile Specialist': {
    title: 'Mobile Specialist Multi-Brand Protocol',
    subtitle: 'Multi-brand tech counter (Avg ₹8.5L/mo). Defend counter share against aggressive Android trade commissions.',
    rationale: 'Android brands push aggressive retail margins here. The BDM must defend prime shelf and counter space next to billing, train staff on customer trade-in affordability, enforce credit limits, and capture fast-turning SKU indents.',
    items: [
      {
        id: 'ms_counter_share',
        category: 'Market',
        title: 'Counter Share Defense vs Competing Brands',
        description: 'Assess Apple share of counter sales vs Samsung, Vivo, and OnePlus; address dealer margin pushback.'
      },
      {
        id: 'ms_cashier_display',
        category: 'Branding',
        title: 'Point-of-Sale (POS) & Counter Top Visibility',
        description: 'Ensure Apple posters and promotional standees occupy high-visibility space next to the primary billing counter.'
      },
      {
        id: 'ms_buyback_schemes',
        category: 'Market',
        title: 'Customer Trade-In & Affordability Schemes',
        description: 'Ensure counter sales staff offer upgrade exchange value and affordability schemes to convert Android switchers.'
      },
      {
        id: 'ms_credit_check',
        category: 'Commercial',
        title: 'Credit Window Adherence & Settlement',
        description: 'Verify timely payment within allowed credit cycle and settle any pending return credits.'
      },
      {
        id: 'ms_order_booking',
        category: 'Commitment',
        title: 'Fast-Moving SKU Order Placement',
        description: 'Book targeted order focusing on high-velocity SKUs that yield fastest dealer ROI and counter turnaround.'
      }
    ]
  }
};
