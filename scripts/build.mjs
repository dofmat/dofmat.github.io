import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultOutputDir = join(projectRoot, 'dist');

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function required(value, name) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Missing required resume field: ${name}`);
  }
}

function validateResume(resume) {
  required(resume?.meta?.title, 'meta.title');
  required(resume?.meta?.description, 'meta.description');
  required(resume?.profile?.name, 'profile.name');
  required(resume?.profile?.role, 'profile.role');
  required(resume?.profile?.summary, 'profile.summary');

  if (!Array.isArray(resume.experience) || resume.experience.length === 0) {
    throw new Error('Missing required resume field: experience');
  }

  resume.experience.forEach((item, index) => {
    required(item?.company, `experience[${index}].company`);
  });
}

function link(item, className = '') {
  const external = item.href.startsWith('http');
  const attrs = external ? ' target="_blank" rel="noreferrer"' : '';
  return `<a class="${className}" href="${escapeHtml(item.href)}"${attrs}>${escapeHtml(item.label)}</a>`;
}

function tags(items) {
  return `<ul class="tags" aria-label="Технологии">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function experience(resume) {
  return resume.experience.map((item) => {
    const company = item.url
      ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.company)}</a>`
      : escapeHtml(item.company);
    const flags = [item.current ? '<span class="status">работаю сейчас</span>' : '', item.parallel ? '<span class="parallel">параллельно</span>' : ''].join('');
    const highlights = item.highlights.length
      ? `<ul class="highlights">${item.highlights.map((point) => `<li>${escapeHtml(point)}</li>`).join('')}</ul>`
      : '';

    return `<article class="experience-item">
      <div class="experience-meta"><time>${escapeHtml(item.period)}</time>${flags}</div>
      <div class="experience-copy">
        <h3>${company}</h3>
        <p class="role">${escapeHtml(item.role)}</p>
        <p>${escapeHtml(item.summary)}</p>
        ${highlights}
        ${tags(item.tags)}
      </div>
    </article>`;
  }).join('');
}

function projects(resume) {
  return resume.projects.map((item) => `<article class="project-card">
    <p class="project-context">${escapeHtml(item.context)}</p>
    <h3>${escapeHtml(item.name)}</h3>
    <p>${escapeHtml(item.description)}</p>
    ${tags(item.tags)}
  </article>`).join('');
}

function skillGroups(resume) {
  return resume.skills.map((group) => `<div class="skill-group">
    <h3>${escapeHtml(group.name)}</h3>
    <p>${group.items.map(escapeHtml).join(' · ')}</p>
  </div>`).join('');
}

function education(resume) {
  return resume.education.map((item) => `<article class="education-item">
    <time>${escapeHtml(item.period)}</time>
    <div><h3>${escapeHtml(item.school)}</h3><p>${escapeHtml(item.program)}</p></div>
  </article>`).join('');
}

function sectionPrompt(command, title) {
  return `<div class="section-prompt" aria-hidden="true"><span>$</span> ${escapeHtml(command)}</div><h2>${escapeHtml(title)}</h2>`;
}

function pageContent(resume) {
  const contacts = resume.contacts.map((item) => link(item)).join('');
  const nav = [
    ['about', '00 / whoami'],
    ['experience', '01 / experience'],
    ['projects', '02 / projects'],
    ['skills', '03 / stack'],
    ['education', '04 / education'],
  ].map(([id, label]) => `<a href="#${id}">${label}</a>`).join('');

  return `<a class="skip-link" href="#main-content">Перейти к содержанию</a>
    <aside class="sidebar">
      <img class="portrait" src="assets/img/profile.jpg" alt="Антон Виноградов">
      <p class="sidebar-name">${escapeHtml(resume.profile.name)}</p>
      <p class="handle">@${escapeHtml(resume.profile.handle)}</p>
      <nav aria-label="Разделы резюме">${nav}</nav>
      <p class="location"><span aria-hidden="true"></span>${escapeHtml(resume.profile.location)}</p>
    </aside>
    <header class="mobile-header">
      <img class="portrait" src="assets/img/profile.jpg" alt="">
      <div><p>${escapeHtml(resume.profile.name)}</p><span>${escapeHtml(resume.profile.role)}</span></div>
      <nav aria-label="Разделы резюме">${nav}</nav>
    </header>
    <main id="main-content">
      <section class="hero" id="about">
        <p class="shell"><b>anton@resume</b>:<span>~</span>$ whoami</p>
        <h1>${escapeHtml(resume.profile.name)}<span>${escapeHtml(resume.profile.role)}</span></h1>
        <p class="summary">${escapeHtml(resume.profile.summary)}</p>
        <div class="contacts">${contacts}</div>
      </section>
      <section id="experience">${sectionPrompt('work --all', 'Опыт')}${experience(resume)}</section>
      <section id="projects">${sectionPrompt('projects --selected', 'Избранные')}<div class="projects-grid">${projects(resume)}</div></section>
      <section id="skills">${sectionPrompt('stack --grouped', 'Стек')}<div class="skills-grid">${skillGroups(resume)}</div></section>
      <section id="education">${sectionPrompt('education --list', 'Образование')}${education(resume)}
        <div class="languages"><h3>Языки</h3><p>${resume.languages.map(escapeHtml).join(' · ')}</p></div>
      </section>
      <section class="interests">${sectionPrompt('cat interests.txt', 'Вне работы')}<p>${escapeHtml(resume.interests)}</p></section>
      <footer><span>EOF</span><a href="#about">Наверх</a></footer>
    </main>`;
}

function safeOutputPath(outputDir) {
  const output = resolve(outputDir);
  const tempRoot = resolve(tmpdir());
  const isDefault = output === defaultOutputDir;
  const tempRelative = relative(tempRoot, output);
  const isTestOutput = tempRelative && !tempRelative.startsWith('..') && !tempRelative.includes(`..${sep}`) && basename(output).startsWith('dofmat-resume-');

  if (!isDefault && !isTestOutput) {
    throw new Error(`Refusing to clear unsafe output directory: ${output}`);
  }

  return output;
}

export async function build({ outputDir = defaultOutputDir, dataPath = join(projectRoot, 'src', 'resume.json') } = {}) {
  const output = safeOutputPath(outputDir);
  const templatePath = join(projectRoot, 'src', 'templates', 'index.html');
  const stylePath = join(projectRoot, 'src', 'styles', 'terminal.css');
  const navigationPath = join(projectRoot, 'src', 'scripts', 'navigation.js');
  const profilePath = join(projectRoot, 'src', 'assets', 'img', 'profile.jpg');
  const faviconPath = join(projectRoot, 'src', 'assets', 'img', 'favicon.ico');
  const [template, resumeSource, styles] = await Promise.all([
    readFile(templatePath, 'utf8'),
    readFile(dataPath, 'utf8'),
    readFile(stylePath, 'utf8'),
  ]);
  const resume = JSON.parse(resumeSource);
  validateResume(resume);

  const html = template
    .replace('{{title}}', escapeHtml(resume.meta.title))
    .replace('{{description}}', escapeHtml(resume.meta.description))
    .replace('{{content}}', pageContent(resume));

  if (/\{\{[^}]+\}\}/.test(html)) {
    throw new Error('Unresolved template placeholder');
  }

  await rm(output, { recursive: true, force: true });
  await mkdir(join(output, 'assets', 'img'), { recursive: true });
  await Promise.all([
    writeFile(join(output, 'index.html'), html),
    writeFile(join(output, 'styles.css'), styles),
    copyFile(navigationPath, join(output, 'navigation.js')),
    copyFile(profilePath, join(output, 'assets', 'img', 'profile.jpg')),
    copyFile(faviconPath, join(output, 'assets', 'img', 'favicon.ico')),
  ]);

  return output;
}

function outputArg(argv) {
  const index = argv.indexOf('--output');
  return index === -1 ? defaultOutputDir : argv[index + 1];
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const output = await build({ outputDir: outputArg(process.argv.slice(2)) });
  console.log(`Built ${output}`);
}
