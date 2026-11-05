## Agent skills

### Issue tracker

Issues live in GitHub Issues for `JuanCHoyos/workflow-agent` (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Code conventions

All code is written in English: functions, variables, types, file names, comments, test names, DynamoDB key prefixes and infrastructure resource names. Spanish is used only for user-facing text (bot messages, UI copy) and for the domain docs (`GLOSSARY.md`, ADRs, specs, issues).

Commit messages and PR titles follow [Conventional Commits](https://www.conventionalcommits.org/) in English: `type(scope): summary`, lowercase and imperative, with the issue in the footer (`Closes #6`). Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`, `build`, `perf`. Scopes: `core`, `web`, `admin`, `functions`, `infra`. PRs are squash-merged, so the PR title becomes the commit on `main`.

Domain terms from `GLOSSARY.md` map to code names as follows:

| Glossary (es) | Code (en) |
|---|---|
| Negocio | Business |
| Miembro | Member |
| Propietario / Administrador / Atención | MemberRole `owner` / `admin` / `support` |
| Asesor | Assignee (the Member attending a Conversation) |
| Contacto | Contact |
| Ficha del Contacto | ContactProfile |
| Conversación | Conversation |
| Sesión | Session |
| Ventana de servicio | ServiceWindow |
| Traspaso | Handoff |
| Calificación | Rating |
| Horario de atención | BusinessHours |
| Flujo / Flujo principal | Flow / MainFlow |
| Plantilla de Flujo | FlowTemplate |
| Disparador | Trigger |
| Menú de opciones | OptionsMenu |
| Agente | AiAgent |
| Herramienta | Tool |
| Base de conocimiento | KnowledgeBase |
| Respuesta rápida | QuickReply |
| Plantilla de WhatsApp | WhatsAppTemplate |
| Colección / Registro / Formulario | Collection / Record / Form |
| Catálogo / Producto / Variante / Adicional / Stock | Catalog / Product / Variant / AddOn / Stock |
| Pedido / Pedido en borrador | Order / DraftOrder |
| Método de pago | PaymentMethod |
| Zona de domicilio | DeliveryZone |
| Agenda / Recurso / Servicio / Reserva | Schedule / Resource / Service / Reservation |
| Saldo IA / Presupuesto mensual | AiBalance / MonthlyBudget |
| Plan Flujos / Plan IA | FlowsPlan / AiPlan |
| Configuración asistida | AssistedSetup |
