const portfolioRoot = document.getElementById("portfolio");

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html != null) node.innerHTML = html;
  return node;
}

function renderStats(stats) {
  const row = el("div", "stats-row");
  stats.forEach((s) => {
    row.appendChild(
      el("div", "stat-pill", `<strong>${s.value}</strong><span>${s.label}</span>`)
    );
  });
  return row;
}

function renderSkills(skills) {
  const wrap = el("div", "skills-wrap");
  Object.entries(skills).forEach(([category, items]) => {
    const block = el("div", "skill-block");
    block.appendChild(el("h3", "skill-category", category));
    const chips = el("div", "skill-chips");
    items.forEach((skill) => chips.appendChild(el("span", "skill-chip", skill)));
    block.appendChild(chips);
    wrap.appendChild(block);
  });
  return wrap;
}

function renderProjects(projects) {
  const grid = el("div", "project-grid");
  projects.forEach((p) => {
    const card = el("article", `project-card${p.featured ? " is-featured" : ""}`);
    const links = [];
    if (p.links?.github && p.links.github !== "#") {
      links.push(`<a href="${p.links.github}" target="_blank" rel="noopener">GitHub</a>`);
    }
    if (p.links?.live) {
      links.push(`<a href="${p.links.live}" target="_blank" rel="noopener">Live demo</a>`);
    }
    card.innerHTML = `
      <div class="project-meta">
        <span class="project-status">${p.status}</span>
      </div>
      <h3>${p.title}</h3>
      <p>${p.description}</p>
      <div class="project-tags">${p.tags.map((t) => `<span>${t}</span>`).join("")}</div>
      ${links.length ? `<div class="project-links">${links.join("")}</div>` : ""}
    `;
    grid.appendChild(card);
  });
  return grid;
}

function renderEducation(edu) {
  const block = el("div", "education-block");
  block.appendChild(el("h3", null, edu.program));
  const ul = el("ul", "education-list");
  edu.details.forEach((d) => ul.appendChild(el("li", null, d)));
  block.appendChild(ul);
  return block;
}

async function initPortfolio() {
  const res = await fetch("data/portfolio.json");
  const data = await res.json();

  document.querySelectorAll("[data-bind='name']").forEach((n) => {
    n.textContent = data.name;
  });
  document.querySelectorAll("[data-bind='title']").forEach((n) => {
    n.textContent = data.title;
  });

  const aboutSection = document.getElementById("about");
  if (aboutSection) {
    aboutSection.appendChild(el("p", "section-lead", data.bio));
    aboutSection.appendChild(renderStats(data.stats));
  }

  const skillsSection = document.getElementById("skills");
  if (skillsSection) skillsSection.appendChild(renderSkills(data.skills));

  const projectsSection = document.getElementById("projects");
  if (projectsSection) projectsSection.appendChild(renderProjects(data.projects));

  const eduSection = document.getElementById("education");
  if (eduSection) eduSection.appendChild(renderEducation(data.education));

  const contactSection = document.getElementById("contact");
  if (contactSection) {
    contactSection.innerHTML = `
      <p class="section-lead">Open to collaborations, internships, and ML project feedback.</p>
      <div class="contact-actions">
        <a class="btn btn-primary" href="${data.contact.github}" target="_blank" rel="noopener">GitHub Profile</a>
        <a class="btn btn-ghost" href="${data.contact.repo}" target="_blank" rel="noopener">Featured Repo</a>
        <a class="btn btn-ghost" href="${data.contact.cv}">Download CV</a>
      </div>
      <p class="contact-note">Based in ${data.location} · ${data.contact.email}</p>
    `;
  }

  document.querySelectorAll(".reveal").forEach((node) => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(node);
  });
}

initPortfolio().catch((err) => console.error("Portfolio load failed", err));
