const form = document.querySelector("#app-form");
const statusMessage = document.querySelector("#admin-status");
const imageInput = form.elements.imageFile;
const imagePreview = document.querySelector("#image-preview");
const imagePreviewImage = imagePreview.querySelector("img");
const imagePreviewName = imagePreview.querySelector("span");

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function linesFrom(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function optionalUrl(value) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(new Error("The image could not be read.")));
    reader.readAsDataURL(file);
  });
}

async function imageUploadFromForm(formData) {
  const file = formData.get("imageFile");

  if (!(file instanceof File) || file.size === 0) {
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

function setStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = `admin-status${type ? ` ${type}` : ""}`;
}

function appFromForm(formData) {
  const app = {
    date: formData.get("date").trim(),
    title: formData.get("title").trim(),
    platform: formData.get("platform").trim(),
    description: formData.get("description").trim(),
    AI: formData.get("AI").trim(),
    prompt: linesFrom(formData.get("prompt")),
    notes: linesFrom(formData.get("notes")),
  };

  const website = optionalUrl(formData.get("website"));
  const GitHub = optionalUrl(formData.get("GitHub"));
  if (website) app.website = website;
  if (GitHub) app.GitHub = GitHub;

  return app;
}

const dateInput = form.elements.date;
dateInput.value = localDateString();

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
  const adminSecret = formData.get("adminSecret").trim();
  const app = appFromForm(formData);

  submitButton.disabled = true;
  setStatus("Preparing image...");

  try {
    const imageFile = await imageUploadFromForm(formData);
    setStatus("Submitting app...");

    const response = await fetch("/api/apps", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Secret": adminSecret,
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
    imagePreview.hidden = true;
    imagePreviewImage.removeAttribute("src");
    imagePreviewName.textContent = "";
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
});
