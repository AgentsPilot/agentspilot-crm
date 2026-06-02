const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  Header, Footer, PageNumber, TabStopType, TabStopPosition,
} = require('docx');
const fs = require('fs');

// ── Colors ────────────────────────────────────────────────────────────────
const ORANGE   = 'E8511A';
const DARK     = '1E293B';
const GRAY     = '64748B';
const LIGHT_BG = 'FFF7F3';
const BLUE_BG  = 'EFF6FF';
const GREEN_BG = 'F0FDF4';
const HEADER_BG = '1E293B';
const ALT_ROW   = 'F8FAFC';

// ── Helpers ───────────────────────────────────────────────────────────────
const border  = { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function cell(text, opts = {}) {
  const { bold = false, mono = false, bg = null, color = DARK, width = null, center = false } = opts;
  return new TableCell({
    borders,
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    shading: bg ? { fill: bg, type: ShadingType.CLEAR } : undefined,
    margins: { top: 80, bottom: 80, left: 140, right: 140 },
    children: [new Paragraph({
      alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({
        text,
        bold,
        font: mono ? 'Courier New' : 'Arial',
        size: mono ? 18 : 20,
        color,
      })],
    })],
  });
}

function headerRow(cols, widths) {
  return new TableRow({
    tableHeader: true,
    children: cols.map((t, i) => new TableCell({
      borders,
      width: { size: widths[i], type: WidthType.DXA },
      shading: { fill: HEADER_BG, type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 140, right: 140 },
      children: [new Paragraph({
        children: [new TextRun({ text: t, bold: true, color: 'FFFFFF', font: 'Arial', size: 20 })],
      })],
    })),
  });
}

function dataRow(cells, widths, alt = false) {
  return new TableRow({
    children: cells.map((c, i) => {
      const isMono = typeof c === 'object' && c.mono;
      const text   = typeof c === 'object' ? c.text : c;
      return new TableCell({
        borders,
        width: { size: widths[i], type: WidthType.DXA },
        shading: alt ? { fill: ALT_ROW, type: ShadingType.CLEAR } : undefined,
        margins: { top: 80, bottom: 80, left: 140, right: 140 },
        children: [new Paragraph({
          children: [new TextRun({
            text,
            font: isMono ? 'Courier New' : 'Arial',
            size: isMono ? 18 : 20,
            color: DARK,
          })],
        })],
      });
    }),
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 160 },
    children: [new TextRun({ text, font: 'Arial', size: 36, bold: true, color: DARK })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: ORANGE, space: 4 } },
    children: [new TextRun({ text, font: 'Arial', size: 28, bold: true, color: DARK })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 80 },
    children: [new TextRun({ text, font: 'Arial', size: 24, bold: true, color: ORANGE })],
  });
}

function body(text, opts = {}) {
  const { spacing = { before: 80, after: 80 }, color = GRAY } = opts;
  return new Paragraph({
    spacing,
    children: [new TextRun({ text, font: 'Arial', size: 20, color })],
  });
}

function mono(text) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
    indent: { left: 360 },
    children: [new TextRun({ text, font: 'Courier New', size: 18, color: DARK })],
  });
}

function spacer(pts = 120) {
  return new Paragraph({ spacing: { before: pts, after: 0 }, children: [new TextRun('')] });
}

function divider() {
  return new Paragraph({
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0', space: 1 } },
    children: [new TextRun('')],
  });
}

function badge(text, bg, fg = 'FFFFFF') {
  return new TextRun({ text: ` ${text} `, font: 'Arial', size: 18, bold: true, color: fg,
    shading: { fill: bg, type: ShadingType.CLEAR } });
}

// ── Document ──────────────────────────────────────────────────────────────
const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 20, color: DARK } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Arial', color: DARK },
        paragraph: { spacing: { before: 400, after: 160 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Arial', color: DARK },
        paragraph: { spacing: { before: 320, after: 120 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: ORANGE },
        paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 2 } },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1260, bottom: 1440, left: 1260 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: ORANGE, space: 4 } },
          children: [
            new TextRun({ text: 'AgentsPilot CRM', font: 'Arial', size: 20, bold: true, color: DARK }),
            new TextRun({ text: '\tDB Architecture v2.0', font: 'Arial', size: 18, color: GRAY }),
          ],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          border: { top: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0', space: 4 } },
          children: [
            new TextRun({ text: 'AgentsPilot Engineering — Internal document', font: 'Arial', size: 16, color: GRAY }),
            new TextRun({ text: '\tPage ', font: 'Arial', size: 16, color: GRAY }),
            new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: GRAY }),
          ],
        })],
      }),
    },

    children: [

      // ── Cover ────────────────────────────────────────────────────────────
      new Paragraph({
        spacing: { before: 480, after: 80 },
        children: [new TextRun({ text: 'AgentsPilot CRM', font: 'Arial', size: 56, bold: true, color: ORANGE })],
      }),
      new Paragraph({
        spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: 'Database Entities & Relationships', font: 'Arial', size: 36, bold: true, color: DARK })],
      }),
      new Paragraph({
        spacing: { before: 0, after: 40 },
        children: [new TextRun({ text: 'Version 2.0  ·  May 2026  ·  Supabase (PostgreSQL)', font: 'Arial', size: 20, color: GRAY })],
      }),
      divider(),
      spacer(40),

      // ── Overview ─────────────────────────────────────────────────────────
      h2('Overview'),
      body('The CRM tracks three contact types across two acquisition paths. All contacts live in a single contacts table, linked to tasks, emails, alarms, and automation activity.', { color: DARK }),
      spacer(),

      // ── Acquisition Paths ────────────────────────────────────────────────
      h2('Contact Types & Acquisition Paths'),
      spacer(80),

      new Table({
        width: { size: 9720, type: WidthType.DXA },
        columnWidths: [3240, 3240, 3240],
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders,
                width: { size: 3240, type: WidthType.DXA },
                shading: { fill: 'FEF3C7', type: ShadingType.CLEAR },
                margins: { top: 160, bottom: 160, left: 200, right: 200 },
                children: [
                  new Paragraph({ children: [new TextRun({ text: 'LEAD', font: 'Arial', size: 26, bold: true, color: 'B45309' })] }),
                  new Paragraph({ children: [new TextRun({ text: 'type = lead', font: 'Courier New', size: 18, color: '92400E' })] }),
                  new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: 'Captured from social forms or external campaigns. No account created yet.', font: 'Arial', size: 19, color: '78350F' })] }),
                  new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: 'source: social | manual', font: 'Courier New', size: 17, color: '92400E' })] }),
                ],
              }),
              new TableCell({
                borders,
                width: { size: 3240, type: WidthType.DXA },
                shading: { fill: 'DBEAFE', type: ShadingType.CLEAR },
                margins: { top: 160, bottom: 160, left: 200, right: 200 },
                children: [
                  new Paragraph({ children: [new TextRun({ text: 'TRIAL', font: 'Arial', size: 26, bold: true, color: '1D4ED8' })] }),
                  new Paragraph({ children: [new TextRun({ text: 'type = trial', font: 'Courier New', size: 18, color: '1E40AF' })] }),
                  new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: 'Registered on AgentsPilot web. 14-day free trial active. Has an account.', font: 'Arial', size: 19, color: '1E3A8A' })] }),
                  new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: 'source: web', font: 'Courier New', size: 17, color: '1E40AF' })] }),
                ],
              }),
              new TableCell({
                borders,
                width: { size: 3240, type: WidthType.DXA },
                shading: { fill: 'DCFCE7', type: ShadingType.CLEAR },
                margins: { top: 160, bottom: 160, left: 200, right: 200 },
                children: [
                  new Paragraph({ children: [new TextRun({ text: 'PAID', font: 'Arial', size: 26, bold: true, color: '15803D' })] }),
                  new Paragraph({ children: [new TextRun({ text: 'type = paid', font: 'Courier New', size: 18, color: '166534' })] }),
                  new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: 'Converted from trial. Active paying customer with MRR recorded.', font: 'Arial', size: 19, color: '14532D' })] }),
                  new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: 'converted_at, mrr, plan', font: 'Courier New', size: 17, color: '166534' })] }),
                ],
              }),
            ],
          }),
        ],
      }),

      spacer(200),
      body('Transition rules:', { color: DARK }),
      new Paragraph({ spacing: { before: 60, after: 40 }, indent: { left: 360 },
        children: [new TextRun({ text: 'lead  →  trial   when contact registers on AgentsPilot website', font: 'Courier New', size: 19, color: DARK })] }),
      new Paragraph({ spacing: { before: 40, after: 40 }, indent: { left: 360 },
        children: [new TextRun({ text: 'trial →  paid    when contact subscribes to a paid plan', font: 'Courier New', size: 19, color: DARK })] }),
      new Paragraph({ spacing: { before: 40, after: 80 }, indent: { left: 360 },
        children: [new TextRun({ text: 'One record per person — same row updates, no duplication', font: 'Courier New', size: 19, color: GRAY })] }),

      divider(),

      // ── ERD ──────────────────────────────────────────────────────────────
      h2('Entity Relationship Diagram'),
      spacer(80),

      new Table({
        width: { size: 9720, type: WidthType.DXA },
        columnWidths: [9720],
        rows: [new TableRow({ children: [new TableCell({
          borders,
          width: { size: 9720, type: WidthType.DXA },
          shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
          margins: { top: 200, bottom: 200, left: 300, right: 300 },
          children: [
            new Paragraph({ children: [new TextRun({ text: 'CONTACTS  (core table)', font: 'Courier New', size: 20, bold: true, color: ORANGE })] }),
            new Paragraph({ spacing: { before: 60 }, children: [new TextRun({ text: 'id (PK)  ·  type: lead | trial | paid', font: 'Courier New', size: 18, color: DARK })] }),
            new Paragraph({ children: [new TextRun({ text: 'full_name, email, phone, company, source', font: 'Courier New', size: 18, color: GRAY })] }),
            new Paragraph({ children: [new TextRun({ text: 'lead:  lead_captured_at', font: 'Courier New', size: 18, color: GRAY })] }),
            new Paragraph({ children: [new TextRun({ text: 'trial: registered_at, trial_started_at, trial_expires_at', font: 'Courier New', size: 18, color: GRAY })] }),
            new Paragraph({ children: [new TextRun({ text: 'paid:  converted_at, mrr, plan', font: 'Courier New', size: 18, color: GRAY })] }),
            spacer(120),
            new Paragraph({ children: [new TextRun({ text: '       │ 1:many to all child tables', font: 'Courier New', size: 18, color: 'CBD5E1' })] }),
            spacer(80),
            new Paragraph({ children: [new TextRun({ text: '┌──────────┬──────────┬──────────┬──────────────────┐', font: 'Courier New', size: 16, color: 'CBD5E1' })] }),
            new Paragraph({ children: [new TextRun({ text: '│  TASKS   │  EMAILS  │  ALARMS  │ AUTOMATION_RUNS  │', font: 'Courier New', size: 16, bold: true, color: DARK })] }),
            new Paragraph({ children: [new TextRun({ text: '│contact_id│contact_id│contact_id│  contact_id      │', font: 'Courier New', size: 16, color: GRAY })] }),
            new Paragraph({ children: [new TextRun({ text: '│  title   │ subject  │  title   │  rule_id         │', font: 'Courier New', size: 16, color: GRAY })] }),
            new Paragraph({ children: [new TextRun({ text: '│  type    │ template │ alarm_at │  action          │', font: 'Courier New', size: 16, color: GRAY })] }),
            new Paragraph({ children: [new TextRun({ text: '│  status  │  status  │triggered │  triggered_at    │', font: 'Courier New', size: 16, color: GRAY })] }),
            new Paragraph({ children: [new TextRun({ text: '└──────────┴──────────┴──────────┴──────────────────┘', font: 'Courier New', size: 16, color: 'CBD5E1' })] }),
            spacer(120),
            new Paragraph({ children: [new TextRun({ text: 'AUTOMATION_SETTINGS  (rule_id PK, enabled, last_run_at)', font: 'Courier New', size: 16, color: GRAY })] }),
            new Paragraph({ children: [new TextRun({ text: 'AUTOMATION_CONFIG    (key PK, value)  — both standalone, no FK', font: 'Courier New', size: 16, color: GRAY })] }),
          ],
        })]})],
      }),

      divider(),

      // ── Table Definitions ─────────────────────────────────────────────────
      h2('Table Definitions'),

      // contacts
      h3('contacts'),
      body('Primary table. One row per person regardless of type.', { color: DARK }),
      spacer(80),
      new Table({
        width: { size: 9720, type: WidthType.DXA },
        columnWidths: [2100, 1600, 900, 5120],
        rows: [
          headerRow(['Column', 'Type', 'Nullable', 'Description'], [2100, 1600, 900, 5120]),
          ...([
            ['id', 'uuid', 'NO', 'Primary key'],
            ['type', 'text', 'NO', 'lead / trial / paid'],
            ['full_name', 'text', 'NO', 'Full name'],
            ['email', 'text', 'YES', 'Unique email address'],
            ['phone', 'text', 'YES', 'Phone number'],
            ['company', 'text', 'YES', 'Company name'],
            ['source', 'text', 'YES', 'social / web / manual'],
            ['utm_source', 'text', 'YES', 'e.g. instagram, landing_page'],
            ['utm_medium', 'text', 'YES', 'e.g. organic, cpc'],
            ['utm_campaign', 'text', 'YES', 'Campaign identifier'],
            ['channel', 'text', 'YES', 'Marketing channel'],
            ['lead_captured_at', 'timestamptz', 'YES', 'When lead was first captured'],
            ['registered_at', 'timestamptz', 'YES', 'Account creation date'],
            ['trial_started_at', 'timestamptz', 'YES', 'Trial start date'],
            ['trial_expires_at', 'timestamptz', 'YES', 'Trial end date (start + 14 days)'],
            ['activated_at', 'timestamptz', 'YES', 'When trial was activated'],
            ['converted_at', 'timestamptz', 'YES', 'When became paid customer'],
            ['mrr', 'numeric', 'YES', 'Monthly Recurring Revenue ($)'],
            ['plan', 'text', 'YES', 'starter / pro / enterprise'],
            ['customer_source', 'text', 'YES', 'stripe / manual'],
            ['lead_score', 'integer', 'YES', '0–100 engagement score'],
            ['funnel_level', 'text', 'YES', 'Interest / Consideration / Decision'],
            ['last_activity_at', 'timestamptz', 'YES', 'Last login or interaction'],
            ['tags', 'text[]', 'YES', "e.g. ['trial', 'activation-email-sent']"],
            ['notes', 'text', 'YES', 'Free text notes'],
            ['payment_failed', 'boolean', 'YES', 'Stripe failure flag'],
            ['manual_at_risk_flag', 'boolean', 'YES', 'Manually flagged as at-risk'],
            ['created_at', 'timestamptz', 'NO', 'Record creation timestamp'],
            ['updated_at', 'timestamptz', 'NO', 'Auto-updated on any change'],
          ].map((r, i) => dataRow(
            [{ text: r[0], mono: true }, { text: r[1], mono: true }, r[2], r[3]],
            [2100, 1600, 900, 5120], i % 2 === 1
          ))),
        ],
      }),

      spacer(200),

      // tasks
      h3('tasks'),
      new Table({
        width: { size: 9720, type: WidthType.DXA },
        columnWidths: [2100, 1800, 900, 4920],
        rows: [
          headerRow(['Column', 'Type', 'Nullable', 'Description'], [2100, 1800, 900, 4920]),
          ...([
            ['id', 'uuid', 'NO', 'Primary key'],
            ['contact_id', 'uuid (FK)', 'YES', '→ contacts.id'],
            ['contact_name', 'text', 'YES', 'Denormalized contact name'],
            ['title', 'text', 'NO', 'Task title'],
            ['type', 'text', 'YES', 'Follow-up / Onboarding / Win-back / Urgent / Call / Email / Admin'],
            ['priority', 'text', 'YES', 'High / Medium / Low'],
            ['due_date', 'date', 'YES', 'Due date'],
            ['kanban_status', 'text', 'YES', 'todo / inprogress / done'],
            ['done', 'boolean', 'YES', 'Completed flag'],
            ['notes', 'text', 'YES', 'Task notes'],
            ['alarm_at', 'timestamptz', 'YES', 'Optional alarm time'],
            ['alarm_triggered', 'boolean', 'YES', 'Alarm has fired'],
            ['created_at', 'timestamptz', 'NO', 'Creation timestamp'],
          ].map((r, i) => dataRow(
            [{ text: r[0], mono: true }, { text: r[1], mono: true }, r[2], r[3]],
            [2100, 1800, 900, 4920], i % 2 === 1
          ))),
        ],
      }),

      spacer(160),
      body('Kanban column mapping:', { color: DARK }),
      spacer(60),
      new Table({
        width: { size: 4000, type: WidthType.DXA },
        columnWidths: [2000, 2000],
        rows: [
          headerRow(['Task Type', 'Kanban Column'], [2000, 2000]),
          dataRow(['Follow-up', 'To Do'], [2000, 2000], false),
          dataRow(['Onboarding', 'In Progress'], [2000, 2000], true),
          dataRow(['Win-back', 'To Do'], [2000, 2000], false),
          dataRow(['Urgent', 'In Progress'], [2000, 2000], true),
        ],
      }),

      spacer(200),

      // emails
      h3('emails'),
      new Table({
        width: { size: 9720, type: WidthType.DXA },
        columnWidths: [2100, 1800, 900, 4920],
        rows: [
          headerRow(['Column', 'Type', 'Nullable', 'Description'], [2100, 1800, 900, 4920]),
          ...([
            ['id', 'uuid', 'NO', 'Primary key'],
            ['contact_id', 'uuid (FK)', 'YES', '→ contacts.id'],
            ['to_email', 'text', 'YES', 'Recipient email address'],
            ['to_name', 'text', 'YES', 'Recipient name'],
            ['contact_name', 'text', 'YES', 'Denormalized contact name'],
            ['subject', 'text', 'YES', 'Email subject'],
            ['body', 'text', 'YES', 'HTML email body'],
            ['template_name', 'text', 'YES', 'Template used'],
            ['status', 'text', 'YES', 'sent / queued / failed / draft'],
            ['task_id', 'uuid', 'YES', 'Linked task (if any)'],
            ['created_at', 'timestamptz', 'NO', 'Creation timestamp'],
          ].map((r, i) => dataRow(
            [{ text: r[0], mono: true }, { text: r[1], mono: true }, r[2], r[3]],
            [2100, 1800, 900, 4920], i % 2 === 1
          ))),
        ],
      }),

      spacer(200),

      // automation_runs
      h3('automation_runs'),
      body('Audit log — every automation rule execution is recorded here.', { color: DARK }),
      spacer(80),
      new Table({
        width: { size: 9720, type: WidthType.DXA },
        columnWidths: [2100, 1800, 900, 4920],
        rows: [
          headerRow(['Column', 'Type', 'Nullable', 'Description'], [2100, 1800, 900, 4920]),
          ...([
            ['id', 'uuid', 'NO', 'Primary key'],
            ['rule_id', 'text', 'NO', 'Which rule fired'],
            ['contact_id', 'uuid (FK)', 'YES', '→ contacts.id'],
            ['contact_name', 'text', 'YES', 'Denormalized contact name'],
            ['action', 'text', 'YES', 'What happened (e.g. Sent welcome email)'],
            ['triggered_at', 'timestamptz', 'NO', 'When the rule fired'],
          ].map((r, i) => dataRow(
            [{ text: r[0], mono: true }, { text: r[1], mono: true }, r[2], r[3]],
            [2100, 1800, 900, 4920], i % 2 === 1
          ))),
        ],
      }),

      spacer(200),

      // automation_settings
      h3('automation_settings'),
      new Table({
        width: { size: 9720, type: WidthType.DXA },
        columnWidths: [2100, 1800, 900, 4920],
        rows: [
          headerRow(['Column', 'Type', 'Nullable', 'Description'], [2100, 1800, 900, 4920]),
          ...([
            ['rule_id', 'text', 'NO', 'Primary key — rule identifier'],
            ['enabled', 'boolean', 'NO', 'On/off toggle'],
            ['last_run_at', 'timestamptz', 'YES', 'Last cron execution time'],
            ['last_run_count', 'integer', 'YES', 'Contacts processed in last run'],
            ['updated_at', 'timestamptz', 'YES', 'Last update'],
          ].map((r, i) => dataRow(
            [{ text: r[0], mono: true }, { text: r[1], mono: true }, r[2], r[3]],
            [2100, 1800, 900, 4920], i % 2 === 1
          ))),
        ],
      }),

      spacer(160),
      body('Automation rule IDs:', { color: DARK }),
      spacer(60),
      new Table({
        width: { size: 9720, type: WidthType.DXA },
        columnWidths: [3000, 6720],
        rows: [
          headerRow(['rule_id', 'Trigger'], [3000, 6720]),
          ...([
            ['trial_signup_welcome', 'New trial signup via /demo page'],
            ['new_lead_followup', 'New lead added via /contact page'],
            ['trial_inactive_2d', 'No activation after 2 days'],
            ['trial_expiring_3d', 'Trial expiry within 3 days'],
            ['trial_expired', 'Trial end date reached'],
            ['at_risk_alert', 'Contact marked as at-risk'],
            ['trial_midpoint_7d', 'Day 7 of active trial'],
            ['churned_winback', 'Day 7 / 14 / 30 after churn'],
          ].map((r, i) => dataRow(
            [{ text: r[0], mono: true }, r[1]],
            [3000, 6720], i % 2 === 1
          ))),
        ],
      }),

      spacer(200),

      // automation_config
      h3('automation_config'),
      new Table({
        width: { size: 9720, type: WidthType.DXA },
        columnWidths: [3000, 6720],
        rows: [
          headerRow(['Key', 'Description'], [3000, 6720]),
          dataRow([{ text: 'at_risk_inactivity_days', mono: true }, 'Number of inactive days before at-risk flag (default: 30)'], [3000, 6720], false),
          dataRow([{ text: 'at_risk_signals', mono: true }, 'JSON object: which signals are active (inactivity, mrr_zero, payment_failed, manual_flag)'], [3000, 6720], true),
        ],
      }),

      divider(),

      // ── Foreign Keys ──────────────────────────────────────────────────────
      h2('Foreign Key Summary'),
      spacer(80),
      new Table({
        width: { size: 9720, type: WidthType.DXA },
        columnWidths: [2800, 800, 2800, 3320],
        rows: [
          headerRow(['Child Table', '', 'References', 'Notes'], [2800, 800, 2800, 3320]),
          dataRow([{ text: 'tasks.contact_id', mono: true }, '→', { text: 'contacts.id', mono: true }, 'SET NULL on delete'], [2800, 800, 2800, 3320], false),
          dataRow([{ text: 'emails.contact_id', mono: true }, '→', { text: 'contacts.id', mono: true }, 'SET NULL on delete'], [2800, 800, 2800, 3320], true),
          dataRow([{ text: 'automation_runs.contact_id', mono: true }, '→', { text: 'contacts.id', mono: true }, 'SET NULL on delete'], [2800, 800, 2800, 3320], false),
        ],
      }),
      spacer(120),
      body('automation_settings and automation_config are standalone — no foreign keys.', { color: GRAY }),

      divider(),

      // ── API Map ───────────────────────────────────────────────────────────
      h2('API → Table Map'),
      spacer(80),
      new Table({
        width: { size: 9720, type: WidthType.DXA },
        columnWidths: [3000, 2360, 4360],
        rows: [
          headerRow(['Endpoint', 'Reads', 'Writes'], [3000, 2360, 4360]),
          dataRow([{ text: 'POST /api/leads', mono: true }, '—', 'contacts, tasks, emails'], [3000, 2360, 4360], false),
          dataRow([{ text: 'POST /api/send-email', mono: true }, 'contacts', 'emails'], [3000, 2360, 4360], true),
          dataRow([{ text: 'GET /api/cron/lifecycle', mono: true }, 'contacts, automation_settings, automation_config', 'tasks, emails, automation_runs, automation_settings'], [3000, 2360, 4360], false),
          dataRow([{ text: 'POST /api/webhooks/stripe', mono: true }, 'contacts', 'contacts (type → paid)  coming soon'], [3000, 2360, 4360], true),
        ],
      }),

      divider(),

      // ── Env Vars ──────────────────────────────────────────────────────────
      h2('Environment Variables'),
      spacer(80),
      new Table({
        width: { size: 9720, type: WidthType.DXA },
        columnWidths: [3600, 1200, 4920],
        rows: [
          headerRow(['Variable', 'Required', 'Description'], [3600, 1200, 4920]),
          dataRow([{ text: 'NEXT_PUBLIC_SUPABASE_URL', mono: true }, '✅', 'Supabase project URL'], [3600, 1200, 4920], false),
          dataRow([{ text: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', mono: true }, '✅', 'Public anon key for client-side queries'], [3600, 1200, 4920], true),
          dataRow([{ text: 'SUPABASE_SERVICE_ROLE_KEY', mono: true }, '✅', 'Bypasses RLS — used by cron only'], [3600, 1200, 4920], false),
          dataRow([{ text: 'RESEND_API_KEY', mono: true }, '✅', 'Email delivery via Resend'], [3600, 1200, 4920], true),
          dataRow([{ text: 'RESEND_FROM_EMAIL', mono: true }, '✅', 'Sender address (verified domain)'], [3600, 1200, 4920], false),
          dataRow([{ text: 'ADMIN_EMAIL', mono: true }, '✅', 'Admin notification recipient'], [3600, 1200, 4920], true),
          dataRow([{ text: 'CRON_SECRET', mono: true }, '⚠️', 'Secures the cron endpoint in production'], [3600, 1200, 4920], false),
        ],
      }),

      spacer(400),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'AgentsPilot Engineering — Internal document — May 2026', font: 'Arial', size: 18, color: 'CBD5E1', italics: true })],
      }),
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('DB_ENTITIES.docx', buf);
  console.log('✅ DB_ENTITIES.docx created');
});
