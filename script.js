const filters = document.querySelector(".filters");
const projectGrid = document.querySelector(".project-grid");

function createTextElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function platformKey(platform) {
  return platform.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

function createProjectCard(app) {
  const article = document.createElement("article");
  article.className = "project-card project-card-detail reveal";
  article.dataset.platform = platformKey(app.platform);

  const visual = document.createElement("div");
  visual.className = "card-visual project-preview";
  const image = document.createElement("img");
  image.src = "assets/arctic-fox-hero.png";
  image.alt = "An arctic fox building apps on The Little AI App Planet";
  visual.append(image, createTextElement("span", "visual-label", "LATEST BUILD"));

  const body = document.createElement("div");
  body.className = "card-body";

  const meta = document.createElement("div");
  meta.className = "card-meta";
  const date = createTextElement("time", "", formatDate(app.date));
  date.dateTime = app.date;
  meta.append(createTextElement("span", "", app.platform), date);

  const aiRow = document.createElement("div");
  aiRow.className = "ai-row";
  aiRow.append(
    createTextElement("span", "ai-label", "AI"),
    createTextElement("strong", "", app.AI),
  );

  const promptSection = document.createElement("div");
  promptSection.className = "prompt-section";
  promptSection.append(createTextElement("h4", "", "Key Prompts"));
  const promptList = document.createElement("ol");
  app.prompt.forEach((prompt) => {
    promptList.append(createTextElement("li", "", prompt));
  });
  promptSection.append(promptList);

  const link = createTextElement("a", "card-link", "View this project ");
  link.href = app.url || "#";
  const arrow = createTextElement("span", "", "↗");
  arrow.setAttribute("aria-hidden", "true");
  link.append(arrow);

  body.append(
    meta,
    createTextElement("h3", "", app.title),
    createTextElement("p", "", app.description),
    aiRow,
    promptSection,
    link,
  );
  article.append(visual, body);
  return article;
}

function renderFilters(apps) {
  const platforms = ["all", ...new Set(apps.map((app) => app.platform))];
  filters.replaceChildren();

  platforms.forEach((platform) => {
    const filter = platform === "all" ? "all" : platformKey(platform);
    const label = platform === "all" ? "All apps " : platform;
    const button = createTextElement(
      "button",
      `filter-button${platform === "all" ? " active" : ""}`,
      label,
    );
    button.type = "button";
    button.dataset.filter = filter;

    if (platform === "all") {
      button.append(createTextElement("span", "", String(apps.length)));
    }

    button.addEventListener("click", () => {
      filters.querySelectorAll(".filter-button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      projectGrid.querySelectorAll(".project-card").forEach((card) => {
        card.classList.toggle("hidden", filter !== "all" && card.dataset.platform !== filter);
      });
    });
    filters.append(button);
  });
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 },
);

function observeReveals() {
  document.querySelectorAll(".reveal:not(.visible)").forEach((element) => observer.observe(element));
}

async function loadApps() {
  try {
    const response = await fetch("data/apps.json");
    if (!response.ok) throw new Error(`Could not load app data (${response.status})`);

    const data = await response.json();
    const apps = [...data.apps].sort((a, b) => b.date.localeCompare(a.date));
    renderFilters(apps);
    projectGrid.replaceChildren(...apps.map(createProjectCard));
    observeReveals();
  } catch (error) {
    console.error(error);
    filters.replaceChildren();
    projectGrid.replaceChildren(
      createTextElement("p", "data-error", "The apps could not be loaded. Please try again later."),
    );
  }
}

observeReveals();
loadApps();

const heroArt = document.querySelector(".hero-art");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (heroArt && !reducedMotion) {
  window.addEventListener(
    "scroll",
    () => {
      const offset = Math.min(window.scrollY * 0.04, 24);
      heroArt.style.translate = `0 ${offset}px`;
    },
    { passive: true },
  );
}
