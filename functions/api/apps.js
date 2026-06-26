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
  const medium = cleanOptionalUrl(input.medium);
  if (website) app.website = website;
  if (GitHub) app.GitHub = GitHub;
  if (medium) app.medium = medium;

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

  return "";
}

function validateAppsData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return "The JSON root must be an object.";
  }
  if (!Array.isArray(data.apps)) {
    return "data/apps.json must contain an apps array.";
  }

  const seenApps = new Set();
  for (let index = 0; index < data.apps.length; index += 1) {
    const input = data.apps[index];
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return `App ${index + 1} must be an object.`;
    }

    const app = normalizeApp(input);
    const validationError = validateApp(app);
    if (validationError) {
      return `App ${index + 1}: ${validationError}`;
    }

    const key = `${app.date}\u0000${app.title}`;
    if (seenApps.has(key)) {
      return `Duplicate app at item ${index + 1}: ${app.date} / ${app.title}`;
    }
    seenApps.add(key);
  }

  return "";
}

function repositoryConfig(env) {
  const owner = env.GITHUB_OWNER || DEFAULT_OWNER;
  const repo = env.GITHUB_REPO || DEFAULT_REPO;
  const branch = env.GITHUB_BRANCH || DEFAULT_BRANCH;
  return {
    branch,
    fileUrl: githubContentsUrl(owner, repo, APPS_PATH),
    owner,
    repo,
  };
}

function authorize(request, env) {
  if (!env.ADMIN_SECRET || request.headers.get("X-Admin-Secret") !== env.ADMIN_SECRET) {
    return json({ error: "Unauthorized." }, 401);
  }
  if (!env.GITHUB_TOKEN) {
    return json({ error: "Missing GITHUB_TOKEN secret." }, 500);
  }
  return null;
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
  const authorizationError = authorize(request, env);
  if (authorizationError) return authorizationError;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be JSON." }, 400);
  }

  const imageUpload = normalizeImageUpload(body?.imageFile);
  const imageValidationError = validateImageUpload(imageUpload);
  if (imageValidationError) {
    return json({ error: imageValidationError }, 400);
  }

  const app = normalizeApp(body?.app || body || {}, imageUpload.name);
  const validationError = validateApp(app);
  if (validationError) {
    return json({ error: validationError }, 400);
  }

  const { branch, fileUrl, owner, repo } = repositoryConfig(env);
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

export async function onRequestGet({ request, env }) {
  const authorizationError = authorize(request, env);
  if (authorizationError) return authorizationError;

  const { branch, fileUrl } = repositoryConfig(env);
  try {
    const currentFile = await githubRequest(`${fileUrl}?ref=${branch}`, env);
    const data = decodeBase64Json(currentFile.content);
    const validationError = validateAppsData(data);
    if (validationError) {
      return json({ error: validationError }, 500);
    }
    return json({ data, sha: currentFile.sha, branch, path: APPS_PATH });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

export async function onRequestPut({ request, env }) {
  const authorizationError = authorize(request, env);
  if (authorizationError) return authorizationError;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be JSON." }, 400);
  }

  let imageUpload = null;
  if (body?.imageFile != null) {
    imageUpload = normalizeImageUpload(body.imageFile);
    const imageValidationError = validateImageUpload(imageUpload);
    if (imageValidationError) {
      return json({ error: imageValidationError }, 400);
    }
    const imageIsReferenced = body?.data?.apps?.some(
      (app) => cleanString(app?.image) === imageUpload.name,
    );
    if (!imageIsReferenced) {
      return json({ error: "The uploaded image must be assigned to an app." }, 400);
    }
  }

  const validationError = validateAppsData(body?.data);
  if (validationError) {
    return json({ error: validationError }, 400);
  }

  const submittedSha = cleanString(body?.sha);
  if (!submittedSha) {
    return json({ error: "Load the latest JSON before saving." }, 400);
  }

  const { branch, fileUrl, owner, repo } = repositoryConfig(env);
  try {
    const currentFile = await githubRequest(`${fileUrl}?ref=${branch}`, env);
    if (currentFile.sha !== submittedSha) {
      return json({ error: "The JSON file changed after it was loaded. Load it again before saving." }, 409);
    }

    let image = null;
    if (imageUpload) {
      const imagePath = `${ASSETS_DIR}/${imageUpload.name}.png`;
      const imageUrl = githubContentsUrl(owner, repo, imagePath);
      const currentImageFile = await githubRequest(`${imageUrl}?ref=${branch}`, env, {}, {
        allowNotFound: true,
      });
      const imagePayload = {
        branch,
        content: imageUpload.contentBase64,
        message: `${currentImageFile ? "Update" : "Add"} image: ${imageUpload.name}.png`,
      };
      if (currentImageFile) imagePayload.sha = currentImageFile.sha;

      const updatedImageFile = await githubRequest(imageUrl, env, {
        method: "PUT",
        body: JSON.stringify(imagePayload),
      });
      image = {
        path: imagePath,
        commit: {
          sha: updatedImageFile.commit.sha,
          url: updatedImageFile.commit.html_url,
        },
      };
    }

    const updatedFile = await githubRequest(fileUrl, env, {
      method: "PUT",
      body: JSON.stringify({
        branch,
        content: encodeBase64Json(body.data),
        message: "Update app data",
        sha: currentFile.sha,
      }),
    });

    return json({
      sha: updatedFile.content.sha,
      commit: {
        sha: updatedFile.commit.sha,
        url: updatedFile.commit.html_url,
      },
      image,
      totalApps: body.data.apps.length,
    });
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}
