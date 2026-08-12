# PhD Application Hub

A local-first Obsidian workflow for managing PhD applications from supervisor discovery to final decisions.

**Author:** DUGUXUNXING  
**License:** MIT

## Why this plugin?

PhD applications are usually not a single checklist. They involve a network of supervisors, universities, research fit, outreach, papers, deadlines, application documents, interviews, and decisions. PhD Application Hub turns that process into a structured workspace while keeping the underlying data as ordinary Markdown notes and Obsidian properties.

The plugin is discipline-neutral. It can be used for STEM, humanities, social sciences, professional doctorates, and interdisciplinary applications.

## Features

- Create and rank potential supervisors.
- Track research fit, priorities, contact status, and follow-up dates.
- Distinguish a generic `Replied` response from a genuinely encouraging `Positive` response.
- When a supervisor becomes `Positive`, optionally create the linked university and application in one guided flow.
- Keep application status consistent using a fixed status picker.
- Generate application checklists from the official deadline and automatically reschedule them when the deadline changes.
- Track papers relevant to a supervisor or application.
- Record emails, meetings, interviews, and follow-up actions.
- Track CV, SOP, research proposal, transcript, writing sample, and other document versions.
- Generate Obsidian Bases for supervisors, universities, applications, papers, interactions, and documents.
- Generate a central dashboard.
- Validate application and contact statuses for accidental free-text edits.
- All core data stays in local Markdown files. No account, telemetry, cloud service, or external API is required.

## Requirements

- Obsidian 1.9.10 or newer.
- The **Bases** core plugin should be enabled for the generated database views.
- The community **Tasks** plugin is optional. If installed, the dashboard also aggregates upcoming and overdue Markdown tasks. Without Tasks, all checklists still remain normal Markdown tasks inside application notes.

## Installation

### Community Plugins

After the plugin is accepted into the Obsidian Community directory:

1. Open **Settings → Community plugins**.
2. Search for **PhD Application Hub**.
3. Install and enable it.

### Manual installation

1. Create a folder named `phd-application-hub` inside:
   `YourVault/.obsidian/plugins/`
2. Copy `main.js`, `manifest.json`, and `styles.css` into that folder.
3. Reload Obsidian.
4. Enable **PhD Application Hub** under Community plugins.

## First-time setup

1. Open **Settings → PhD Application Hub**.
2. Keep or change the default workspace folder: `PhD Application`.
3. Set your application cycle, for example `2027`.
4. Set a default program name if useful.
5. Click **Initialize workspace**.

The plugin creates:

```text
PhD Application/
├── 00 Dashboard/
├── 01 Bases/
├── 10 Supervisors/
├── 20 Universities/
├── 30 Applications/
├── 40 Papers/
├── 50 Interactions/
├── 60 Documents/
└── 90 Archive/
```

It also creates six `.base` files and a dashboard note.

> Changing the workspace-folder setting later does not automatically migrate an existing workspace. Move the folder manually first, then update the setting and run **Initialize workspace** again to refresh dashboard/Base definitions.

## Recommended workflow

### 1. Add supervisors first

Run:

**Command Palette → PhD Application Hub: Add supervisor**

Record:

- supervisor name;
- university or institution;
- country;
- research areas;
- fit score from 1 to 5;
- priority A/B/C;
- email and website.

The university is stored as a link, but the plugin does not need to create a University page yet.

### 2. Evaluate fit

Each supervisor note contains sections for:

- why the supervisor/group is relevant;
- why your background is relevant;
- possible project overlap;
- relevant papers;
- funding/group notes;
- contact strategy;
- questions and risks.

Suggested fit scale:

- `5` — exceptional fit;
- `4` — strong fit;
- `3` — reasonable fit;
- `2` — partial fit;
- `1` — weak fit.

Suggested priority scale:

- `A` — top target;
- `B` — strong target;
- `C` — exploratory or backup.

Fit and priority are intentionally separate. A supervisor can be scientifically excellent but still be a lower practical priority because of funding, availability, location, timing, or competition.

### 3. Track outreach

Open a supervisor note and run:

**PhD Application Hub: Update supervisor contact status**

Allowed values are:

- `Not contacted`
- `Drafting`
- `Sent`
- `Replied`
- `Positive`
- `Follow-up`
- `Closed`

Use `Positive` only when the response is meaningfully encouraging: for example, the supervisor recommends applying, shows clear interest in your background, invites further discussion, or otherwise makes the program an active target.

### 4. Positive reply → University + Application

When you set a supervisor to `Positive`, the plugin asks whether to:

- create the university and application;
- create the university only;
- do nothing yet.

If you create both, the new application is automatically linked to the supervisor and starts in `Preparing` status.

This is the main workflow:

```text
Supervisor discovery
→ fit evaluation
→ outreach
→ Positive reply
→ University
→ Application
→ preparation
→ submission
→ interview
→ decision
```

You can also create universities or applications manually for centralized admissions processes where prior supervisor contact is not expected.

## Application statuses

Use **Update application status** rather than typing free text.

The fixed statuses are:

- `Researching`
- `Shortlisted`
- `Preparing`
- `Submitted`
- `Interview`
- `Offer`
- `Rejected`
- `Declined`

When you select `Submitted`, the plugin records the submission date automatically if it is empty. `Interview` prompts for an interview date. Final decision statuses can store a result note.

The Applications Base includes an **Invalid status** view so accidental manual edits are easy to detect.

## Deadline-generated checklist

If you enter an official deadline when creating an application, the plugin generates suggested due dates for:

- verifying eligibility and requirements;
- reviewing recent supervisor/group work;
- drafting the statement;
- requesting recommendations;
- preparing transcripts and degree documents;
- finalizing the CV;
- finalizing the statement/proposal;
- proofreading;
- uploading documents;
- final submission.

These are normal Markdown tasks. You can edit their dates at any time.

If the official application deadline changes later, simply edit the `deadline` property or run **PhD Application Hub: Update application deadline**. The plugin automatically reschedules the standard managed checklist tasks. The **Submit application** task always uses the official deadline itself.

## Interactions

Use **Record interaction** for important:

- sent emails;
- received replies;
- meetings;
- interviews;
- follow-ups;
- other application-related communication.

A follow-up date generates a Markdown follow-up task automatically.

## Papers

Use **Add relevant paper** only for papers that matter to your application strategy, not as a replacement for a full reference manager.

Paper notes focus on:

- the main result;
- why the paper matters to your application;
- methods and key results;
- connection to your experience;
- a possible question for the supervisor.

## Documents

Use **Add application document record** to track versions of:

- CV;
- statement / SOP;
- research proposal;
- transcript;
- reference letter;
- writing sample;
- other materials.

The actual PDF/DOCX can remain anywhere in your vault; the document note can store a path or wikilink to it.

## Dashboard and Bases

The generated dashboard embeds views for:

- upcoming applications;
- Positive supervisor responses;
- supervisor follow-ups;
- Priority A supervisors;
- active applications;
- recent interactions.

If the Tasks community plugin is enabled, the dashboard also shows overdue tasks and tasks due within 30 days without requiring JavaScript Tasks queries.

### Application deadlines vs Tasks

**Applications — next 30 days** is an application-level view: one row per application whose official deadline is approaching.

**Tasks due in the next 30 days** is an action-level view from the optional Tasks plugin: it shows individual checklist items such as `Finalize CV` and `Submit application`. Changing the application deadline automatically reschedules the standard checklist so these two views remain consistent.

## Commands

- Initialize PhD workspace
- Open application dashboard
- Add supervisor
- Update supervisor contact status
- Add university
- Add application
- Update application status
- Update application deadline
- Record interaction
- Add relevant paper
- Add application document record
- Validate PhD workspace

## Privacy and data

PhD Application Hub is local-first:

- no telemetry;
- no analytics;
- no external network requests;
- no login;
- no cloud database;
- no API keys.

The plugin only reads and writes files inside the Obsidian vault, primarily under the configured workspace folder.

## Development

Requirements: Node.js 18 or newer.

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

The build output is `main.js` in the repository root.

## Releasing

1. Update the version in `manifest.json`, `package.json`, and `versions.json` as needed.
2. Commit and push the changes.
3. Create a Git tag exactly equal to the manifest version, with no `v` prefix. Example: `1.0.1`.
4. Push the tag.
5. The included GitHub Actions workflow builds the plugin, creates provenance attestations, and creates a GitHub Release containing `main.js`, `manifest.json`, and `styles.css`.

## License

MIT License. See `LICENSE`.
