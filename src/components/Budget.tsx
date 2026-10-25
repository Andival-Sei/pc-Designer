import {
  ArrowUpRight,
  Info,
  Wallet,
  Pencil,
  RefreshCw,
  MapPin,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { money } from "../lib/model";
import type { Project, Category } from "../lib/model";
export function Budget({
  project,
  onEditBudget,
  onRefresh,
  refreshing,
  priceMessage,
  onBrowse,
}: {
  project: Project;
  onEditBudget: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  priceMessage: string;
  onBrowse: (c: Category) => void;
}) {
  const parts = Object.values(project.desired),
    priced = parts.filter((p) => p.offer || p.price !== undefined);
  const total = priced.reduce(
      (sum, p) => sum + (p.offer?.price ?? p.price ?? 0),
      0,
    ),
    cost = total;
  const complete = parts.length > 0 && priced.length === parts.length;
  const ratio = project.budget
    ? Math.min(100, (cost / project.budget) * 100)
    : 0;
  const over = project.budget > 0 && cost > project.budget;
  return (
    <aside className="sidebar">
      <section className="budget-card">
        <div className="panel-title">
          <span>
            <Wallet size={18} />
            План покупки
          </span>
          <button
            className="icon-button"
            aria-label="Изменить бюджет"
            onClick={onEditBudget}
          >
            <Pencil size={15} />
          </button>
        </div>
        <span className="total-label">
          {complete ? "Стоимость желаемого" : "Известная стоимость"}
        </span>
        <div className="total-price">
          {priced.length ? money(total) : <span>Пока без цены</span>}
        </div>
        <div className="price-completeness">
          {priced.length} из {parts.length} позиций с ценой
        </div>
        <div className="budget-limit">
          <span>Мой бюджет</span>
          <button className="text-button" onClick={onEditBudget}>
            {project.budget ? money(project.budget) : "Указать"}
            <Pencil size={12} />
          </button>
        </div>
        <div className={`progress-track ${over ? "over" : ""}`}>
          <div style={{ width: `${ratio}%` }} />
        </div>
        <p className={`budget-caption ${over ? "danger" : ""}`}>
          {!project.budget
            ? "Укажите бюджет, чтобы видеть остаток"
            : over
              ? `Выше бюджета на ${money(cost - project.budget)}`
              : priced.length
                ? `В запасе ${money(project.budget - cost)}${complete ? "" : " до добавления остальных цен"}`
                : "Добавьте цены, чтобы рассчитать покупку"}
        </p>
        <button
          className="button full-width"
          onClick={onRefresh}
          disabled={refreshing || !parts.some((p) => p.offer)}
        >
          <RefreshCw size={16} className={refreshing ? "spin" : ""} />
          {refreshing ? "Проверяем цены…" : "Обновить цены"}
        </button>
        {priceMessage && (
          <p className="refresh-message" role="status">
            {priceMessage}
          </p>
        )}
        <p className="fine-print">
          <Info size={13} />
          Стоимость без возможной доставки. Цены вручную обновляются вами.
        </p>
      </section>
      <section className="stores-panel">
        <div className="panel-title">
          <span>
            <MapPin size={17} />
            Покупаем в Армении
          </span>
          <span className="country-flag" aria-label="Армения">
            <i />
            <i />
            <i />
          </span>
        </div>
        <p>Местные предложения. Без пересчёта валют и догадок о доставке.</p>
        <button
          className="store-item"
          onClick={() => onBrowse(project.device === "phone" ? "phone" : "cpu")}
        >
          <span className="store-logo">
            {project.device === "phone" ? "iS" : "m."}
          </span>
          <span>
            <strong>{project.device === "phone" ? "iSpace" : "Mtech"}</strong>
            <small>
              {project.device === "phone"
                ? "Телефоны Apple"
                : "Комплектующие для ПК"}
            </small>
          </span>
          <ArrowUpRight size={18} />
        </button>
        <a
          className="store-direct"
          href={
            project.device === "phone"
              ? "https://ispace.am/en"
              : "https://www.mtech.am/en_us"
          }
          target="_blank"
          rel="noreferrer"
        >
          Сайт магазина
          <ExternalLink size={12} />
        </a>
        <p className="source-note">
          {project.device === "phone"
            ? "Android и другие магазины: добавьте свою ссылку и цену."
            : "Каталог не полный. Можно добавить любую деталь и ссылку вручную."}
        </p>
      </section>
      <div className="privacy-note">
        <ShieldCheck size={20} />
        <p>
          <strong>Ваше пространство</strong>Сборки хранятся в этом браузере.
          Экспортируйте копию перед очисткой данных.
        </p>
      </div>
    </aside>
  );
}
