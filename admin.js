const form = document.querySelector("#app-form");
const statusMessage = document.querySelector("#admin-status");

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
    image: formData.get("image").trim(),
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

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const submitButton = form.querySelector("button[type='submit']");
  const formData = new FormData(form);
  const adminSecret = formData.get("adminSecret").trim();
  const app = appFromForm(formData);

  submitButton.disabled = true;
  setStatus("Submitting app...");

  try {
    const response = await fetch("/api/apps", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Secret": adminSecret,
      },
      body: JSON.stringify({ app }),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "The app could not be saved.");
    }

    setStatus(`Added "${result.app.title}". Commit: ${result.commit.sha.slice(0, 7)}`, "success");
    form.reset();
    dateInput.value = localDateString();
  } catch (error) {
    setStatus(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
});
