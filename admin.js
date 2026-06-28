const form = document.querySelector("#app-form");
const statusMessage = document.querySelector("#admin-status");
const imageInput = form.elements.imageFile;
const imagePreview = document.querySelector("#image-preview");
const imagePreviewImage = imagePreview.querySelector("img");
const imagePreviewName = imagePreview.querySelector("span");
const adminSecretInput = document.querySelector("#admin-secret");
const jsonEditor = document.querySelector("#json-editor");
const jsonLoadButton = document.querySelector("#json-load");
const jsonFormatButton = document.querySelector("#json-format");
const jsonSaveButton = document.querySelector("#json-save");
const jsonStatus = document.querySelector("#json-status");
const appListLoadButton = document.querySelector("#app-list-load");
const appListStatus = document.querySelector("#app-list-status");
const appAdminList = document.querySelector("#app-admin-list");
const appEditForm = document.querySelector("#app-edit-form");
const appEditTitle = document.querySelector("#app-edit-title");
const appEditCancelButton = document.querySelector("#app-edit-cancel");
const appEditStatus = document.querySelector("#app-edit-status");
const editImageInput = appEditForm.elements.imageFile;
const editImagePreview = document.querySelector("#edit-image-preview");
const editImagePreviewImage = editImagePreview.querySelector("img");
const editImagePreviewName = editImagePreview.querySelector("span");
let jsonFileSha = "";
let appListData = null;
let appListSha = "";
let editingAppIndex = -1;
const arrayFieldConfigs = {
  prompt: {
    addButton: document.querySelector('[data-array-add="prompt"]'),
    list: document.querySelector('[data-array-list="prompt"]'),
    placeholder: "Write a key prompt",
    removeLabel: "Remove prompt",
    multiline: true,
  },
  notes: {
    addButton: document.querySelector('[data-array-add="notes"]'),
    list: document.querySelector('[data-array-list="notes"]'),
    placeholder: "Write a note",
    removeLabel: "Remove note",
    multiline: true,
  },
};

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function optionalUrl(value) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function arrayValues(name) {
  return Array.from(document.querySelectorAll(`[data-array-input="${name}"]`))
    .map((input) => input.value.trim())
    .filter(Boolean);
}

function createArrayRow(name, value = "", shouldFocus = true) {
  const config = arrayFieldConfigs[name];
  const row = document.createElement("div");
  const input = document.createElement(config.multiline ? "textarea" : "input");
  const removeButton = document.createElement("button");

  row.className = "array-row";
  if (input instanceof HTMLInputElement) {
    input.type = "text";
  } else {
    input.rows = 3;
  }
  input.value = value;
  input.placeholder = config.placeholder;
  input.dataset.arrayInput = name;

  removeButton.className = "array-remove";
  removeButton.type = "button";
  removeButton.textContent = "Remove";
  removeButton.setAttribute("aria-label", config.removeLabel);
  removeButton.addEventListener("click", () => {
    row.remove();
    if (config.list.children.length === 0) {
      createArrayRow(name);
    }
  });

  row.append(input, removeButton);
  config.list.append(row);
  if (shouldFocus) {
    input.focus();
  }
}

function resetArrayFields() {
  Object.keys(arrayFieldConfigs).forEach((name) => {
    arrayFieldConfigs[name].list.textContent = "";
    createArrayRow(name, "", false);
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(new Error("The image could not be read.")));
    reader.readAsDataURL(file);
  });
}

async function imageUploadFromForm(formData, required = true) {
  const file = formData.get("imageFile");

  if (!(file instanceof File) || file.size === 0) {
    if (!required) return null;
    throw new Error("Upload a PNG image.");
  }

  if (file.type !== "image/png") {
    throw new Error("The app image must be a PNG file.");
  }

  const dataUrl = await readFileAsDataUrl(file);
  const [, contentBase64 = ""] = dataUrl.split(",");

  return {
    name: file.name,
    mimeType: file.type,
    contentBase64,
  };
}

function imageNameFromFileName(fileName) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-")
    .trim();
}

function setStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = `admin-status${type ? ` ${type}` : ""}`;
}

function setJsonStatus(message, type = "") {
  jsonStatus.textContent = message;
  jsonStatus.className = `admin-status${type ? ` ${type}` : ""}`;
}

function setAppListStatus(message, type = "") {
  appListStatus.textContent = message;
  appListStatus.className = `admin-status${type ? ` ${type}` : ""}`;
}

function setAppEditStatus(message, type = "") {
  appEditStatus.textContent = message;
  appEditStatus.className = `admin-status${type ? ` ${type}` : ""}`;
}

function adminSecret() {
  const secret = adminSecretInput.value.trim();
  if (!secret) {
    adminSecretInput.focus();
    throw new Error("Enter the admin secret in the Access section first.");
  }
  return secret;
}

function parsedJsonEditor() {
  let data;
  try {
    data = JSON.parse(jsonEditor.value);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error.message}`);
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("The JSON root must be an object.");
  }
  if (!Array.isArray(data.apps)) {
    throw new Error("The JSON must contain an apps array.");
  }
  return data;
}

function appFromForm(formData) {
  const prompt = arrayValues("prompt");
  const notes = arrayValues("notes");
  const AI = formData.get("AI").trim();

  const app = {
    date: formData.get("date").trim(),
    title: formData.get("title").trim(),
    platform: formData.get("platform").trim(),
    description: formData.get("description").trim(),
    notes,
  };

  const website = optionalUrl(formData.get("website"));
  const GitHub = optionalUrl(formData.get("GitHub"));
  const medium = optionalUrl(formData.get("medium"));
  if (AI) app.AI = AI;
  if (prompt.length > 0) app.prompt = prompt;
  if (website) app.website = website;
  if (GitHub) app.GitHub = GitHub;
  if (medium) app.medium = medium;

  return app;
}

function editArrayValues(name) {
  return Array.from(appEditForm.querySelectorAll(`[data-edit-array-input="${name}"]`))
    .map((input) => input.value.trim())
    .filter(Boolean);
}

function createEditArrayRow(name, value = "", shouldFocus = false) {
  const config = arrayFieldConfigs[name];
  const list = appEditForm.querySelector(`[data-edit-array-list="${name}"]`);
  const row = document.createElement("div");
  const input = document.createElement(config.multiline ? "textarea" : "input");
  const removeButton = document.createElement("button");

  row.className = "array-row";
  if (input instanceof HTMLInputElement) input.type = "text";
  else input.rows = 3;
  input.value = value;
  input.dataset.editArrayInput = name;
  input.placeholder = config.placeholder;

  removeButton.className = "array-remove";
  removeButton.type = "button";
  removeButton.textContent = "Remove";
  removeButton.setAttribute("aria-label", config.removeLabel);
  removeButton.addEventListener("click", () => {
    row.remove();
    if (list.children.length === 0) createEditArrayRow(name);
  });

  row.append(input, removeButton);
  list.append(row);
  if (shouldFocus) input.focus();
}

function fillEditArray(name, values) {
  const list = appEditForm.querySelector(`[data-edit-array-list="${name}"]`);
  list.textContent = "";
  (values.length ? values : [""]).forEach((value) => createEditArrayRow(name, value));
}

function appFromEditForm(formData) {
  const prompt = editArrayValues("prompt");
  const notes = editArrayValues("notes");
  const AI = formData.get("AI").trim();

  const app = {
    date: formData.get("date").trim(),
    title: formData.get("title").trim(),
    platform: formData.get("platform").trim(),
    description: formData.get("description").trim(),
    image: formData.get("image").trim(),
    notes,
  };
  const website = optionalUrl(formData.get("website"));
  const GitHub = optionalUrl(formData.get("GitHub"));
  const medium = optionalUrl(formData.get("medium"));
  if (AI) app.AI = AI;
  if (prompt.length > 0) app.prompt = prompt;
  if (website) app.website = website;
  if (GitHub) app.GitHub = GitHub;
  if (medium) app.medium = medium;
  return app;
}

function openAppEditor(index) {
  const app = appListData?.apps[index];
  if (!app) return;

  editingAppIndex = index;
  ["date", "title", "platform", "description", "image", "AI", "website", "GitHub", "medium"]
    .forEach((name) => {
      appEditForm.elements[name].value = app[name] || "";
    });
  fillEditArray("prompt", app.prompt || []);
  fillEditArray("notes", app.notes || []);
  editImageInput.value = "";
  editImagePreview.hidden = true;
  editImagePreviewImage.removeAttribute("src");
  editImagePreviewName.textContent = "";
  appEditTitle.textContent = `Edit: ${app.title}`;
  setAppEditStatus("");
  appEditForm.hidden = false;
  appEditForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeAppEditor() {
  editingAppIndex = -1;
  appEditForm.hidden = true;
  appEditForm.reset();
  setAppEditStatus("");
}

function renderAppList() {
  appAdminList.textContent = "";
  appListData.apps.forEach((app, index) => {
    const item = document.createElement("article");
    const image = document.createElement("img");
    const content = document.createElement("div");
    const meta = document.createElement("p");
    const title = document.createElement("h3");
    const description = document.createElement("p");
    const editButton = document.createElement("button");

    item.className = "app-admin-item";
    image.src = `assets/${encodeURIComponent(app.image)}.png`;
    image.alt = "";
    image.loading = "lazy";
    content.className = "app-admin-content";
    meta.className = "app-admin-meta";
    meta.textContent = `${app.date} · ${app.platform}`;
    title.textContent = app.title;
    description.textContent = app.description;
    editButton.className = "button app-item-edit";
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.setAttribute("aria-label", `Edit ${app.title}`);
    editButton.addEventListener("click", () => openAppEditor(index));

    content.append(meta, title, description);
    item.append(image, content, editButton);
    appAdminList.append(item);
  });
}

const dateInput = form.elements.date;
dateInput.value = localDateString();
resetArrayFields();

Object.entries(arrayFieldConfigs).forEach(([name, config]) => {
  config.addButton.addEventListener("click", () => createArrayRow(name));
});

appEditForm.querySelectorAll("[data-edit-array-add]").forEach((button) => {
  button.addEventListener("click", () => createEditArrayRow(button.dataset.editArrayAdd, "", true));
});

appEditCancelButton.addEventListener("click", closeAppEditor);

editImageInput.addEventListener("change", () => {
  const [file] = editImageInput.files;
  if (!file) {
    editImagePreview.hidden = true;
    editImagePreviewImage.removeAttribute("src");
    editImagePreviewName.textContent = "";
    return;
  }

  editImagePreviewImage.src = URL.createObjectURL(file);
  editImagePreviewName.textContent = file.name;
  editImagePreview.hidden = false;
});

appListLoadButton.addEventListener("click", async () => {
  appListLoadButton.disabled = true;
  setAppListStatus("Loading apps...");

  try {
    const response = await fetch("/api/apps", {
      headers: { "X-Admin-Secret": adminSecret() },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The app list could not be loaded.");

    appListData = result.data;
    appListSha = result.sha;
    closeAppEditor();
    renderAppList();
    setAppListStatus(`Loaded ${appListData.apps.length} apps.`, "success");
  } catch (error) {
    setAppListStatus(error.message, "error");
  } finally {
    appListLoadButton.disabled = false;
  }
});

appEditForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = appEditForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  setAppEditStatus("Saving app...");

  try {
    if (!appListData || editingAppIndex < 0) throw new Error("Load and select an app first.");
    const editFormData = new FormData(appEditForm);
    const updatedApp = appFromEditForm(editFormData);
    const imageFile = await imageUploadFromForm(editFormData, false);
    if (imageFile) updatedApp.image = imageNameFromFileName(imageFile.name);
    const updatedData = {
      ...appListData,
      apps: appListData.apps.map((app, index) => index === editingAppIndex ? updatedApp : app),
    };
    updatedData.apps.sort((a, b) => (
      a.date.localeCompare(b.date) || a.title.localeCompare(b.title)
    ));
    const response = await fetch("/api/apps", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Secret": adminSecret(),
      },
      body: JSON.stringify({ data: updatedData, sha: appListSha, imageFile }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The app could not be saved.");

    appListData = updatedData;
    appListSha = result.sha;
    renderAppList();
    closeAppEditor();
    setAppListStatus(`Updated "${updatedApp.title}". Commit: ${result.commit.sha.slice(0, 7)}`, "success");
  } catch (error) {
    setAppEditStatus(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
});

imageInput.addEventListener("change", () => {
  const [file] = imageInput.files;

  if (!file) {
    imagePreview.hidden = true;
    imagePreviewImage.removeAttribute("src");
    imagePreviewName.textContent = "";
    return;
  }

  imagePreviewImage.src = URL.createObjectURL(file);
  imagePreviewName.textContent = file.name;
  imagePreview.hidden = false;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const submitButton = form.querySelector("button[type='submit']");
  const formData = new FormData(form);

  submitButton.disabled = true;
  setStatus("Preparing image...");

  try {
    const secret = adminSecret();
    const app = appFromForm(formData);
    const imageFile = await imageUploadFromForm(formData);
    setStatus("Submitting app...");

    const response = await fetch("/api/apps", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Secret": secret,
      },
      body: JSON.stringify({ app, imageFile }),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "The app could not be saved.");
    }

    setStatus(`Added "${result.app.title}". Commit: ${result.commit.sha.slice(0, 7)}`, "success");
    form.reset();
    dateInput.value = localDateString();
    resetArrayFields();
    imagePreview.hidden = true;
    imagePreviewImage.removeAttribute("src");
    imagePreviewName.textContent = "";
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
});

jsonLoadButton.addEventListener("click", async () => {
  jsonLoadButton.disabled = true;
  setJsonStatus("Loading JSON...");

  try {
    const response = await fetch("/api/apps", {
      headers: { "X-Admin-Secret": adminSecret() },
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "The JSON file could not be loaded.");
    }

    jsonEditor.value = `${JSON.stringify(result.data, null, 2)}\n`;
    jsonFileSha = result.sha;
    jsonEditor.disabled = false;
    jsonFormatButton.disabled = false;
    jsonSaveButton.disabled = false;
    setJsonStatus(`Loaded ${result.data.apps.length} apps.`, "success");
  } catch (error) {
    setJsonStatus(error.message, "error");
  } finally {
    jsonLoadButton.disabled = false;
  }
});

jsonFormatButton.addEventListener("click", () => {
  try {
    const data = parsedJsonEditor();
    jsonEditor.value = `${JSON.stringify(data, null, 2)}\n`;
    setJsonStatus(`JSON is valid. ${data.apps.length} apps found.`, "success");
  } catch (error) {
    setJsonStatus(error.message, "error");
  }
});

jsonSaveButton.addEventListener("click", async () => {
  jsonSaveButton.disabled = true;
  setJsonStatus("Validating JSON...");

  try {
    const data = parsedJsonEditor();
    const response = await fetch("/api/apps", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Secret": adminSecret(),
      },
      body: JSON.stringify({ data, sha: jsonFileSha }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "The JSON file could not be saved.");
    }

    jsonFileSha = result.sha;
    jsonEditor.value = `${JSON.stringify(data, null, 2)}\n`;
    setJsonStatus(`Saved ${result.totalApps} apps. Commit: ${result.commit.sha.slice(0, 7)}`, "success");
  } catch (error) {
    setJsonStatus(error.message, "error");
  } finally {
    jsonSaveButton.disabled = false;
  }
});
