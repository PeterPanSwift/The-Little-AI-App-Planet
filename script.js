const filters = document.querySelector(".filters");
const projectGrid = document.querySelector(".project-grid");

function createTextElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function formatDate(date) {
  const [year, month, day] = date.split("-");
  return `${year}/${month}/${day}`;
}

function platformKey(platform) {
  return platform.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

const animalEmojis = [
  "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯",
  "🦁", "🐮", "🐷", "🐸", "🐵", "🐧", "🦉", "🦄", "🐙", "🐳",
];

function randomAnimalEmojis(count) {
  return [...animalEmojis]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}

function createAnimalList(items) {
  const list = document.createElement("ul");
  const emojis = randomAnimalEmojis(items.length);

  items.forEach((item, index) => {
    const listItem = document.createElement("li");
    const emoji = createTextElement("span", "animal-marker", emojis[index]);
    emoji.setAttribute("aria-hidden", "true");
    listItem.append(emoji, createTextElement("span", "list-text", item));
    list.append(listItem);
  });

  return list;
}

function imagePath(imageName) {
  const safeName = /^[a-z0-9_-]+$/i.test(imageName) ? imageName : "arctic-fox-hero";
  return `assets/${safeName}.png`;
}

function createProjectCard(app) {
  const article = document.createElement("article");
  article.className = "project-card project-card-detail reveal";
  article.dataset.platform = platformKey(app.platform);

  const visual = document.createElement("div");
  visual.className = "card-visual project-preview";
  const image = document.createElement("img");
  image.src = imagePath(app.image);
  image.alt = "An arctic fox building apps on The Little AI App Planet";
  visual.append(image, createTextElement("span", "visual-label", "LATEST BUILD"));

  const body = document.createElement("div");
  body.className = "card-body";

  const meta = document.createElement("div");
  meta.className = "card-meta";
  const appNumber = document.createElement("div");
  appNumber.className = "app-number";
  appNumber.append(
    createTextElement("span", "app-number-label", "App"),
    createTextElement("strong", "", String(app.number).padStart(2, "0")),
  );

  const dateBlock = document.createElement("div");
  dateBlock.className = "app-date";
  dateBlock.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 2v3M17 2v3M3.5 9h17M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/>
    </svg>`;
  const dateText = document.createElement("span");
  dateText.append(
    createTextElement("small", "", "Built on"),
  );
  const date = createTextElement("time", "", formatDate(app.date));
  date.dateTime = app.date;
  dateText.append(date);
  dateBlock.append(dateText);
  meta.append(appNumber, dateBlock);

  const platform = createTextElement("p", "app-platform", app.platform);

  const aiRow = document.createElement("div");
  aiRow.className = "ai-row";
  aiRow.append(
    createTextElement("span", "ai-label", "AI"),
    createTextElement("strong", "", app.AI),
  );

  const promptSection = document.createElement("div");
  promptSection.className = "prompt-section";
  promptSection.append(createTextElement("h4", "", "Key Prompts"));
  promptSection.append(createAnimalList(app.prompt));

  const learnSection = document.createElement("div");
  learnSection.className = "learn-section";
  learnSection.append(createTextElement("h4", "", "What I Learned"));
  learnSection.append(createAnimalList(app.learn));

  const githubLink = document.createElement("a");
  githubLink.className = "github-link";
  githubLink.href = app.GitHub;
  githubLink.target = "_blank";
  githubLink.rel = "noopener noreferrer";
  githubLink.setAttribute("aria-label", `Open ${app.title} on GitHub`);
  githubLink.title = "View source on GitHub";
  githubLink.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.49 0-.24-.01-1.05-.01-1.91-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.57 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.94a9.3 9.3 0 0 1 2.5.35c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.24 10.24 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z"/>
    </svg>`;

  body.append(
    meta,
    platform,
    createTextElement("h3", "", app.title),
    createTextElement("p", "", app.description),
    aiRow,
    promptSection,
    learnSection,
    githubLink,
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
    const chronologicalApps = [...data.apps].sort((a, b) => a.date.localeCompare(b.date));
    chronologicalApps.forEach((app, index) => {
      app.number = index + 1;
    });
    const apps = chronologicalApps.reverse();
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
