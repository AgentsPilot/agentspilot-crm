# AgentsPilot CRM — Database Entities & Relationships
**Version:** 3.0  
**Last updated:** May 2026  
**Platform:** Supabase (PostgreSQL)

---

## Overview

The CRM tracks contacts across two worlds — the CRM (leads) and the AgentsPilot website (customers). All contacts have a stage + state history, and can be enrolled in automated campaigns.

---

## Two Worlds

```
CRM ONLY                          AGENTSPILOT WEBSITE
────────────────────              ──────────────────────────────
LEAD                              CUSTOMER
stage = lead                      stage = customer_trial → customer_paid

• Added manually in CRM           • Registers on /demo page
• Captured from social forms      • Always starts as trial
• No website account              • Converts to paid via Stripe
• Never from web signup           • Has an account + timezone

          │ registers on AP web
          └──────────────────────► stage → customer_trial
                                          state → active
                                              │ pays
                                          stage → customer_paid
                                          state → active
```

---

## Stages & States

```
STAGE               STATES
─────────────────   ─────────────────────────────────────
lead                new → contacted → qualified

customer_trial      active → inactive → expiring → expired

customer_paid       active → at_risk → churned
```

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        CONTACTS                              │
│  contact_id (PK)                                             │
│  first_name, last_name, email, phone, company                │
│  source: social | web | manual                               │
│  utm_source, utm_medium, utm_campaign, channel               │
│  country, timezone                                           │
└──────────────────┬──────────────────────────────────────────┘
                   │ 1
      ┌────────────┼──────────────┬──────────────────┐
      │ many       │ many         │ many              │ many
      ▼            ▼              ▼                   ▼
┌───────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────────────────┐
│CONTACT_   │ │  TASKS   │ │    EMAILS    │ │  CAMPAIGN_           │
│STAGES     │ │          │ │              │ │  ENROLLMENTS         │
│contact_id │ │contact_id│ │  contact_id  │ │  contact_id          │
│stage      │ │title     │ │  subject     │ │  campaign_id ──────► │
│state      │ │type      │ │  template    │ │  current_step        │
│from_stage │ │priority  │ │  status      │ │  status              │
│from_state │ │due_date  │ └──────────────┘ └──────────────────────┘
│changed_by │ │kanban    │                            │
│changed_at │ └──────────┘                            │ many
└───────────┘                                         ▼
                                             ┌─────────────────────┐
                                             │  CAMPAIGN_EVENTS    │
                                             │  enrollment_id      │
                                             │  contact_id         │
                                             │  step_id            │
                                             │  action_type        │
                                             │  status             │
                                             │  fired_at           │
                                             └─────────────────────┘

┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  CAMPAIGNS   │────►│ CAMPAIGN_STEPS   │────►│ EMAIL_TEMPLATES │
│  id (PK)     │     │  campaign_id     │     │  id (PK)        │
│  name        │     │  step_number     │     │  name           │
│  type        │     │  delay_days      │     │  subject        │
│  target_stage│     │  action_type     │     │  body_html      │
│  target_state│     │  template_id     │     │  stage          │
│  active      │     │  notify_manager  │     └─────────────────┘
└──────────────┘     │  send_hour_start │
                     │  send_hour_end   │
                     └──────────────────┘

┌───────────────────────┐     ┌───────────────────────┐
│  AUTOMATION_SETTINGS  │     │  AUTOMATION_CONFIG    │
│  rule_id (PK)         │     │  key (PK)             │
│  enabled              │     │  value                │
│  last_run_at          │     └───────────────────────┘
│  last_run_count       │
└───────────────────────┘
```

---

## Table Definitions

### contacts
Identity only — one row per person, never changes type.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `contact_id` | uuid PK | NO | Primary key |
| `first_name` | text | NO | First name |
| `last_name` | text | YES | Last name |
| `email` | text UNIQUE | YES | Email address |
| `phone` | text | YES | Phone number |
| `company` | text | YES | Company name |
| `source` | text | YES | `social` / `web` / `manual` |
| `utm_source` | text | YES | e.g. instagram, landing_page |
| `utm_medium` | text | YES | e.g. organic, cpc |
| `utm_campaign` | text | YES | Campaign identifier |
| `channel` | text | YES | Marketing channel |
| `country` | text | YES | Country (used for timezone mapping) |
| `timezone` | text | YES | e.g. Asia/Jerusalem, America/New_York (default: UTC) |
| `created_at` | timestamptz | NO | Record creation |
| `updated_at` | timestamptz | NO | Auto-updated on change |

---

### contact_stages
Full history of every stage/state change per contact.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid PK | NO | Primary key |
| `contact_id` | uuid FK | NO | → contacts.contact_id |
| `stage` | text | NO | `lead` / `customer_trial` / `customer_paid` |
| `state` | text | NO | Sub-status within stage (see below) |
| `from_stage` | text | YES | Previous stage |
| `from_state` | text | YES | Previous state |
| `trial_started_at` | timestamptz | YES | Trial start (customer_trial only) |
| `trial_expires_at` | timestamptz | YES | Trial expiry (customer_trial only) |
| `mrr` | numeric | YES | Monthly Recurring Revenue (customer_paid only) |
| `plan` | text | YES | Plan name (customer_paid only) |
| `notes` | text | YES | Reason for change |
| `changed_by` | text | YES | `system` / `api` / `stripe` / `manual` |
| `changed_at` | timestamptz | NO | When the change happened |

**Valid states per stage:**

| Stage | Valid States |
|-------|-------------|
| `lead` | `new`, `contacted`, `qualified` |
| `customer_trial` | `active`, `inactive`, `expiring`, `expired` |
| `customer_paid` | `active`, `at_risk`, `churned` |

**changed_by values:**

| Value | Who triggered it |
|-------|-----------------|
| `system` | Daily CRON automation |
| `api` | Web signup (/demo page) |
| `stripe` | Stripe payment webhook |
| `manual` | Team member in CRM |

---

### contacts_current *(view)*
Always shows the latest stage + state per contact. Use this for all portal queries.

```sql
select * from contacts_current where stage = 'customer_trial';
```

---

### campaigns
Campaign definitions. Two types — LeadGen (customers) and Follower (leads).

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid PK | NO | Primary key |
| `name` | text | NO | Campaign name |
| `type` | text | NO | `leadgen` / `follower` |
| `target_stage` | text | NO | Which stage to target |
| `target_state` | text | YES | Which state (null = all states in stage) |
| `active` | boolean | NO | On/off |
| `created_at` | timestamptz | NO | |
| `updated_at` | timestamptz | NO | |

**Campaign types:**

| Type | Target | Purpose |
|------|--------|---------|
| `leadgen` | `customer_trial`, `customer_paid` | Notifications to web customers |
| `follower` | `lead` | Email sequences to leads by state |

---

### campaign_steps
The sequence of actions within a campaign.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid PK | NO | Primary key |
| `campaign_id` | uuid FK | NO | → campaigns.id |
| `step_number` | integer | NO | Order of execution (1, 2, 3...) |
| `delay_days` | integer | NO | Days after enrollment (0 = immediate) |
| `action_type` | text | NO | `email` / `notification` |
| `template_id` | uuid FK | YES | → email_templates.id |
| `notify_manager` | boolean | NO | Send notification to MKT manager after action |
| `send_hour_start` | integer | NO | Earliest send hour in contact's timezone (default: 9) |
| `send_hour_end` | integer | NO | Latest send hour in contact's timezone (default: 18) |
| `created_at` | timestamptz | NO | |

---

### campaign_enrollments
Tracks which contacts are enrolled in which campaigns.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid PK | NO | Primary key |
| `campaign_id` | uuid FK | NO | → campaigns.id |
| `contact_id` | uuid FK | NO | → contacts.contact_id |
| `enrolled_at` | timestamptz | NO | Enrollment timestamp |
| `current_step` | integer | NO | Next step to execute |
| `status` | text | NO | `active` / `completed` / `unsubscribed` |
| `completed_at` | timestamptz | YES | When completed |

One contact can be enrolled in multiple campaigns simultaneously.

---

### campaign_events
Audit log of every campaign action fired.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid PK | NO | Primary key |
| `enrollment_id` | uuid FK | NO | → campaign_enrollments.id |
| `contact_id` | uuid FK | NO | → contacts.contact_id |
| `step_id` | uuid FK | YES | → campaign_steps.id |
| `action_type` | text | YES | `email` / `notification` |
| `status` | text | YES | `sent` / `pending` / `failed` / `skipped` |
| `fired_at` | timestamptz | NO | When it fired |

---

### email_templates
Templates used by campaign steps and automation rules.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid PK | NO | Primary key |
| `name` | text | NO | Template name |
| `subject` | text | NO | Email subject |
| `body_html` | text | NO | HTML body (supports {{first_name}} tokens) |
| `stage` | text | YES | Target stage |
| `created_at` | timestamptz | NO | |
| `updated_at` | timestamptz | NO | |

---

### tasks
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid PK | NO | Primary key |
| `contact_id` | uuid FK | YES | → contacts.contact_id |
| `contact_name` | text | YES | Denormalized |
| `title` | text | NO | Task title |
| `type` | text | YES | Follow-up / Onboarding / Win-back / Urgent / Call / Email / Admin |
| `priority` | text | YES | High / Medium / Low |
| `due_date` | date | YES | Due date |
| `kanban_status` | text | YES | `todo` / `inprogress` / `done` |
| `done` | boolean | YES | Completed flag |
| `notes` | text | YES | Notes |
| `alarm_at` | timestamptz | YES | Alarm time |
| `alarm_triggered` | boolean | YES | Alarm fired |
| `created_at` | timestamptz | NO | |

---

### emails
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | uuid PK | NO | Primary key |
| `contact_id` | uuid FK | YES | → contacts.contact_id |
| `to_email` | text | YES | Recipient |
| `to_name` | text | YES | Recipient name |
| `subject` | text | YES | Subject |
| `body` | text | YES | HTML body |
| `template_name` | text | YES | Template used |
| `status` | text | YES | `sent` / `queued` / `failed` / `draft` |
| `created_at` | timestamptz | NO | |

---

### automation_settings
| Column | Type | Description |
|--------|------|-------------|
| `rule_id` | text PK | Rule identifier |
| `enabled` | boolean | On/off toggle |
| `last_run_at` | timestamptz | Last execution |
| `last_run_count` | integer | Contacts processed |

**Rule IDs:** `trial_signup_welcome`, `new_lead_followup`, `trial_inactive_2d`, `trial_expiring_3d`, `trial_expired`, `at_risk_alert`, `trial_midpoint_7d`, `churned_winback`

---

### automation_config
| Column | Type | Description |
|--------|------|-------------|
| `key` | text PK | Config key |
| `value` | text | Config value |

**Keys:** `at_risk_inactivity_days` (default: 30), `at_risk_signals` (JSON)

---

## Foreign Key Summary

```
contact_stages.contact_id        → contacts.contact_id
tasks.contact_id                 → contacts.contact_id
emails.contact_id                → contacts.contact_id
automation_runs.contact_id       → contacts.contact_id
campaign_enrollments.contact_id  → contacts.contact_id
campaign_enrollments.campaign_id → campaigns.id
campaign_steps.campaign_id       → campaigns.id
campaign_steps.template_id       → email_templates.id
campaign_events.enrollment_id    → campaign_enrollments.id
campaign_events.contact_id       → contacts.contact_id
campaign_events.step_id          → campaign_steps.id
```

---

## Campaign Flow

```
CRON runs daily
      │
      ▼
Check contacts_current for stage/state matches
      │
      ▼
Enroll matching contacts → campaign_enrollments
      │
      ▼
For each active enrollment → check delay_days reached?
      │
      ▼
Check contact timezone → within send_hour_start/end?
      │
      ▼
Fire step → send email via template
      │
      ├── Log to campaign_events
      └── Notify MKT manager (if notify_manager = true)
```

---

## API → Table Map

| Endpoint | Reads | Writes |
|---|---|---|
| `POST /api/leads` | — | contacts, contact_stages, tasks, emails |
| `POST /api/send-email` | contacts | emails |
| `GET /api/cron/lifecycle` | contacts_current, automation_settings | contact_stages, tasks, emails, automation_runs |
| `GET /api/cron/campaigns` | contacts_current, campaigns, campaign_steps | campaign_enrollments, campaign_events, emails |
| `POST /api/webhooks/stripe` *(soon)* | contacts | contacts, contact_stages |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Bypasses RLS for cron |
| `RESEND_API_KEY` | ✅ | Email delivery |
| `RESEND_FROM_EMAIL` | ✅ | Sender address |
| `ADMIN_EMAIL` | ✅ | Admin notifications |
| `CRON_SECRET` | ⚠️ | Secures cron in production |

---

*AgentsPilot Engineering — Internal document — v3.0*
