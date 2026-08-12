import {
  App,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  normalizePath,
} from "obsidian";

interface PhDApplicationHubSettings {
  workspaceFolder: string;
  cycle: string;
  defaultProgram: string;
}

const DEFAULT_SETTINGS: PhDApplicationHubSettings = {
  workspaceFolder: "PhD Application",
  cycle: String(new Date().getFullYear() + 1),
  defaultProgram: "PhD Program",
};

const APPLICATION_STATUSES = [
  "Researching",
  "Shortlisted",
  "Preparing",
  "Submitted",
  "Interview",
  "Offer",
  "Rejected",
  "Declined",
] as const;

const CONTACT_STATUSES = [
  "Not contacted",
  "Drafting",
  "Sent",
  "Replied",
  "Positive",
  "Follow-up",
  "Closed",
] as const;

const PRIORITIES = ["A", "B", "C"] as const;

const APPLICATION_TASK_SCHEDULE = [
  { text: "Verify eligibility and all required documents", daysBefore: 60 },
  { text: "Review supervisor or group recent work", daysBefore: 50 },
  { text: "Draft statement / SOP / research statement", daysBefore: 45 },
  { text: "Request recommendation letters", daysBefore: 35 },
  { text: "Prepare transcript and degree documents", daysBefore: 30 },
  { text: "Finalize CV", daysBefore: 21 },
  { text: "Finalize statement or proposal", daysBefore: 14 },
  { text: "Proofread final package", daysBefore: 10 },
  { text: "Upload documents and verify portal fields", daysBefore: 7 },
  { text: "Submit application", daysBefore: 0 },
] as const;

type FieldType = "text" | "textarea" | "dropdown";

interface FormField {
  key: string;
  label: string;
  type?: FieldType;
  placeholder?: string;
  value?: string;
  options?: Record<string, string>;
  description?: string;
}

class FormModal extends Modal {
  private fields: FormField[];
  private values: Record<string, string> = {};
  private submitLabel: string;
  private onSubmit: (values: Record<string, string>) => void | Promise<void>;

  constructor(
    app: App,
    title: string,
    fields: FormField[],
    onSubmit: (values: Record<string, string>) => void | Promise<void>,
    submitLabel = "Create",
  ) {
    super(app);
    this.setTitle(title);
    this.fields = fields;
    this.onSubmit = onSubmit;
    this.submitLabel = submitLabel;
    for (const field of fields) this.values[field.key] = field.value ?? "";
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass("phd-application-hub-modal");

    for (const field of this.fields) {
      const setting = new Setting(contentEl).setName(field.label);
      if (field.description) setting.setDesc(field.description);

      if (field.type === "dropdown" && field.options) {
        setting.addDropdown((dropdown) => {
          dropdown.addOptions(field.options ?? {});
          dropdown.setValue(this.values[field.key]);
          dropdown.onChange((value: string) => (this.values[field.key] = value));
        });
      } else if (field.type === "textarea") {
        setting.addTextArea((text) => {
          text.setPlaceholder(field.placeholder ?? "");
          text.setValue(this.values[field.key]);
          text.onChange((value: string) => (this.values[field.key] = value));
        });
      } else {
        setting.addText((text) => {
          text.setPlaceholder(field.placeholder ?? "");
          text.setValue(this.values[field.key]);
          text.onChange((value: string) => (this.values[field.key] = value));
        });
      }
    }

    new Setting(contentEl)
      .addButton((button) =>
        button.setButtonText("Cancel").onClick(() => this.close()),
      )
      .addButton((button) =>
        button
          .setButtonText(this.submitLabel)
          .setCta()
          .onClick(async () => {
            this.close();
            await this.onSubmit({ ...this.values });
          }),
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

class ChoiceModal extends Modal {
  constructor(
    app: App,
    title: string,
    message: string,
    choices: Array<{ label: string; value: string; cta?: boolean }>,
    onChoose: (value: string) => void | Promise<void>,
  ) {
    super(app);
    this.setTitle(title);
    const { contentEl } = this;
    contentEl.createEl("p", { text: message });

    for (const choice of choices) {
      new Setting(contentEl).addButton((button) => {
        button.setButtonText(choice.label);
        if (choice.cta) button.setCta();
        button.onClick(async () => {
          this.close();
          await onChoose(choice.value);
        });
      });
    }
  }
}

export default class PhDApplicationHubPlugin extends Plugin {
  settings: PhDApplicationHubSettings = DEFAULT_SETTINGS;
  private applicationDeadlines = new Map<string, string>();
  private deadlineSyncInProgress = new Set<string>();

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addRibbonIcon("graduation-cap", "Open PhD Application Hub", () => {
      void this.openDashboard();
    });

    this.addCommand({
      id: "initialize-workspace",
      name: "Initialize PhD workspace",
      callback: () => void this.initializeWorkspace(),
    });

    this.addCommand({
      id: "open-dashboard",
      name: "Open application dashboard",
      callback: () => void this.openDashboard(),
    });

    this.addCommand({
      id: "add-supervisor",
      name: "Add supervisor",
      callback: () => this.openCreateSupervisorModal(),
    });

    this.addCommand({
      id: "update-supervisor-contact-status",
      name: "Update supervisor contact status",
      callback: () => void this.openUpdateSupervisorStatusModal(),
    });

    this.addCommand({
      id: "add-university",
      name: "Add university",
      callback: () => this.openCreateUniversityModal(),
    });

    this.addCommand({
      id: "add-application",
      name: "Add application",
      callback: () => this.openCreateApplicationModal(),
    });

    this.addCommand({
      id: "update-application-status",
      name: "Update application status",
      callback: () => void this.openUpdateApplicationStatusModal(),
    });

    this.addCommand({
      id: "update-application-deadline",
      name: "Update application deadline",
      callback: () => void this.openUpdateApplicationDeadlineModal(),
    });

    this.addCommand({
      id: "record-interaction",
      name: "Record interaction",
      callback: () => this.openCreateInteractionModal(),
    });

    this.addCommand({
      id: "add-paper",
      name: "Add relevant paper",
      callback: () => this.openCreatePaperModal(),
    });

    this.addCommand({
      id: "add-document",
      name: "Add application document record",
      callback: () => this.openCreateDocumentModal(),
    });

    this.addCommand({
      id: "validate-workspace",
      name: "Validate PhD workspace",
      callback: () => void this.validateWorkspace(),
    });

    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        void this.handleApplicationMetadataChanged(file);
      }),
    );

    this.app.workspace.onLayoutReady(() => {
      void this.migrateGeneratedFiles();
      void this.captureAndSyncApplicationDeadlines();
    });

    this.addSettingTab(new PhDApplicationHubSettingTab(this.app, this));
  }

  private get root(): string {
    return normalizePath(this.settings.workspaceFolder.trim() || "PhD Application");
  }

  private path(relative: string): string {
    return normalizePath(`${this.root}/${relative}`);
  }

  private async loadSettings(): Promise<void> {
    const loaded = (await this.loadData()) as Partial<PhDApplicationHubSettings> | null;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded ?? {});
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async initializeWorkspace(): Promise<void> {
    const folders = [
      this.root,
      this.path("00 Dashboard"),
      this.path("01 Bases"),
      this.path("10 Supervisors"),
      this.path("20 Universities"),
      this.path("30 Applications"),
      this.path("40 Papers"),
      this.path("50 Interactions"),
      this.path("60 Documents"),
      this.path("90 Archive"),
    ];

    for (const folder of folders) await this.ensureFolder(folder);
    await this.writeFileIfMissing(this.path("00 Dashboard/PhD Application Dashboard.md"), this.dashboardContent());
    await this.writeOrReplace(this.path("01 Bases/Supervisors.base"), this.supervisorsBase());
    await this.writeOrReplace(this.path("01 Bases/Universities.base"), this.universitiesBase());
    await this.writeOrReplace(this.path("01 Bases/Applications.base"), this.applicationsBase());
    await this.writeOrReplace(this.path("01 Bases/Papers.base"), this.papersBase());
    await this.writeOrReplace(this.path("01 Bases/Interactions.base"), this.interactionsBase());
    await this.writeOrReplace(this.path("01 Bases/Documents.base"), this.documentsBase());

    new Notice("PhD Application Hub workspace is ready.");
    await this.openDashboard();
  }

  private async ensureWorkspace(): Promise<void> {
    const dashboard = this.app.vault.getAbstractFileByPath(this.path("00 Dashboard/PhD Application Dashboard.md"));
    if (!dashboard) await this.initializeWorkspace();
  }

  private async ensureFolder(folderPath: string): Promise<void> {
    const normalized = normalizePath(folderPath);
    const parts = normalized.split("/");
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!this.app.vault.getAbstractFileByPath(current)) {
        await this.app.vault.createFolder(current);
      }
    }
  }

  private async writeFileIfMissing(filePath: string, content: string): Promise<void> {
    if (!this.app.vault.getAbstractFileByPath(filePath)) {
      await this.ensureFolder(filePath.split("/").slice(0, -1).join("/"));
      await this.app.vault.create(filePath, content);
    }
  }

  private async writeOrReplace(filePath: string, content: string): Promise<void> {
    await this.ensureFolder(filePath.split("/").slice(0, -1).join("/"));
    const existing = this.app.vault.getAbstractFileByPath(filePath);
    if (existing instanceof TFile) await this.app.vault.modify(existing, content);
    else if (!existing) await this.app.vault.create(filePath, content);
  }

  private async openDashboard(): Promise<void> {
    await this.ensureWorkspace();
    const file = this.app.vault.getAbstractFileByPath(this.path("00 Dashboard/PhD Application Dashboard.md"));
    if (file instanceof TFile) await this.app.workspace.getLeaf(false).openFile(file);
  }

  private activeFileOfType(type: string): TFile | null {
    const file = this.app.workspace.getActiveFile();
    if (!file) {
      new Notice(`Open a ${type} note first.`);
      return null;
    }
    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
    if (fm?.type !== type) {
      new Notice(`This command must be run inside a ${type} note.`);
      return null;
    }
    return file;
  }

  private openCreateSupervisorModal(): void {
    void this.ensureWorkspace().then(() => {
      new FormModal(
        this.app,
        "Add supervisor",
        [
          { key: "name", label: "Supervisor name", placeholder: "Full name" },
          { key: "university", label: "University / institution", description: "The university page is normally created only after a Positive reply." },
          { key: "country", label: "Country" },
          { key: "areas", label: "Research areas", placeholder: "Comma-separated topics" },
          { key: "fit", label: "Fit", type: "dropdown", value: "4", options: { "5": "5 — exceptional", "4": "4 — strong", "3": "3 — reasonable", "2": "2 — partial", "1": "1 — weak" } },
          { key: "priority", label: "Priority", type: "dropdown", value: "B", options: { A: "A — top target", B: "B — strong target", C: "C — exploratory" } },
          { key: "email", label: "Email" },
          { key: "website", label: "Website" },
        ],
        async (values) => {
          if (!values.name.trim()) return void new Notice("Supervisor name is required.");
          await this.createSupervisor(values);
        },
      ).open();
    });
  }

  private async createSupervisor(values: Record<string, string>): Promise<void> {
    const name = values.name.trim();
    const filePath = this.path(`10 Supervisors/${this.safeFileName(name)}.md`);
    if (this.app.vault.getAbstractFileByPath(filePath)) return void new Notice("That supervisor already exists.");

    const areas = this.parseList(values.areas);
    const content = `---\ntype: supervisor\nname: ${this.yaml(name)}\nuniversity: ${this.yaml(values.university ? `[[${values.university.trim()}]]` : "")}\ncountry: ${this.yaml(values.country)}\nresearch_areas:${this.yamlList(areas)}\nfit: ${Number(values.fit) || 4}\npriority: ${this.yaml(values.priority || "B")}\ncontact_status: "Not contacted"\nlast_contact:\nfollow_up:\nemail: ${this.yaml(values.email)}\nwebsite: ${this.yaml(values.website)}\ncreated: ${this.today()}\n---\n\n# ${name}\n\n## Research fit\n\n### Why this supervisor or group is relevant\n- \n\n### Why my background is relevant\n- \n\n### Possible project overlap\n- \n\n## Research themes\n- \n\n## Relevant papers\n- \n\n## Group and funding notes\n- Group size:\n- Recruitment notes:\n- Funding model:\n- Expected start date:\n\n## Contact strategy\n- Main reason to contact:\n- Specific paper or result to mention:\n- Proposed question or project idea:\n\n## Contact history\n- Status: Not contacted\n\n## Questions and risks\n- \n\n## Next action\n- [ ] Review recent work\n`;
    await this.app.vault.create(filePath, content);
    new Notice(`Created supervisor: ${name}`);
  }

  private async openUpdateSupervisorStatusModal(): Promise<void> {
    const file = this.activeFileOfType("supervisor");
    if (!file) return;
    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
    const options = this.toOptions(CONTACT_STATUSES);

    new FormModal(
      this.app,
      "Update supervisor contact status",
      [
        { key: "status", label: "Contact status", type: "dropdown", value: CONTACT_STATUSES.includes(fm.contact_status) ? fm.contact_status : "Not contacted", options },
        { key: "last_contact", label: "Last contact date", value: fm.last_contact ?? this.today(), placeholder: "YYYY-MM-DD" },
        { key: "follow_up", label: "Follow-up date", value: fm.follow_up ?? "", placeholder: "YYYY-MM-DD (optional)" },
      ],
      async (values) => {
        await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, any>) => {
          frontmatter.contact_status = values.status;
          frontmatter.last_contact = values.last_contact || undefined;
          frontmatter.follow_up = values.follow_up || undefined;
        });
        new Notice(`Contact status → ${values.status}`);
        if (values.status === "Positive") this.offerCreateUniversityAndApplication(file);
      },
      "Update",
    ).open();
  }

  private offerCreateUniversityAndApplication(supervisorFile: TFile): void {
    new ChoiceModal(
      this.app,
      "Positive response",
      "A Positive response normally means you now plan to apply. Create the linked university and application?",
      [
        { label: "Create university and application", value: "both", cta: true },
        { label: "Create university only", value: "university" },
        { label: "Not now", value: "none" },
      ],
      async (choice) => {
        if (choice === "none") return;
        await this.createUniversityFromSupervisor(supervisorFile, choice === "both");
      },
    ).open();
  }

  private async createUniversityFromSupervisor(supervisorFile: TFile, createApplicationAfter: boolean): Promise<void> {
    const fm = this.app.metadataCache.getFileCache(supervisorFile)?.frontmatter ?? {};
    const universityDefault = this.cleanWikiLink(fm.university ?? "");
    new FormModal(
      this.app,
      "Create university",
      [
        { key: "name", label: "University / institution", value: universityDefault },
        { key: "country", label: "Country", value: fm.country ?? "" },
        { key: "city", label: "City" },
        { key: "department", label: "Department / school / institute" },
        { key: "priority", label: "Priority", type: "dropdown", value: fm.priority ?? "B", options: { A: "A — top target", B: "B — strong target", C: "C — exploratory" } },
        { key: "website", label: "Program or department website" },
      ],
      async (values) => {
        if (!values.name.trim()) return void new Notice("University name is required.");
        const universityName = values.name.trim();
        await this.ensureUniversity(values, supervisorFile.basename);
        await this.app.fileManager.processFrontMatter(supervisorFile, (frontmatter: Record<string, any>) => {
          frontmatter.university = `[[${universityName}]]`;
        });
        if (createApplicationAfter) this.openCreateApplicationModal(universityName, supervisorFile.basename, fm.priority ?? "B");
      },
    ).open();
  }

  private openCreateUniversityModal(): void {
    void this.ensureWorkspace().then(() => {
      new FormModal(
        this.app,
        "Add university",
        [
          { key: "name", label: "University / institution" },
          { key: "country", label: "Country" },
          { key: "city", label: "City" },
          { key: "department", label: "Department / school / institute" },
          { key: "priority", label: "Priority", type: "dropdown", value: "B", options: { A: "A — top target", B: "B — strong target", C: "C — exploratory" } },
          { key: "website", label: "Program or department website" },
        ],
        async (values) => {
          if (!values.name.trim()) return void new Notice("University name is required.");
          await this.ensureUniversity(values);
        },
      ).open();
    });
  }

  private async ensureUniversity(values: Record<string, string>, supervisorName = ""): Promise<TFile | null> {
    const name = values.name.trim();
    const filePath = this.path(`20 Universities/${this.safeFileName(name)}.md`);
    const existing = this.app.vault.getAbstractFileByPath(filePath);
    if (existing instanceof TFile) {
      new Notice(`University already exists: ${name}`);
      return existing;
    }
    const content = `---\ntype: university\nname: ${this.yaml(name)}\ncountry: ${this.yaml(values.country)}\ncity: ${this.yaml(values.city)}\ndepartment: ${this.yaml(values.department)}\npriority: ${this.yaml(values.priority || "B")}\nstatus: "Applying"\nfunding_model:\nenglish_requirement:\nwebsite: ${this.yaml(values.website)}\ncreated: ${this.today()}\n---\n\n# ${name}\n\n## Program overview\n- Program:\n- Typical start date:\n- Application route:\n- Number of positions:\n- Funding:\n\n## Eligibility\n- Degree requirements:\n- Language requirement:\n- Grade requirements:\n- Application fee:\n\n## Potential supervisors\n${supervisorName ? `- [[${supervisorName}]]` : "- "}\n\n## Application requirements\n- [ ] CV\n- [ ] Statement / SOP\n- [ ] Research proposal (if required)\n- [ ] Transcript\n- [ ] Degree certificate\n- [ ] Language proof or waiver\n- [ ] Recommendation letters\n- [ ] Other requirements\n\n## Notes\n- \n`;
    const created = await this.app.vault.create(filePath, content);
    new Notice(`Created university: ${name}`);
    return created;
  }

  private openCreateApplicationModal(university = "", supervisor = "", priority = "B"): void {
    void this.ensureWorkspace().then(() => {
      const statusOptions = this.toOptions(APPLICATION_STATUSES);
      new FormModal(
        this.app,
        "Add application",
        [
          { key: "university", label: "University / institution", value: university },
          { key: "program", label: "Program / position", value: this.settings.defaultProgram },
          { key: "supervisors", label: "Potential supervisors", value: supervisor, placeholder: "Comma-separated names" },
          { key: "deadline", label: "Official deadline", placeholder: "YYYY-MM-DD" },
          { key: "priority", label: "Priority", type: "dropdown", value: priority, options: { A: "A — top target", B: "B — strong target", C: "C — exploratory" } },
          { key: "status", label: "Initial status", type: "dropdown", value: "Preparing", options: statusOptions },
          { key: "funding", label: "Funding / studentship" },
          { key: "portal", label: "Application portal URL" },
        ],
        async (values) => {
          if (!values.university.trim()) return void new Notice("University is required.");
          await this.createApplication(values);
        },
      ).open();
    });
  }

  private async createApplication(values: Record<string, string>): Promise<void> {
    const university = values.university.trim();
    const program = values.program.trim() || this.settings.defaultProgram;
    const supervisors = this.parseList(values.supervisors);
    const deadline = this.isDate(values.deadline) ? values.deadline : "";
    const fileName = this.safeFileName(`${university} — ${program} — ${this.settings.cycle}`);
    const filePath = this.path(`30 Applications/${fileName}.md`);
    if (this.app.vault.getAbstractFileByPath(filePath)) return void new Notice("That application already exists.");

    const taskLines = APPLICATION_TASK_SCHEDULE.map(({ text, daysBefore }) =>
      `- [ ] ${text}${deadline ? ` 📅 ${this.shiftDate(deadline, -daysBefore)}` : ""}`,
    ).join("\n");
    const supervisorYaml = supervisors.length ? `\n${supervisors.map((s) => `  - ${this.yaml(`[[${s}]]`)}`).join("\n")}` : " []";
    const supervisorSections = supervisors.length
      ? supervisors.map((s) => `### [[${s}]]\n- Why fit:\n- Specific work to mention:\n- Contact status:\n`).join("\n")
      : "- Add supervisor links here.\n";

    const content = `---\ntype: application\ncycle: ${this.yaml(this.settings.cycle)}\nuniversity: ${this.yaml(`[[${university}]]`)}\nprogram: ${this.yaml(program)}\nsupervisors:${supervisorYaml}\ndeadline: ${deadline}\nstatus: ${this.yaml(APPLICATION_STATUSES.includes(values.status as typeof APPLICATION_STATUSES[number]) ? values.status : "Preparing")}\npriority: ${this.yaml(PRIORITIES.includes(values.priority as typeof PRIORITIES[number]) ? values.priority : "B")}\nfunding: ${this.yaml(values.funding)}\nportal_url: ${this.yaml(values.portal)}\nsubmitted_date:\ninterview_date:\nresult:\ncreated: ${this.today()}\n---\n\n# ${university} — ${program} — ${this.settings.cycle}\n\n> [!important]\n> Use the **Update application status** command to keep status values consistent.\n\n## Core information\n- Official page:\n- Portal: ${values.portal}\n- Deadline: ${deadline}\n- Deadline time zone:\n- Funding: ${values.funding}\n- Contact person:\n\n## Supervisor fit\n${supervisorSections}\n## Application checklist\n${taskLines}\n- [ ] Save submission confirmation\n\n## Statement strategy\n### Why this program\n- \n\n### Why these supervisors\n- \n\n### My strongest evidence\n- \n\n### Proposed research direction\n- \n\n## Recommendation letters\n| Recommender | Requested | Submitted | Notes |\n|---|---|---|---|\n| 1 |  |  |  |\n| 2 |  |  |  |\n| 3 |  |  |  |\n\n## Submission record\n- Submitted:\n- Confirmation number:\n- Fee:\n- Missing documents:\n\n## Interview preparation\n- Likely questions:\n- Questions for supervisor:\n- Questions about funding / group:\n- Short research pitch:\n\n## Result / decision\n- \n`;
    await this.app.vault.create(filePath, content);
    new Notice(`Created application: ${university}`);
  }

  private openUpdateApplicationDeadlineModal(): void {
    const file = this.activeFileOfType("application");
    if (!file) return;
    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
    const currentDeadline = this.frontmatterDate(fm.deadline);

    new FormModal(
      this.app,
      "Update application deadline",
      [
        {
          key: "deadline",
          label: "Official deadline",
          value: currentDeadline,
          placeholder: "YYYY-MM-DD",
          description: "Changing this date also reschedules the standard application checklist.",
        },
      ],
      async (values) => {
        const deadline = values.deadline.trim();
        if (deadline && !this.isDate(deadline)) {
          new Notice("Use YYYY-MM-DD for the deadline.");
          return;
        }

        // Update the cache baseline first so the metadata event does not trigger a second sync.
        this.applicationDeadlines.set(file.path, deadline);
        await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, any>) => {
          frontmatter.deadline = deadline || null;
        });
        await this.syncApplicationDeadline(file, deadline);
        new Notice(deadline ? `Deadline → ${deadline}; checklist rescheduled.` : "Deadline cleared; managed task due dates removed.");
      },
      "Update",
    ).open();
  }

  private async captureAndSyncApplicationDeadlines(): Promise<void> {
    const applicationFolder = `${this.path("30 Applications")}/`;
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (!file.path.startsWith(applicationFolder)) continue;
      const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
      if (fm?.type !== "application") continue;
      const deadline = this.frontmatterDate(fm.deadline);
      this.applicationDeadlines.set(file.path, deadline);
      if (!deadline || this.isDate(deadline)) await this.syncApplicationDeadline(file, deadline);
    }
  }

  private async migrateGeneratedFiles(): Promise<void> {
    const applicationsBase = this.app.vault.getAbstractFileByPath(this.path("01 Bases/Applications.base"));
    if (applicationsBase instanceof TFile) {
      await this.app.vault.process(applicationsBase, (content) =>
        content.replace(
          'days_left: \'if(deadline, ((deadline - today()) / 86400000).round(), null)\'',
          'days_left: \'if(deadline, ((number(deadline) - number(today())) / 86400000).round(), null)\'',
        ),
      );
    }
  }

  private async handleApplicationMetadataChanged(file: TFile): Promise<void> {
    const applicationFolder = `${this.path("30 Applications")}/`;
    if (!file.path.startsWith(applicationFolder) || this.deadlineSyncInProgress.has(file.path)) return;

    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
    if (fm?.type !== "application") return;

    const rawDeadline = this.frontmatterDate(fm.deadline);
    const previousDeadline = this.applicationDeadlines.get(file.path);
    if (previousDeadline === undefined) {
      this.applicationDeadlines.set(file.path, rawDeadline);
      return;
    }
    if (previousDeadline === rawDeadline) return;

    this.applicationDeadlines.set(file.path, rawDeadline);
    if (rawDeadline && !this.isDate(rawDeadline)) {
      new Notice(`Invalid application deadline in ${file.basename}. Use YYYY-MM-DD.`);
      return;
    }

    await this.syncApplicationDeadline(file, rawDeadline);
    new Notice(rawDeadline ? `Deadline changed; checklist rescheduled for ${file.basename}.` : `Deadline cleared; task due dates removed for ${file.basename}.`);
  }

  private async syncApplicationDeadline(file: TFile, deadline: string): Promise<void> {
    if (this.deadlineSyncInProgress.has(file.path)) return;
    this.deadlineSyncInProgress.add(file.path);

    try {
      await this.app.vault.process(file, (content) => {
        let updated = content;

        // Keep the human-readable deadline in Core information consistent with frontmatter.
        updated = updated.replace(/^(- Deadline:\s*).*$/m, `$1${deadline}`);

        for (const { text, daysBefore } of APPLICATION_TASK_SCHEDULE) {
          const dueDate = deadline ? this.shiftDate(deadline, -daysBefore) : "";
          updated = this.replaceManagedTaskDueDate(updated, text, dueDate);
        }

        return updated;
      });
    } finally {
      this.deadlineSyncInProgress.delete(file.path);
    }
  }

  private replaceManagedTaskDueDate(content: string, taskText: string, dueDate: string): string {
    const escaped = taskText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`^(\\s*[-*+]\\s+\\[[^\\]]\\]\\s+${escaped})(?:\\s+📅\\s+\\d{4}-\\d{2}-\\d{2})?(.*)$`, "m");
    return content.replace(pattern, (_match, prefix: string, suffix: string) => {
      const cleanedSuffix = String(suffix ?? "").replace(/^\s+/, "");
      const datePart = dueDate ? ` 📅 ${dueDate}` : "";
      return `${prefix}${datePart}${cleanedSuffix ? ` ${cleanedSuffix}` : ""}`;
    });
  }

  private frontmatterDate(value: unknown): string {
    if (typeof value === "string") return value.trim();
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, "0");
      const d = String(value.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    return value == null ? "" : String(value).trim();
  }

  private async openUpdateApplicationStatusModal(): Promise<void> {
    const file = this.activeFileOfType("application");
    if (!file) return;
    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
    const options = this.toOptions(APPLICATION_STATUSES);
    new FormModal(
      this.app,
      "Update application status",
      [{ key: "status", label: "Application status", type: "dropdown", value: APPLICATION_STATUSES.includes(fm.status) ? fm.status : "Preparing", options }],
      async (values) => {
        await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, any>) => {
          frontmatter.status = values.status;
          if (values.status === "Submitted" && !frontmatter.submitted_date) frontmatter.submitted_date = this.today();
        });
        new Notice(`Application status → ${values.status}`);

        if (values.status === "Interview") {
          this.openSimpleFrontmatterFieldModal(file, "Interview date", "interview_date", fm.interview_date ?? "", "YYYY-MM-DD");
        } else if (["Offer", "Rejected", "Declined"].includes(values.status)) {
          this.openSimpleFrontmatterFieldModal(file, "Result / decision note", "result", fm.result ?? "", "Optional note");
        }
      },
      "Update",
    ).open();
  }

  private openSimpleFrontmatterFieldModal(file: TFile, title: string, key: string, value: string, placeholder: string): void {
    new FormModal(
      this.app,
      title,
      [{ key, label: title, value, placeholder }],
      async (values) => {
        await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, any>) => {
          frontmatter[key] = values[key] || undefined;
        });
      },
      "Save",
    ).open();
  }

  private openCreateInteractionModal(): void {
    void this.ensureWorkspace().then(() => {
      new FormModal(
        this.app,
        "Record interaction",
        [
          { key: "date", label: "Date", value: this.today(), placeholder: "YYYY-MM-DD" },
          { key: "interaction_type", label: "Type", type: "dropdown", value: "Email sent", options: { "Email sent": "Email sent", "Email received": "Email received", Meeting: "Meeting", Interview: "Interview", "Follow-up": "Follow-up", Other: "Other" } },
          { key: "supervisor", label: "Supervisor" },
          { key: "university", label: "University / institution" },
          { key: "application", label: "Application note name" },
          { key: "subject", label: "Subject / short title" },
          { key: "outcome", label: "Outcome", type: "textarea" },
          { key: "follow_up", label: "Follow-up date", placeholder: "YYYY-MM-DD (optional)" },
        ],
        async (values) => {
          if (!values.subject.trim()) return void new Notice("Subject is required.");
          await this.createInteraction(values);
        },
      ).open();
    });
  }

  private async createInteraction(values: Record<string, string>): Promise<void> {
    const date = this.isDate(values.date) ? values.date : this.today();
    const entity = values.supervisor || values.university || "Interaction";
    const fileName = this.safeFileName(`${date} — ${entity} — ${values.subject}`);
    const filePath = this.path(`50 Interactions/${fileName}.md`);
    const followUp = this.isDate(values.follow_up) ? values.follow_up : "";
    const followTask = followUp ? `- [ ] Follow up${values.supervisor ? ` with [[${values.supervisor}]]` : ""} about ${values.subject} 📅 ${followUp}` : "- [ ] Add next action if needed";
    const content = `---\ntype: interaction\ndate: ${date}\ninteraction_type: ${this.yaml(values.interaction_type)}\nsupervisor: ${this.yaml(values.supervisor ? `[[${values.supervisor}]]` : "")}\nuniversity: ${this.yaml(values.university ? `[[${values.university}]]` : "")}\napplication: ${this.yaml(values.application ? `[[${values.application}]]` : "")}\nsubject: ${this.yaml(values.subject)}\noutcome: ${this.yaml(values.outcome)}\nfollow_up: ${followUp}\ncreated: ${this.today()}\n---\n\n# ${values.subject}\n\n## Summary\n- \n\n## What happened\n${values.outcome ? `- ${values.outcome}` : "- "}\n\n## Implications for the application\n- \n\n## Next action\n${followTask}\n\n## Detailed notes\n- \n`;
    await this.app.vault.create(filePath, content);
    new Notice("Interaction recorded.");
  }

  private openCreatePaperModal(): void {
    void this.ensureWorkspace().then(() => {
      new FormModal(
        this.app,
        "Add relevant paper",
        [
          { key: "title", label: "Paper title" },
          { key: "year", label: "Year" },
          { key: "venue", label: "Journal / venue / preprint" },
          { key: "supervisors", label: "Related supervisors", placeholder: "Comma-separated names" },
          { key: "topics", label: "Topics", placeholder: "Comma-separated topics" },
          { key: "relevance", label: "Relevance", type: "dropdown", value: "4", options: { "5": "5 — essential", "4": "4 — high", "3": "3 — useful", "2": "2 — peripheral", "1": "1 — low" } },
          { key: "url", label: "URL / DOI" },
        ],
        async (values) => {
          if (!values.title.trim()) return void new Notice("Paper title is required.");
          await this.createPaper(values);
        },
      ).open();
    });
  }

  private async createPaper(values: Record<string, string>): Promise<void> {
    const supervisors = this.parseList(values.supervisors);
    const topics = this.parseList(values.topics);
    const fileName = this.safeFileName(`${values.year ? `${values.year} — ` : ""}${values.title}`);
    const filePath = this.path(`40 Papers/${fileName}.md`);
    const content = `---\ntype: paper\ntitle: ${this.yaml(values.title)}\nyear: ${values.year || ""}\nvenue: ${this.yaml(values.venue)}\nsupervisors:${this.yamlList(supervisors.map((s) => `[[${s}]]`))}\ntopics:${this.yamlList(topics)}\nrelevance: ${Number(values.relevance) || 4}\nread_status: "Unread"\nurl: ${this.yaml(values.url)}\ncreated: ${this.today()}\n---\n\n# ${values.title}\n\n## One-sentence result\n- \n\n## Why it matters for this application\n- \n\n## Methods\n- \n\n## Key results\n- \n\n## Connection to my experience\n- \n\n## Possible question for the supervisor\n- \n\n## Reading notes\n- \n`;
    await this.app.vault.create(filePath, content);
    new Notice("Paper note created.");
  }

  private openCreateDocumentModal(): void {
    void this.ensureWorkspace().then(() => {
      new FormModal(
        this.app,
        "Add application document record",
        [
          { key: "document_type", label: "Document type", type: "dropdown", value: "CV", options: { CV: "CV", "Statement / SOP": "Statement / SOP", "Research proposal": "Research proposal", Transcript: "Transcript", "Reference letter": "Reference letter", "Writing sample": "Writing sample", Other: "Other" } },
          { key: "name", label: "Record name", value: "CV" },
          { key: "version", label: "Version", value: "v1" },
          { key: "application", label: "Target application" },
          { key: "university", label: "Target university" },
          { key: "attachment", label: "Attachment path or wikilink" },
        ],
        async (values) => {
          if (!values.name.trim()) return void new Notice("Document name is required.");
          await this.createDocument(values);
        },
      ).open();
    });
  }

  private async createDocument(values: Record<string, string>): Promise<void> {
    const filePath = this.path(`60 Documents/${this.safeFileName(values.name)}.md`);
    const content = `---\ntype: document\ndocument_type: ${this.yaml(values.document_type)}\nversion: ${this.yaml(values.version)}\nstatus: "Draft"\ntarget_application: ${this.yaml(values.application ? `[[${values.application}]]` : "")}\ntarget_university: ${this.yaml(values.university ? `[[${values.university}]]` : "")}\nlast_updated: ${this.today()}\nattachment: ${this.yaml(values.attachment)}\ncreated: ${this.today()}\n---\n\n# ${values.name}\n\n## Purpose and target\n- \n\n## Current version\n- Version: ${values.version}\n- Status: Draft\n- Attachment: ${values.attachment}\n\n## Change log\n### ${this.today()}\n- Created.\n\n## Content notes\n- \n\n## Feedback\n- \n\n## Next revision\n- [ ] \n`;
    await this.app.vault.create(filePath, content);
    new Notice("Document record created.");
  }

  private async validateWorkspace(): Promise<void> {
    await this.ensureWorkspace();
    const problems: string[] = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (!file.path.startsWith(`${this.root}/`)) continue;
      const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
      if (!fm) continue;
      if (fm.type === "application" && !APPLICATION_STATUSES.includes(fm.status)) problems.push(`${file.path}: invalid application status "${fm.status ?? ""}"`);
      if (fm.type === "supervisor" && !CONTACT_STATUSES.includes(fm.contact_status)) problems.push(`${file.path}: invalid contact status "${fm.contact_status ?? ""}"`);
    }
    if (!problems.length) return void new Notice("Workspace validation passed.");
    new Notice(`Found ${problems.length} workspace issue(s). See developer console for details.`, 8000);
    console.warn("PhD Application Hub validation issues", problems);
  }

  private dashboardContent(): string {
    const root = this.root;
    return `---\ntype: dashboard\ncycle: ${this.yaml(this.settings.cycle)}\n---\n\n# 🎓 PhD Application Hub\n\n> [!tip] Workflow\n> Research supervisors first. A **Positive** reply can create the linked university and application automatically.\n\n> [!note] Optional Tasks integration\n> Install and enable the community **Tasks** plugin if you want the two task sections below to aggregate deadlines across your workspace. All application checklists remain normal Markdown tasks even without it.\n\n## 🚨 Overdue and due today\n\n\`\`\`tasks\nnot done\ndue before tomorrow\npath includes ${root}\nsort by due\ngroup by folder\n\`\`\`\n\n## 📅 Tasks due in the next 30 days\n\n> This section shows individual checklist actions (including **Submit application**), not application rows. The application-level deadline table is shown separately below.\n\n\`\`\`tasks\nnot done\nhas due date\ndue on or after today\ndue on or before in 30 days\npath includes ${root}\nsort by due\ngroup by folder\n\`\`\`\n\n## 🎓 Applications — next 30 days\n\n![[${root}/01 Bases/Applications.base#Next 30 days]]\n\n## ✅ Positive supervisor responses\n\n![[${root}/01 Bases/Supervisors.base#Positive]]\n\n## 📬 Supervisor follow-ups\n\n![[${root}/01 Bases/Supervisors.base#Follow-up]]\n\n## ⭐ Priority A supervisors\n\n![[${root}/01 Bases/Supervisors.base#Priority A]]\n\n## 📑 Active applications\n\n![[${root}/01 Bases/Applications.base#Active]]\n\n## 📨 Recent interactions\n\n![[${root}/01 Bases/Interactions.base#Recent 30 days]]\n\n---\n\n## Quick navigation\n- [[${root}/01 Bases/Supervisors.base|Supervisors database]]\n- [[${root}/01 Bases/Universities.base|Universities database]]\n- [[${root}/01 Bases/Applications.base|Applications database]]\n- [[${root}/01 Bases/Papers.base|Papers database]]\n- [[${root}/01 Bases/Interactions.base|Interactions database]]\n- [[${root}/01 Bases/Documents.base|Documents database]]\n`;
  }

  private supervisorsBase(): string {
    const p = `${this.root}/10 Supervisors`;
    return `filters:\n  and:\n    - 'file.inFolder("${p}")'\n    - 'type == "supervisor"'\nformulas:\n  fit_stars: 'if(fit, "★".repeat(fit) + "☆".repeat(5 - fit), "")'\n  followup_state: 'if(follow_up, if(follow_up < today(), "🔴 overdue", if(follow_up <= today() + "7d", "🟠 soon", "")), "")'\nproperties:\n  file.name:\n    displayName: Supervisor\n  university:\n    displayName: University\n  country:\n    displayName: Country\n  research_areas:\n    displayName: Research\n  formula.fit_stars:\n    displayName: Fit\n  priority:\n    displayName: Priority\n  contact_status:\n    displayName: Contact\n  last_contact:\n    displayName: Last contact\n  follow_up:\n    displayName: Follow-up\n  formula.followup_state:\n    displayName: Follow-up state\nviews:\n  - type: table\n    name: "Positive"\n    filters:\n      and:\n        - 'contact_status == "Positive"'\n    order:\n      - file.name\n      - university\n      - country\n      - formula.fit_stars\n      - priority\n      - last_contact\n  - type: table\n    name: "Priority A"\n    filters:\n      and:\n        - 'priority == "A"'\n    order:\n      - file.name\n      - university\n      - country\n      - research_areas\n      - formula.fit_stars\n      - contact_status\n      - follow_up\n  - type: table\n    name: "Follow-up"\n    filters:\n      and:\n        - 'follow_up'\n        - 'follow_up <= today() + "7d"'\n        - 'contact_status != "Closed"'\n        - 'contact_status != "Positive"'\n    order:\n      - file.name\n      - university\n      - contact_status\n      - last_contact\n      - follow_up\n      - formula.followup_state\n  - type: table\n    name: "All supervisors"\n    order:\n      - file.name\n      - university\n      - country\n      - research_areas\n      - formula.fit_stars\n      - priority\n      - contact_status\n      - email\n      - website\n`;
  }

  private universitiesBase(): string {
    const p = `${this.root}/20 Universities`;
    return `filters:\n  and:\n    - 'file.inFolder("${p}")'\n    - 'type == "university"'\nproperties:\n  file.name:\n    displayName: University\n  country:\n    displayName: Country\n  city:\n    displayName: City\n  department:\n    displayName: Department\n  priority:\n    displayName: Priority\n  status:\n    displayName: Status\n  funding_model:\n    displayName: Funding\n  english_requirement:\n    displayName: Language\n  website:\n    displayName: Website\nviews:\n  - type: table\n    name: "Active targets"\n    filters:\n      and:\n        - 'status != "Archived"'\n    order:\n      - file.name\n      - country\n      - department\n      - priority\n      - status\n      - funding_model\n      - english_requirement\n  - type: table\n    name: "All universities"\n    order:\n      - file.name\n      - country\n      - city\n      - department\n      - priority\n      - status\n      - website\n`;
  }

  private applicationsBase(): string {
    const p = `${this.root}/30 Applications`;
    return `filters:\n  and:\n    - 'file.inFolder("${p}")'\n    - 'type == "application"'\nformulas:\n  days_left: 'if(deadline, ((number(deadline) - number(today())) / 86400000).round(), null)'\n  urgency: 'if(!deadline, "", if(status == "Submitted" || status == "Offer" || status == "Rejected" || status == "Declined", "—", if(deadline < today(), "🔴 overdue", if(deadline <= today() + "14d", "🔥 ≤14d", if(deadline <= today() + "30d", "⚠️ ≤30d", "")))))'\nproperties:\n  file.name:\n    displayName: Application\n  university:\n    displayName: University\n  program:\n    displayName: Program\n  supervisors:\n    displayName: Supervisors\n  deadline:\n    displayName: Deadline\n  formula.days_left:\n    displayName: Days left\n  formula.urgency:\n    displayName: Urgency\n  status:\n    displayName: Status\n  priority:\n    displayName: Priority\n  funding:\n    displayName: Funding\n  submitted_date:\n    displayName: Submitted\n  interview_date:\n    displayName: Interview\n  result:\n    displayName: Result\nviews:\n  - type: table\n    name: "Active"\n    filters:\n      and:\n        - 'status != "Submitted"'\n        - 'status != "Offer"'\n        - 'status != "Rejected"'\n        - 'status != "Declined"'\n    order:\n      - file.name\n      - university\n      - supervisors\n      - deadline\n      - formula.days_left\n      - formula.urgency\n      - status\n      - priority\n  - type: table\n    name: "Next 30 days"\n    filters:\n      and:\n        - 'deadline'\n        - 'deadline >= today()'\n        - 'deadline <= today() + "30d"'\n        - 'status != "Submitted"'\n        - 'status != "Offer"'\n        - 'status != "Rejected"'\n        - 'status != "Declined"'\n    order:\n      - file.name\n      - university\n      - deadline\n      - formula.days_left\n      - formula.urgency\n      - status\n  - type: table\n    name: "Submitted"\n    filters:\n      or:\n        - 'status == "Submitted"'\n        - 'status == "Interview"'\n    order:\n      - file.name\n      - university\n      - submitted_date\n      - interview_date\n      - status\n  - type: table\n    name: "Results"\n    filters:\n      or:\n        - 'status == "Offer"'\n        - 'status == "Rejected"'\n        - 'status == "Declined"'\n    order:\n      - file.name\n      - university\n      - status\n      - result\n  - type: table\n    name: "Invalid status"\n    filters:\n      and:\n${APPLICATION_STATUSES.map((s) => `        - 'status != "${s}"'`).join("\n")}\n    order:\n      - file.name\n      - status\n      - university\n  - type: table\n    name: "All applications"\n    order:\n      - file.name\n      - university\n      - program\n      - supervisors\n      - deadline\n      - formula.days_left\n      - status\n      - priority\n      - funding\n`;
  }

  private papersBase(): string {
    const p = `${this.root}/40 Papers`;
    return `filters:\n  and:\n    - 'file.inFolder("${p}")'\n    - 'type == "paper"'\nproperties:\n  file.name:\n    displayName: Paper\n  year:\n    displayName: Year\n  venue:\n    displayName: Venue\n  supervisors:\n    displayName: Related supervisors\n  topics:\n    displayName: Topics\n  relevance:\n    displayName: Relevance\n  read_status:\n    displayName: Read\n  url:\n    displayName: URL\nviews:\n  - type: table\n    name: "High relevance"\n    filters:\n      and:\n        - 'relevance >= 4'\n    order:\n      - file.name\n      - year\n      - supervisors\n      - topics\n      - relevance\n      - read_status\n  - type: table\n    name: "To read"\n    filters:\n      or:\n        - 'read_status == "Unread"'\n        - 'read_status == "Skimmed"'\n    order:\n      - file.name\n      - supervisors\n      - topics\n      - relevance\n      - read_status\n  - type: table\n    name: "All papers"\n    order:\n      - file.name\n      - year\n      - venue\n      - supervisors\n      - topics\n      - relevance\n      - read_status\n      - url\n`;
  }

  private interactionsBase(): string {
    const p = `${this.root}/50 Interactions`;
    return `filters:\n  and:\n    - 'file.inFolder("${p}")'\n    - 'type == "interaction"'\nproperties:\n  file.name:\n    displayName: Interaction\n  date:\n    displayName: Date\n  interaction_type:\n    displayName: Type\n  supervisor:\n    displayName: Supervisor\n  university:\n    displayName: University\n  application:\n    displayName: Application\n  subject:\n    displayName: Subject\n  outcome:\n    displayName: Outcome\n  follow_up:\n    displayName: Follow-up\nviews:\n  - type: table\n    name: "Follow-ups due"\n    filters:\n      and:\n        - 'follow_up'\n        - 'follow_up <= today()'\n    order:\n      - date\n      - supervisor\n      - interaction_type\n      - subject\n      - outcome\n      - follow_up\n  - type: table\n    name: "Recent 30 days"\n    filters:\n      and:\n        - 'date'\n        - 'date >= today() - "30d"'\n    order:\n      - date\n      - supervisor\n      - university\n      - interaction_type\n      - subject\n      - outcome\n      - follow_up\n  - type: table\n    name: "All interactions"\n    order:\n      - date\n      - supervisor\n      - university\n      - application\n      - interaction_type\n      - subject\n      - outcome\n      - follow_up\n`;
  }

  private documentsBase(): string {
    const p = `${this.root}/60 Documents`;
    return `filters:\n  and:\n    - 'file.inFolder("${p}")'\n    - 'type == "document"'\nproperties:\n  file.name:\n    displayName: Document\n  document_type:\n    displayName: Type\n  version:\n    displayName: Version\n  status:\n    displayName: Status\n  target_application:\n    displayName: Application\n  target_university:\n    displayName: University\n  last_updated:\n    displayName: Updated\n  attachment:\n    displayName: File\nviews:\n  - type: table\n    name: "Needs work"\n    filters:\n      and:\n        - 'status != "Final"'\n        - 'status != "Archived"'\n    order:\n      - file.name\n      - document_type\n      - version\n      - status\n      - target_application\n      - last_updated\n  - type: table\n    name: "Final"\n    filters:\n      and:\n        - 'status == "Final"'\n    order:\n      - file.name\n      - document_type\n      - version\n      - target_application\n      - target_university\n      - last_updated\n      - attachment\n  - type: table\n    name: "All documents"\n    order:\n      - file.name\n      - document_type\n      - version\n      - status\n      - target_application\n      - target_university\n      - last_updated\n      - attachment\n`;
  }

  private toOptions(values: readonly string[]): Record<string, string> {
    const options: Record<string, string> = {};
    for (const value of values) options[value] = value;
    return options;
  }

  private yaml(value: unknown): string {
    return JSON.stringify(value ?? "");
  }

  private yamlList(values: string[]): string {
    return values.length ? `\n${values.map((v) => `  - ${this.yaml(v)}`).join("\n")}` : " []";
  }

  private parseList(value: string): string[] {
    return (value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  }

  private safeFileName(value: string): string {
    return value.trim().replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ");
  }

  private cleanWikiLink(value: unknown): string {
    const text = String(value ?? "").trim();
    const match = text.match(/^\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$/);
    return match ? match[1] : text;
  }

  private today(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  private isDate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
  }

  private shiftDate(date: string, deltaDays: number): string {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() + deltaDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
}

class PhDApplicationHubSettingTab extends PluginSettingTab {
  plugin: PhDApplicationHubPlugin;

  constructor(app: App, plugin: PhDApplicationHubPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Workspace folder")
      .setDesc("Root folder used for all PhD Application Hub notes and Bases.")
      .addText((text) =>
        text
          .setPlaceholder("PhD Application")
          .setValue(this.plugin.settings.workspaceFolder)
          .onChange(async (value: string) => {
            this.plugin.settings.workspaceFolder = value.trim() || "PhD Application";
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Application cycle")
      .setDesc("Used in application note names and metadata, for example 2027.")
      .addText((text) =>
        text.setValue(this.plugin.settings.cycle).onChange(async (value: string) => {
          this.plugin.settings.cycle = value.trim();
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Default program title")
      .setDesc("Pre-filled when creating a new application.")
      .addText((text) =>
        text.setValue(this.plugin.settings.defaultProgram).onChange(async (value: string) => {
          this.plugin.settings.defaultProgram = value.trim() || "PhD Program";
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("Initialize or refresh workspace")
      .setDesc("Creates missing folders and dashboard, and refreshes the generated Base definitions. Existing application notes are not overwritten.")
      .addButton((button) =>
        button.setButtonText("Initialize workspace").setCta().onClick(() => {
          void this.plugin.initializeWorkspace();
        }),
      );
  }
}
