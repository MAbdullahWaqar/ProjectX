# RealDoor — Application-Readiness Copilot

> **Built for the 6th Global AI Hackathon**  
> A renter-side copilot that turns messy household documents into a human-confirmed profile, explains complex housing rules, identifies missing documents, and creates a renter-controlled application-readiness packet — **without ever deciding eligibility.**

---

## 📖 The Problem
Applying for affordable housing (like the LIHTC program) is an overwhelming, high-stakes process. Renters face fragmented requirements, confusing income math, and minor paperwork errors that can delay applications for weeks.

Typically, AI in the housing space is built for *property managers* to screen, evaluate, and adjudicate renters. 

## 💡 Our Solution
RealDoor flips the script. It is an AI tool built exclusively to **advocate for the renter**. 
The AI extracts, explains, retrieves, calculates, and prepares. **The renter confirms. A qualified human decides.**

RealDoor reduces avoidable friction by making published rules legible, mathematically cross-checking extracted documents, and preparing a clean packet that a human compliance officer can easily review. 

---

## 🚀 Key Features (The 4 Stages)

### 1. Profile (Data Extraction & Verification)
Renters upload synthetic household documents (e.g., pay stubs). The AI extracts the data, but RealDoor doesn't just blindly trust it. The engine mathematically cross-checks the values (e.g., dividing YTD income by Gross to verify pay periods). The renter **must manually confirm** every value before it is locked into their profile.

### 2. Understand (Rule Demystification & RAG)
A deterministic engine instantly calculates the renter's exact income against the frozen 2026 HUD rule corpus. A built-in chat interface allows the renter to ask questions about the rules. The system uses RAG to retrieve exact, cited answers directly from the rulebook. If a user asks "Am I eligible?", the AI strictly deflects.

### 3. Prepare (Checklist & Packet Generation)
Based on the extracted data, RealDoor generates a dynamic checklist of missing or expired documents. Once ready, it compiles a secure, Markdown/PDF readiness packet that the renter controls. 

### 4. Discover (Transparent Property Browsing)
A transparent, unfiltered directory of properties using public location data. It never ranks, scores, or sorts by protected traits. Availability is marked as "Unknown" unless explicitly proven, and filters are purely renter-driven.

---

## 🛡️ Strict Technical Guardrails

RealDoor was engineered under severe, self-imposed constraints to ensure maximum safety and compliance:

- **Zero Eligibility Decisioning:** The system is explicitly blocked from inferring acceptance, predicting outcomes, or making adjudicative decisions. 
- **100% Client-Side Architecture:** There is no backend database. No sensitive data is ever sent to a server for storage. All state is maintained locally in the browser and vanishes instantly upon closing the tab or clicking "Delete Session Data".
- **Deterministic Math Override:** AI is never used to perform compliance math. The LLM extracts strings; a hardcoded, deterministic TypeScript/JavaScript rules engine performs the calculations.
- **Explicit Consent & Revocation:** Data extraction is blocked until explicit consent is given, and can be revoked at any time.

---

## 🎨 UI/UX & Architecture

- **Vanilla HTML/CSS/JS:** Built entirely without massive frameworks (No React, No Next.js), keeping the footprint incredibly lightweight and secure.
- **Shadcn UI Aesthetic:** The custom CSS `styles.css` is meticulously engineered to perfectly emulate modern Shadcn UI design tokens (using precise HSL variables, subtle borders, crisp focus rings, and an exact typography scale). It feels like a premium B2B enterprise tool.
- **WCAG 2.2 AA Accessible:** Semantic HTML, strict ARIA roles, high-contrast states, and full keyboard navigability. 

---

## 🧪 Testing
The architecture is rigorously tested to prove that the guardrails hold.
- **68 Logic Tests:** Ensuring math is deterministic, PI boundaries hold, and decision-making is impossible.
- **48 UI Tests:** Validating that semantic ARIA roles exist, consent flows block extraction, and the UI responds perfectly to state changes.

Total: **116 Passing Tests.**

---

## 💻 Quickstart

Because RealDoor is 100% client-side, running it is incredibly simple.

1. Clone the repository:
   ```bash
   git clone https://github.com/MAbdullahWaqar/ProjectX.git
   cd RealDoor
   ```
2. Serve the static files (using any local server, like Python):
   ```bash
   python3 -m http.server 3000
   ```
3. Open `http://localhost:3000` in your browser.

To run the test suite:
```bash
npm install
npm run test:ui
```

---

## 🏆 Hackathon Rubric Alignment
- **Product Promise:** Purely assistive, no decisioning.
- **Technical Depth:** Client-side processing, RAG citations, deterministic math engine.
- **Responsible AI:** Strict consent flows, session-deletion controls, no protected-trait sorting.
- **UX Excellence:** Premium Shadcn aesthetic, WCAG 2.2 AA compliant, wide-dashboard layout.
