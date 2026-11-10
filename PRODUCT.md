# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Owners and staff of small neighborhood businesses in Colombia (restaurants, pizzerias, bakeries, corner stores, stationery shops, barbershops). They are not technical. They set up and run their business's WhatsApp bot themselves, often from a phone, between serving customers. Staff with the support role mostly answer conversations from the Inbox.

## Product Purpose

A multi-tenant SaaS where each Business builds its own messaging bot without code: Flows with steps (messages, options menus, questions, conditions), optional AI Agents with a prepaid AI balance, and a human Inbox for handoffs. It takes orders and reservations and answers frequent questions over WhatsApp (Facebook and Instagram later). Success: a bakery owner gets a working bot live on their own, and customers get answers at any hour.

## Positioning

Built for the corner shop, not the enterprise: Spanish-first, priced in Colombian pesos, self-serve, and AI spend that can never exceed what the Business prepaid. Flows and the AI Agent share the same tools, so a Business can start without AI and add it later.

## Operating Context

- Members sign in with an emailed one-time code; each Business has owner, admin and support roles.
- Flows are edited as a draft on a visual canvas, tried in a built-in simulator, then published; customers only ever see the published version.
- Business hours are set per day in Colombian time and Flows can branch on them.
- Domain vocabulary is fixed in `GLOSSARY.md` (Negocio, Flujo, Contacto, Traspaso…); UI copy uses those Spanish terms.

## Capabilities and Constraints

- UI copy is Spanish (Colombia); code is English.
- Stack: Next.js app router on AWS via SST, DynamoDB, OpenAuth.
- Still undecided: pricing amounts and plan limits.

## Brand Commitments

- Product name in use: "Workflow Agent" (working name, not final).
- Dark mode is the primary design target, styled after Claude's interface; light mode follows the system preference.

## Evidence on Hand

No customers, testimonials, logos or metrics exist yet. Do not fabricate any.

## Product Principles

1. A non-technical owner must succeed alone, on a phone.
2. What the customer sees is always predictable: drafts never leak, the simulator shows the real thing.
3. Money and data are safe by default: no surprise AI charges, no data crossing between Businesses.
4. Say it in the owner's words, in Spanish, with the glossary's terms.

## Accessibility & Inclusion

WCAG 2.2 AA: AA contrast in both themes, full keyboard operation, 44px touch targets, visible focus, and motion that respects reduced-motion preferences.
