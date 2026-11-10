---
version: 1
slug: "app-panel-layout-tsx"
primary_target: "app/(panel)/layout.tsx"
related_targets: ["components/flow-editor/FlowEditor.tsx"]
---

# Surface brief: web panel

Scope: the authenticated web panel (packages/web) — shell, home, onboarding, Flows list, Flow editor with simulator, business hours, dev mailbox, plus the sign-in screen theme. Mode: Operate.

Audience and job: non-technical owners and staff of neighborhood businesses in Colombia, often on a phone between customers, building and testing their WhatsApp bot. Primary tasks: create a Flow, connect steps, try it in the simulator, publish; set business hours.

Constraints: Spanish UI with glossary terms; WCAG 2.2 AA; mobile first with 44px targets; dark theme designed first, light follows the system; no Claude name or logo.

Seed: none (pinned by the user: a dark interface in the style of Claude).

## Direction contract

THESIS: A calm, warm workspace where building a bot feels like writing, not wiring. Refuses the category default of a cold blue SaaS dashboard with a dense grey canvas.

OWN-WORLD: Warm near-black grounds (#1f1e1d shell, #262624 work area, #30302e raised), ivory text (#faf9f5), muted sand (#c2c0b6), hairline borders in translucent sand, one clay accent (#d97757 / #b85a38 for filled buttons) for primary actions, selection and focus. System sans, tight 1.15 scale, generous spacing, soft 10–14px radii, low offset shadows.

STORY: The owner lands, sees their Business and the next step, opens a Flow, drags steps into a conversation, and immediately chats with it in the simulator before publishing.

FIRST VIEWPORT: Desktop — left rail (brand, Business, Inicio/Flujos/Horario, account) and the work area. Mobile — compact top bar with the page title and a bottom tab bar. The editor gives the canvas the full viewport; step details and the simulator rise as bottom sheets on phones and dock right on desktop.

SIGNATURE: The simulator as the editor's companion: a live chat column docked beside the canvas, the bot's replies set like Claude's conversation, so testing is one glance away.

RISK: Warm dark can drift muddy and low-contrast; every text pairing is checked for AA, and state colors stay legible on the warm grounds.
