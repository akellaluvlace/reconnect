# Axil Update — What's New + How to Test

---

## 1. Alignment Chapter — Email System

**What changed:**
The email system now uses your CMS templates. When you send a prep brief or feedback reminder to an interviewer, the system:

1. Checks if you've set up a custom email template in **Settings > Admin > Email Templates**
2. If you have one, it loads it into the send modal — already filled in with the real data (interviewer name, role title, stage names, access link)
3. If you haven't created a template yet, it falls back to a sensible default
4. Either way, you can edit the email before hitting send — it's never locked

**The placeholders work like this:**
When you write `Hi {{interviewer_name}}`, the system replaces it with the actual interviewer's name. Same for `{{role_title}}`, `{{candidate_name}}`, `{{stage_name}}`, and `{{playbook_link}}`.

**The access link (`{{playbook_link}}`):**
This is a magic link — the interviewer clicks it, no login needed. It takes them straight to their interview prep page showing:
- Which role they're interviewing for
- Their assigned stages
- Focus areas and weights for each stage
- Suggested questions with purpose notes
- The 1-4 rating guide

They don't see salary, other people's feedback, AI analysis, or anything beyond their assignment.

---

## 2. CMS Admin (Settings > Admin)

This is your org's control panel. Seven sections, all work the same way — add, edit, deactivate.

| Section | What It Does | Where It Shows Up |
|---|---|---|
| **Skills** | Your skill taxonomy ("JavaScript" not "JS") | Playbook wizard — autocomplete suggestions |
| **Industries** | Industries you recruit for | Playbook wizard — dropdown |
| **Levels** | Seniority levels (Graduate -> Director) | Playbook wizard — dropdown |
| **Stage Templates** | Pre-built interview stages | Process chapter — stage creation |
| **Question Bank** | Curated question library | Process chapter — "Browse Bank" button |
| **JD Templates** | Job description structures | Discovery chapter — JD generation |
| **Email Templates** | Prep brief + reminder emails | Alignment chapter — send modals |

**Seed data:** There's a "Load starter data" button at the top of the Admin page. It gives you 5 levels, 6 industries, 3 stage templates, and common questions to start with. You can modify or deactivate any of them.

**Everything is org-scoped** — your templates are private to your org. Other companies on the platform can't see or use them.

### Email Template Placeholders

| Placeholder | Replaced with |
|---|---|
| `{{interviewer_name}}` | The interviewer's name |
| `{{candidate_name}}` | Candidate/role name |
| `{{role_title}}` | Full playbook title |
| `{{stage_name}}` | Assigned stage names |
| `{{playbook_link}}` | Interviewer's access link (no login needed) |

### Quick Tips

- **Start with skills and levels** — used most in the wizard
- **Build the question bank over time** — add questions that worked well after each hire
- **Deactivate, don't delete** — hides items without losing data
- **Email templates show in the send modal** — when you send prep/reminder emails from the Alignment chapter, your CMS template is loaded as the default (editable before sending)

---

## 3. What to Test

**CMS Admin (Settings > Admin):**
- [ ] Click "Load starter data" — does it populate the sections?
- [ ] Add a custom skill, edit it, deactivate it
- [ ] Add a level — does it appear in the playbook wizard dropdown?
- [ ] Add an industry — does it appear in the wizard?
- [ ] Create a stage template — does it show when creating stages in Process?
- [ ] Add a question to the bank — can you find it via "Browse Bank" in a stage?
- [ ] Create an email template (type: prep) with `{{interviewer_name}}` and `{{playbook_link}}` — does it load correctly when you send a prep email from Alignment?

**Alignment Chapter (on any playbook):**
- [ ] Add a collaborator (interviewer), assign them stages
- [ ] Click "Send Prep" — does the modal show your CMS template (or a sensible default)?
- [ ] Are the placeholders replaced with real data in the preview?
- [ ] Send the email — does the interviewer receive it?
- [ ] Click the magic link from the email in an incognito window — does it open the prep page without requiring login?
- [ ] Does the prep page show the right stages, focus areas, questions, and rating guide?

**General:**
- [ ] Settings page — does it show the Admin section link? (only visible to admins)
- [ ] Does the playbook wizard pull your CMS skills/levels/industries?

---

## 4. What's Not Live Yet

- **Debrief chapter** — built but disabled in the nav (shows a lock icon). Waiting on the Google Workspace upgrade for the recording pipeline before enabling it.
- **Feedback submission** — interviewers can see their prep, but can't submit feedback yet. That's the next build once we have the recording pipeline.
- **Notification system** — planned but not built yet (e.g. "feedback submitted" alerts, daily reminders).

---

**Feedback welcome.** Let us know what works, what doesn't, and anything you'd change.
