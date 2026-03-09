# Axil CMS — Admin Guide

## What is it?

The CMS is your company's control panel inside Axil. It lets you customise the data that powers the platform — skills, interview stages, questions, email templates — without needing a developer.

**Access:** Settings > Admin (visible to admins only, one admin per org).

---

## The 7 Sections

### 1. Skills
Your org's skill taxonomy. When hiring managers create playbooks, these appear as autocomplete suggestions — keeping naming consistent ("JavaScript" not "JS").

### 2. Industries
Industries your org recruits for. Used in the playbook wizard and feeds into AI market research.

### 3. Levels
Your seniority levels (e.g., Graduate, Mid, Senior, Director). Define what each means at your company. Used in the playbook wizard.

### 4. Stage Templates
Pre-built interview stages with focus areas and questions. Save time by templating your standard process (e.g., "HR Screen — 30min — Culture Fit + Motivation") and reusing across roles.

### 5. Question Bank
Your org's curated question library. When editing a stage in the Process chapter, click **"Browse Bank"** to pull from this library alongside AI-generated questions.

### 6. JD Templates
Reusable job description structures (summary, responsibilities, qualifications, benefits). The AI uses these as a starting point when generating JDs.

### 7. Email Templates
Customise the emails sent to interviewers (prep briefs and feedback reminders). Use placeholders that auto-fill with real data:

| Placeholder | Replaced with |
|---|---|
| `{{interviewer_name}}` | The interviewer's name |
| `{{candidate_name}}` | Candidate/role name |
| `{{role_title}}` | Full playbook title |
| `{{stage_name}}` | Assigned stage names |
| `{{playbook_link}}` | Interviewer's access link (no login needed) |

---

## Seed Data

Click **"Load starter data"** (top of Admin page) to populate defaults:
- 5 levels, 6 industries, 3 stage templates, common questions

You can modify or deactivate any of these. Skills, JD templates, and email templates start empty.

---

## How It Flows Into the Platform

| CMS Section | Where it appears |
|---|---|
| Skills | Playbook wizard — skill autocomplete |
| Industries | Playbook wizard — industry dropdown |
| Levels | Playbook wizard — level dropdown |
| Stage Templates | Process chapter — stage creation |
| Question Bank | Process chapter — "Browse Bank" in stage editor |
| JD Templates | Discovery chapter — JD generation |
| Email Templates | Alignment chapter — prep & reminder emails |

---

## Org-Level Isolation

Each organisation has its own CMS data. Templates and settings are private to your org — other companies on the platform cannot see or use them.

---

## Quick Tips

- **Start with skills and levels** — used most in the wizard
- **Build the question bank over time** — add questions that worked well after each hire
- **Deactivate, don't delete** — hides items without losing data
- **Email templates show in the send modal** — when you send prep/reminder emails from the Alignment chapter, your CMS template is loaded as the default (editable before sending)

---

**Feedback welcome.** If you'd like any changes to how the CMS works, sections added/removed, or different defaults — let us know.
