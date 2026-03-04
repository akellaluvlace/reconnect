# Axil Platform — Status Report (4 March 2026)

## Summary

This update covers all client feedback from the Review/Feedback Doc plus production resilience, cost optimisation, and UX improvements. All changes are live or ready for deployment on app.axil.ie.

---

## Client Feedback — Resolved

All items from the Review/Feedback Doc have been addressed:

### 1. Questions under Focus Areas (not bunched at bottom)
**Feedback:** _"Is it possible to have the suggested Qs for each section under the relevant focus area instead of bunched together at the bottom?"_

**Done.** In edit mode, questions now appear directly under their relevant focus area — not in a separate block at the bottom. Each focus area shows its own questions with full editing capabilities.

### 2. Per-Question Editing in Edit Mode
**Feedback:** _"When I go back to the interview stages section, I can't add a question."_

**Done.** Full per-question editing is now available inside each focus area:
- **Inline edit** — click pencil to edit any question's text directly
- **Delete** — remove individual questions
- **AI Refine** — click the AI icon on any question to get 3 alternative suggestions (with optional guidance, e.g. "make it more behavioral")
- **AI Generate** — describe what you want to assess and AI creates new questions
- **Regenerate All** — replace all questions for a focus area (with confirmation)
- **Add custom** — manually type a new question

### 3. Questions Regenerate When Focus Areas Change
**Feedback:** _"When you click edit, you can edit the focus areas but the questions don't regenerate based on these edits."_

**Done.** Users can now regenerate questions per focus area after editing. AI generation uses the updated focus area name, description, and stage context. Renaming a focus area automatically updates all its linked questions.

### 4. Weight Tooltip
**Feedback:** _"What does the weight mean? I need to be able to explain it."_

**Done.** Hovering the info icon next to any weight displays: _"Relative importance (1–4) in your overall hiring evaluation. 4 = critical to assess, 1 = good to check if time allows."_

### 5. Process Source Info
**Feedback:** _"Where is the suggested process coming from?"_

**Done.** Below the stage list header: _"Process designed from your market research, role requirements, and industry interview frameworks."_ A "How to use this page" guide is also available explaining all editing features.

### 6. Finalize Button
**Feedback:** _"A functional button/click to confirm the process is aligned and complete would be a value add."_

**Done.** A "Finalize Process" button is available for the user to confirm their process is complete before moving to collaborators.

### 7. Coverage Confidence (Noted — Ongoing)
**Feedback:** _"If Axil is making too many suggested improvements on its own recommendations, it doesn't give the user the confidence they need."_

**Acknowledged.** The AI refinement cap (max 2 iterations) helps here. The coverage analysis is designed to catch edge cases the AI's initial pass might miss — but we're tuning it so the gap count is lower and the initial generation is tighter. This is an ongoing refinement.

---

## UX/UI Polish (This Session)

- **Spacing overhaul** — All stage cards, focus areas, and questions now have consistent breathing room. No more "wall of text" feel.
- **Text contrast** — Headings, body text, and secondary text have clear visual hierarchy. Grey text made more readable.
- **Input focus** — Single clean border on focus. Removed double-border issue (outline + border conflict).
- **Edit mode border** — Removed distracting green highlight border from cards being edited.
- **Focus area scroll** — Adding a new focus area auto-scrolls it into view.
- **How to use guide** — Expandable guide explaining drag & drop, edit, expand, focus areas, questions, AI features, add/insert, and delete.

---

## Key Features (Previous)

### Smart Role Suggestions (Cost Saving)
Previously researched roles suggested as you type. Cache hit = instant results, saves ~€0.28 and ~80s per playbook.

### AI Refinement Cap (Cost + Quality Control)
Max 2 AI refinement iterations per playbook. Enforced client + server side. History with restore available.

### Session Expiry Handling
Expired sessions redirect to login with clear message instead of error popups.

---

## Production Hardening

| Area | What Changed |
|------|-------------|
| **AI Timeouts** | Proper timeout limits on server (up to 5 min) and browser. Clear errors instead of infinite spinners. |
| **Score Stability** | Coverage scores can only go up or stay the same after improvements. |
| **Gap Severity** | Gaps can only improve in severity on re-analysis. |
| **Save Reliability** | Data save limit increased for larger playbooks. |
| **Error Messages** | User-friendly messages on all AI errors. |

---

## Test Coverage

- **535 automated tests** passing across the web application
- **389 AI pipeline tests** passing
- **233 database tests** passing
- All changes typecheck clean with zero errors

---

## What's Next

- Deploy latest changes to app.axil.ie
- Awaiting client decision (response expected shortly)
- Step 10.2: Interview scheduling pipeline (cron jobs, state machine, UI)
- Share link stage scoping (collaborators see only their assigned stage)
