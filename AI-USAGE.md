# AI Usage Log

## Tools Used
- **Google Antigravity (Gemini Flash)**: Used for core development, file edits, running terminal commands, and build verification.
- **Claude**: Used for architectural thinking, domain logic design (5-point checklists per outlet type and the 4-tier inactive outlet definition), and complex TypeScript implementation.
- **Cursor**: Used for in-editor code improvements, refactoring, and quick inline fixes.
- **Google Stitch**: Used for dashboard UI layout references and design mockups.

---

## What I Used AI For

1. **CSV Parsing & Cleaning**: Writing PapaParse data loaders and handling messy strings (`"30 days"`, `"COD"`, town spelling variations).
2. **UI & Components**: Building the mobile counter drawer, 5-point checklist modals, and desktop dashboards.
3. **Duplicate Detection & Merging**: Writing the algorithm to detect duplicate outlets by name and coordinates, plus the 1-click merge tool.
4. **Embedded Backend & SQLite Database**: Creating a native SQLite (better-sqlite3) REST API for local persistence, session uthentication, and data seeding with zero external configuration.

---

## Where the AI Was Wrong & How I Caught It

### 1. Geofencing Assumption (The Madurai Shared-Wall Problem)
- **The Error**: The AI automatically added browser GPS tracking and a 500-meter radius check to verify visits.
- **Why It Was Wrong**: In places like Madurai, three shops share the same physical wall. Phone GPS cannot tell which shop a BDM entered. Also, GPS permission prompts added friction for field reps.
- **How I Caught It**: I removed all GPS tracking and replaced it with tangible proof: storefront photos, 5-point checklist completion, and purchase order bookings.

### 2. Schema Typo in CSV Validator (TypeScript Error)
- **The Error**: The AI added an `expectedFileName` property inside the CSV validation schema object.
- **Why It Was Wrong**: That property did not exist in the TypeScript interface.
- **How I Caught It**: Running `npx tsc --noEmit` caught the compiler error immediately, and I removed the invalid field.

---

## Summary
AI accelerated boilerplate coding, UI setup, and data parsing significantly. However, human oversight was essential to align the code with real-world business constraints (like shared-wall shops) and keep TypeScript builds clean.
