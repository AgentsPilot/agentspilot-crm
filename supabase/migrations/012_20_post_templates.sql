-- ── Migration 012: 20 AgentsPilot post templates with Canva designs ──────────
-- Each template has the Canva thumbnail + edit URL already linked

insert into post_templates (title, platforms, media_type, background, cta, caption, sort_order, active, design_preview_url, design_url) values

('Lead Follow-Up',
 'LinkedIn, Instagram, Facebook',
 'Static Image',
 'Businesses lose deals by going silent after first contact. AgentsPilot automates follow-ups.',
 '👉 Follow AgentsPilot to see more',
 'You lose the deal the moment you go quiet.

AgentsPilot follows up automatically — so no lead slips through.

👉 Follow to see how',
 8, true,
 'https://design.canva.ai/5hGWOgiserxV7xV',
 'https://www.canva.com/d/qqFbM7PpYrEjgMQ'),

('CRM Data Hygiene',
 'LinkedIn, Instagram, Facebook',
 'Static Image',
 'Stale CRM data kills pipeline visibility. AgentsPilot keeps records updated automatically.',
 '👉 Follow AgentsPilot to see more',
 'Your CRM is only as good as the data in it.

AgentsPilot keeps it updated in real time — no manual entry needed.

👉 Follow to see how',
 9, true,
 'https://design.canva.ai/zyQ87XTvsWvmIIT',
 'https://www.canva.com/d/LzFIoXoJNe18ByR'),

('Admin Overhead',
 'LinkedIn, Instagram, Facebook',
 'Static Image',
 'Every hour spent on admin is an hour not spent selling or building.',
 '👉 Follow AgentsPilot to see more',
 'Every hour spent on admin is an hour not spent selling.

AgentsPilot handles the admin.

👉 Follow to see how',
 10, true,
 'https://design.canva.ai/RNN4tLebWXQ81Wo',
 'https://www.canva.com/d/c6Ia6esZLqds-nf'),

('Response Time',
 'LinkedIn, Instagram, Facebook',
 'Static Image',
 'First response time sets client expectations. AgentsPilot responds instantly 24/7.',
 '👉 Follow AgentsPilot to see more',
 'Clients don''t wait. Your response time sets the tone.

AgentsPilot replies instantly, 24/7.

👉 Follow to see how',
 11, true,
 'https://design.canva.ai/VTF-Sx6Ka5IiRwO',
 'https://www.canva.com/d/OzNMEJZETgrTmap'),

('Client Onboarding',
 'LinkedIn, Instagram, Facebook',
 'Static Image',
 'Manual client onboarding wastes days. AgentsPilot automates the entire onboarding flow.',
 '👉 Follow AgentsPilot to see more',
 'Onboarding a new client shouldn''t take 3 days.

AgentsPilot automates the whole flow.

👉 Follow to see how',
 12, true,
 'https://design.canva.ai/Wa9tzjX3IV_vFzs',
 'https://www.canva.com/d/TqNXtYbl9IclMww'),

('Scheduling',
 'LinkedIn, Instagram, Facebook',
 'Static Image',
 'Manual meeting scheduling is a time sink. AgentsPilot books them automatically.',
 '👉 Follow AgentsPilot to see more',
 'You''re still manually scheduling meetings in 2026?

AgentsPilot books them for you.

👉 Follow to see how',
 13, true,
 'https://design.canva.ai/Au4_GD0cYsgV0pa',
 'https://www.canva.com/d/1kemopDxAiv_dVM'),

('Email Overload',
 'LinkedIn, Instagram, Facebook',
 'Static Image',
 'Inboxes are not task managers. AgentsPilot triages and responds to emails automatically.',
 '👉 Follow AgentsPilot to see more',
 'Your inbox is not a to-do list.

AgentsPilot triages and responds for you.

👉 Follow to see how',
 14, true,
 'https://design.canva.ai/R8LpqGEAUyf74ao',
 'https://www.canva.com/d/ucoeth5mhAdYLLB'),

('Billing Follow-Up',
 'LinkedIn, Instagram, Facebook',
 'Static Image',
 'Unpaid invoices silently drain cash flow. AgentsPilot chases them so you don''t have to.',
 '👉 Follow AgentsPilot to see more',
 'Invoices don''t chase themselves.

AgentsPilot follows up on every unpaid one.

👉 Follow to see how',
 15, true,
 'https://design.canva.ai/Hb99W4Z_Dwtc4c5',
 'https://www.canva.com/d/0LZROsKEAMHZvy4'),

('Reporting',
 'LinkedIn, Instagram, Facebook',
 'Static Image',
 'Manual reporting steals hours every week. AgentsPilot generates reports automatically.',
 '👉 Follow AgentsPilot to see more',
 'The report you spent 2 hours building? It''s automated.

AgentsPilot generates it while you sleep.

👉 Follow to see how',
 16, true,
 'https://design.canva.ai/1k_f4NZj6dhCxtd',
 'https://www.canva.com/d/0-uQvO67fhxU_A2'),

('Employee Onboarding',
 'LinkedIn, Instagram, Facebook',
 'Static Image',
 'New hires without a structured process lose weeks. AgentsPilot guides them from day one.',
 '👉 Follow AgentsPilot to see more',
 'New employee. 47 tasks. No process.

AgentsPilot guides them from day one.

👉 Follow to see how',
 17, true,
 'https://design.canva.ai/xMXEh0RnCT1vNDF',
 'https://www.canva.com/d/HJC88TFQbOAKWbc'),

('Lead Response Speed',
 'LinkedIn, Instagram, Facebook',
 'Static Image',
 'Most leads never get a timely response. AgentsPilot responds to every single one.',
 '👉 Follow AgentsPilot to see more',
 'Leads come in. Most never get a response.

AgentsPilot responds to every single one.

👉 Follow to see how',
 18, true,
 'https://design.canva.ai/XqSvRkE2IJrcPhw',
 'https://www.canva.com/d/fzxAixOQ75Hbzyn'),

('Team Productivity',
 'LinkedIn, Instagram, Facebook',
 'Static Image',
 '40% of team time goes to repetitive work. AgentsPilot takes that back.',
 '👉 Follow AgentsPilot to see more',
 'Your team is spending 40% of their day on repetitive work.

AgentsPilot takes that back.

👉 Follow to see how',
 19, true,
 'https://design.canva.ai/xuyCj8_HKxecpqd',
 'https://www.canva.com/d/EaKnkOll-_NG4_C'),

('Sales Pipeline',
 'LinkedIn, Instagram, Facebook',
 'Static Image',
 'Missed follow-ups kill pipeline. AgentsPilot never misses one.',
 '👉 Follow AgentsPilot to see more',
 'A missed follow-up is a missed opportunity.

AgentsPilot never misses one.

👉 Follow to see how',
 20, true,
 'https://design.canva.ai/4T2IeZaIY2uYVsc',
 'https://www.canva.com/d/UtqkobiwzQWq5OL'),

('Support Routing',
 'LinkedIn, Instagram, Facebook',
 'Static Image',
 'Support ticket backlogs frustrate customers. AgentsPilot routes and resolves instantly.',
 '👉 Follow AgentsPilot to see more',
 'Support tickets pile up. Customers get frustrated.

AgentsPilot routes and resolves instantly.

👉 Follow to see how',
 21, true,
 'https://design.canva.ai/zOf0R6g8gRCHoiU',
 'https://www.canva.com/d/rCSBoMQ7coqa5sD'),

('Scale Without Hiring',
 'LinkedIn, Instagram, Facebook',
 'Static Image',
 'You shouldn''t need a full ops team to run like one. AgentsPilot scales your operations.',
 '👉 Follow AgentsPilot to see more',
 'You shouldn''t need a full team to run like one.

AgentsPilot scales your ops without headcount.

👉 Follow to see how',
 22, true,
 'https://design.canva.ai/bpXAzM44_3dD-DV',
 'https://www.canva.com/d/hM6ZWQnJNW-2wWv'),

('Consistency',
 'LinkedIn, Instagram, Facebook',
 'Static Image',
 'Most businesses fail on consistency, not process. AgentsPilot runs the same way every time.',
 '👉 Follow AgentsPilot to see more',
 'Most businesses don''t have a process problem. They have a consistency problem.

AgentsPilot runs the same way every time.

👉 Follow to see how',
 23, true,
 'https://design.canva.ai/YMK3wSoIFeujaIn',
 'https://www.canva.com/d/rekufLCTlRjZrNX'),

('Reminders',
 'LinkedIn, Instagram, Facebook',
 'Static Image',
 'Manual reminders waste mental bandwidth. AgentsPilot sends every reminder automatically.',
 '👉 Follow AgentsPilot to see more',
 'Stop reminding people of things that should be automatic.

AgentsPilot sends every reminder for you.

👉 Follow to see how',
 24, true,
 'https://design.canva.ai/nMTcVOwgFsrHgvS',
 'https://www.canva.com/d/TkgQb3c-_B4ZAnI'),

('Sales Efficiency',
 'LinkedIn, Instagram, Facebook',
 'Static Image',
 'Your best closers are doing data entry. AgentsPilot handles the admin so they can sell.',
 '👉 Follow AgentsPilot to see more',
 'Your best salesperson shouldn''t be doing data entry.

AgentsPilot handles the admin so they can close.

👉 Follow to see how',
 25, true,
 'https://design.canva.ai/c4Ek9aDXimciHgE',
 'https://www.canva.com/d/Btp4xEuWqKzii2j'),

('AI Positioning',
 'LinkedIn, Instagram, Facebook',
 'Static Image',
 'AI replaces the boring parts of work, not people. That''s exactly what AgentsPilot does.',
 '👉 Follow AgentsPilot to see more',
 'AI won''t replace your team. But it will replace the boring parts of their job.

That''s exactly what AgentsPilot does.

👉 Follow to see how',
 26, true,
 'https://design.canva.ai/6w0h_skT55Zr3Kk',
 'https://www.canva.com/d/IlP6l9BKzaZLkZ8'),

('Vision',
 'LinkedIn, Instagram, Facebook',
 'Static Image',
 'You built this business to grow it, not to manage it. AgentsPilot handles the management.',
 '👉 Follow AgentsPilot to see more',
 'You built this business to grow it. Not to manage it.

AgentsPilot handles the management.

👉 Follow to see how',
 27, true,
 'https://design.canva.ai/DqtV1U6jw8M47Xo',
 'https://www.canva.com/d/Wsb9579zUo3S2aE');
