const DEFAULT_OWNER = "PeterPanSwift";
const DEFAULT_REPO = "The-Little-AI-App-Planet";
const DEFAULT_BRANCH = "main";
const APPS_PATH = "data/apps.json";
const ASSETS_DIR = "assets";
const MAX_IMAGE_BASE64_LENGTH = 10 * 1024 * 1024;

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

function githubContentsUrl(owner, repo, path) {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`;
}

function imageNameFromFileName(fileName) {
  const baseName = cleanString(fileName).replace(/\.[^.]+$/, "");
  return baseName
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-")
    .trim();
}

function normalizeImageUpload(input) {
  if (!input || typeof input !== "object") return null;

  return {
    name: imageNameFromFileName(input.name),
    mimeType: cleanString(input.mimeType),
    contentBase64: cleanString(input.contentBase64).replace(/\s/g, ""),
  };
}

function validateImageUpload(upload) {
  if (!upload) {
    return "Upload a PNG image.";
  }

  if (!upload.name) {
    return "The uploaded image needs a file name.";
  }

  if (upload.mimeType !== "image/png") {
    return "The app image must be a PNG file.";
  }

  if (!upload.contentBase64) {
    return "The uploaded image is empty.";
  }

  if (upload.contentBase64.length > MAX_IMAGE_BASE64_LENGTH) {
    return "The PNG image is too large.";
  }

  if (!/^[A-Za-z0-9+/=]+$/.test(upload.contentBase64)) {
    return "The uploaded image content is not valid base64.";
  }

  if (!upload.contentBase64.startsWith("iVBORw0KGgo")) {
    return "The app image must be a valid PNG file.";
  }

  return "";
}

function normalizeApp(input, imageName = "") {
  const app = {
    date: cleanString(input.date),
    title: cleanString(input.title),
    platform: cleanString(input.platform),
    description: cleanString(input.description),
    image: imageName || cleanString(input.image),
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

async function githubRequest(url, env, init = {}, options = {}) {
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
  if (response.status === 404 && options.allowNotFound) {
    return null;
  }

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

  const imageUpload = normalizeImageUpload(body.imageFile);
  const imageValidationError = validateImageUpload(imageUpload);
  if (imageValidationError) {
    return json({ error: imageValidationError }, 400);
  }

  const app = normalizeApp(body.app || body, imageUpload.name);
  const validationError = validateApp(app);
  if (validationError) {
    return json({ error: validationError }, 400);
  }

  const owner = env.GITHUB_OWNER || DEFAULT_OWNER;
  const repo = env.GITHUB_REPO || DEFAULT_REPO;
  const branch = env.GITHUB_BRANCH || DEFAULT_BRANCH;
  const fileUrl = githubContentsUrl(owner, repo, APPS_PATH);
  const imagePath = `${ASSETS_DIR}/${imageUpload.name}.png`;
  const imageUrl = githubContentsUrl(owner, repo, imagePath);

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

    const currentImageFile = await githubRequest(`${imageUrl}?ref=${branch}`, env, {}, {
      allowNotFound: true,
    });
    if (currentImageFile) {
      return json({ error: `Image already exists: ${imagePath}` }, 409);
    }

    const imagePayload = {
      branch,
      content: imageUpload.contentBase64,
      message: `Add image: ${imageUpload.name}.png`,
    };

    const updatedImageFile = await githubRequest(imageUrl, env, {
      method: "PUT",
      body: JSON.stringify(imagePayload),
    });

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
      image: {
        path: imagePath,
        commit: {
          sha: updatedImageFile.commit.sha,
          url: updatedImageFile.commit.html_url,
        },
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
