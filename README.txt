BDM FIELD VISIT APPLICATION - HANDOVER & TECHNICAL README
===========================================================

1. PURPOSE

This application is an offline-first field assistant and territory dashboard built for 12 Business Development Managers (BDMs) who distribute iPhones across ~800 retail outlets in Tamil Nadu.

The problem with the previous system was trust. Head office received visit logs filled with low-effort remarks ("routine visit", "shop closed", 5-minute durations) with no way to tell whether a real conversation took place, whether the outlet even exists, or whether time was going to the shops that actually drive volume. In places like Madurai where multiple mobile shops share a single physical wall, phone GPS cannot distinguish which door an officer walked into.

Instead of turning the app into an administrative tracker that field reps will resent and game, we built it for the BDM first. When a BDM opens a store profile on their phone, they instantly see its 6-month billing history, owner contact, and payment terms. They get a format-specific 5-point checklist to guide the conversation, can take a quick storefront photo, and book replenishment orders with estimated order values. The app syncs seamlessly with the local SQLite database.


2. HOW TO RUN

Prerequisites: Node.js (v18 or higher) and npm.

1. Install dependencies:
   npm install

2. Start the development server (runs with embedded SQLite database):
   npm run dev

3. (Optional) Run standalone Express SQLite backend server:
   npm run server

4. Open in your browser:
   http://localhost:3000

5. Admin Dashboard Login Credentials:
   - **Credentials are managed securely and are not disclosed in this documentation.**

The app runs on port 3000. It includes a native SQLite database (powered by better-sqlite3) stored at data/bdm_sales.db. It automatically seeds tables (bdms, outlets, billing, visits, audits, merges, users, sessions) from the CSV files and auth config on initial launch with zero external configuration required.


3. TECH STACK & ARCHITECTURE

The application is built with a high-performance, modern TypeScript web stack designed for rapid local startup, mobile field responsiveness, and zero-configuration evaluation:

- Database: SQLite 3 (via better-sqlite3) stored in data/bdm_sales.db with ACID compliance, WAL-mode journaling, and relational SQL schema (users, sessions, login_attempts, outlets, billing, bdms, visits, audits, merges, category_csvs).
- Authentication & Security: State-backed Bearer Session Tokens with crypto.scryptSync salted password hashing (unique 16-byte random salt per user, constant-time timingSafeEqual comparison), brute-force rate-limiting, and SQLite session revocation.
- Backend & API: Express REST API (/api/auth/*, /api/visits, /api/sync/visits, /api/audits, /api/outlets/merge, /api/db/*) embedded directly into the Vite dev server and available standalone via npm run server.
- Frontend Core: React 19 with TypeScript (v5.7) for strict type safety and modular component architecture with global AuthProvider security gate.
- Build Tool & Dev Server: Vite (v6.2) with @vitejs/plugin-react and @tailwindcss/vite for sub-second Hot Module Replacement (HMR) and optimized production bundles.
- Styling System: Hybrid Tailwind CSS (v4) + Custom CSS. Tailwind utility classes are used across all layouts, dashboards, and mobile views, while custom CSS variables manage theme design tokens and custom animations.
- Data Ingestion: PapaParse (v5.5) for fast CSV parsing, schema validation, and CSV export of field visit logs.
- Icons: Lucide React (v1.16) for lightweight Apple-style visual indicators and action icons.


4. OUTLET TYPES AND THE 5-POINT VISIT CHECKLISTS

The prompt gave seven candidate topics for a visit conversation (how the shop did vs last month, what is holding them back, what we will do to help, how to get walk-ins, growing sales, collecting what is owed, and taking the next order) with a strict rule: pick no more than five, and tailor them to the outlet type based on the numbers.

Here are the four outlet types, what the data shows about them, and the five checklist items chosen for each:

4.1 Multi-Yard (Avg Volume: ~11.8 Lakhs/month)
What the data shows: There are very few of these on the master list, but they bill the largest single invoices in the network and carry 30-to-45-day credit lines. A single overdue bill or out-of-stock weekend here hits territory numbers hard.
The 5 Checklist Items:
1. Outstanding & Credit Limit Reconciliation (Commercial): Check aging balance against the 30/45-day credit window; clear pending settlements before taking fresh orders.
2. Hero SKU Depth & Fast-Mover Cover (Inventory): Audit 14-day stock cover on top Base and Pro iPhone models to prevent weekend stock-outs.
3. Apple Dedicated Bay & Floor Prominence (Branding): Verify prime floor visibility, ensure clean signage, and make sure competitor brand promoters haven't encroached on the space.
4. Volume Slab & Trade Scheme Alignment (Market): Review store progress toward quarterly volume milestones and confirm distributor scheme payouts.
5. Firm Bulk Indent Commitment (Commitment): Lock in the weekly bulk replenishment order with delivery dates and payment commitments.

4.2 Premium Reseller (Avg Volume: ~10.3 Lakhs/month)
What the data shows: These are dedicated Apple-only storefronts. They live and die by customer experience, high-margin Pro/Max sales, and whether staff are trained to offer financing.
The 5 Checklist Items:
1. Live Demo Device & Merchandising Audit (Branding): Check that interactive demo units are powered on, running updated iOS, screen glass is clean, and security tethers work.
2. Month-on-Month Sales Trend & Pro Mix (Commercial): Review sales trajectory with the store manager to make sure higher-value Pro/Max models match historical pace.
3. Staff Financing & Pitch Knowledge (Market): Check that floor staff are actively pitching zero-cost EMI, bank cashbacks, and trade-in exchange programs to walk-in customers.
4. Zero Outage on Fast-Moving Colors/Storage (Inventory): Identify any stock-outs on trending colors (e.g., Natural Titanium) or entry storage variants that lead to lost sales.
5. Dedicated Assortment Replenishment (Commitment): Book replacement units for sold inventory to keep the full catalog in stock.

4.3 General Trade (Avg Volume: ~9.3 Lakhs/month)
What the data shows: This makes up roughly two-thirds of the entire retail network and has the highest drop-off rate. When an outlet goes quiet here, it is usually because they bought from grey market sub-dealers, have an unresolved credit dispute, or closed down.
The 5 Checklist Items:
1. Performance Trajectory & Inactivity Diagnostic (Commercial): Walk through the 6-month billing history with the owner. If ordering slowed down or stopped, find out why.
2. Payment Collection & Credit Clearance (Commercial): Collect pending payments on COD/15/30-day terms before writing a new order.
3. Margin Grievances & Competitor Sourcing (Market): Check if the owner is buying from unauthorized sub-dealers or grey channels due to better pricing or credit terms.
4. Local Walk-in Demand & Footfall Trend (Market): Gauge local footfall trends, student/festival demand, and nearby competitor marketing activity.
5. Firm Order / Revival Commitment (Commitment): Get a purchase order or agree on a specific callback date for the next replenishment cycle.

4.4 Mobile Specialist (Avg Volume: ~8.5 Lakhs/month)
What the data shows: Small multi-brand counters where Android brands (Samsung, Vivo, OnePlus) push high dealer margins and aggressive point-of-sale branding.
The 5 Checklist Items:
1. Counter Share Defense vs Competitors (Market): Check Apple counter sales share against competing Android brands; address dealer pushback on trade margins.
2. Point-of-Sale (POS) & Countertop Visibility (Branding): Make sure Apple posters, standees, and display units sit in high-visibility spots right next to the cash register.
3. Trade-In & Affordability Schemes (Market): Verify counter staff know how to pitch buyback schemes to convert price-conscious Android buyers.
4. Credit Window Adherence & Settlement (Commercial): Check that payments match the allowed credit window and clear any pending return credits.
5. Fast-Moving SKU Order Placement (Commitment): Book orders focused on fast-turning models that give the dealer quick cash turnaround.


5. INACTIVE OUTLET DEFINITION

Because the business did not have an existing rule for what counts as an active outlet, we defined four distinct tiers using actual monthly invoice data from February 2026 to July 2026:

- Active: Billed at least once in July 2026 (July value > 0). This represents ~290 outlets.
- At-Risk (30-day drop-off): Billed in June 2026 but zero in July 2026. This is the critical window where a BDM visit has the highest chance of preventing permanent churn.
- Dormant (>60 days inactive): Zero billing in both June and July 2026, but billed at least once between February and May 2026.
- Ghost: Listed in outlets.csv with zero billed invoices across the entire 6-month period (Total 6M Value = 0).

Why this rule:
Instead of relying on the unverified "Status" column in outlets.csv (which is often outdated or blank), looking at actual invoice months gives an accurate picture. It immediately separates the ~500 quiet outlets into recent drop-offs that can be saved versus ghost records that need a physical check.


6. FIELD NOTES & AUDIT REMARKS CAPTURE

BDMs capture free-text field notes, specific commercial agreements (e.g. delivery date, payment terms), and individual 5-point checklist remarks. All observations and ground truth audits are saved and synced to the backend SQLite database.


7. DATA QUALITY HANDLING & DUPLICATE OUTLETS

Per client instructions, the application does not quietly clean or overwrite the four source CSV files. It reads them as they are and handles errors gracefully at runtime:

7.1 Missing Latitude / Longitude
- Handled safely as undefined instead of breaking the app with NaN errors.
- Outlets without coordinates are listed in the Data Hygiene Center under "Missing Coordinates" so territory managers can review them, while remaining fully accessible in beat lists.

7.2 Blank Status & Blank Credit Terms
- Blank "Status" values in outlets.csv are ignored. The app calculates real-time status (Active, At-Risk, Dormant, Ghost) directly from billing history.
- Blank credit terms are flagged as "Unknown — verify with owner" (shown with an amber warning badge) and default to COD when booking orders until verified.

7.3 Inconsistent Town Names (e.g., Madras vs Chennai, Trichy vs Tiruchirappalli)
- Uses a built-in synonym map (townNormalizer.ts) that maps common aliases and local spellings to the 12 canonical BDM territories in Tamil Nadu:
  * "Madras" -> Chennai
  * "MDU" -> Madurai
  * "Tanjore" -> Thanjavur
  * "CBE" -> Coimbatore
  * "Tiruchirappalli" / "trichy" -> Trichy
  * "Nellai" / "TIRUNELVELI" -> Tirunelveli
  * "tiruppur" -> Tirupur
- This ensures outlets get assigned to the right BDM officer without altering the raw text in the original file.

7.4 Inconsistent Credit Term Formatting
- A regex parser handles messy entries like "30 days", "30", "45", "15", and "COD", converting them to clean numbers (30, 45, 15, 0) for calculation while keeping the original string visible on screen.

7.5 Duplicate Outlet Records (The Coverage Inflation Problem)
- The client pointed out that duplicate outlet entries inflate reported coverage numbers across territories.
- The app detects duplicates in two ways:
  1. Name matching: Strips spaces and punctuation to compare normalized outlet names within a town.
  2. Coordinate clustering: Identifies shops registered at identical GPS coordinates.
- To resolve this, we added a 1-click "Merge Twin Records" tool in the Data Hygiene Center. When merged, the secondary shop's 6-month billing is rolled into the primary outlet, the duplicate is marked as an alias, and the merge mapping is saved to local_backend_db.json. This removes duplicate inflation from territory coverage numbers.


8. WHY I ASKED CLARIFYING QUESTIONS BEFORE BUILDING

Before writing code, I reviewed the 4 CSV files and the problem statement. In real-world software projects, building on silent assumptions leads to bad design and wasted effort. Asking targeted clarification questions helped establish the ground truth and confirmed key business rules:

1. Clarifying the 5-Point Checklists (Questions 1 - 3):
   - Why I asked: If the company already had an official field checklist, inventing an arbitrary list would conflict with existing operations.
   - Outcome: Confirmed that no standard checklist existed. With 7 candidate topics and a strict 5-point limit, I analyzed the sales numbers to design four format-specific checklists tailored to each outlet type (e.g., credit line reconciliation and bulk stock cover for Multi-Yards vs. demo display condition and staff financing pitches for Premium Resellers).

2. Clarifying Inactive Outlets & Churn Tracking (Questions 4 - 6):
   - Why I asked: Looking at the data, over 500 of the ~800 master outlets had zero billing in July. I needed to know if the company had an official inactive definition (like 30, 45, or 60 days) and whether BDMs should record why an outlet stopped ordering.
   - Outcome: Confirmed that no active definition existed and the business did not know why outlets were going quiet. This allowed me to define a clear 4-tier model (Active, 30-day At-Risk, Dormant, Ghost) and add point-of-visit churn diagnostics (e.g., shop closed, buying from grey market, or credit disputes).

3. Clarifying Billing & Outstanding Visibility for BDMs (Questions 7 - 8):
   - Why I asked: BDMs often enter shops without context on past ordering pace or overdue balances, risking booking new orders when old payments are still pending.
   - Outcome: Confirmed that BDMs should have full commercial context on their phones. I placed 6-month billing trends, overdue flags, and credit windows right on the outlet profile so payment collection is addressed before writing fresh orders.

4. Clarifying Raw Data Handling & Duplicate Records (Question 9):
   - Why I asked: The source CSVs contained duplicate shops, missing GPS coordinates, blank credit terms, and inconsistent town names (like Madras vs Chennai). I needed to confirm whether to clean the files on disk or handle them safely in application logic.
   - Outcome: Confirmed that source CSV files should never be quietly modified or overwritten on disk. I built runtime normalization for town aliases, non-breaking fallbacks for missing coordinates, and an interactive 1-click Twin Merge tool to resolve duplicate coverage inflation while preserving original audit data.

9. FUTURE IMPLEMENTATION

The following roadmap capabilities are planned for upcoming releases to further enhance security, cross-platform access, automated financial operations, and data ingestion flexibility:

1. Superadmin Access, Role-Based Access Control (RBAC) & Password Recovery:
   - Superadmin Master Control: Full administrative privileges to manage database seeds, upload master CSV datasets, approve duplicate outlet merges, and configure system policies.
   - Separate Role-Restricted User Logins: Dedicated login credentials for each of the 12 Business Development Managers (BDMs), restricting their visibility exclusively to their assigned territory outlets, beat routes, and performance scorecards.
   - Self-Service Forgot Password: Secure, tokenized password reset links sent via verified corporate email.
   * Project Example: 
     When BDM "karthik_mdu" logs in, he only sees the 68 retail counters assigned to Madurai (e.g., Poorvika Mobile World - Simmakkal), can log visits, and capture photos. He cannot access Master CSV imports or edit global settings. Meanwhile, the Superadmin logs in to oversee all 12 Tamil Nadu territories, manage master merges, create new BDM accounts, and reset user passwords.

2. Simultaneous Web & Dedicated Mobile Application Access:
   - Unified Dual Platform: The system can be accessed simultaneously via modern web browsers (Chrome/Safari) on desktop laptops and as an installable standalone mobile application (PWA / Native App via Capacitor/React Native) on iOS and Android devices.
   * Project Example: 
     BDM Priya is in the field visiting Sangeetha Mobiles in Coimbatore with fluctuating mobile reception. She uses the installed mobile app on her smartphone to seamlessly review 6-month billing, complete the 5-point checklist, and book indents offline. At the same time, the Head of Sales at headquarters in Chennai accesses the web portal on their office laptop to review live statewide analytics, anomaly reports, and territory health.

3. Real-Time Payment Reminders & Overdue Alerts (WhatsApp / SMS / Email):
   - Automated Pre-Due & Overdue Notifications: Automated message dispatch (via WhatsApp Business API, SMS gateway, or Email) triggered when an outlet's invoice is nearing the credit window expiration (e.g., 3 days before due date) or exceeds the allowed credit period (15, 30, or 45 days).
   * Project Example: 
     Supreme Mobiles (Trichy) has a 30-day credit term with an invoice of ₹4,50,000 billed on July 5th. On Day 27 (3 days before due), the system automatically triggers a friendly WhatsApp notification to the store owner with invoice details. If unpaid by Day 31, the system sends an urgent overdue alert to both the store owner and the Trichy BDM to reconcile payments before booking any fresh shipments.

4. Smart CSV Field & Column Mapping Wizard:
   - Flexible Ingestion Interface: Eliminates the requirement for uploaded CSV files to strictly match predefined column headers (e.g., 'Outlet Code,Outlet Name,Town,Owner Name'). Allows administrators to upload raw CSV exports directly from any third-party accounting/distributor software (such as Tally, SAP, Marg, or Busy) and map columns interactively in the browser.
   * Project Example: 
     If the distributor exports a billing sheet containing non-standard headers like "Store_ID", "Dealer_Name", "City", and "Payment_Window", the Admin does not need to manually edit the spreadsheet in Excel. Instead, the upload screen presents a visual mapping dropdown where the admin maps:
     - "Store_ID" -> Outlet Code
     - "Dealer_Name" -> Outlet Name
     - "City" -> Town / Territory
     - "Payment_Window" -> Credit Days
     The application previews the mapped dataset, validates required data types, and imports records into the SQLite database seamlessly.

5. In-App Direct Messaging & User Chat System:
   - Targeted Direct Messaging: Allows administrators and territory managers to send personalized, real-time messages and actionable instructions directly to a specific user (such as an individual BDM or field executive).
   - In-Dashboard Conversation Hub: A built-in chat interface embedded right inside the web dashboard and mobile app, enabling two-way communication where users can view ongoing message history, reply instantly, and resolve field queries without switching to external messaging apps.
   * Project Example: 
     The Sales Admin notices that an outlet in Madurai has been dormant for 45 days and needs urgent attention. Instead of sending an unmonitored external text or phone call, the Admin clicks the BDM's profile in the dashboard and sends a direct message: "Please prioritize visiting Rathna Stores today to check if they need fresh iPhone 15 stock." BDM Karthik instantly sees the message badge in his dashboard, reviews the conversation thread, and replies directly with an on-ground status update.