import assert from "node:assert/strict";
import { test } from "node:test";

import { MAX_TITLE_LENGTH, infoText, isValidTitle, normalizeTitle, statusText } from "../static/utils.js";

test("normalizeTitle прибирає пробіли по краях", () => {
  assert.equal(normalizeTitle("  Задача  "), "Задача");
  assert.equal(normalizeTitle(undefined), "");
});

test("isValidTitle відхиляє порожню назву", () => {
  assert.equal(isValidTitle(""), false);
  assert.equal(isValidTitle("   "), false);
});

test("isValidTitle перевіряє максимальну довжину", () => {
  assert.equal(isValidTitle("a".repeat(MAX_TITLE_LENGTH)), true);
  assert.equal(isValidTitle("a".repeat(MAX_TITLE_LENGTH + 1)), false);
});

test("infoText показує версію та под", () => {
  assert.equal(infoText({ version: "1.0.0", pod: "backend-abc" }), "Версія 1.0.0 · под backend-abc");
  assert.equal(infoText(null), "");
});

test("statusText показує кількість задач і виконаних", () => {
  const tasks = [{ done: true }, { done: false }, { done: true }];
  assert.equal(statusText(tasks), "Задач: 3 · виконано: 2 · бекенд працює");
  assert.equal(statusText([]), "Задач: 0 · виконано: 0 · бекенд працює");
});
