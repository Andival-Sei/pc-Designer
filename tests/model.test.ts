import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initialWorkspace,
  safeUrl,
  validateWorkspace,
} from "../src/lib/model.js";
test("backup round-trip preserves projects and defaults to dark", () => {
  const w = initialWorkspace();
  assert.equal(w.theme, "dark");
  assert.ok(validateWorkspace(JSON.parse(JSON.stringify(w))));
  assert.equal(w.projects.length, 2);
});
test("import rejects malformed budgets, duplicate IDs, unsafe links, and missing active project", () => {
  const w = initialWorkspace();
  const invalid = [
    { ...w, activeId: "missing" },
    { ...w, projects: [w.projects[0], w.projects[0]] },
    { ...w, projects: [{ ...w.projects[0], budget: -5 }] },
    { ...w, projects: [{ ...w.projects[0], budget: "100000" }] },
    {
      ...w,
      projects: [
        {
          ...w.projects[0],
          desired: {
            cpu: { name: "x", notes: "", url: "javascript:alert(1)" },
          },
        },
      ],
    },
  ];
  for (const data of invalid) assert.equal(validateWorkspace(data), false);
  assert.equal(safeUrl("javascript:alert(1)"), undefined);
  assert.equal(safeUrl("https://www.mtech.am/"), "https://www.mtech.am/");
});
