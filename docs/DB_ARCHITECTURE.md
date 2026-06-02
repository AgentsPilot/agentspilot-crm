# AgentsPilot CRM — Database Architecture
**Version:** 2.0  
**Last updated:** May 2026  
**Platform:** Supabase (PostgreSQL)

---

## Overview

The CRM tracks three types of contacts across two acquisition paths. All contacts live in a single `contacts` table, connected to tasks, emails, alarms, and automation activity.

---

## Acquisition Paths

```
PATH 1 — Social / External
──────────────────────────
Social Form / Landing Page
         │
         ▼
      [LEAD]                ← no account, captured from external source
         │
    Registers on AP web
         │
         ▼
     [TRIAL]                ← has account, 14-day free trial
         │
      Pays
         │
         ▼
      [PAID]                ← active paying customer


PATH 2 — Direct Web Signup
──────────────────────────
AgentsPilot Website (/demo)
         │
         ▼
      [TRIAL]               ← skips Lead, goes straight to trial
         │
      Pays
         │
         ▼
      [PAID]
```

**Rules:**
- Leads are ONLY created from social/external forms — never from the web signup
- Every web signup starts as Trial — there is no direct Paid signup
- All three types share one record in the `contacts` table (no duplication)

---

## Tables

### 1. `contacts` — Core table

The single source of truth for all people in the CRM.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Unique identifier |
| `type` | text | `lead` \| `trial` \| `paid` |
| `full_name` | text | Contact full name |
| `email` | text UNIQUE | Email address |
| `phone` | text | Phone number |
| `company` | text | Company name |
| `source` | text | `social` \| `web` \| `manual` |
| `utm_source` | text | e.g. instagram, facebook, landing_page |
| `utm_medium` | text | e.g. organic, paid, cpc |
| `utm_campaign` | text | Campaign name |
| `channel` | text | Marketing channel label |
| `lead_captured_at` | timestamptz | When lead was first captured |
| `registered_at` | timestamptz | When they created an account |
| `trial_started_at` | timestamptz | Trial start date |
| `trial_expires_at` | timestamptz | Trial end date (start + 14 days) |
| `converted_at` | timestamptz | When they became a paid customer |
| `mrr` | numeric | Monthly Recurring Revenue ($) |
| `plan` | text | Plan name (starter, pro, enterprise) |
| `customer_source` | text | How they converted (stripe, manual) |
| `lead_score` | integer | 0–100 engagement score |
| `funnel_level` | text | Interest / Consideration / Decision |
| `last_activity_at` | timestamptz | Last login or interaction |
| `tags` | text[] | Array of tags e.g. ['trial', 'at-risk'] |
| `notes` | text | Free text notes |
| `payment_failed` | boolean | Stripe payment failure flag |
| `manual_at_risk_flag` | boolean | Manually flagged as at-risk |
| `created_at` | timestamptz | Record creation time |
| `updated_at` | timestamptz | Last update (auto-managed) |

**Type field rules:**

| `type` | Who | Required fields |
|--------|-----|-----------------|
| `lead` | Captured from social/form | `full_name`, `source = social` |
| `trial` | Registered on AP web | `email`, `trial_started_at`, `trial_expires_at` |
| `paid` | Converted customer | `converted_at`, `mrr > 0` |

**Type transitions:**
```
lead → trial   (contact registers on AP website)
trial → paid   (contact subscribes to a plan)
```

---

### 2. `tasks` — CRM tasks & follow-ups

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `contact_id` | uuid FK → contacts.id | Linked contact |
| `contact_name` | text | Denormalized for display |
| `title` | text | Task title |
| `type` | text | `Follow-up` \| `Onboarding` \| `Win-back` \| `Urgent` \| `Call` \| `Email` \| `Admin` |
| `priority` | text | `High` \| `Medium` \| `Low` |
| `due_date` | date | Due date |
| `kanban_status` | text | `todo` \| `inprogress` \| `done` |
| `done` | boolean | Completed flag |
| `notes` | text | Task notes |
| `alarm_at` | timestamptz | Optional alarm time |
| `alarm_triggered` | boolean | Alarm fired flag |
| `created_at` | timestamptz | |

**Kanban column mapping:**

| Task type | Kanban column |
|-----------|---------------|
| Follow-up | To Do |
| Onboarding | In Progress |
| Win-back | To Do |
| Urgent | In Progress |

---

### 3. `emails` — Email log

All emails sent by the system (manual + automated).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `contact_id` | uuid FK → contacts.id | Linked contact |
| `to_email` | text | Recipient email |
| `to_name` | text | Recipient name |
| `contact_name` | text | Denormalized |
| `subject` | text | Email subject |
| `body` | text | Email body (HTML) |
| `template_name` | text | Template used |
| `status` | text | `sent` \| `queued` \| `failed` \| `draft` |
| `task_id` | uuid | Linked task (if created from task) |
| `created_at` | timestamptz | |

**Email templates:**

| Template | Trigger | Type |
|----------|---------|------|
| Welcome to Trial | Trial signup | Auto |
| Activate Your Trial | 2 days inactive | Auto |
| Trial Mid-Point Check-in | Day 7 of trial | Auto |
| Trial Expiring in 3 Days | 3 days before expiry | Auto |
| Trial Expired — Win-back | Trial end date | Auto |
| At-Risk Check-in | Status = at_risk | Auto |
| Churned Win-back | Status = churned | Auto |

---

### 4. `automation_settings` — Rule on/off switches

| Column | Type | Description |
|--------|------|-------------|
| `rule_id` | text PK | Rule identifier |
| `enabled` | boolean | On/off toggle |
| `last_run_at` | timestamptz | Last cron execution |
| `last_run_count` | integer | Contacts processed last run |
| `updated_at` | timestamptz | |

**Rule IDs:**

| rule_id | Description |
|---------|-------------|
| `trial_signup_welcome` | Welcome email on signup |
| `new_lead_followup` | Follow-up for new leads |
| `trial_inactive_2d` | Nudge after 2 inactive days |
| `trial_expiring_3d` | Warning 3 days before expiry |
| `trial_expired` | Win-back on expiry |
| `at_risk_alert` | Check-in for at-risk contacts |
| `trial_midpoint_7d` | Mid-point check-in email |
| `churned_winback` | Win-back sequence (day 7/14/30) |

---

### 5. `automation_config` — Key/value config store

| Column | Type | Description |
|--------|------|-------------|
| `key` | text PK | Config key |
| `value` | text | Config value |
| `updated_at` | timestamptz | |

**Config keys:**

| Key | Default | Description |
|-----|---------|-------------|
| `at_risk_inactivity_days` | `30` | Days of inactivity before at-risk |
| `at_risk_signals` | `{"inactivity":true,...}` | JSON: which signals are active |

---

### 6. `automation_runs` — Automation audit log

Every time a rule fires for a contact, a row is inserted here.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `rule_id` | text | Which rule fired |
| `contact_id` | uuid FK → contacts.id | Which contact |
| `contact_name` | text | Denormalized |
| `action` | text | What happened (e.g. "Sent welcome email") |
| `triggered_at` | timestamptz | When it fired |

---

## Entity Relationships

```
contacts (1) ────────── (many) tasks
contacts (1) ────────── (many) emails
contacts (1) ────────── (many) automation_runs

automation_settings  (standalone — no FK)
automation_config    (standalone — no FK)
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/leads` | POST | Create contact from /demo or /contact form |
| `/api/send-email` | POST | Send manual email |
| `/api/cron/lifecycle` | GET | Run all automation rules (daily 9am) |
| `/api/webhooks/stripe` | POST | Convert trial → paid on payment *(coming soon)* |

---

## Automation Flow

```
                    Daily CRON (9am)
                         │
          ┌──────────────┼──────────────────┐
          ▼              ▼                  ▼
   trial_inactive    trial_expiring      at_risk
   2+ days           in 3 days           detected
          │              │                  │
   Send activation  Send warning       Send check-in
   email            email              email
   Create task       Create alarm      Create alarm
          │
          ▼
   trial_midpoint
   (day 7)
          │
   Send tips email


   On signup (/api/leads):
   ─────────────────────
   trial signup  →  Welcome email (immediate)
                 →  Follow-up task (2 days)
                 →  Admin notification

   lead signup   →  Welcome email (immediate)
                 →  Follow-up task (2 days)
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (bypasses RLS) |
| `RESEND_API_KEY` | ✅ | Resend email API key |
| `RESEND_FROM_EMAIL` | ✅ | Sender address |
| `ADMIN_EMAIL` | ✅ | Admin notification recipient |
| `CRON_SECRET` | ⚠️ | Secures the cron endpoint in production |

---

*Document generated by AgentsPilot Engineering*
