import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleHelp,
  Copy,
  Monitor,
  Moon,
  MoreHorizontal,
  Plus,
  Smartphone,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { blankProject, validateWorkspace } from "./lib/model";
import type {
  Category,
  CatalogResponse,
  Device,
  Part,
  Project,
  Side,
} from "./lib/model";
import { downloadWorkspace, loadWorkspace, STORAGE_KEY } from "./lib/storage";
import { Comparison } from "./components/Comparison";
import { Budget } from "./components/Budget";
import { PartEditor } from "./components/PartEditor";
import { Dialog } from "./components/Dialog";
import "./App.css";

export default function App() {
  const [loaded] = useState(loadWorkspace);
  const [workspace, setWorkspace] = useState(loaded.workspace);
  const [saveError, setSaveError] = useState(loaded.error || "");
  const saveBlocked = useRef(Boolean(loaded.error));
  const [editor, setEditor] = useState<{ category: Category; side: Side }>();
  const [modal, setModal] = useState<
    "budget" | "help" | "new" | "rename" | "delete" | "share"
  >();
  const [mobileSide, setMobileSide] = useState<Side>("desired");
  const [notice, setNotice] = useState(""),
    [refreshing, setRefreshing] = useState(false),
    [priceMessage, setPriceMessage] = useState("");
  const [projectMenu, setProjectMenu] = useState(false),
    [actionsMenu, setActionsMenu] = useState(false);
  const [shared, setShared] = useState<Project>();
  const fileInput = useRef<HTMLInputElement>(null);
  const project =
    workspace.projects.find((p) => p.id === workspace.activeId) ||
    workspace.projects[0];
  useEffect(() => {
    document.documentElement.dataset.theme = workspace.theme;
    if (saveBlocked.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
      setSaveError("");
    } catch {
      setSaveError(
        "Не удалось сохранить в браузере. Экспортируйте резервную копию, чтобы не потерять изменения.",
      );
    }
  }, [workspace]);
  useEffect(() => {
    const listener = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const value = JSON.parse(e.newValue);
          if (validateWorkspace(value)) {
            setWorkspace(value);
            setNotice("Сборки обновлены из другой вкладки");
          }
        } catch {
          /* preserve current data */
        }
      }
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    setPriceMessage("");
    setProjectMenu(false);
    setActionsMenu(false);
  }, [project.id]);
  useEffect(() => {
    if (!location.hash.startsWith("#build=")) return;
    try {
      const encoded = location.hash.slice(7);
      if (encoded.length > 60000) throw new Error("too large");
      const p = JSON.parse(
        new TextDecoder().decode(
          Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)),
        ),
      ) as Project;
      if (
        !validateWorkspace({
          version: 1,
          theme: "dark",
          activeId: p.id,
          projects: [p],
        })
      )
        throw new Error("invalid");
      setShared(p);
    } catch {
      setNotice("Ссылка на сборку повреждена. Попросите отправить её ещё раз.");
    }
    history.replaceState(null, "", location.pathname + location.search);
  }, []);
  const updateProject = (fn: (p: Project) => Project) =>
    setWorkspace((w) => ({
      ...w,
      projects: w.projects.map((p) => (p.id === project.id ? fn(p) : p)),
    }));
  const savePart = (part: Part) => {
    if (editor)
      updateProject((p) => ({
        ...p,
        [editor.side]: { ...p[editor.side], [editor.category]: part },
      }));
    setNotice("Изменения сохранены");
  };
  const addProject = (p: Project) => {
    if (workspace.projects.length >= 50) {
      setNotice(
        "Можно хранить до 50 проектов. Экспортируйте и удалите лишние.",
      );
      return;
    }
    setWorkspace((w) => ({
      ...w,
      activeId: p.id,
      projects: [...w.projects, p],
    }));
    setModal(undefined);
  };
  const switchDevice = (device: Device) => {
    const found = workspace.projects.find((p) => p.device === device);
    if (found) setWorkspace((w) => ({ ...w, activeId: found.id }));
    else addProject(blankProject(device));
  };
  const refreshPrices = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setPriceMessage("");
    const id = project.id,
      entries = Object.entries(project.desired).filter(([, p]) => p.offer);
    let updated = 0,
      failed = 0,
      indexed = 0;
    const updates: Partial<Record<Category, Part>> = {};
    await Promise.all(
      entries.map(async ([category, part]) => {
        try {
          const r = await fetch(`/api/catalog?category=${category}`),
            data: CatalogResponse = await r.json();
          const offer = data.offers.find((o) => o.id === part.offer!.id);
          if (
            !r.ok ||
            !offer ||
            Date.parse(offer.checkedAt) < Date.parse(part.offer!.checkedAt)
          ) {
            failed++;
            return;
          }
          updates[category as Category] = { ...part, offer };
          if (offer.origin === "index") indexed++;
          else updated++;
        } catch {
          failed++;
        }
      }),
    );
    setWorkspace((w) => ({
      ...w,
      projects: w.projects.map((p) => {
        if (p.id !== id) return p;
        const desired = { ...p.desired };
        for (const [category, part] of Object.entries(updates)) {
          const key = category as Category;
          if (p.desired[key]?.offer?.id === part.offer?.id) desired[key] = part;
        }
        return { ...p, desired };
      }),
    }));
    setPriceMessage(
      `${updated ? `Проверено цен: ${updated}.` : indexed ? "" : "Цены не обновлены."}${indexed ? ` Цен из резервного индекса: ${indexed}. Смотрите дату проверки у товара.` : ""}${failed ? ` Не удалось проверить: ${failed}. Сохранены последние известные цены.` : " Кэш магазина — до 15 минут."}`,
    );
    setRefreshing(false);
  };
  // Refresh once per project opening; price updates must not trigger a fetch loop.
  /* oxlint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (Object.values(project.desired).some((p) => p.offer))
      void refreshPrices();
  }, [project.id]);
  /* oxlint-enable react-hooks/exhaustive-deps */
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 2_000_000)
        throw new Error("Файл слишком большой (до 2 МБ).");
      const data: unknown = JSON.parse(await file.text());
      if (!validateWorkspace(data))
        throw new Error("Это не резервная копия Next Rig или файл повреждён.");
      if (workspace.projects.length + data.projects.length > 50)
        throw new Error("После импорта получится больше 50 проектов.");
      const added = data.projects.map((p) => ({
        ...p,
        id: crypto.randomUUID(),
      }));
      saveBlocked.current = false;
      setWorkspace((w) => ({
        ...w,
        projects: [...w.projects, ...added],
        activeId: added[0].id,
      }));
      setNotice(`Импортировано проектов: ${added.length}`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Не удалось прочитать файл");
    }
    if (fileInput.current) fileInput.current.value = "";
  };
  const share = async () => {
    const bytes = new TextEncoder().encode(JSON.stringify(project));
    const url = `${location.origin}${location.pathname}#build=${btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""))}`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Ссылка скопирована. По ней можно добавить копию сборки.");
    } catch {
      setNotice("Браузер не разрешил копирование. Используйте экспорт JSON.");
    }
    setModal(undefined);
  };
  return (
    <div className="app-shell">
      <header className="site-header">
        <a
          className="brand"
          href="#"
          aria-label="Next Rig — главная"
          onClick={(e) => e.preventDefault()}
        >
          <span className="brand-symbol">
            <Monitor size={20} strokeWidth={2.2} />
          </span>
          next<span className="brand-light">rig</span>
          <span className="brand-period">.</span>
        </a>
        <nav className="device-nav" aria-label="Тип устройства">
          <button
            className={project.device === "pc" ? "active" : ""}
            onClick={() => switchDevice("pc")}
          >
            <Monitor size={17} />
            Мой ПК
          </button>
          <button
            className={project.device === "phone" ? "active" : ""}
            onClick={() => switchDevice("phone")}
          >
            <Smartphone size={17} />
            Телефон
          </button>
        </nav>
        <div className="header-tools">
          <span className="location-label">
            <span className="location-dot" />
            Армения <span>AMD ֏</span>
          </span>
          <button
            className="icon-button"
            aria-label={
              workspace.theme === "dark"
                ? "Включить светлую тему"
                : "Включить тёмную тему"
            }
            onClick={() =>
              setWorkspace((w) => ({
                ...w,
                theme: w.theme === "dark" ? "light" : "dark",
              }))
            }
          >
            {workspace.theme === "dark" ? (
              <Sun size={19} />
            ) : (
              <Moon size={19} />
            )}
          </button>
          <button
            className="icon-button"
            aria-label="Как это работает"
            onClick={() => setModal("help")}
          >
            <CircleHelp size={19} />
          </button>
        </div>
      </header>
      <main>
        <div className="workspace-top">
          <div className="breadcrumb">
            Моё пространство<span>/</span>
            {project.device === "pc" ? "Сборки ПК" : "Телефоны"}
          </div>
          <span className={`save-status ${saveError ? "danger" : ""}`}>
            <span />
            {saveError ? "Есть проблема с сохранением" : "Сохранено в браузере"}
          </span>
        </div>
        <div className="page-heading">
          <div className="project-title-wrap">
            <div className="project-picker">
              <button
                className="project-title"
                onClick={() => setProjectMenu(!projectMenu)}
                aria-expanded={projectMenu}
              >
                {project.name}
                <ChevronDown size={23} />
              </button>
              {projectMenu && (
                <div className="dropdown project-dropdown">
                  <span className="menu-label">Мои проекты</span>
                  {workspace.projects
                    .filter((p) => p.device === project.device)
                    .map((p) => (
                      <button
                        key={p.id}
                        onClick={() =>
                          setWorkspace((w) => ({ ...w, activeId: p.id }))
                        }
                      >
                        {p.name}
                        {p.id === project.id && <Check size={15} />}
                      </button>
                    ))}
                  <button
                    onClick={() => {
                      setProjectMenu(false);
                      setModal("new");
                    }}
                  >
                    <Plus size={15} />
                    Новый проект
                  </button>
                </div>
              )}
            </div>
            <p>
              {project.device === "pc"
                ? "От вашей сборки — к той самой."
                : "Найдите свой следующий телефон."}{" "}
              Сравнивайте и планируйте покупку.
            </p>
          </div>
          <div className="heading-actions">
            <div className="actions-menu">
              <button
                className="icon-button bordered"
                aria-label="Управление проектом"
                aria-expanded={actionsMenu}
                onClick={() => setActionsMenu(!actionsMenu)}
              >
                <MoreHorizontal size={20} />
              </button>
              {actionsMenu && (
                <div className="dropdown action-dropdown">
                  <button
                    onClick={() => {
                      setActionsMenu(false);
                      setModal("new");
                    }}
                  >
                    <Plus size={15} />
                    Новый проект
                  </button>
                  <button
                    onClick={() => {
                      setActionsMenu(false);
                      setModal("share");
                    }}
                  >
                    <ArrowUpRight size={15} />
                    Поделиться
                  </button>
                  <button
                    onClick={() => {
                      setActionsMenu(false);
                      setModal("rename");
                    }}
                  >
                    Переименовать
                  </button>
                  <button
                    onClick={() => {
                      addProject({
                        ...structuredClone(project),
                        id: crypto.randomUUID(),
                        name: `${project.name.slice(0, 85)} (копия)`,
                      });
                      setActionsMenu(false);
                    }}
                  >
                    <Copy size={15} />
                    Создать копию
                  </button>
                  <button
                    onClick={() => {
                      downloadWorkspace(workspace);
                      setActionsMenu(false);
                    }}
                  >
                    <ArrowDownToLine size={15} />
                    Экспорт всех проектов
                  </button>
                  <button
                    onClick={() => {
                      fileInput.current?.click();
                      setActionsMenu(false);
                    }}
                  >
                    <ArrowUpFromLine size={15} />
                    Импорт из JSON
                  </button>
                  <button
                    className="danger"
                    onClick={() => {
                      setActionsMenu(false);
                      setModal("delete");
                    }}
                  >
                    <Trash2 size={15} />
                    Удалить проект
                  </button>
                </div>
              )}
            </div>
            <button
              className="button secondary"
              onClick={() => setModal("share")}
            >
              <ArrowUpRight size={17} />
              Поделиться
            </button>
            <button className="button" onClick={() => setModal("new")}>
              <Plus size={17} />
              Новый проект
            </button>
          </div>
        </div>
        {saveError && (
          <div role="alert" className="notice warning">
            {saveError}
          </div>
        )}
        {project.demo && (
          <div className="demo-banner">
            <span className="demo-icon">
              <Monitor size={16} />
            </span>
            <p>
              <strong>Начните с примера.</strong> Здесь демонстрационные
              устройства. Замените их своими или создайте пустой проект.
            </p>
            <button
              onClick={() => {
                updateProject((p) => ({ ...p, demo: false }));
                setNotice("Можно редактировать пример как свой проект");
              }}
            >
              Понятно
              <X size={14} />
            </button>
          </div>
        )}
        <div className="workspace-grid">
          <Comparison
            project={project}
            mobileSide={mobileSide}
            onMobileSide={setMobileSide}
            onEdit={(category, side) => setEditor({ category, side })}
          />
          <Budget
            project={project}
            onEditBudget={() => setModal("budget")}
            onRefresh={() => void refreshPrices()}
            refreshing={refreshing}
            priceMessage={priceMessage}
            onBrowse={(category) => setEditor({ category, side: "desired" })}
          />
        </div>
        <footer className="site-footer">
          <span className="footer-brand">next rig.</span>
          <span>Продумайте следующий апгрейд.</span>
          <button
            className="text-button"
            onClick={() => {
              downloadWorkspace(workspace);
              setNotice("Резервная копия скачана");
            }}
          >
            <ArrowDownToLine size={14} />
            Скачать резервную копию
          </button>
        </footer>
      </main>
      <input
        type="file"
        accept=".json,application/json"
        ref={fileInput}
        hidden
        onChange={(e) => void importFile(e.target.files?.[0])}
      />
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          <span>{notice}</span>
          <button
            className="icon-button"
            aria-label="Скрыть уведомление"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {editor && (
        <PartEditor
          key={`${project.id}-${editor.category}-${editor.side}`}
          {...editor}
          part={project[editor.side][editor.category]}
          onSave={savePart}
          onClose={() => setEditor(undefined)}
          onRemove={() => {
            const e = editor;
            updateProject((p) => {
              const side = { ...p[e.side] };
              delete side[e.category];
              return { ...p, [e.side]: side };
            });
            setNotice("Позиция удалена");
          }}
        />
      )}
      {modal === "budget" && (
        <Dialog title="Бюджет покупки" onClose={() => setModal(undefined)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const budget = Number(
                new FormData(e.currentTarget).get("budget"),
              );
              updateProject((p) => ({ ...p, budget }));
              setModal(undefined);
              setNotice("Бюджет сохранён");
            }}
          >
            <p className="modal-description">
              Сколько вы планируете потратить на новое оборудование? Сравним с
              суммой цен в колонке «Хочу».
            </p>
            <label className="form-label">
              Бюджет, ֏
              <input
                name="budget"
                type="number"
                min="0"
                max="10000000000"
                step="1"
                required
                defaultValue={project.budget}
                autoFocus
              />
            </label>
            <p className="editor-footnote">
              Укажите 0, чтобы не ограничивать бюджет.
            </p>
            <div className="dialog-actions">
              <button className="button" type="submit">
                Сохранить
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {modal === "new" && (
        <Dialog title="Следующий апгрейд" onClose={() => setModal(undefined)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget),
                p = blankProject(form.get("device") as Device);
              p.name = String(form.get("name")).trim();
              if (p.name) addProject(p);
            }}
          >
            <p className="modal-description">
              Пустой проект для ваших устройств и планов.
            </p>
            <label className="form-label">
              Название
              <input
                name="name"
                maxLength={100}
                required
                placeholder="Например, рабочий ПК"
                autoFocus
              />
            </label>
            <fieldset className="device-choice">
              <legend>Что планируем?</legend>
              <label>
                <input
                  type="radio"
                  name="device"
                  value="pc"
                  defaultChecked={project.device === "pc"}
                />
                <Monitor size={22} />
                <span>Компьютер</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="device"
                  value="phone"
                  defaultChecked={project.device === "phone"}
                />
                <Smartphone size={22} />
                <span>Телефон</span>
              </label>
            </fieldset>
            <div className="dialog-actions">
              <button className="button" type="submit">
                <Plus size={17} />
                Создать проект
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {modal === "rename" && (
        <Dialog title="Название проекта" onClose={() => setModal(undefined)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const name = String(
                new FormData(e.currentTarget).get("name"),
              ).trim();
              if (name) {
                updateProject((p) => ({ ...p, name }));
                setModal(undefined);
              }
            }}
          >
            <label className="form-label">
              Название
              <input
                name="name"
                maxLength={100}
                required
                defaultValue={project.name}
                autoFocus
              />
            </label>
            <div className="dialog-actions">
              <button className="button">Сохранить</button>
            </div>
          </form>
        </Dialog>
      )}
      {modal === "delete" && (
        <Dialog title="Удалить проект?" onClose={() => setModal(undefined)}>
          <p className="modal-description">
            «{project.name}» будет удалён из этого браузера. Сначала можно
            скачать резервную копию.
          </p>
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => downloadWorkspace(workspace)}
            >
              Скачать копию
            </button>
            <button
              className="button destructive"
              onClick={() => {
                setWorkspace((w) => {
                  const rest = w.projects.filter((p) => p.id !== project.id);
                  if (!rest.length) rest.push(blankProject(project.device));
                  return { ...w, projects: rest, activeId: rest[0].id };
                });
                setModal(undefined);
                setNotice("Проект удалён");
              }}
            >
              Удалить
            </button>
          </div>
        </Dialog>
      )}
      {modal === "share" && (
        <Dialog title="Поделиться планом" onClose={() => setModal(undefined)}>
          <p className="modal-description">
            Ссылка содержит снимок этого проекта: модели, заметки, бюджет и
            цены. Получатель сможет сохранить свою копию. Дальнейшие изменения
            не синхронизируются.
          </p>
          <p className="notice">
            Не добавляйте личную информацию в заметки, если планируете делиться
            ссылкой.
          </p>
          <div className="dialog-actions">
            <button className="button" onClick={() => void share()}>
              <Copy size={16} />
              Скопировать ссылку
            </button>
          </div>
        </Dialog>
      )}
      {shared && (
        <Dialog
          title="Вам отправили проект"
          onClose={() => setShared(undefined)}
        >
          <p className="modal-description">
            «{shared.name}» — {shared.device === "pc" ? "сборка ПК" : "телефон"}
            . Добавьте отдельную копию в своё пространство.
          </p>
          <div className="dialog-actions">
            <button
              className="button"
              onClick={() => {
                addProject({ ...shared, id: crypto.randomUUID() });
                setShared(undefined);
              }}
            >
              Добавить копию
            </button>
          </div>
        </Dialog>
      )}
      {modal === "help" && (
        <Dialog
          title="Ваш следующий апгрейд"
          onClose={() => setModal(undefined)}
        >
          <div className="help-content">
            <h3>Сейчас и хочу</h3>
            <p>
              Нажмите на позицию, чтобы добавить или изменить устройство. Для ПК
              — восемь категорий, для телефона — одна модель с вашими заметками.
            </p>
            <h3>Цены для Армении</h3>
            <p>
              Цены получаем с публичных страниц Mtech и iSpace. Покрытие
              ограничено доступными страницами магазинов. Любую другую модель,
              магазин и цену можно добавить вручную. Доставку уточняйте в
              магазине.
            </p>
            <h3>Что считаем</h3>
            <p>
              Бюджет учитывает только новые позиции в колонке «Хочу».
              Совместимость компонентов и производительность автоматически не
              проверяются.
            </p>
            <h3>Без регистрации</h3>
            <p>
              Изменения сохраняются на этом устройстве и в этом браузере.
              Очистка данных браузера удалит проекты. В приватном режиме данные
              могут исчезнуть при закрытии окна.
            </p>
            <h3>Перенос и резервная копия</h3>
            <p>
              В меню проекта есть экспорт и импорт JSON. Импорт добавляет копии
              и не заменяет ваши проекты. «Поделиться» передаёт снимок одного
              проекта.
            </p>
            <h3>Конфиденциальность</h3>
            <p>
              Сборки не отправляются на сервер. Сервер запрашивает у магазинов
              только категорию каталога. Изображения товаров загружаются с
              сайтов магазинов.
            </p>
          </div>
        </Dialog>
      )}
    </div>
  );
}
