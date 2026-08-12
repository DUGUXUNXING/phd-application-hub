# Changelog

## 1.0.1 - 2026-08-12

- Fixed the Applications Base `Days left` formula by explicitly converting dates to numeric timestamps before rounding.
- Added automatic deadline-to-checklist synchronization for application notes.
- Added **Update application deadline** command.
- Editing an Application `deadline` property now reschedules all standard managed checklist due dates automatically.
- Existing application notes are reconciled on plugin load, including applications that originally had no deadline.
- Clarified the difference between application-level deadlines and individual Tasks checklist items on the dashboard.


## 1.0.0 - 2026-08-12

- Initial public release.
- Local-first PhD application workspace generator.
- Supervisor outreach and Positive-response workflow.
- Linked university and application creation.
- Fixed application-status picker.
- Deadline-generated Markdown checklists.
- Paper, interaction, and document tracking.
- Obsidian Bases dashboard and database views.
- Optional Tasks integration without JavaScript queries.
- Workspace validation command.
