import assert from "node:assert/strict";
import { test } from "node:test";

import { MAX_TITLE_LENGTH, isValidTitle, normalizeTitle, statusText } from "../static/utils.js";

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

test("statusText показує кількість задач", () => {
  assert.equal(statusText(3), "Задач: 3 · бекенд працює");
});
