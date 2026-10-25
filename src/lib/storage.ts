import { initialWorkspace, validateWorkspace } from "./model";
import type { Workspace } from "./model";
export const STORAGE_KEY = "next-rig.workspace.v1";
export function loadWorkspace(): { workspace: Workspace; error?: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { workspace: initialWorkspace() };
    const data: unknown = JSON.parse(raw);
    if (!validateWorkspace(data)) throw new Error("invalid");
    return { workspace: data };
  } catch {
    return {
      workspace: initialWorkspace(),
      error:
        "Не удалось прочитать сохранение. Автосохранение отключено, исходные данные не перезаписаны. Восстановите проекты через импорт резервной копии.",
    };
  }
}
export function downloadWorkspace(workspace: Workspace) {
  const blob = new Blob([JSON.stringify(workspace, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "next-rig-backup.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
