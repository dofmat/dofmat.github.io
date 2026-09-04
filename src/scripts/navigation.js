const links = [...document.querySelectorAll('nav a[href^="#"]')];
const sections = [...new Set(links.map((link) => document.querySelector(link.hash)).filter(Boolean))];

function showCurrentSection(id) {
  links.forEach((link) => {
    if (link.hash === `#${id}`) {
      link.setAttribute('aria-current', 'location');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

const initialSection = sections.find((section) => `#${section.id}` === location.hash) ?? sections[0];
if (initialSection) {
  showCurrentSection(initialSection.id);
}

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((left, right) => Math.abs(left.boundingClientRect.top) - Math.abs(right.boundingClientRect.top));

    if (visible[0]) {
      showCurrentSection(visible[0].target.id);
    }
  }, { rootMargin: '-20% 0px -70% 0px' });

  sections.forEach((section) => observer.observe(section));
}
