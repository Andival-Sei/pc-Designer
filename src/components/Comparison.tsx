import {
  Cpu,
  CircuitBoard,
  MemoryStick,
  HardDrive,
  Fan,
  Zap,
  Box,
  Smartphone,
  Plus,
  Pencil,
  ArrowRight,
  Monitor,
  Layers,
  ExternalLink,
} from "lucide-react";
import { categories, money, safeUrl } from "../lib/model";
import type { Category, Part, Project, Side } from "../lib/model";
const categoryIcons = {
  cpu: Cpu,
  gpu: Monitor,
  motherboard: CircuitBoard,
  ram: MemoryStick,
  storage: HardDrive,
  cooler: Fan,
  psu: Zap,
  case: Box,
  phone: Smartphone,
};
function PartCell({
  part,
  side,
  label,
  onEdit,
}: {
  part?: Part;
  side: Side;
  label: string;
  onEdit: () => void;
}) {
  const o = part?.offer,
    amount = o?.price ?? part?.price;
  const age = o ? Date.now() - Date.parse(o.checkedAt) : 0;
  return (
    <div className={`part-cell ${side} ${!part ? "empty" : ""}`}>
      <button
        className="part-edit"
        onClick={onEdit}
        aria-label={`${part ? "Изменить" : "Добавить"}: ${label}, ${side === "current" ? "сейчас" : "хочу"}`}
      >
        {part ? (
          <>
            <div className="part-name">{part.name}</div>
            <div className="part-notes">
              {part.notes ||
                (o
                  ? `${o.store} · ${o.availability === "in-stock" ? "в наличии" : o.availability === "out-of-stock" ? "нет в наличии" : "наличие уточняйте"}`
                  : "Добавлено вручную")}
            </div>
          </>
        ) : (
          <span>
            <Plus size={16} />
            {label === "Телефон"
              ? side === "current"
                ? "Указать телефон"
                : "Выбрать телефон"
              : side === "current"
                ? "Указать комплектующее"
                : "Выбрать комплектующее"}
          </span>
        )}
        {part ? <Pencil className="edit-hint" size={14} /> : null}
      </button>
      {part && (
        <div className="part-price">
          {amount !== undefined ? (
            <strong>{money(amount)}</strong>
          ) : (
            <span>Цена не указана</span>
          )}
          {o ? (
            <span
              className={age > 24 * 3600000 ? "price-old" : "price-source"}
              title={`Проверено ${new Date(o.checkedAt).toLocaleString("ru-RU")}`}
            >
              {age > 24 * 3600000 ? "Старая цена" : o.origin === "index" ? "Из индекса" : "Цена магазина"}
            </span>
          ) : amount !== undefined ? (
            <span className="price-source">Вручную</span>
          ) : null}
          {safeUrl(o?.url || part.url) && (
            <a
              href={safeUrl(o?.url || part.url)}
              target="_blank"
              rel="noreferrer"
              aria-label={`Открыть ${part.name} в магазине`}
            >
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      )}
      {o && <time className="price-time" dateTime={o.checkedAt}>Проверено {new Date(o.checkedAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</time>}
    </div>
  );
}
export function Comparison({
  project,
  mobileSide,
  onMobileSide,
  onEdit,
}: {
  project: Project;
  mobileSide: Side;
  onMobileSide: (s: Side) => void;
  onEdit: (c: Category, s: Side) => void;
}) {
  const list = categories.filter((c) =>
    project.device === "pc" ? c.id !== "phone" : c.id === "phone",
  );
  const count = Object.keys(project.desired).length;
  return (
    <section
      className={`comparison mobile-${mobileSide} ${project.device === "phone" ? "phone-comparison" : ""}`}
      aria-label="Сравнение устройств"
    >
      <div className="comparison-intro">
        <div>
          <span className="section-label">
            <Layers size={15} />
            {project.device === "pc" ? "Конфигурация" : "Сравнение телефонов"}
          </span>
          <h2>
            Всё начинается
            <br />с хорошего плана.
          </h2>
          <p>Оставьте лучшее. Обновите остальное.</p>
        </div>
        <div className="rig-art" aria-hidden="true">
          {project.device === "pc" ? (
            <>
              <div className="rig-body">
                <div className="rig-fans">
                  <span />
                  <span />
                </div>
                <div className="rig-board">
                  <Cpu size={33} />
                </div>
                <div className="rig-gpu" />
                <div className="rig-base" />
              </div>
              <div className="rig-floor" />
            </>
          ) : (
            <>
              <div className="phone-art">
                <span />
                <Smartphone size={62} strokeWidth={1} />
              </div>
              <div className="phone-art second">
                <span />
              </div>
            </>
          )}
        </div>
      </div>
      <div className="mobile-side-switch">
        <button
          onClick={() => onMobileSide("current")}
          className={mobileSide === "current" ? "selected" : ""}
        >
          Сейчас
        </button>
        <button
          onClick={() => onMobileSide("desired")}
          className={mobileSide === "desired" ? "selected" : ""}
        >
          Хочу <ArrowRight size={14} />
        </button>
      </div>
      <div className="comparison-head">
        <div className="category-head">
          {project.device === "pc" ? "Компонент" : "Устройство"}
        </div>
        <div className="current">
          <span className="column-dot" />
          <h3>У меня сейчас</h3>
          <span className="column-caption">Отправная точка</span>
        </div>
        <div className="desired">
          <span className="column-dot" />
          <h3>Хочу обновить</h3>
          <span className="column-caption">
            {count}{" "}
            {project.device === "pc" ? "из 8 компонентов" : "из 1 устройства"}
          </span>
        </div>
      </div>
      <div className="comparison-rows">
        {list.map((c) => {
          const Icon = categoryIcons[c.id];
          const same =
            project.current[c.id]?.name &&
            project.current[c.id]?.name === project.desired[c.id]?.name;
          return (
            <div
              className={`comparison-row ${same ? "unchanged" : ""}`}
              key={c.id}
            >
              <div className="category-cell">
                <span className="category-icon">
                  <Icon size={20} strokeWidth={1.6} />
                </span>
                <div>
                  <span>{c.label}</span>
                  <small>{c.short}</small>
                </div>
              </div>
              <PartCell
                part={project.current[c.id]}
                side="current"
                label={c.label}
                onEdit={() => onEdit(c.id, "current")}
              />
              <PartCell
                part={project.desired[c.id]}
                side="desired"
                label={c.label}
                onEdit={() => onEdit(c.id, "desired")}
              />
            </div>
          );
        })}
      </div>
      <div className="comparison-footer">
        <span>
          <span className="legend-dot" />
          {project.device === "pc"
            ? "Каждый компонент можно изменить"
            : "Любую модель можно добавить вручную"}
        </span>
        <span>Цены в армянских драмах</span>
      </div>
    </section>
  );
}
