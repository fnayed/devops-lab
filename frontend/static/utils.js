// Чисті функції без доступу до DOM — їх легко тестувати в Node.js

export const MAX_TITLE_LENGTH = 200;

export function normalizeTitle(raw) {
  return String(raw ?? "").trim();
}

export function isValidTitle(raw) {
  const title = normalizeTitle(raw);
  return title.length > 0 && title.length <= MAX_TITLE_LENGTH;
}

export function statusText(count) {
  return `Задач: ${count} · бекенд працює`;
}

// Рядок «версія · под» — щоб у Kubernetes було видно, який под відповів
export function infoText(info) {
  if (!info) return "";
  return `Версія ${info.version} · под ${info.pod}`;
}
