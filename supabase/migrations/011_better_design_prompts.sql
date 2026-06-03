-- ── Migration 011: richer, more visual AI design prompts ─────────────────────

update post_templates set design_prompt =
'Cinematic social media post. Abstract infinite loop of glowing orange threads on deep charcoal, forming a Möbius strip shape with soft depth of field — representing endless repetitive work. Tiny light particles drift through the scene. Dramatic studio lighting with orange and cool-blue color grading. Ultra-modern editorial feel, like a luxury tech brand campaign. No text, no people. Square 1:1 format.'
where title = 'Teaser Post #1';

update post_templates set design_prompt =
'High-impact aerial photography aesthetic. Chaotic desk shot from directly above: dozens of overlapping sticky notes, spreadsheets, browser tabs, and notification badges piled on top of each other, shot with shallow depth of field so the center is sharp chaos and edges blur into darkness. Muted desaturated colors except one bright orange notification badge glowing in the corner. Editorial photojournalism style. Overwhelm made visual. Square 1:1 format.'
where title = 'Teaser Post #2 — Pain Question';

update post_templates set design_prompt =
'Sharp split-screen composition. LEFT half: dark red-tinted chaos — tangled cables, broken gears, overlapping sticky notes, warning icons, blurred motion suggesting frustration and complexity. RIGHT half: clean electric scene — a single smooth glowing orange circuit path flowing elegantly from input to output, crisp white space, order and calm. A razor-sharp diagonal line divides both worlds. No text. Professional B2B editorial. Square 1:1 format.'
where title = 'Comparison Post (Core)';

update post_templates set design_prompt =
'Luxurious macro photography. A single golden hourglass against dark slate, sand glowing warm amber as it falls. The glass is slightly tilted for drama, casting a long shadow. Abstract currency symbols subtly etched into the glass surface. Soft bokeh light orbs float in background. Rich premium feeling — like a luxury finance brand. Deep shadows, warm golden highlights, dark vignette edges. Square 1:1 format.'
where title = 'Value Post — Time & Money';

update post_templates set design_prompt =
'Clean isometric 3D illustration, modern startup style. Miniature office scene at 45-degree angle: tiny glowing laptop showing a green-checkmark expense dashboard, surrounded by small stacks of receipts being automatically sorted by a robotic arm. Soft pastel background with gentle drop shadows. Style inspired by Stripe or Linear product marketing — playful yet professional. Orange and white accent colors. Square 1:1 format.'
where title = 'Use Case — Expenses';

update post_templates set design_prompt =
'Bold graphic design poster. A giant glowing neon-orange question mark made of light tubes floats against a dark textured concrete wall. The question mark casts dramatic warm orange light and shadows on the wall behind it. Subtle light fog drifts through the scene. Inspired by editorial fashion photography meets tech brand aesthetics. Extremely minimal — question mark is the only element. Deep blacks, glowing orange. Square 1:1 format.'
where title = 'Engagement Post — Question';

update post_templates set design_prompt =
'Cinematic product reveal, Apple-launch aesthetic. A sleek dark dashboard screen emerges from total darkness, lit by a dramatic upward god-ray beam in deep orange and gold. The screen shows a clean minimal UI with glowing orange data points. Background is dark fluid texture with subtle perspective grid lines converging toward the screen. Lens flare elements. Premium, aspirational, cinematic. The mood is revelation — something important is about to change. Square 1:1 format.'
where title = 'Reveal Post (Later Stage)';
