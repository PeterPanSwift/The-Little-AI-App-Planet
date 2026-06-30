const filters = document.querySelector(".filters");
const projectGrid = document.querySelector(".project-grid");
const completedCount = document.querySelector(".completed-count");
let allChronologicalApps = [];
let includeFutureApps = false;
let activeFilter = "all";
let searchQuery = "";
const platformOrder = ["SwiftUI", "Flutter", "AI", "Website", "Python"];

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

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function appendAutoLinkedText(container, text) {
  const urlPattern = /https?:\/\/[^\s<>"'，。！？；：、（）【】《》]+/gi;
  let cursor = 0;

  for (const match of text.matchAll(urlPattern)) {
    const rawUrl = match[0];
    const trailingPunctuation = rawUrl.match(/[),.;:!?\]}，。！？；：、]+$/u)?.[0] || "";
    const url = rawUrl.slice(0, rawUrl.length - trailingPunctuation.length);

    container.append(document.createTextNode(text.slice(cursor, match.index)));

    const link = document.createElement("a");
    link.className = "note-link";
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = url;
    container.append(link);

    if (trailingPunctuation) {
      container.append(document.createTextNode(trailingPunctuation));
    }
    cursor = match.index + rawUrl.length;
  }

  container.append(document.createTextNode(text.slice(cursor)));
}

function createLinkedListText(text, options = {}) {
  const container = document.createElement("span");
  container.className = "list-text";
  const legacyNoteLink = options.linkNotes
    ? text.match(/\(link:\s*(https?:\/\/[^\s)]+)\)/i)
    : null;

  if (!legacyNoteLink) {
    appendAutoLinkedText(container, text);
    return container;
  }

  const link = document.createElement("a");
  link.className = "note-link";
  link.href = legacyNoteLink[1];
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = text.replace(legacyNoteLink[0], "").trim() || "Open link";
  container.append(link);
  return container;
}

function createAnimalList(items, options = {}) {
  const list = document.createElement("ul");
  const listItems = normalizedListItems(items, options);
  const emojis = randomAnimalEmojis(listItems.length);

  listItems.forEach((item, index) => {
    const listItem = document.createElement("li");
    const emoji = createTextElement("span", "animal-marker", emojis[index]);
    const content = createLinkedListText(item, options);
    emoji.setAttribute("aria-hidden", "true");
    listItem.append(emoji, content);
    list.append(listItem);
  });

  return list;
}

function normalizedListItems(items, options = {}) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item && (!options.omitNone || item !== "無"));
}

function hasListItems(items, options = {}) {
  return normalizedListItems(items, options).length > 0;
}

function imagePath(imageName) {
  const trimmedName = typeof imageName === "string" ? imageName.trim() : "";
  const safeName = /^[\p{L}\p{N} _-]+$/u.test(trimmedName)
    ? trimmedName
    : "arctic-fox-hero";
  return `assets/${encodeURIComponent(safeName)}.png`;
}

function createProjectCard(app) {
  const article = document.createElement("article");
  article.className = "project-card project-card-detail reveal";
  article.dataset.platform = platformKey(app.platform);
  article.dataset.title = app.title.toLocaleLowerCase();

  const visual = document.createElement("div");
  visual.className = "card-visual project-preview";
  const image = document.createElement("img");
  image.src = imagePath(app.image);
  image.alt = `${app.title} preview`;
  visual.style.setProperty("--preview-image", `url("${image.src}")`);
  visual.append(image);

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

  const aiRow = typeof app.AI === "string" && app.AI.trim()
    ? document.createElement("div")
    : null;
  if (aiRow) {
    aiRow.className = "ai-row";
    aiRow.append(
      createTextElement("span", "ai-label", "AI"),
      createTextElement("strong", "", app.AI.trim()),
    );
  }

  const promptSection = hasListItems(app.prompt)
    ? document.createElement("div")
    : null;
  if (promptSection) {
    promptSection.className = "prompt-section";
    promptSection.append(createTextElement("h4", "", "Key Prompts"));
    promptSection.append(createAnimalList(app.prompt));
  }

  const notesSection = hasListItems(app.notes, { omitNone: true })
    ? document.createElement("div")
    : null;
  if (notesSection) {
    notesSection.className = "notes-section";
    notesSection.append(createTextElement("h4", "", "Notes"));
    notesSection.append(createAnimalList(app.notes, { linkNotes: true, omitNone: true }));
  }

  const appLinks = document.createElement("div");
  appLinks.className = "app-links";

  if (app.website) {
    const websiteLink = document.createElement("a");
    websiteLink.className = "app-link website-link";
    websiteLink.href = app.website;
    websiteLink.target = "_blank";
    websiteLink.rel = "noopener noreferrer";
    websiteLink.setAttribute("aria-label", `Open ${app.title} website`);
    websiteLink.title = "Visit website";
    websiteLink.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9"/>
        <path d="M3.5 9h17M3.5 15h17M12 3c2.3 2.5 3.5 5.5 3.5 9S14.3 18.5 12 21M12 3C9.7 5.5 8.5 8.5 8.5 12s1.2 6.5 3.5 9"/>
      </svg>`;
    appLinks.append(websiteLink);
  }

  if (app.GitHub) {
    const githubLink = document.createElement("a");
    githubLink.className = "app-link github-link";
    githubLink.href = app.GitHub;
    githubLink.target = "_blank";
    githubLink.rel = "noopener noreferrer";
    githubLink.setAttribute("aria-label", `Open ${app.title} on GitHub`);
    githubLink.title = "View source on GitHub";
    githubLink.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.49 0-.24-.01-1.05-.01-1.91-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.57 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.94a9.3 9.3 0 0 1 2.5.35c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.24 10.24 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z"/>
      </svg>`;
    appLinks.append(githubLink);
  }

  if (app.medium) {
    const mediumLink = document.createElement("a");
    mediumLink.className = "app-link medium-link";
    mediumLink.href = app.medium;
    mediumLink.target = "_blank";
    mediumLink.rel = "noopener noreferrer";
    mediumLink.setAttribute("aria-label", `Open ${app.title} on Medium`);
    mediumLink.title = "Read on Medium";
    mediumLink.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13.54 12c0 3.53-2.84 6.39-6.35 6.39S.84 15.53.84 12s2.84-6.39 6.35-6.39 6.35 2.86 6.35 6.39Zm6.97 0c0 3.32-1.42 6.01-3.17 6.01s-3.17-2.69-3.17-6.01 1.42-6.01 3.17-6.01 3.17 2.69 3.17 6.01Zm2.65 0c0 2.98-.5 5.4-1.12 5.4s-1.12-2.42-1.12-5.4.5-5.4 1.12-5.4 1.12 2.42 1.12 5.4Z"/>
      </svg>`;
    appLinks.append(mediumLink);
  }

  body.append(
    meta,
    platform,
    createTextElement("h3", "", app.title),
    createTextElement("p", "", app.description),
    ...(aiRow ? [aiRow] : []),
    ...(promptSection ? [promptSection] : []),
    ...(notesSection ? [notesSection] : []),
    appLinks,
  );
  article.append(visual, body);
  return article;
}

function currentChronologicalApps() {
  const today = localDateString();
  return includeFutureApps
    ? allChronologicalApps
    : allChronologicalApps.filter((app) => app.date <= today);
}

function completedAppsCount() {
  const today = localDateString();
  return allChronologicalApps.filter((app) => app.date <= today).length;
}

function renderCompletedCount() {
  if (!completedCount) return;
  completedCount.textContent = String(completedAppsCount());
}

function renderCurrentApps() {
  const visibleChronologicalApps = currentChronologicalApps();
  const platformKeys = new Set(visibleChronologicalApps.map((app) => platformKey(app.platform)));

  if (activeFilter !== "all" && !platformKeys.has(activeFilter)) {
    activeFilter = "all";
  }

  const apps = [...visibleChronologicalApps].reverse();
  projectGrid.replaceChildren(...apps.map(createProjectCard));
  renderFilters(apps);
  observeReveals();
}

function renderFilters(apps) {
  const availablePlatformKeys = new Set(apps.map((app) => platformKey(app.platform)));
  const platforms = ["all"];
  const seenPlatforms = new Set();

  allChronologicalApps.forEach((app) => {
    const key = platformKey(app.platform);

    if (availablePlatformKeys.has(key) && !seenPlatforms.has(key)) {
      platforms.push(app.platform);
      seenPlatforms.add(key);
    }
  });

  const platformRanks = new Map(platformOrder.map((platform, index) => [platformKey(platform), index]));
  platforms.splice(
    1,
    platforms.length - 1,
    ...platforms.slice(1).sort((a, b) => {
      const aRank = platformRanks.get(platformKey(a)) ?? platformOrder.length;
      const bRank = platformRanks.get(platformKey(b)) ?? platformOrder.length;
      return aRank - bRank;
    }),
  );

  const futureCount = allChronologicalApps.filter((app) => app.date > localDateString()).length;
  filters.replaceChildren();
  const categoryRow = document.createElement("div");
  categoryRow.className = "filter-categories";
  const toolsRow = document.createElement("div");
  toolsRow.className = "filter-tools";
  filters.append(categoryRow, toolsRow);

  const applyFilters = () => {
    const query = filters.querySelector(".app-search-input").value.trim().toLocaleLowerCase();
    searchQuery = query;
    let visibleCount = 0;

    projectGrid.querySelectorAll(".project-card").forEach((card) => {
      const matchesPlatform = activeFilter === "all" || card.dataset.platform === activeFilter;
      const matchesTitle = !query || card.dataset.title.includes(query);
      const visible = matchesPlatform && matchesTitle;
      card.classList.toggle("hidden", !visible);
      if (visible) visibleCount += 1;
    });

    projectGrid.querySelector(".search-empty")?.remove();
    if (visibleCount === 0) {
      projectGrid.append(
        createTextElement("p", "data-error search-empty", `No apps found for “${query}”.`),
      );
    }
  };

  platforms.forEach((platform) => {
    const filter = platform === "all" ? "all" : platformKey(platform);
    const label = platform === "all" ? "All Apps " : `${platform} `;
    const count = platform === "all"
      ? apps.length
      : apps.filter((app) => app.platform === platform).length;
    const button = createTextElement(
      "button",
      `filter-button${filter === activeFilter ? " active" : ""}`,
      label,
    );
    button.type = "button";
    button.dataset.filter = filter;
    button.append(createTextElement("span", "", String(count)));

    button.addEventListener("click", () => {
      filters.querySelectorAll(".filter-button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      activeFilter = filter;
      applyFilters();
    });
    categoryRow.append(button);
  });

  const search = document.createElement("label");
  search.className = "app-search";
  search.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5"/>
      <path d="m16 16 4 4"/>
    </svg>`;
  const searchInput = document.createElement("input");
  searchInput.className = "app-search-input";
  searchInput.type = "search";
  searchInput.placeholder = "Search apps";
  searchInput.setAttribute("aria-label", "Search apps by name");
  searchInput.value = searchQuery;
  searchInput.addEventListener("input", applyFilters);
  searchInput.addEventListener("search", applyFilters);
  search.append(searchInput);
  toolsRow.append(search);

  const futureToggle = document.createElement("label");
  futureToggle.className = "future-toggle";
  const futureCheckbox = document.createElement("input");
  futureCheckbox.type = "checkbox";
  futureCheckbox.checked = includeFutureApps;
  futureCheckbox.addEventListener("change", () => {
    includeFutureApps = futureCheckbox.checked;
    renderCurrentApps();
  });
  futureToggle.append(
    futureCheckbox,
    createTextElement("span", "", futureCount > 0 ? `Show future apps ${futureCount}` : "Show future apps"),
  );
  toolsRow.append(futureToggle);
  applyFilters();
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
    const response = await fetch("data/apps.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load app data (${response.status})`);

    const data = await response.json();
    allChronologicalApps = [...data.apps].sort((a, b) => a.date.localeCompare(b.date));
    allChronologicalApps.forEach((app, index) => {
      app.number = index + 1;
    });
    renderCompletedCount();
    renderCurrentApps();
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
