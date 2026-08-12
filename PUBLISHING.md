# Publishing PhD Application Hub to the Obsidian Community directory

This file is written for the initial `1.0.0` release.

## Repository identity

Recommended repository name:

`phd-application-hub`

The plugin ID is already fixed as:

`phd-application-hub`

The display name is:

`PhD Application Hub`

Author:

`DUGUXUNXING`

Do not change the plugin ID after public release.

## 1. Test the packaged build manually

Create:

`YourVault/.obsidian/plugins/phd-application-hub/`

Copy into it:

- `main.js`
- `manifest.json`
- `styles.css`

Reload Obsidian, enable the plugin, then test:

1. Initialize workspace.
2. Add a supervisor.
3. Update contact status to Sent.
4. Update to Replied.
5. Update to Positive.
6. Choose Create university and application.
7. Confirm all linked notes are created.
8. Confirm Applications.base displays the application.
9. Update application status through all major states.
10. Record an interaction with a follow-up date.
11. If Tasks is installed, confirm the follow-up appears on the dashboard.
12. Run Validate PhD workspace.
13. Restart Obsidian and repeat a few actions.

## 2. Create the GitHub repository

Create a **public** GitHub repository named:

`phd-application-hub`

From this source folder:

```bash
git init
git branch -M main
git add .
git commit -m "Initial release 1.0.0"
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/phd-application-hub.git
git push -u origin main
```

## 3. Optional but recommended: create package-lock.json

On a machine with Node.js and internet access:

```bash
npm install
npm run build
npm run lint
```

Commit the generated `package-lock.json`:

```bash
git add package-lock.json
git commit -m "Add dependency lockfile"
git push
```

If you do this, you may change the release workflow from `npm install` to `npm ci` for stricter reproducible installs.

## 4. Confirm metadata before release

Check `manifest.json`:

```json
{
  "id": "phd-application-hub",
  "name": "PhD Application Hub",
  "version": "1.0.0",
  "minAppVersion": "1.9.10",
  "author": "DUGUXUNXING"
}
```

Also confirm:

- README.md exists in repository root.
- LICENSE exists in repository root.
- versions.json exists in repository root.
- source code is visible in `src/main.ts`.
- the repository is public.

## 5. Create the initial GitHub Release

The included GitHub Actions workflow triggers when a Git tag is pushed.

The tag must be exactly the same as the version in `manifest.json` and must **not** use a `v` prefix.

Correct:

`1.0.0`

Wrong:

`v1.0.0`

Push the tag:

```bash
git tag 1.0.0
git push origin 1.0.0
```

Then open GitHub → Actions and confirm the workflow succeeds.

The resulting GitHub Release must contain these individual assets:

- `main.js`
- `manifest.json`
- `styles.css`

Do not rely only on a source ZIP. Obsidian downloads the individual release assets.

## 6. Check the release before submission

Download the three release assets from GitHub and perform one more clean manual installation in a test vault.

Verify:

- version in the release `manifest.json` is `1.0.0`;
- release tag is `1.0.0`;
- plugin ID is `phd-application-hub`;
- plugin enables without console errors;
- workspace initialization works;
- README accurately describes the behavior;
- no private data, secrets, local paths, or API keys are committed.

## 7. Submit to the Obsidian Community directory

Use the current Obsidian Community submission site:

1. Sign in with your Obsidian account.
2. Link the GitHub account that owns the repository.
3. Open **Plugins**.
4. Choose **New plugin**.
5. Enter the public GitHub repository URL.
6. Review and accept the developer policies.
7. Confirm that you intend to maintain the plugin.
8. Submit.

The directory reads `manifest.json` from the default branch HEAD during submission, so commit all metadata changes before submitting.

## 8. During review

Watch the repository and your Obsidian Community account for reviewer feedback.

If reviewers request a code or metadata change:

1. Make the change on `main`.
2. If the released code changes, bump the plugin version (for example to `1.0.1`).
3. Build and test again.
4. Push a new tag matching the new manifest version.
5. Make sure the new release contains the required assets.
6. Respond to the review request with the fix.

Do not silently replace release files under the same version after reviewers have begun testing. Prefer a new patch version.

## 9. Future releases after acceptance

After the initial plugin has been accepted, you do not resubmit every version to the Community directory.

For a normal patch release:

1. Change `manifest.json` version, e.g. `1.0.0` → `1.0.1`.
2. Change `package.json` version to the same value.
3. Update `CHANGELOG.md`.
4. If `minAppVersion` changes, update `versions.json`.
5. Commit and push.
6. Tag the exact version: `1.0.1`.
7. Push the tag.
8. Confirm the GitHub Release assets.

Obsidian obtains updates from GitHub Releases automatically.

## 10. Suggested Community directory description

> A local-first workspace for managing PhD supervisors, outreach, applications, deadlines, papers, documents, interviews, and decisions.

## 11. Suggested first release notes

### PhD Application Hub 1.0.0

Initial public release.

Highlights:

- supervisor discovery and fit tracking;
- fixed outreach states including `Positive`;
- Positive response → University + Application workflow;
- fixed application-status picker;
- deadline-generated application checklists;
- paper, interaction, and document tracking;
- generated Bases and central dashboard;
- optional Tasks integration without JavaScript queries;
- local-only storage with no telemetry or external network requests.
