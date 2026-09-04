import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

test('build creates a self-contained resume', () => {
  const outputDir = mkdtempSync(join(tmpdir(), 'dofmat-resume-'));

  try {
    const result = spawnSync(
      process.execPath,
      ['scripts/build.mjs', '--output', outputDir],
      { cwd: projectRoot, encoding: 'utf8' },
    );

    assert.equal(result.status, 0, result.stderr);

    const html = readFileSync(join(outputDir, 'index.html'), 'utf8');
    assert.match(html, /Technical Lead \/ Solution Architect/);
    assert.match(html, /Media Instinct Group/);
    assert.match(html, /2SkyMobile/);
    assert.doesNotMatch(html, /Antwerp/);
    assert.match(html, /<h2>Избранные<\/h2>/);
    assert.match(html, /Сервис доставки/);
    assert.match(html, /XML- и YML-фиды/);
    assert.match(html, /Каталог и поиск/);
    assert.match(html, /техлид/);
    assert.match(html, /тимлид/);
    assert.doesNotMatch(html, /техническ(?:ий|им) лидер|production/i);
    assert.doesNotMatch(html, /Пишу backend|На frontend|frontend-модули|Frontend одного/);
    assert.doesNotMatch(html, /Outdoor-реклама/);
    assert.doesNotMatch(html, /\{\{[^}]+\}\}/);
    assert.doesNotMatch(html, /jquery|bootstrap|fontawesome/i);
    assert.match(html, /<script src="navigation\.js" defer><\/script>/);
    assert.ok(existsSync(join(outputDir, 'styles.css')));
    assert.ok(existsSync(join(outputDir, 'navigation.js')));
    assert.ok(existsSync(join(outputDir, 'assets', 'img', 'profile.jpg')));
    assert.ok(existsSync(join(outputDir, 'assets', 'img', 'favicon.ico')));

    const navigation = readFileSync(join(outputDir, 'navigation.js'), 'utf8');
    assert.match(navigation, /IntersectionObserver/);
    assert.match(navigation, /aria-current/);

    const styles = readFileSync(join(outputDir, 'styles.css'), 'utf8');
    assert.match(styles, /\.portrait\s*{[^}]*aspect-ratio:\s*1\s*\/\s*1/s);
    assert.doesNotMatch(styles, /content:\s*['"]>['"]/);
  } finally {
    rmSync(outputDir, { recursive: true, force: true });
  }
});

test('build escapes content loaded from a custom data file', async () => {
  const outputDir = mkdtempSync(join(tmpdir(), 'dofmat-resume-'));
  const fixtureDir = mkdtempSync(join(tmpdir(), 'dofmat-resume-fixture-'));
  const dataPath = join(fixtureDir, 'resume.json');
  const resume = JSON.parse(readFileSync(join(projectRoot, 'src', 'resume.json'), 'utf8'));
  resume.profile.summary = '<script>alert("resume")</script>';
  writeFileSync(dataPath, JSON.stringify(resume));

  try {
    const { build } = await import('../scripts/build.mjs');
    await build({ outputDir, dataPath });
    const html = readFileSync(join(outputDir, 'index.html'), 'utf8');

    assert.match(html, /&lt;script&gt;alert\(&quot;resume&quot;\)&lt;\/script&gt;/);
    assert.doesNotMatch(html, /<script>alert/);
  } finally {
    rmSync(outputDir, { recursive: true, force: true });
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test('build rejects an experience without a company', async () => {
  const outputDir = mkdtempSync(join(tmpdir(), 'dofmat-resume-'));
  const fixtureDir = mkdtempSync(join(tmpdir(), 'dofmat-resume-fixture-'));
  const dataPath = join(fixtureDir, 'resume.json');
  const resume = JSON.parse(readFileSync(join(projectRoot, 'src', 'resume.json'), 'utf8'));
  delete resume.experience[0].company;
  writeFileSync(dataPath, JSON.stringify(resume));

  try {
    const { build } = await import('../scripts/build.mjs');
    await assert.rejects(
      build({ outputDir, dataPath }),
      /Missing required resume field: experience\[0\]\.company/,
    );
  } finally {
    rmSync(outputDir, { recursive: true, force: true });
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test('workflow builds and deploys dist to GitHub Pages', () => {
  const workflowPath = join(projectRoot, '.github', 'workflows', 'pages.yml');
  assert.ok(existsSync(workflowPath), 'pages workflow must exist');

  const workflow = readFileSync(workflowPath, 'utf8');
  assert.match(workflow, /branches:\s*\[master\]/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /actions\/configure-pages@v5/);
  assert.match(workflow, /actions\/upload-pages-artifact@v4/);
  assert.match(workflow, /path:\s*dist/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(workflow, /pages:\s*write/);
  assert.match(workflow, /id-token:\s*write/);
});
