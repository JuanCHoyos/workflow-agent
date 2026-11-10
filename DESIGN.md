---
name: Workflow Agent
description: A calm, warm dark workspace for building and testing WhatsApp bots, phone first.
colors:
  clay: "#b85a38"
  clay-deep: "#a64f30"
  clay-text: "#e8957a"
  clay-soft: "rgb(217 119 87 / 16%)"
  on-clay: "#ffffff"
  focus-clay: "#e8957a"
  ground-shell: "#1f1e1d"
  ground: "#262624"
  surface: "#2b2a28"
  surface-raised: "#30302e"
  surface-sunken: "#1c1b1a"
  hover-veil: "rgb(250 249 245 / 6%)"
  pressed-veil: "rgb(250 249 245 / 10%)"
  hairline: "rgb(222 220 209 / 13%)"
  hairline-strong: "rgb(222 220 209 / 24%)"
  ivory: "#faf9f5"
  sand-secondary: "#d7d5cc"
  sand-muted: "#a8a69d"
  scrim: "rgb(10 10 9 / 62%)"
  danger: "#f2a299"
  danger-soft: "rgb(242 162 153 / 12%)"
  warning-text: "#f0c56d"
  warning-soft: "rgb(240 197 109 / 12%)"
  success-text: "#8fd19e"
  success-soft: "rgb(143 209 158 / 12%)"
  step-message: "#d97757"
  step-menu: "#a48ad6"
  step-question: "#d9a441"
  step-condition: "#6f9fe0"
  step-end: "#8f8d85"
typography:
  headline:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title-sm:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  control:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 550
    lineHeight: 1
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 550
  caption:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
  voice:
    fontFamily: "ui-serif, Georgia, Times New Roman, serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  mono:
    fontFamily: "ui-monospace, SF Mono, Cascadia Code, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
rounded:
  sm: "8px"
  md: "10px"
  lg: "14px"
  xl: "20px"
  pill: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "24px"
  "6": "32px"
  "7": "48px"
  control-h: "44px"
components:
  button-primary:
    backgroundColor: "{colors.clay}"
    textColor: "{colors.on-clay}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.clay-deep}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ivory}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.hover-veil}"
  button-toggle-on:
    backgroundColor: "{colors.clay-soft}"
    textColor: "{colors.clay-text}"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.danger}"
  button-danger-hover:
    backgroundColor: "{colors.danger-soft}"
  button-sm:
    height: "36px"
    padding: "0 12px"
  input:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.ivory}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "44px"
  chip-toggle:
    backgroundColor: "transparent"
    textColor: "{colors.sand-secondary}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "36px"
  chip-toggle-on:
    backgroundColor: "{colors.clay-soft}"
    textColor: "{colors.clay-text}"
  badge:
    backgroundColor: "{colors.hover-veil}"
    textColor: "{colors.sand-secondary}"
    rounded: "{rounded.pill}"
    padding: "0 8px"
    height: "22px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "24px"
  sheet:
    backgroundColor: "{colors.surface-raised}"
    rounded: "{rounded.xl}"
  dialog:
    backgroundColor: "{colors.surface-raised}"
    rounded: "{rounded.xl}"
    width: "440px"
  step-node:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.lg}"
    padding: "12px"
    width: "248px"
  nav-item-active:
    backgroundColor: "{colors.pressed-veil}"
    textColor: "{colors.ivory}"
    rounded: "{rounded.md}"
    height: "40px"
  simulator-contact-bubble:
    backgroundColor: "{colors.clay}"
    textColor: "{colors.on-clay}"
    rounded: "16px"
    padding: "8px 12px"
---

# Design System: Workflow Agent

## Overview

**Creative North Star: "The Warm Writing Desk"**

A dark, quiet workspace where building a bot feels like writing, not wiring. Grounds are warm near-blacks stacked in small tonal steps, text is ivory and sand, and a single clay accent marks what to do next, what is selected and where focus is. Dark is the designed theme; light follows the operating system from the same token names (values live in `packages/web/app/globals.css` and the sidecar).

Density is calm: one system sans face, a short type ramp, 44px controls, generous gaps on a 4px base. Depth comes from tonal layering and hairline borders first, soft shadows only where something floats over the canvas. The one expressive move is the simulator: the bot's replies are set unboxed in a serif voice face, the Contact's messages sit in clay bubbles, so testing reads like a conversation rather than a debug log.

The world refuses the cold blue SaaS dashboard with a dense grey canvas. Phones come first: on a phone the editor owns the full viewport and details rise as bottom sheets; at 900px and up a left sidebar appears and sheets dock to the right.

**Key Characteristics:**
- Warm near-black tonal stack, no pure black or cool greys.
- One clay accent for primary action, selection, focus and the active tab.
- System sans for everything operational; serif only for the bot's voice.
- Hairline translucent-sand borders; soft, low shadows only on floating layers.
- 44px touch targets on coarse pointers, everywhere.

## Colors

A warm, low-chroma dark palette with one clay accent and a separate, functional hue set for step types.

### Primary
- **Clay** (`clay`): filled primary buttons, the Contact's bubbles in the simulator, the "Simulando" badge, the checked switch track. White text on it holds at least 4.5:1.
- **Deep Clay** (`clay-deep`): primary hover. Hover darkens in both themes so white text keeps contrast.
- **Clay Ink** (`clay-text`): accent used as text or stroke on dark grounds: links, active tab, toggle-on labels, selected step border, selected edges, connection line, unsaved dot.
- **Clay Wash** (`clay-soft`): selected and pressed-on fills (chip toggles, aria-pressed buttons, accent badges), the focus halo around inputs and selected steps, text selection.
- **Focus Clay** (`focus-clay`): the 2px focus outline (offset 2px) and focused input border.

### Neutral
- **Shell Black** (`ground-shell`): sidebar, mobile top bar and tab bar (88-92% opaque with blur), editor toolbar.
- **Work Ground** (`ground`): page and canvas background.
- **Surface** (`surface`): cards, grouped lists, rule and option cards inside the step panel.
- **Raised Surface** (`surface-raised`): sheets, dialogs, menus, step nodes, the home "next step" panel.
- **Sunken Well** (`surface-sunken`): input fills, the simulator chat well, option rows inside steps.
- **Hover / Pressed Veils** (`hover-veil`, `pressed-veil`): translucent ivory over any ground; hover only on fine pointers, pressed marks the current sidebar item.
- **Hairline / Strong Hairline** (`hairline`, `hairline-strong`): dividers and container borders; strong for control borders, switch off-track, sheet handle, canvas dot grid.
- **Ivory** (`ivory`): primary text. **Sand** (`sand-secondary`): secondary text, labels, nav items. **Muted Sand** (`sand-muted`): hints, captions, placeholders, inactive tabs, edges.

### Status
- **Danger / Warning / Success**: each a light text tone paired with a 12% wash of itself (`danger` + `danger-soft`, etc.). Used for notices, the canvas issues pill (warning), issue borders on steps (warning text color) and destructive buttons.

### Step Types
- **Message** (`step-message`), **Options menu** (`step-menu`), **Question** (`step-question`), **Condition** (`step-condition`), **End** (`step-end`): appear only as the step's header icon, its output handle ring and its icon in the add-step menu. Never as fills.

### Named Rules
**The One Clay Rule.** Clay is the only accent. It marks the primary action, selection, focus and the current place; nothing decorative is clay.

**The Wash-Not-Fill Rule.** Selected and on states use the 12-16% wash of their color with the ink tone as text, never a saturated fill. The filled clay is reserved for the primary button and the Contact's voice.

**The Icon-Only Step Hue Rule.** Step-type colors identify, they don't decorate: icon, handle ring, menu icon. Node bodies stay on the raised surface.

## Typography

**Body Font:** system sans (`ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto`)
**Voice Font:** system serif (`ui-serif, Georgia`), only for the bot's replies in the simulator
**Mono Font:** system mono (`ui-monospace, "SF Mono", "Cascadia Code", Consolas`), for variable names

**Character:** the operational face disappears into the work; the serif gives the bot a human, conversational voice in the one place the product talks back.

### Hierarchy
- **Headline** (600, 1.625rem, 1.2, -0.02em, balanced wrap): page titles.
- **Title** (600, 1.125rem, 1.3, -0.01em): section titles. **Title small** (600, 1rem): sheet titles, Flow name in the editor toolbar.
- **Body** (400, 16px, 1.5): running text; page intros capped at 62ch. Inputs stay at 16px so iOS never zooms.
- **Control** (550, 0.9375rem): buttons, nav items, simulator options.
- **Label** (550, 0.875rem): field labels, chip toggles, small buttons.
- **Caption** (400, 0.8125rem): hints, save status, menu descriptions. Badges and tab labels use 0.75rem at 600; step headers 0.75rem at 650.
- **Voice** (400, 1rem, 1.6, serif): bot replies, unboxed.

### Named Rules
**The Single Voice Rule.** The serif belongs to the bot. It never appears in chrome, headings or forms.

**The Half-Step Weight Rule.** Interactive text sits at 550, between regular body and 600 headings, so controls read as touchable without shouting.

## Layout

Mobile first with one breakpoint at 900px. Below it: a sticky 56px top bar with the page title, a fixed 64px three-tab bar (Inicio, Flujos, Horario) with safe-area padding, and content padded 24px/16px with room for the tab bar. At 900px and up: a 248px sticky sidebar (brand, Business card, nav, account) and content centered at max 960px with 48px/32px padding. A secondary 640px step lets rows go horizontal (home next-step panel, Flow creation, business-hours day rows).

The Flow editor takes the full viewport: on phones the app chrome hides and the editor brings its own toolbar with a back arrow; on desktop the sidebar stays and step details or the simulator dock as a 380px panel to the right of the canvas. On phones the hours save bar sticks above the tab bar so saving never needs a scroll, and scroll padding keeps focused elements clear of both bars.

Spacing is a 4px-based scale (4, 8, 12, 16, 24, 32, 48). Stacks and rows default to 12px gaps; page headers sit 24px above content; panels pad 16-24px.

## Elevation & Depth

Hybrid, tonal first. Resting content is flat: depth comes from the ground stack (sunken, ground, surface, raised) and hairline borders. Shadows appear only on layers that float above the work: sheets and dialogs, menus, the add-step button, canvas controls, the phone save bar, and lightly on step nodes so they sit on the canvas. The mobile bars use translucency with a 16px blur instead of a shadow.

### Shadow Vocabulary
- **Rest** (`shadow-sm`): step nodes on the canvas.
- **Float** (`shadow-md`): add-step button, issues list, canvas controls, phone save bar, selected step (with a 3px clay-wash ring).
- **Overlay** (`shadow-lg`): bottom sheet, dialog, add-step menu.
- **Lift**: a dragged step gets a soft drop-shadow filter; it never changes size or position on its own.

Exact values are in the sidecar; all are soft, blurred and offset downward only.

### Named Rules
**The Float-Only Shadow Rule.** If it scrolls with the page, it has no shadow. Shadows mean "this is above the work."

## Shapes

Soft, consistent corners: 8px for small inner items (option rows, menu items, the inline name field), 10px for controls and notices, 14px for cards, lists, nodes, menus and docked panels, 20px for sheets and dialogs. Pills (999px) for chips, badges, the switch, the issues pill and the sheet handle. Grouped lists are one bordered container with hairline dividers between rows, not separate cards. Empty states use a dashed strong hairline.

## Components

### Buttons
Quiet and solid; one filled button per view.
- **Shape:** gently rounded (10px), 44px tall, 16px side padding; small variant 36px, raised to 44px on coarse pointers. Icon buttons are square at the same heights.
- **Primary:** clay fill, white label at 550.
- **Secondary (default):** transparent with a strong hairline border. **Ghost:** no border. **Danger:** danger text, wash on hover; **Danger strong:** wash fill with a 45% danger border for confirmations.
- **Toggle (aria-pressed):** clay wash fill, clay ink label, half-opacity ink border (the editor's Probar button).
- **States:** hover veil only on fine pointers; press scales to 0.97 over 160ms with the out curve; disabled at 45% opacity.

### Chips
- **Day toggles:** pill outline in strong hairline with sand label; checked becomes clay wash with clay ink and no border. A visually hidden checkbox carries semantics; focus ring on the pill.
- **Badges:** 22px pills at 0.75rem/600 on the hover veil; accent and success variants use their wash.

### Cards / Containers
- **Corner Style:** 14px. **Background:** surface (raised for the emphasized next-step panel). **Border:** 1px hairline. **Padding:** 24px for cards, 16px for list rows. **Shadow:** none.

### Inputs / Fields
- **Style:** sunken fill, strong hairline border, 10px corners, 44px tall, 16px text; textarea 112px minimum. Selects use a custom chevron.
- **Focus:** border turns focus clay with a 3px clay-wash halo; no outline.
- **Error:** danger border via `aria-invalid`. Labels in sand at 0.875rem/550 above, hints muted at 0.8125rem below.
- **Switch:** 44x26 pill track (strong hairline off, clay on) with a white 20px thumb and an invisible hit area extended 9px; the thumb stretches while pressed.

### Navigation
- **Desktop sidebar:** shell black, 40px rows at 0.9375rem/550 in sand; current item gets the pressed veil and ivory text; Business shown in a veil-filled card.
- **Phone:** blurred top bar with the page title; tab bar with 22px icons over 0.75rem labels, muted at rest and clay ink when current.

### Sheet (signature)
One component, two forms. On phones a modal bottom sheet: raised surface, 20px top corners, overlay shadow, max 82dvh, slides up over 420ms on the drawer curve, dismisses by dragging the header (distance or flick), Escape, scrim tap or close button. It takes dialog semantics, makes the rest of the page inert, focuses itself (not a field, so the keyboard stays down) and returns focus to its opener. At 900px it becomes a static 14px-cornered docked region labeled for assistive tech.

### Flow canvas and step nodes
Canvas on the work ground with a strong-hairline dot grid and muted edges (1.75px; 2.5px selected). Step nodes are 248px raised cards (End is 148px) with a strong hairline border; a 0.75rem/650 header carries the type icon in its step hue plus Inicio or Simulando badges. Selected: clay ink border plus clay-wash ring. Waiting step in the simulator: clay ink border. Steps with issues: warning border. Handles are 12px rings with a 12px invisible extension, growing on fine-pointer hover. The add-step menu rises from a floating primary button bottom-left; an issues pill top-left expands into a list that jumps to each step.

### Simulator
A sunken chat well inside the sheet. The bot speaks unboxed in the voice serif at 1rem/1.6; the Contact's messages are right-aligned clay bubbles (16px corners, 6px at the tail). Menu options render as stacked raised buttons in clay ink; captured variables show as mono clay-wash pills. New lines enter with a 6px rise over 220ms.

### Dialog
Native dialog for confirmations: raised surface, 20px corners, overlay shadow, max 440px, scrim backdrop; fades and scales from 0.96 over 200ms.

### Sign-in
The hosted sign-in screen reuses the grounds, clay primary, medium radius and system sans, with sunken inputs in dark mode.

## Do's and Don'ts

### Do:
- **Do** keep every interactive target at 44px on coarse pointers, extending hit areas invisibly where the visual must stay small (switch, canvas handles).
- **Do** gate hover effects behind `(hover: hover) and (pointer: fine)`; touch gets press feedback (scale 0.97) instead.
- **Do** give every motion a reduced-motion path: transforms drop out, sheets and dialogs fall back to a short fade, pop-in and message animations are removed.
- **Do** offer a non-drag path for every drag: steps open with Enter or Space after Tab, and step connections can be set from selects in the step panel.
- **Do** make phone overlays true modals: dialog semantics, inert background, focus on open and focus returned on close.
- **Do** use the 2px focus-clay outline with 2px offset for keyboard focus everywhere; inputs use the border-plus-halo variant.
- **Do** use the ease-out curve for press and pop-in, the drawer curve for sheets; keep UI transitions at 150-200ms and sheets at 420ms.

### Don't:
- **Don't** introduce a second accent or a cool blue-grey neutral; the grounds stay warm.
- **Don't** fill step nodes or large areas with step-type hues.
- **Don't** use the serif outside the bot's voice.
- **Don't** put shadows on resting cards, lists or panels.
- **Don't** drop input text below 16px.
