import { infoText, isValidTitle, normalizeTitle, statusText } from "./utils.js";

const list = document.getElementById("list");
const form = document.getElementById("form");
const titleInput = document.getElementById("title");
const statusEl = document.getElementById("status");
const infoEl = document.getElementById("info");

async function api(path, options = {}) {
  const res = await fetch("/api" + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(res.status);
  return res.status === 204 ? null : res.json();
}

async function load() {
  try {
    const tasks = await api("/tasks");
    list.innerHTML = "";
    for (const t of tasks) {
      const li = document.createElement("li");
      if (t.done) li.className = "done";

      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = t.done;
      box.onchange = () => api(`/tasks/${t.id}`, { method: "PATCH", body: JSON.stringify({ done: box.checked }) }).then(load);

      const text = document.createElement("span");
      text.textContent = t.title;

      const del = document.createElement("button");
      del.textContent = "Видалити";
      del.onclick = () => api(`/tasks/${t.id}`, { method: "DELETE" }).then(load);

      li.append(box, text, del);
      list.append(li);
    }
    statusEl.textContent = statusText(tasks);
    infoEl.textContent = infoText(await api("/info"));
  } catch (e) {
    statusEl.textContent = "Бекенд недоступний: " + e.message;
  }
}

form.onsubmit = async (e) => {
  e.preventDefault();
  if (!isValidTitle(titleInput.value)) return;
  await api("/tasks", { method: "POST", body: JSON.stringify({ title: normalizeTitle(titleInput.value) }) });
  titleInput.value = "";
  load();
};

load();
