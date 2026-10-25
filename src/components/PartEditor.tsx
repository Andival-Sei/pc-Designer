import { useEffect, useState } from "react";
import {
  ExternalLink,
  Plus,
  Search,
  RefreshCw,
  MapPin,
  PencilLine,
  Check,
} from "lucide-react";
import { categories, money, safeUrl } from "../lib/model";
import type {
  Category,
  Part,
  Offer,
  CatalogResponse,
  Side,
} from "../lib/model";
import { Dialog } from "./Dialog";
export function PartEditor({
  category,
  side,
  part,
  onSave,
  onRemove,
  onClose,
}: {
  category: Category;
  side: Side;
  part?: Part;
  onSave: (p: Part) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"catalog" | "manual">(
    side === "desired" ? "catalog" : "manual",
  );
  const [search, setSearch] = useState(""),
    [data, setData] = useState<CatalogResponse>(),
    [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0),
    [error, setError] = useState("");
  const [name, setName] = useState(part?.name || ""),
    [notes, setNotes] = useState(part?.notes || "");
  const [price, setPrice] = useState(
      part?.price !== undefined ? String(part.price) : "",
    ),
    [url, setUrl] = useState(part?.url || "");
  const [stockOnly, setStockOnly] = useState(false);
  useEffect(() => {
    if (tab !== "catalog") return;
    const controller = new AbortController();
    setLoading(true);
    setData(undefined);
    fetch(`/api/catalog?category=${category}`, { signal: controller.signal })
      .then(async (r) => {
        const body = await r.json();
        setData(body);
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setData({
            offers: [],
            checkedAt: "",
            error:
              "Не удалось подключиться. Проверьте интернет и повторите попытку.",
          });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [category, tab, attempt]);
  const offers = (data?.offers || [])
    .filter(
      (o) =>
        search
          .toLowerCase()
          .split(/\s+/)
          .every((q) => o.name.toLowerCase().includes(q)) &&
        (!stockOnly || o.availability === "in-stock"),
    )
    .sort((a, b) => a.price - b.price);
  const choose = (offer: Offer) => {
    onSave({ name: offer.name, notes: "", offer });
    onClose();
  };
  return (
    <Dialog
      title={`${side === "current" ? "Сейчас" : "Хочу"} · ${categories.find((c) => c.id === category)?.label}`}
      onClose={onClose}
      wide
    >
      <div className="editor-tabs">
        <button
          className={tab === "catalog" ? "selected" : ""}
          onClick={() => setTab("catalog")}
        >
          <Search size={16} />
          Предложения магазинов
        </button>
        <button
          className={tab === "manual" ? "selected" : ""}
          onClick={() => setTab("manual")}
        >
          <PencilLine size={16} />
          Добавить вручную
        </button>
      </div>
      {tab === "catalog" ? (
        <>
          <div className="catalog-intro">
            <MapPin size={16} />
            <span>Армения · цены в AMD</span>
            <span>{category === "phone" ? "iSpace · iPhone" : "Mtech"}</span>
          </div>
          <label className="search-field">
            <Search size={19} />
            <input
              aria-label="Поиск в каталоге"
              placeholder={
                category === "phone"
                  ? "Например, iPhone 16 128"
                  : "Модель или бренд…"
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </label>
          <div className="catalog-meta">
            <span>
              {loading
                ? "Получаем цены из магазина…"
                : `${offers.length} предложений`}
            </span>
            {category === "phone" && (
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={stockOnly}
                  onChange={(e) => setStockOnly(e.target.checked)}
                />
                Только в наличии
              </label>
            )}
            <button
              className="text-button"
              onClick={() => setAttempt((a) => a + 1)}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? "spin" : ""} />
              Обновить
            </button>
          </div>
          {data?.error && (
            <p className="notice warning" role="status">
              {data.error}
            </p>
          )}
          <div className="catalog-list" aria-busy={loading}>
            {loading
              ? Array.from({ length: 4 }, (_, i) => (
                  <div className="catalog-skeleton" key={i}>
                    <div />
                    <div />
                    <div />
                  </div>
                ))
              : offers.map((o) => (
                  <article className="offer-row" key={o.id}>
                    <div className="offer-image">
                      {o.image && (
                        <img
                          src={o.image}
                          alt=""
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.style.visibility = "hidden";
                          }}
                        />
                      )}
                    </div>
                    <div className="offer-info">
                      <h3>{o.name}</h3>
                      <p>
                        {o.store}
                        <span
                          className={
                            o.availability === "in-stock" ? "stock" : ""
                          }
                        >
                          {o.availability === "in-stock"
                            ? "В наличии"
                            : o.availability === "out-of-stock"
                              ? "Нет в наличии"
                              : "Наличие уточняйте"}
                        </span>
                      </p>
                      <a href={o.url} target="_blank" rel="noreferrer">
                        Проверить в магазине <ExternalLink size={11} />
                      </a>
                      <time className="price-time" dateTime={o.checkedAt}>
                        {o.origin === "index" ? "Индекс" : "Магазин"} ·{" "}
                        {new Date(o.checkedAt).toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                    <div className="offer-action">
                      <strong>{money(o.price)}</strong>
                      <button
                        className="button compact"
                        onClick={() => choose(o)}
                      >
                        <Plus size={15} />
                        Выбрать
                      </button>
                    </div>
                  </article>
                ))}
            {!loading && !offers.length && (
              <div className="empty-search">
                <Search size={28} />
                <h3>Предложений не найдено</h3>
                <p>
                  Попробуйте другое название или добавьте устройство вручную.
                </p>
                <button
                  className="button secondary"
                  onClick={() => setTab("manual")}
                >
                  Добавить вручную
                </button>
              </div>
            )}
          </div>
          <p className="editor-footnote">
            {category === "phone"
              ? "Автоматические цены пока доступны для iPhone. Android и другие модели можно добавить вручную."
              : "Показаны товары с первой страницы категории Mtech. Другие модели и магазины можно добавить вручную."}{" "}
            {data?.checkedAt &&
              `Проверено ${new Date(data.checkedAt).toLocaleString("ru-RU")}.`}{" "}
            Цена и наличие могут измениться.
          </p>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (url && !safeUrl(url)) {
              setError("Укажите полную ссылку, которая начинается с https://");
              return;
            }
            onSave({
              name: name.trim(),
              notes: notes.trim(),
              ...(price !== "" ? { price: Number(price) } : {}),
              ...(url ? { url: safeUrl(url) } : {}),
            });
            onClose();
          }}
        >
          <div className="form-grid">
            <label className="full">
              Модель
              <input
                required
                maxLength={250}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  category === "phone"
                    ? "Samsung Galaxy S25"
                    : "Название комплектующего"
                }
              />
            </label>
            <label className="full">
              Характеристики или заметка
              <textarea
                maxLength={1000}
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Объём памяти, цвет, важные детали…"
              />
            </label>
            <label>
              Цена, ֏
              <input
                type="number"
                min="0"
                max="10000000000"
                step="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Необязательно"
              />
            </label>
            <label>
              Ссылка на магазин
              <input
                type="url"
                maxLength={2000}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
              />
            </label>
          </div>
          <p className="editor-footnote">
            Цена, добавленная вручную, не обновляется автоматически. Для текущей
            техники это справочная стоимость, а не оценка продажи.
          </p>
          {error && (
            <p role="alert" className="notice warning">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            {part && (
              <button
                type="button"
                className="text-button danger"
                onClick={() => {
                  onRemove();
                  onClose();
                }}
              >
                Удалить позицию
              </button>
            )}
            <button type="submit" className="button">
              <Check size={17} />
              Сохранить
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
