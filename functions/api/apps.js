const DEFAULT_OWNER = "PeterPanSwift";
const DEFAULT_REPO = "The-Little-AI-App-Planet";
const DEFAULT_BRANCH = "main";
const APPS_PATH = "data/apps.json";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function decodeBase64Json(content) {
  const binary = atob(content.replace(/\n/g, ""));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function encodeBase64Json(data) {
  const bytes = new TextEncoder().encode(`${JSON.stringify(data, null, 2)}\n`);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanOptionalUrl(value) {
  const trimmed = cleanString(value);
  if (!trimmed) return undefined;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function cleanStringArray(value) {
  return Array.isArray(value)
    ? value.map(cleanString).filter(Boolean)
    : [];
}

function normalizeApp(input) {
  const app = {
    date: cleanString(input.date),
    title: cleanString(input.title),
    platform: cleanString(input.platform),
    description: cleanString(input.description),
    image: cleanString(input.image),
    AI: cleanString(input.AI),
    prompt: cleanStringArray(input.prompt),
    notes: cleanStringArray(input.notes),
  };

  const website = cleanOptionalUrl(input.website);
  const GitHub = cleanOptionalUrl(input.GitHub);
  if (website) app.website = website;
  if (GitHub) app.GitHub = GitHub;

  return app;
}

function validateApp(app) {
  const requiredFields = ["date", "title", "platform", "description", "image", "AI"];
  const missing = requiredFields.filter((field) => !app[field]);
  if (missing.length > 0) {
    return `Missing required fields: ${missing.join(", ")}`;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(app.date)) {
    return "Date must use YYYY-MM-DD.";
  }

  if (app.prompt.length === 0) {
    return "Add at least one key prompt.";
  }

  if (app.notes.length === 0) {
    return "Add at least one note.";
  }

  return "";
}

async function githubRequest(url, env, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "little-ai-app-planet-admin",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `GitHub API failed with ${response.status}`);
  }
  return data;
}

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_SECRET || request.headers.get("X-Admin-Secret") !== env.ADMIN_SECRET) {
    return json({ error: "Unauthorized." }, 401);
  }

  if (!env.GITHUB_TOKEN) {
    return json({ error: "Missing GITHUB_TOKEN secret." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be JSON." }, 400);
  }

  const app = normalizeApp(body.app || body);
  const validationError = validateApp(app);
  if (validationError) {
    return json({ error: validationError }, 400);
  }

  const owner = env.GITHUB_OWNER || DEFAULT_OWNER;
  const repo = env.GITHUB_REPO || DEFAULT_REPO;
  const branch = env.GITHUB_BRANCH || DEFAULT_BRANCH;
  const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${APPS_PATH}`;

  try {
    const currentFile = await githubRequest(`${fileUrl}?ref=${branch}`, env);
    const appsData = decodeBase64Json(currentFile.content);
    if (!Array.isArray(appsData.apps)) {
      return json({ error: "data/apps.json must contain an apps array." }, 500);
    }

    const duplicate = appsData.apps.some(
      (existingApp) => existingApp.date === app.date && existingApp.title === app.title,
    );
    if (duplicate) {
      return json({ error: "An app with the same date and title already exists." }, 409);
    }

    appsData.apps.push(app);
    appsData.apps.sort((a, b) => (
      a.date.localeCompare(b.date) || a.title.localeCompare(b.title)
    ));

    const updatedFile = await githubRequest(fileUrl, env, {
      method: "PUT",
      body: JSON.stringify({
        branch,
        content: encodeBase64Json(appsData),
        message: `Add app: ${app.title}`,
        sha: currentFile.sha,
      }),
    });

    return json({
      app,
      commit: {
        sha: updatedFile.commit.sha,
        url: updatedFile.commit.html_url,
      },
      totalApps: appsData.apps.length,
    }, 201);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}
