export const categories = [
  { id: "cpu", label: "Процессор", short: "CPU", source: 20 },
  { id: "gpu", label: "Видеокарта", short: "GPU", source: 23 },
  { id: "motherboard", label: "Материнская плата", short: "MB", source: 21 },
  { id: "ram", label: "Оперативная память", short: "RAM", source: 22 },
  { id: "storage", label: "Накопитель", short: "SSD", source: 41 },
  { id: "cooler", label: "Охлаждение", short: "FAN", source: 51 },
  { id: "psu", label: "Блок питания", short: "PSU", source: 25 },
  { id: "case", label: "Корпус", short: "CASE", source: 34 },
  { id: "phone", label: "Телефон", short: "PHONE", source: 0 },
] as const;
export type Category = (typeof categories)[number]["id"];
export type Side = "current" | "desired";
export type Device = "pc" | "phone";
export interface Offer {
  id: string;
  category: Category;
  name: string;
  price: number;
  currency: "AMD";
  url: string;
  image?: string;
  store: string;
  checkedAt: string;
  availability: "in-stock" | "out-of-stock" | "unknown";
}
export interface Part {
  name: string;
  notes: string;
  price?: number;
  url?: string;
  offer?: Offer;
}
export interface Project {
  id: string;
  name: string;
  device: Device;
  demo: boolean;
  budget: number;
  current: Partial<Record<Category, Part>>;
  desired: Partial<Record<Category, Part>>;
}
export interface Workspace {
  version: 1;
  activeId: string;
  theme: "dark" | "light";
  projects: Project[];
}
export interface CatalogResponse {
  offers: Offer[];
  checkedAt: string;
  stale?: boolean;
  error?: string;
}
export const money = (value: number) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value) +
  " ֏";
export const demoProject = (device: Device): Project => ({
  id: crypto.randomUUID(),
  name: device === "pc" ? "Моя следующая сборка" : "Следующий телефон",
  device,
  demo: true,
  budget: device === "pc" ? 800000 : 450000,
  current:
    device === "pc"
      ? {
          cpu: { name: "AMD Ryzen 5 5600X", notes: "Мой процессор" },
          gpu: { name: "GeForce RTX 3060", notes: "12 ГБ" },
          motherboard: { name: "MSI B550-A PRO", notes: "AM4" },
          ram: { name: "Kingston Fury Beast", notes: "16 ГБ · DDR4" },
          storage: { name: "Samsung 970 EVO Plus", notes: "500 ГБ" },
          cooler: { name: "DeepCool AK400", notes: "Воздушное охлаждение" },
          psu: { name: "Corsair CX650", notes: "650 Вт" },
          case: { name: "NZXT H510", notes: "Чёрный" },
        }
      : { phone: { name: "iPhone 13", notes: "128 ГБ · Midnight" } },
  desired:
    device === "pc"
      ? {
          cpu: {
            name: "AMD Ryzen 7 9700X",
            notes: "Подберите предложение в магазине",
          },
          gpu: {
            name: "GeForce RTX 5070",
            notes: "Подберите предложение в магазине",
          },
          ram: { name: "Kingston Fury Beast", notes: "32 ГБ · DDR5" },
        }
      : {
          phone: {
            name: "iPhone 16, 128 GB, Pink",
            notes: "Подберите предложение в магазине",
          },
        },
});
export function initialWorkspace(): Workspace {
  const pc = demoProject("pc"),
    phone = demoProject("phone");
  return { version: 1, activeId: pc.id, theme: "dark", projects: [pc, phone] };
}
export function blankProject(device: Device): Project {
  return {
    id: crypto.randomUUID(),
    name: device === "pc" ? "Новая сборка" : "Новый телефон",
    device,
    demo: false,
    budget: 0,
    current: {},
    desired: {},
  };
}
export const safeUrl = (value?: string) => {
  if (!value) return undefined;
  try {
    const u = new URL(value);
    return u.protocol === "https:" ? u.href : undefined;
  } catch {
    return undefined;
  }
};
export function validateWorkspace(value: unknown): value is Workspace {
  if (!value || typeof value !== "object") return false;
  const w = value as Workspace;
  if (
    w.version !== 1 ||
    !["dark", "light"].includes(w.theme) ||
    !Array.isArray(w.projects) ||
    !w.projects.length ||
    w.projects.length > 50
  )
    return false;
  const ids = new Set<string>();
  for (const p of w.projects) {
    if (
      !p ||
      typeof p.id !== "string" ||
      ids.has(p.id) ||
      typeof p.name !== "string" ||
      p.name.length > 100 ||
      !["pc", "phone"].includes(p.device) ||
      typeof p.demo !== "boolean"
    )
      return false;
    ids.add(p.id);
    if (
      typeof p.budget !== "number" ||
      !Number.isFinite(p.budget) ||
      p.budget < 0 ||
      p.budget > 1e10
    )
      return false;
    for (const side of ["current", "desired"] as Side[]) {
      if (!p[side] || typeof p[side] !== "object" || Array.isArray(p[side]))
        return false;
      for (const [key, part] of Object.entries(p[side])) {
        if (
          !categories.some((c) => c.id === key) ||
          !part ||
          typeof part.name !== "string" ||
          part.name.length > 250 ||
          typeof part.notes !== "string" ||
          part.notes.length > 1000
        )
          return false;
        if (
          part.price !== undefined &&
          (typeof part.price !== "number" ||
            !Number.isFinite(part.price) ||
            part.price < 0 ||
            part.price > 1e10)
        )
          return false;
        if (
          part.url !== undefined &&
          (typeof part.url !== "string" || !safeUrl(part.url))
        )
          return false;
        const o = part.offer;
        if (
          o &&
          (typeof o !== "object" ||
            o.category !== key ||
            typeof o.id !== "string" ||
            typeof o.name !== "string" ||
            typeof o.store !== "string" ||
            o.currency !== "AMD" ||
            typeof o.price !== "number" ||
            !Number.isFinite(o.price) ||
            o.price <= 0 ||
            o.price > 1e10 ||
            !safeUrl(o.url) ||
            !["in-stock", "out-of-stock", "unknown"].includes(o.availability) ||
            typeof o.checkedAt !== "string" ||
            !Number.isFinite(Date.parse(o.checkedAt)))
        )
          return false;
      }
    }
  }
  return ids.has(w.activeId);
}
