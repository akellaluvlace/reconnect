# Axil — Testing & Beta Plan

---

## 1. Recording Pipeline Testing Strategy

The Google Meet recording pipeline has 4 independent pieces. Test each one separately before running end-to-end.

### Phase A: Manual Upload Path (no Google needed)

Build and test the Whisper + Claude pipeline using uploaded audio files. This validates the entire AI analysis flow without any Google dependency.

**How to test:**
1. Record a short audio clip (phone voice memo, any format) — 1-2 minutes of someone answering an interview-style question
2. Upload via the manual upload button on the interview card
3. Verify: file accepted → Whisper transcribes → transcript stored → Claude synthesizes feedback

**What this proves:** The AI pipeline works end-to-end. If this passes, the only remaining question is "can we get the recording out of Google Drive?" — which is a much simpler problem.

### Phase B: Google Calendar + Meet Link (no recording needed)

Test that scheduling creates a real calendar event with a Meet link.

**How to test:**
1. Schedule an interview in Axil (pick any future date)
2. Check the Google Workspace calendar — event should appear
3. Verify: Meet link is on the event, interviewer is co-host, candidate is attendee
4. Cancel the interview in Axil — event should be removed from calendar

**What this proves:** Calendar API integration works, Meet links are generated correctly.

### Phase C: Recording Retrieval (one short test call)

This is the only step that requires two people on a call.

**How to test:**
1. Schedule a test interview in Axil (creates Meet event)
2. Two people join the Meet link — say a few sentences (60-90 seconds is enough)
3. End the call
4. Wait ~5 minutes for Google to process the recording
5. Click "Check Recording" in Axil (or let the background poll find it)
6. Verify: recording status changes to "uploaded", Drive file ID is stored

**What this proves:** Meet API returns the correct Drive file ID after a call ends.

### Phase D: Full End-to-End (one short test call)

Combine everything: schedule → call → record → retrieve → transcribe → synthesize.

**How to test:**
1. Schedule interview in Axil
2. Two people join, have a scripted 90-second conversation:
   - "Tell me about your experience with project management"
   - "I've led a team of 5 on a 6-month project..."
3. End the call
4. Submit feedback form for the candidate
5. Wait for recording retrieval (automatic polling)
6. Trigger AI synthesis
7. Verify: synthesis includes both transcript analysis AND feedback form data

**What this proves:** The complete pipeline works. One successful run = confidence to go to beta.

---

## 2. Beta Testing System

### 2.1 Beta Group Setup

- **Size:** 5-10 testers from client's team
- **Roles to cover:** At least 1 admin, 2 managers, 3-4 interviewers
- **Duration:** 5 business days (1 week)
- **Access:** Production deployment with test data clearly labelled

### 2.2 Bug Report Template

Every bug report must include these fields. Share this with all beta testers.

```
**Page/Feature:** [e.g., Playbook Discovery, Feedback Form, Login]
**What I did:** [Step-by-step what you clicked/typed]
**What I expected:** [What should have happened]
**What happened instead:** [What actually happened — error message, blank screen, wrong data, etc.]
**Browser:** [Chrome / Firefox / Edge / other]
**Screenshot:** [Attach if possible — especially for UI bugs]
**Severity:**
  - Blocker: Can't continue using the app at all
  - Major: Feature doesn't work, but I can use other parts
  - Minor: Cosmetic issue or minor inconvenience
```

### 2.3 Structured Test Scenarios

Give each tester a checklist to follow. This ensures every critical path gets tested by at least 2 people.

#### Scenario 1: First-Time Setup (Admin)
- [ ] Register with email + password
- [ ] Verify email confirmation works
- [ ] Land on empty dashboard — does empty state make sense?
- [ ] Invite a team member (manager role)
- [ ] Verify they received the invitation email

#### Scenario 2: Create a Playbook (Admin or Manager)
- [ ] Click "Create Playbook"
- [ ] Fill in role title, department, level
- [ ] Go through Discovery: trigger market research, review AI-generated insights
- [ ] Edit the job description — does AI-generated content make sense?
- [ ] Go through Process: add 3 stages, generate focus areas + questions
- [ ] Review AI-generated questions — are they relevant?
- [ ] Go through Alignment: generate candidate profile
- [ ] Add a collaborator via email
- [ ] Create a share link, open it in an incognito window

#### Scenario 3: Interview Flow (Interviewer)
- [ ] Receive collaborator invite email
- [ ] Click magic link — does it log you in?
- [ ] See only your assigned stage (not the full playbook)
- [ ] See focus areas and questions for your stage
- [ ] Submit feedback: rate each category 1-4, add pros/cons, confirm focus areas
- [ ] Try to view other interviewers' feedback — should NOT be visible

#### Scenario 4: Manager Review (Manager)
- [ ] Open a playbook with submitted feedback
- [ ] See all interviewers' feedback (not just your own)
- [ ] Trigger AI synthesis
- [ ] Review AI output — does it have a disclaimer? Does it avoid hire/no-hire?
- [ ] Check that scores, highlights, and concerns make sense

#### Scenario 5: Recording Flow (requires Meet)
- [ ] Schedule an interview via Axil
- [ ] Verify calendar event + Meet link created
- [ ] Join the call with another person (90-second test)
- [ ] After call ends, check recording status
- [ ] Verify transcription appears
- [ ] Trigger synthesis — does it reference both transcript and feedback?

#### Scenario 6: Edge Cases (anyone)
- [ ] Try submitting feedback with all fields empty — should show validation errors
- [ ] Try extremely long text in notes (paste 5000 characters)
- [ ] Try accessing a revoked share link — should get blocked
- [ ] Try accessing someone else's playbook URL — should get 403
- [ ] Delete a stage that has feedback attached — what happens?

### 2.4 Feedback Collection Process

**Channel:** Shared spreadsheet (Google Sheets or similar) with columns:
| Date | Tester | Scenario # | Page | Bug or Feedback? | Description | Severity | Screenshot | Status |

**Rules:**
- One row per issue (don't bundle multiple bugs in one row)
- Check if someone already reported the same issue before adding a new row
- "Feedback" = suggestions or opinions (not bugs). These go to backlog, not hotfix.
- "Bug" = something broken. Gets triaged daily.

**Daily triage (us):**
1. Review new rows every morning
2. Mark duplicates
3. Assign severity (override tester's assessment if needed)
4. Fix blockers same-day, majors within 48 hours, minors go to backlog
5. Update "Status" column: Investigating → Fixed → Deployed → Verified

### 2.5 Success Criteria

Beta is complete when:
- [ ] All 6 scenarios tested by at least 2 different testers
- [ ] Zero open blocker bugs
- [ ] All major bugs fixed or have documented workarounds
- [ ] Client signs off on AI output quality (synthesis makes sense for real roles)
- [ ] Recording pipeline works end-to-end at least once with a real call
- [ ] Share link data scope verified by client (no sensitive data leaks)

---

## 3. Pre-Beta Verification (Internal — Before Testers Get Access)

Run through this ourselves before opening beta:

- [ ] Deploy all migrations to production
- [ ] Set all env vars in Vercel
- [ ] Register a test account, create a playbook, go through full Discovery → Process → Alignment flow
- [ ] Test auth: email+password, Google OAuth, Microsoft OAuth
- [ ] Test collaborator invite: send real email, click real magic link
- [ ] Test share link: open in incognito, verify minimal data scope
- [ ] Test AI generation: market research, JD, stages, questions, candidate profile, synthesis
- [ ] Test manual audio upload + transcription
- [ ] Test recording pipeline (one short Meet call)
- [ ] Check every page for missing empty states or broken layouts
- [ ] Run E2E smoke tests against production URL
