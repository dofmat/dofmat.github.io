# Resume Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a maintainable terminal-style resume whose content, template, and styling can be changed independently.

**Architecture:** A dependency-free Node.js build script reads structured resume JSON, renders semantic HTML into a small template, copies the selected CSS theme and local images, and writes a deployable `dist/`. GitHub Actions runs the tests and build, then deploys `dist/` with the official Pages actions.

**Tech Stack:** Node.js 22 standard library, semantic HTML5, CSS, Node test runner, GitHub Actions, GitHub Pages.

---

## File structure

- `src/resume.json`: all editable resume content and navigation labels.
- `src/templates/index.html`: document shell and build placeholders.
- `src/styles/terminal.css`: the complete terminal editorial theme, responsive rules, accessibility states, and print rules.
- `src/assets/img/profile.jpg`: the user-supplied portrait.
- `src/assets/img/favicon.ico`: existing favicon.
- `scripts/build.mjs`: validation, HTML escaping, section rendering, and copying to `dist/`.
- `test/build.test.mjs`: build contract and escaping regression checks.
- `.github/workflows/pages.yml`: Pages build and deployment.
- `package.json`: local and CI commands.
- `.gitignore`: generated output and visual brainstorming artifacts.
- `dist/`: generated, ignored deployment output.

The old root `index.html`, `css/styles.css`, and `js/scripts.js` are removed after the generated replacement passes.

### Task 1: Establish the build contract

**Files:**
- Create: `package.json`
- Create: `test/build.test.mjs`

- [ ] **Step 1: Add dependency-free npm commands**

```json
{
  "name": "dofmat-resume",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node scripts/build.mjs",
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Write failing tests for the build output**

The test imports `build` and `escapeHtml`, builds into a temporary directory, and verifies:

```js
assert.match(html, /Technical Lead/);
assert.match(html, /Media Instinct Group/);
assert.match(html, /2SkyMobile \/ Antwerp/);
assert.doesNotMatch(html, /\{\{[^}]+\}\}/);
assert.doesNotMatch(html, /jquery|bootstrap|fontawesome/i);
assert.equal(escapeHtml('<script>'), '&lt;script&gt;');
```

It also verifies that `styles.css`, `assets/img/profile.jpg`, and `assets/img/favicon.ico` exist in the temporary build.

- [ ] **Step 3: Run the test and verify RED**

Run: `npm test`

Expected: FAIL because `scripts/build.mjs` does not exist.

### Task 2: Add structured resume content and template

**Files:**
- Create: `src/resume.json`
- Create: `src/templates/index.html`
- Create: `src/assets/img/profile.jpg`
- Create: `src/assets/img/favicon.ico`

- [ ] **Step 1: Add the content schema as plain JSON**

Top-level fields:

```json
{
  "meta": { "title": "Резюме - Антон Виноградов", "description": "Technical Lead / Solution Architect" },
  "profile": { "name": "Антон Виноградов", "role": "Technical Lead / Solution Architect", "summary": "..." },
  "contacts": [],
  "experience": [],
  "projects": [],
  "skills": [],
  "education": [],
  "interests": "..."
}
```

Populate it with the approved chronology and copy from the design specification. Mark 2SkyMobile / Antwerp as a parallel project and MirCli as current.

- [ ] **Step 2: Add the semantic document template**

Use only three placeholders:

```html
<title>{{title}}</title>
<meta name="description" content="{{description}}">
<link rel="stylesheet" href="styles.css">
...
{{content}}
```

The shell contains `lang="ru"`, the viewport meta tag, favicon link, and no external assets.

- [ ] **Step 3: Copy local assets**

Copy the provided photograph from `C:\Users\dofmat\Downloads\IMG_20260831_151913_edit_1231777089766275.jpg` without altering the source. Copy the existing favicon from `assets/img/favicon.ico`.

### Task 3: Implement the minimum static generator

**Files:**
- Create: `scripts/build.mjs`
- Modify: `test/build.test.mjs`

- [ ] **Step 1: Implement validation and escaping**

`escapeHtml` replaces `&`, `<`, `>`, `"`, and `'`. `build` rejects missing `profile.name`, `profile.role`, empty `experience`, a missing template, theme, portrait, or favicon.

- [ ] **Step 2: Render the approved sections**

Render skip-link, desktop sidebar, mobile header, hero, experience articles, project list, grouped skills, education, interests, and footer. Use real semantic elements and real links.

- [ ] **Step 3: Write the output**

`build({ outputDir = 'dist' })` clears only the resolved output directory, creates it, writes `index.html` and `styles.css`, then copies image assets.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npm test`

Expected: all tests PASS.

### Task 4: Build the terminal editorial theme

**Files:**
- Create: `src/styles/terminal.css`

- [ ] **Step 1: Add tokens and desktop layout**

Use the approved palette and a 4px spacing base. Keep the reading column near `70rem`; use monospace for headings and metadata and system sans-serif for prose.

- [ ] **Step 2: Add mobile behavior**

At narrow widths, hide the desktop sidebar and show a compact header with portrait, name, role, contacts, and horizontally scrollable section links. Do not hide identity or contact data.

- [ ] **Step 3: Add accessibility states**

Add a visible skip-link on focus, underlines for inline links, a 2px `:focus-visible` outline with offset, minimum touch padding, and reduced-motion handling.

- [ ] **Step 4: Add print rules**

Print with white background and dark text. Hide navigation, prompts, and decorative chrome. Prevent experience entries from splitting when practical.

- [ ] **Step 5: Rebuild**

Run: `npm run build`

Expected: `dist/index.html`, `dist/styles.css`, and both images are produced.

### Task 5: Add GitHub Pages deployment

**Files:**
- Create: `.github/workflows/pages.yml`
- Modify: `.gitignore`

- [ ] **Step 1: Add the official Pages workflow**

Use `actions/checkout@v6`, `actions/setup-node@v6`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v4`, and `actions/deploy-pages@v4`. Trigger on pushes to `master` and `workflow_dispatch`. Grant only `contents: read`, `pages: write`, and `id-token: write`.

- [ ] **Step 2: Ignore generated and brainstorming files**

```gitignore
dist/
.superpowers/
```

- [ ] **Step 3: Test the workflow contract**

Extend `test/build.test.mjs` to assert the workflow references `dist`, the official Pages actions, the `master` branch, and the required permissions.

- [ ] **Step 4: Run tests and build**

Run: `npm test`

Expected: all tests PASS.

Run: `npm run build`

Expected: exit code 0 and a complete `dist/`.

### Task 6: Remove the legacy implementation and verify the site

**Files:**
- Delete: `index.html`
- Delete: `css/styles.css`
- Delete: `js/scripts.js`

- [ ] **Step 1: Remove legacy generated/theme files**

Delete only the three named files after the new build succeeds. Remove empty `css` and `js` directories if they become empty. Keep the original tracked assets until the new source assets and build are verified.

- [ ] **Step 2: Run automated verification**

Run: `npm test`

Expected: all tests PASS.

Run: `npm run build`

Expected: exit code 0.

Run: `git diff --check`

Expected: no output.

- [ ] **Step 3: Run browser verification**

Serve `dist/` locally and verify desktop, 390 px, and 320 px views; keyboard navigation; browser console; portrait crop; and print preview. Confirm there is no horizontal overflow and no external stylesheet or script request.

- [ ] **Step 4: Review the final diff**

Confirm no secret, `.env`, SSH key, generated `dist/`, or unrelated file is included. Do not commit or push without a separate explicit request.
