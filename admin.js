const state = {
  products: [],
  categories: [],
  filter: "",
  search: "",
  category: "",
  sort: "recent",
  page: 30,
  editing: null,
  draft: null,
  dirty: false,
  pendingFiles: new Map(),
  processingImages: 0,
  photoSequence: 0,
  savingProduct: false,
  productSaveToken: 0,
  selected: new Set(),
  undo: null,
  categoryEditing: null,
  categoryFiles: null,
  categoryDirty: false,
  categoryImageRemoved: false,
  bulkDirty: false,
  bulkCategoryProducts: [],
  offerDirty: false,
  moveCategoryDirty: false,
  offerProduct: null,
  moveCategory: null,
  importUndo: null,
  modoSeleccion: false
};

const $ = (selector) => document.querySelector(selector);
const authView = $("#authView");
const adminView = $("#adminView");
const loginForm = $("#loginForm");
const loginFeedback = $("#loginFeedback");
const catalogFeedback = $("#catalogFeedback");
const editorFeedback = $("#editorFeedback");
const productList = $("#productList");
const editorDialog = $("#editorDialog");
const confirmDialog = $("#confirmDialog");
editorDialog.addEventListener("cancel", (event) => {
  const fileInputCancel = event.composedPath().some((target) => target instanceof HTMLInputElement && target.type === "file");
  if (!fileInputCancel) return;
  event.preventDefault();
  event.stopPropagation();
}, true);

function message(element, text, error = false) {
  element.textContent = text;
  element.classList.toggle("error", error);
}
function fieldError(input, text) {
  const error = $(`#${input.id}Error`) || input.closest(".campo")?.querySelector(".field-error");
  if (error) error.textContent = text;
  input.classList.toggle("field-invalid", Boolean(text));
  input.setAttribute("aria-invalid", text ? "true" : "false");
}
function clearFieldErrors(form) {
  form.querySelectorAll(".field-error").forEach((error) => { error.textContent = ""; });
  form.querySelectorAll(".field-invalid").forEach((input) => {
    input.classList.remove("field-invalid");
    input.removeAttribute("aria-invalid");
  });
}
function showFieldError(input, text) {
  fieldError(input, text);
  input.focus();
}
function openModal(dialog, options = {}) {
  window.abrirVentana(dialog.id, {
    opener: options.opener,
    dirty: options.dirty,
    confirmDirty: options.dirty ? () => askConfirmation("Hay cambios sin guardar. ¿Cerrar igualmente?") : null,
    reset: () => {
      if (options.discard) options.discard();
      else dialog.querySelectorAll("form").forEach((form) => form.reset());
      dialog.querySelectorAll("form").forEach(clearFieldErrors);
    },
    onClose: options.onClose
  });
  setTimeout(() => {
    if (!dialog.open) return;
    const firstField = dialog.querySelector("input:not([type=hidden]):not([type=file]),select,textarea");
    (firstField || dialog.querySelector("button"))?.focus();
  }, 0);
}
function closeModal(dialog, returnValue = "cancel", force = false) {
  return window.cerrarVentana(dialog.id, { reason: returnValue, force });
}
function productId(product) { return String(product.id); }
function publicImage(product) {
  const color = Array.isArray(product.colores) && product.colores[0];
  return color?.imagenes?.[0] || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='18' fill='%23eef0f1'/%3E%3Cpath d='M38 78h44M44 69h32l-4-25H48z' fill='none' stroke='%2311b5c3' stroke-width='5'/%3E%3C/svg%3E";
}
function money(value) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(value) || 0);
}
function escapePath(url) {
  const marker = "/object/public/productos/";
  return url.includes(marker) ? decodeURIComponent(url.split(marker)[1]) : null;
}
function isOwner(value) {
  return value === true || value?.[0] === true || value?.es_dueno === true;
}

async function checkSession(session) {
  if (!session) {
    authView.hidden = false;
    adminView.hidden = true;
    $("#adminNav").hidden = true;
    return false;
  }
  const { data, error } = await window.db.rpc("es_dueno");
  if (error || !isOwner(data)) {
    await window.db.auth.signOut();
    authView.hidden = false;
    adminView.hidden = true;
    message(loginFeedback, "Esta cuenta no tiene permisos.", true);
    return false;
  }
  authView.hidden = true;
  adminView.hidden = false;
  $("#adminNav").hidden = false;
  await loadCatalog();
  return true;
}

async function loadCatalog() {
  if (!window.db) {
    message(catalogFeedback, "Configurá Supabase para usar el panel.", true);
    return;
  }
  message(catalogFeedback, "Cargando catálogo…");
  const [productsResult, categoriesResult] = await Promise.all([
    window.db.from("productos").select("*").order("created_at", { ascending: false }),
    window.db.from("categorias").select("id,nombre,orden,visible").order("orden", { ascending: true })
  ]);
  if (productsResult.error || categoriesResult.error) {
    message(catalogFeedback, productsResult.error?.message || categoriesResult.error?.message || "No se pudo cargar el catálogo.", true);
    return;
  }
  state.products = (productsResult.data || []).map((product) => ({ ...product, detalles: normalizarDetalles(product.detalles).join(" | ") }));
  state.categories = categoriesResult.data || [];
  renderCategories();
  renderStats();
  renderProducts();
  message(catalogFeedback, "");
}

function renderCategories() {
  const categoryFilter = $("#categoryFilter");
  const productCategory = $("#productCategory");
  [categoryFilter, productCategory].forEach((select) => {
    const current = select.value;
    select.replaceChildren();
    if (select === categoryFilter) {
      const all = document.createElement("option");
      all.value = "";
      all.textContent = "Todas las categorías";
      select.append(all);
    }
    state.categories.filter((category) => category.visible !== false).forEach((category) => {
      const option = document.createElement("option");
      option.value = category.id;
      option.textContent = category.nombre;
      select.append(option);
    });
    if ([...select.options].some((option) => option.value === current)) select.value = current;
  });
}

function renderStats() {
  const stats = [
    ["", "Total", state.products.length],
    ["agotado", "Agotados", state.products.filter((p) => p.estado === "agotado" || Number(p.stock) === 0).length],
    ["oculto", "Ocultos", state.products.filter((p) => p.estado === "oculto").length],
    ["oferta", "En oferta", state.products.filter((p) => p.en_oferta).length]
  ];
  const container = $("#stats");
  container.replaceChildren();
  stats.forEach(([filter, label, count]) => {
    const button = document.createElement("button");
    button.className = "stat";
    button.classList.toggle("is-active", state.filter === filter);
    button.type = "button";
    const strong = document.createElement("strong");
    strong.textContent = count;
    const span = document.createElement("span");
    span.textContent = label;
    button.append(strong, span);
    button.addEventListener("click", () => { state.filter = filter; state.page = 30; renderStats(); renderProducts(); });
    container.append(button);
  });
}

function visibleProducts() {
  const query = state.search.trim().toLocaleLowerCase();
  const list = state.products.filter((product) => {
    const matchesSearch = !query || String(product.nombre || "").toLocaleLowerCase().includes(query);
    const matchesCategory = !state.category || String(product.categoria_id) === state.category;
    const matchesFilter = !state.filter || (state.filter === "agotado" ? product.estado === "agotado" || Number(product.stock) === 0 : state.filter === "oculto" ? product.estado === "oculto" : state.filter === "oferta" ? product.en_oferta : true);
    return matchesSearch && matchesCategory && matchesFilter;
  });
  return list.sort((a, b) => {
    if (state.sort === "name") return String(a.nombre).localeCompare(String(b.nombre), "es");
    if (state.sort === "price") return Number(a.precio) - Number(b.precio);
    if (state.sort === "manual") return Number(a.orden || 0) - Number(b.orden || 0);
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
}

function button(text, className = "icon-button") {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = text;
  return element;
}
function inlineNumber(value, aria, onSave) {
  const input = document.createElement("input");
  input.className = "inline-input";
  input.type = "number";
  input.inputMode = aria.includes("stock") ? "numeric" : "decimal";
  input.min = "0";
  input.step = "1";
  input.value = Number(value) || 0;
  input.setAttribute("aria-label", aria);
  let original = input.value;
  const save = async () => {
    if (input.value === original) return;
    const next = Number(input.value);
    if (!Number.isFinite(next) || next < 0) { input.value = original; return; }
    input.disabled = true;
    const ok = await onSave(next);
    input.disabled = false;
    if (ok) {
      original = String(next);
      input.value = original;
      flash(input, "Guardado ✓");
      setTimeout(renderProducts, 1400);
    } else input.value = original;
  };
  input.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); input.blur(); } });
  input.addEventListener("blur", save);
  return input;
}
function priceInput(value, aria, onSave, options = {}) {
  const input = document.createElement("input");
  input.className = "inline-input";
  input.type = "text";
  input.inputMode = "numeric";
  input.setAttribute("aria-label", aria);
  if (options.placeholder) input.placeholder = options.placeholder;
  const format = (number) => new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(number);
  let original = value == null && options.allowEmpty ? "" : String(Math.max(0, Math.round(Number(value) || 0)));
  input.value = original === "" ? "" : format(Number(original));
  const formattedOriginal = () => original === "" ? "" : format(Number(original));
  input.addEventListener("focus", () => {
    input.value = original;
    input.select();
  });
  input.addEventListener("input", () => options.onInput?.(input.value));
  const save = async () => {
    const raw = input.value.trim();
    if (!raw && options.allowEmpty) {
      if (original === "") return;
      if (options.validate && !options.validate(null)) {
        options.onInvalid?.();
        input.value = formattedOriginal();
        return;
      }
      input.disabled = true;
      const ok = await onSave(null);
      input.disabled = false;
      if (ok) {
        original = "";
        input.value = "";
        flash(input, "Guardado ✓");
        setTimeout(renderProducts, 1400);
      } else input.value = formattedOriginal();
      return;
    }
    const next = Number(raw.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(next) || next < 0) { input.value = formattedOriginal(); return; }
    if (options.validate && !options.validate(next)) {
      options.onInvalid?.();
      input.value = formattedOriginal();
      return;
    }
    input.value = format(next);
    if (String(next) === original) return;
    input.disabled = true;
    const ok = await onSave(next);
    input.disabled = false;
    if (ok) {
      original = String(next);
      flash(input, "Guardado ✓");
      setTimeout(renderProducts, 1400);
    } else input.value = formattedOriginal();
  };
  input.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); input.blur(); } });
  input.addEventListener("blur", save);
  return input;
}
function flash(element, text) {
  const note = document.createElement("span");
  note.className = "saved-note";
  note.textContent = text;
  element.parentElement.append(note);
  setTimeout(() => note.remove(), 1400);
}

function renderProducts() {
  const menuFocusId = openProductMenu?.id;
  closeProductMenu(false);
  const list = visibleProducts();
  if (state.modoSeleccion) {
    const visibleIds = new Set(list.map(productId));
    state.selected.forEach((id) => { if (!visibleIds.has(id)) state.selected.delete(id); });
    $("#selectedCount").textContent = state.selected.size;
  }
  productList.replaceChildren();
  list.slice(0, state.page).forEach((product) => productList.append(createProductCard(product)));
  if (menuFocusId) {
    const replacement = [...productList.querySelectorAll("[data-menu-btn]")].find((item) => item.dataset.id === menuFocusId);
    (replacement || $("#searchInput")).focus({ preventScroll: true });
  }
  $("#moreButton").hidden = list.length <= state.page;
  if (!list.length) {
    const empty = document.createElement("p");
    empty.className = "feedback";
    empty.textContent = "No hay productos con estos filtros.";
    productList.append(empty);
  }
}

function createProductCard(product) {
  const card = document.createElement("article");
  card.className = "product-card";
  card.classList.toggle("is-selected", state.selected.has(productId(product)));
  let selection = null;
  if (state.modoSeleccion) {
    selection = document.createElement("input");
    selection.type = "checkbox";
    selection.className = "selection-box";
    selection.checked = state.selected.has(productId(product));
    selection.setAttribute("aria-label", `Seleccionar ${product.nombre}`);
    selection.dataset.selectionId = productId(product);
  }
  const image = document.createElement("img");
  image.className = "product-thumb";
  image.src = publicImage(product);
  image.alt = product.nombre || "Producto";
  image.loading = "lazy";
  const main = document.createElement("div");
  main.className = "product-main";
  const name = document.createElement("strong");
  name.className = "product-name";
  name.textContent = product.nombre || "Sin nombre";
  const meta = document.createElement("span");
  meta.className = "product-meta";
  meta.textContent = state.categories.find((category) => String(category.id) === String(product.categoria_id))?.nombre || "Sin categoría";
  const values = document.createElement("div");
  values.className = "product-values";
  const priceControl = document.createElement("label");
  priceControl.className = "price-control";
  const priceLabel = document.createElement("span");
  priceLabel.className = "inline-label";
  priceLabel.textContent = "Precio";
  const priceWrap = document.createElement("span");
  priceWrap.className = "price-input-wrap";
  const currency = document.createElement("span");
  currency.textContent = "$";
  const price = priceInput(product.precio, `Precio de ${product.nombre}`, (value) => {
    if (product.precio_oferta != null && Number(product.precio_oferta) >= value) {
      setOfferError("Debe ser menor al precio");
      return false;
    }
    setOfferError("");
    return updateProduct(product, { precio: value });
  });
  priceWrap.append(currency, price);
  priceControl.append(priceLabel, priceWrap);
  const offerField = document.createElement("label");
  offerField.className = "price-control offer-control";
  const offerLabel = document.createElement("span");
  offerLabel.className = "inline-label";
  offerLabel.textContent = "Oferta";
  const offerWrap = document.createElement("span");
  offerWrap.className = "offer-input-wrap";
  const offerPriceWrap = document.createElement("span");
  offerPriceWrap.className = "price-input-wrap";
  const offerCurrency = document.createElement("span");
  offerCurrency.textContent = "$";
  const offerError = document.createElement("small");
  offerError.className = "field-error offer-error";
  const offerDiscount = document.createElement("span");
  offerDiscount.className = `offer-discount${product.en_oferta ? " is-active" : ""}`;
  const hasOffer = product.precio_oferta !== null && product.precio_oferta !== undefined && product.precio_oferta !== "";
  offerDiscount.hidden = !hasOffer || Number(product.precio) <= 0;
  if (!offerDiscount.hidden) offerDiscount.textContent = `-${Math.round((1 - Number(product.precio_oferta) / Number(product.precio)) * 100)}%`;
  const setOfferError = (text) => {
    offerError.textContent = text;
    offerInput.classList.toggle("field-invalid", Boolean(text));
    offerInput.setAttribute("aria-invalid", text ? "true" : "false");
  };
  const offerInput = priceInput(
    hasOffer ? product.precio_oferta : null,
    `Oferta de ${product.nombre}`,
    (value) => updateProduct(product, { precio_oferta: value }),
    {
      allowEmpty: true,
      placeholder: "—",
      validate: (value) => {
        if (value === null && product.en_oferta) {
          setOfferError("Ingresá un precio de oferta o desactivá 'En oferta'.");
          return false;
        }
        if (value !== null && (value < 0 || value >= Number(product.precio))) {
          setOfferError("Debe ser menor al precio");
          return false;
        }
        setOfferError("");
        return true;
      },
      onInvalid: () => offerInput.focus(),
      onInput: () => {
        if (offerError.textContent) setOfferError("");
      }
    }
  );
  offerInput.classList.toggle("is-active", Boolean(product.en_oferta));
  offerInput.classList.toggle("is-muted", hasOffer && !product.en_oferta);
  offerInput.placeholder = "—";
  offerPriceWrap.append(offerCurrency, offerInput);
  offerWrap.append(offerPriceWrap, offerDiscount);
  offerField.append(offerLabel, offerWrap, offerError);
  const stockField = document.createElement("label");
  stockField.className = "stock-field";
  const stockLabel = document.createElement("span");
  stockLabel.className = "inline-label";
  stockLabel.textContent = "Stock";
  const stockControl = document.createElement("div");
  stockControl.className = "stock-control";
  const minus = button("−");
  const stock = inlineNumber(product.stock, `Stock de ${product.nombre}`, (value) => updateStock(product, value));
  const plus = button("+");
  minus.setAttribute("aria-label", "Restar stock");
  plus.setAttribute("aria-label", "Sumar stock");
  minus.addEventListener("click", async () => { await updateStock(product, Math.max(0, Number(product.stock) - 1)); renderProducts(); });
  plus.addEventListener("click", async () => { await updateStock(product, Number(product.stock) + 1); renderProducts(); });
  stockControl.append(minus, stock, plus);
  stockField.append(stockLabel, stockControl);
  values.append(priceControl, offerField, stockField);
  main.append(name, meta);
  const switches = document.createElement("div");
  switches.className = "quick-switches";
  switches.append(toggle("Visible", product.estado !== "oculto", async () => {
    await updateProduct(product, { estado: product.estado === "oculto" ? (Number(product.stock) === 0 ? "agotado" : "activo") : "oculto" });
    renderProducts();
  }));
  switches.append(toggle("Agotado", product.estado === "agotado", async () => {
    await updateStock(product, 0);
    renderProducts();
  }));
  switches.append(toggle("En oferta", Boolean(product.en_oferta), () => toggleOffer(product)));
  const actions = document.createElement("div");
  actions.className = "product-actions";
  const menuButton = button("⋯");
  menuButton.setAttribute("aria-label", `Acciones de ${product.nombre}`);
  menuButton.dataset.menuBtn = "";
  menuButton.dataset.id = productId(product);
  menuButton.setAttribute("aria-haspopup", "menu");
  menuButton.setAttribute("aria-expanded", "false");
  actions.append(menuButton);
  const pressTimer = { id: null };
  card.addEventListener("pointerdown", (event) => {
    if (state.modoSeleccion || event.target.closest("input,button")) return;
    pressTimer.id = setTimeout(() => {
      entrarModoSeleccion();
      state.selected.add(productId(product));
      renderProducts();
    }, 550);
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((type) => card.addEventListener(type, () => clearTimeout(pressTimer.id)));
  if (selection) card.prepend(selection);
  card.append(image, main, values, switches, actions);
  return card;
}
function toggle(label, active, action) {
  const control = button("");
  control.className = `quick-switch${active ? " is-on" : ""}`;
  const dot = document.createElement("i");
  const text = document.createElement("span");
  text.textContent = label;
  control.append(dot, text);
  control.addEventListener("click", action);
  return control;
}
let openProductMenu = null;
function ensureProductMenu() {
  let backdrop = $("#productMenuBackdrop");
  let menu = $("#productActionMenu");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "productMenuBackdrop";
    backdrop.className = "product-menu-backdrop";
    backdrop.setAttribute("aria-hidden", "true");
    document.body.append(backdrop);
  }
  if (!menu) {
    menu = document.createElement("div");
    menu.id = "productActionMenu";
    menu.className = "product-menu";
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Acciones del producto");
    menu.setAttribute("aria-hidden", "true");
    document.body.append(menu);
  }
  return { menu, backdrop };
}
function closeProductMenu(restoreFocus = true) {
  if (!openProductMenu) return;
  const { button: opener, menu, backdrop } = openProductMenu;
  opener.setAttribute("aria-expanded", "false");
  menu.classList.remove("is-open");
  menu.setAttribute("aria-hidden", "true");
  backdrop.classList.remove("is-visible");
  backdrop.setAttribute("aria-hidden", "true");
  openProductMenu = null;
  if (restoreFocus && opener.isConnected) opener.focus({ preventScroll: true });
}
function positionProductMenu(opener, menu) {
  if (window.matchMedia("(max-width: 600px)").matches) {
    menu.style.top = "";
    menu.style.left = "";
    return;
  }
  const rect = opener.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  const gap = 8;
  const top = rect.bottom + menuRect.height + gap <= window.innerHeight
    ? rect.bottom + gap
    : Math.max(gap, rect.top - menuRect.height - gap);
  menu.style.top = `${top}px`;
  menu.style.left = `${Math.max(gap, Math.min(window.innerWidth - menuRect.width - gap, rect.right - menuRect.width))}px`;
}
function openProductActions(opener) {
  const { menu, backdrop } = ensureProductMenu();
  if (openProductMenu?.button === opener) {
    closeProductMenu();
    return;
  }
  closeProductMenu(false);
  const id = opener.dataset.id;
  const product = state.products.find((item) => productId(item) === id);
  if (!product) return;
  menu.replaceChildren();
  const actions = [
    ["edit", "Editar"],
    ["feature", "Destacar arriba"],
    ["duplicate", "Duplicar"],
    ["delete", "Eliminar"],
    ["import", "⇧ Importar productos"]
  ];
  actions.forEach(([action, label]) => {
    const item = button(label, `product-menu__item${action === "delete" ? " is-danger" : ""}`);
    item.dataset.productMenuAction = action;
    item.dataset.id = id;
    item.setAttribute("role", "menuitem");
    menu.append(item);
  });
  const closeItem = button("Cerrar", "product-menu__close");
  closeItem.dataset.productMenuAction = "close";
  closeItem.setAttribute("role", "menuitem");
  menu.append(closeItem);
  openProductMenu = { button: opener, id, menu, backdrop };
  opener.setAttribute("aria-expanded", "true");
  menu.classList.add("is-open");
  menu.setAttribute("aria-hidden", "false");
  backdrop.classList.add("is-visible");
  backdrop.setAttribute("aria-hidden", "false");
  positionProductMenu(opener, menu);
  menu.querySelector('[role="menuitem"]')?.focus({ preventScroll: true });
}
document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const menuButton = target.closest("[data-menu-btn]");
  if (menuButton) {
    event.preventDefault();
    openProductActions(menuButton);
    return;
  }
  const actionItem = target.closest("[data-product-menu-action]");
  if (!actionItem || !openProductMenu) return;
  const { id } = actionItem.dataset;
  const action = actionItem.dataset.productMenuAction;
  const product = state.products.find((item) => productId(item) === id);
  const importOpener = action === "import" ? openProductMenu?.button : actionItem;
  closeProductMenu();
  if (action === "import") { openProductImport(importOpener); return; }
  if (!product || action === "close") return;
  if (action === "edit") openEditor(product);
  else if (action === "feature") featureProduct(product);
  else if (action === "duplicate") duplicateProduct(product);
  else if (action === "delete") removeProduct(product);
});
document.addEventListener("pointerdown", (event) => {
  if (!openProductMenu) return;
  const target = event.target instanceof Element ? event.target : null;
  if (!target || target.closest("[data-menu-btn]") || target.closest("#productActionMenu")) return;
  closeProductMenu();
});
document.addEventListener("keydown", (event) => {
  if (!openProductMenu) return;
  const items = [...openProductMenu.menu.querySelectorAll('[role="menuitem"]')];
  const index = items.indexOf(document.activeElement);
  if (event.key === "Escape") {
    event.preventDefault();
    closeProductMenu();
  } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex = index < 0
      ? (direction > 0 ? 0 : items.length - 1)
      : (index + direction + items.length) % items.length;
    items[nextIndex]?.focus();
  } else if (event.key === "Home") {
    event.preventDefault();
    items[0]?.focus();
  } else if (event.key === "End") {
    event.preventDefault();
    items[items.length - 1]?.focus();
  }
});
window.addEventListener("scroll", (event) => {
  if (openProductMenu && !(event.target instanceof Element && event.target.closest("#productActionMenu"))) closeProductMenu();
}, true);
window.addEventListener("resize", () => closeProductMenu());

function entrarModoSeleccion() {
  if (state.modoSeleccion) return;
  state.modoSeleccion = true;
  adminView.classList.add("selection-mode");
  const bar = $("#bulkBar");
  bar.hidden = false;
  bar.style.display = "grid";
  $("#selectionButton").textContent = "Cancelar selección";
  $("#selectionButton").setAttribute("aria-pressed", "true");
  $("#selectionButton").classList.add("is-active");
  renderProducts();
}
function salirModoSeleccion() {
  state.modoSeleccion = false;
  state.selected.clear();
  closeProductMenu(false);
  productList.querySelectorAll(".selection-box").forEach((checkbox) => checkbox.remove());
  productList.querySelectorAll(".product-card.is-selected").forEach((card) => card.classList.remove("is-selected"));
  $("#selectedCount").textContent = "0";
  const bar = $("#bulkBar");
  bar.hidden = true;
  bar.style.display = "none";
  adminView.classList.remove("selection-mode");
  $("#selectionButton").textContent = "Seleccionar";
  $("#selectionButton").setAttribute("aria-pressed", "false");
  $("#selectionButton").classList.remove("is-active");
}
function cambiarPantalla(view) {
  if (!["products", "categories", "settings"].includes(view)) view = "products";
  if (view !== "products") salirModoSeleccion();
  document.querySelectorAll("#adminNav button").forEach((item) => item.classList.toggle("is-active", item.dataset.view === view));
  adminView.hidden = view !== "products";
  $("#categoriesView").hidden = view !== "categories";
  $("#settingsView").hidden = view !== "settings";
  if (view === "categories") renderCategoryList();
}
function viewFromLocation() {
  const view = location.hash.slice(1);
  return ["products", "categories", "settings"].includes(view) ? view : "products";
}
window.addEventListener("popstate", () => { salirModoSeleccion(); cambiarPantalla(history.state?.panelView || viewFromLocation()); });
window.addEventListener("hashchange", () => { salirModoSeleccion(); cambiarPantalla(viewFromLocation()); });
window.addEventListener("pagehide", salirModoSeleccion);
window.addEventListener("pageshow", (event) => { if (event.persisted) salirModoSeleccion(); });
document.addEventListener("click", (event) => {
  const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
  if (link && state.modoSeleccion && link.origin === location.origin) salirModoSeleccion();
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !state.modoSeleccion || event.defaultPrevented) return;
  if (document.querySelector("dialog[open]")) return;
  salirModoSeleccion();
});

async function updateProduct(product, changes) {
  const previous = { ...product };
  Object.assign(product, changes);
  const { error } = await window.db.from("productos").update(changes).eq("id", product.id);
  if (error) {
    Object.assign(product, previous);
    message(catalogFeedback, error.message, true);
    renderProducts();
    return false;
  }
  renderStats();
  return true;
}
async function updateStock(product, value) {
  const stock = Math.max(0, Math.round(Number(value) || 0));
  const estado = stock === 0 ? "agotado" : product.estado === "agotado" ? "activo" : product.estado;
  return updateProduct(product, { stock, estado });
}
async function toggleOffer(product) {
  if (!product.en_oferta && (!product.precio_oferta || Number(product.precio_oferta) >= Number(product.precio))) {
    state.offerProduct = product;
    state.offerDirty = false;
    $("#offerValue").value = "";
    clearFieldErrors($("#offerForm"));
    openModal($("#offerDialog"), {
      dirty: () => state.offerDirty,
      discard: () => { state.offerDirty = false; $("#offerForm").reset(); }
    });
  } else {
    await updateProduct(product, { en_oferta: !product.en_oferta });
    renderProducts();
  }
}
async function featureProduct(product) {
  const minimum = Math.min(0, ...state.products.map((item) => Number(item.orden) || 0));
  await updateProduct(product, { orden: minimum - 1 });
  state.sort = "manual";
  $("#sortSelect").value = "manual";
  renderProducts();
}

function selectedProducts() {
  return state.products.filter((product) => state.selected.has(productId(product)));
}
function snapshotProducts(products) {
  return products.map((product) => ({ id: product.id, record: JSON.parse(JSON.stringify(product)), values: { estado: product.estado, precio: product.precio, precio_oferta: product.precio_oferta, en_oferta: product.en_oferta, categoria_id: product.categoria_id, stock: product.stock, orden: product.orden } }));
}
async function updateBulkProducts(products, changesFactory, successText = "Cambios aplicados.") {
  const snapshots = snapshotProducts(products);
  const successful = [];
  const errors = [];
  for (const product of products) {
    try {
      const changes = changesFactory(product);
      const { error } = await window.db.from("productos").update(changes).eq("id", product.id);
      if (error) throw error;
      Object.assign(product, changes);
      successful.push(product);
    } catch (error) {
      errors.push(error.message || "No se pudo actualizar el producto.");
    }
  }
  if (!successful.length) {
    message(catalogFeedback, `No se pudo aplicar la acción: ${errors[0] || "error desconocido"}`, true);
    return false;
  }
  const successfulIds = new Set(successful.map(productId));
  const snapshot = snapshots.filter((item) => successfulIds.has(String(item.id)));
  state.undo = { snapshot, expires: Date.now() + 10000 };
  salirModoSeleccion();
  if (errors.length) showUndo(`${successful.length} productos actualizados; ${errors.length} con errores.`);
  else showUndo(successText);
  renderStats();
  renderProducts();
  setTimeout(() => { if (state.undo?.expires <= Date.now()) state.undo = null; }, 10100);
  return true;
}
async function restoreSnapshot(snapshot, notify = true) {
  for (const item of snapshot) {
    const product = state.products.find((candidate) => String(candidate.id) === String(item.id));
    if (!product && item.record) {
      const restored = { ...item.record };
      delete restored.created_at;
      delete restored.updated_at;
      const result = await window.db.from("productos").insert(restored).select().single();
      if (!result.error) state.products.push(result.data);
      continue;
    }
    if (!product) continue;
    Object.assign(product, item.values);
    await window.db.from("productos").update(item.values).eq("id", item.id);
  }
  if (notify) message(catalogFeedback, "Cambios deshechos.");
  renderStats();
  renderProducts();
}
function showUndo(text) {
  catalogFeedback.replaceChildren();
  const label = document.createElement("span");
  label.textContent = text;
  const undo = document.createElement("button");
  undo.className = "secondary-button undo-button";
  undo.type = "button";
  undo.textContent = "Deshacer";
  undo.addEventListener("click", async () => {
    if (!state.undo || state.undo.expires < Date.now()) return;
    const snapshot = state.undo.snapshot;
    state.undo = null;
    await restoreSnapshot(snapshot);
  });
  catalogFeedback.append(label, undo);
}
function openBulkInput(type) {
  const products = selectedProducts();
  if (!products.length) return message(catalogFeedback, "Elegí al menos un producto.", true);
  if (type === "category") {
    const select = $("#bulkCategoryValue");
    select.replaceChildren();
    state.categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.id;
      option.textContent = category.nombre;
      select.append(option);
    });
    state.bulkCategoryProducts = products;
    state.bulkDirty = false;
    clearFieldErrors($("#bulkCategoryForm"));
    openModal($("#bulkCategoryDialog"), {
      dirty: () => state.bulkDirty,
      discard: () => { state.bulkDirty = false; $("#bulkCategoryForm").reset(); }
    });
    return;
  }
  if (type === "delete") {
    askConfirmation(`¿Eliminar ${products.length} productos?`).then(async (confirmed) => {
      if (!confirmed) return;
      const snapshot = snapshotProducts(products);
      const results = await Promise.all(products.map(async (product) => {
        try { return await window.db.from("productos").delete().eq("id", product.id); }
        catch (error) { return { error }; }
      }));
      const succeededIds = new Set(results.flatMap((result, index) => result.error ? [] : [productId(products[index])]));
      const failed = results.filter((result) => result.error);
      if (!succeededIds.size) {
        message(catalogFeedback, `No se pudieron eliminar los productos: ${failed[0]?.error?.message || "error desconocido"}`, true);
        return;
      }
      state.products = state.products.filter((product) => !succeededIds.has(productId(product)));
      const successfulSnapshot = snapshot.filter((item) => succeededIds.has(String(item.id)));
      state.undo = { snapshot: successfulSnapshot, expires: Date.now() + 10000 };
      salirModoSeleccion();
      showUndo(failed.length ? `${succeededIds.size} productos eliminados; ${failed.length} con errores.` : "Productos eliminados.");
      renderStats(); renderProducts();
      if (state.undo) setTimeout(() => { if (state.undo?.expires <= Date.now()) state.undo = null; }, 10100);
    });
    return;
  }
  $("#bulkInputTitle").textContent = type === "price" ? "Ajustar precios" : "Poner en oferta";
  $("#bulkInputLabel").firstChild.textContent = type === "price" ? "Porcentaje" : "Porcentaje de descuento";
  $("#bulkInputValue").value = "";
  $("#bulkInputValue").min = type === "price" ? "-100" : "0";
  $("#bulkRoundingLabel").hidden = type !== "price";
  $("#bulkInputHint").hidden = type !== "price";
  $("#bulkInputForm").dataset.type = type;
  state.bulkDirty = false;
  clearFieldErrors($("#bulkInputForm"));
  openModal($("#bulkInputDialog"), {
    dirty: () => state.bulkDirty,
    discard: () => { state.bulkDirty = false; $("#bulkInputForm").reset(); }
  });
}
async function applyBulkInput(event) {
  event.preventDefault();
  const type = $("#bulkInputForm").dataset.type;
  const value = $("#bulkInputValue").value.trim();
  const amount = Number(value);
  if (!value) return showFieldError($("#bulkInputValue"), "Ingresá un porcentaje.");
  if (!Number.isFinite(amount) || (type === "offer" && (amount < 0 || amount > 100))) return showFieldError($("#bulkInputValue"), "Ingresá un porcentaje entre 0 y 100.");
  const rounding = Number($("#bulkRounding").value) || 0;
  const dialog = $("#bulkInputDialog");
  const opener = modalData.get(dialog)?.opener;
  await closeModal(dialog, "continue", true);
  if (type === "price") {
    const products = selectedProducts();
    const preview = $("#previewList");
    preview.replaceChildren();
    products.forEach((product) => {
      const next = rounding ? Math.round((Number(product.precio) * (1 + amount / 100)) / rounding) * rounding : Math.round(Number(product.precio) * (1 + amount / 100));
      const row = document.createElement("div");
      row.className = "preview-item";
      const name = document.createElement("span"); name.textContent = product.nombre;
      const prices = document.createElement("strong"); prices.textContent = `${money(product.precio)} → ${money(next)}`;
      row.append(name, prices); preview.append(row);
    });
    openModal($("#previewDialog"), { opener });
    $("#applyPreview").onclick = async () => {
      await closeModal($("#previewDialog"), "apply", true);
      await updateBulkProducts(products, (product) => {
        const next = rounding ? Math.round((Number(product.precio) * (1 + amount / 100)) / rounding) * rounding : Math.round(Number(product.precio) * (1 + amount / 100));
        return { precio: Math.max(0, next) };
      }, "Precios actualizados.");
    };
  } else {
    await updateBulkProducts(selectedProducts(), (product) => ({ en_oferta: true, precio_oferta: Math.round(Number(product.precio) * (1 - amount / 100)) }), "Ofertas actualizadas.");
  }
}

function emptyDraft() {
  return { id: crypto.randomUUID(), nombre: "", precio: 0, stock: 0, categoria_id: state.categories[0]?.id || "", precio_oferta: null, en_oferta: false, estado: "activo", detalles: [], descripcion: "", colores: [{ nombre: "Natural", hex: "#11b5c3", imagenes: [] }] };
}
function cloneDraft(product) {
  return JSON.parse(JSON.stringify(product || emptyDraft()));
}
function fillEditor(product) {
  state.editing = product || null;
  state.draft = cloneDraft(product);
  state.pendingFiles = new Map();
  $("#editorTitle").textContent = product ? "Editar producto" : "Nuevo producto";
  $("#productName").value = state.draft.nombre || "";
  $("#productPrice").value = state.draft.precio || 0;
  $("#productStock").value = state.draft.stock ?? 0;
  $("#productCategory").value = state.draft.categoria_id || state.categories[0]?.id || "";
  $("#productOfferPrice").value = state.draft.precio_oferta || "";
  $("#productOfferPercent").value = state.draft.precio_oferta ? Math.round((1 - state.draft.precio_oferta / state.draft.precio) * 100) : "";
  $("#productOffer").checked = Boolean(state.draft.en_oferta);
  $("#productStatus").value = state.draft.estado || "activo";
  $("#productOrder").value = state.draft.orden ?? 0;
  $("#productDetails").value = normalizarDetalles(state.draft.detalles).join(" | ");
  $("#productDescription").value = state.draft.descripcion || "";
  state.dirty = false;
  clearFieldErrors($("#productForm"));
  renderColors();
  message(editorFeedback, "");
}
function openEditor(product) {
  fillEditor(product);
  openModal(editorDialog, {
    dirty: () => state.dirty,
    discard: async () => {
      state.dirty = false;
      state.productSaveToken++;
      const pendingFiles = state.pendingFiles;
      state.pendingFiles = new Map();
      await cleanupPendingUploads(pendingFiles);
      $("#productForm").reset();
    }
  });
}
function renderColors() {
  const list = $("#colorsList");
  list.replaceChildren();
  state.draft.colores.forEach((color, index) => list.append(renderColorRow(color, index)));
}
function renderColorRow(color, index) {
  const row = document.createElement("div");
  row.className = "color-row";
  const name = document.createElement("input");
  name.value = color.nombre || "";
  name.placeholder = "Nombre del color";
  name.setAttribute("aria-label", "Nombre del color");
  name.addEventListener("input", () => { color.nombre = name.value; state.dirty = true; });
  const hex = document.createElement("input");
  hex.type = "color";
  hex.value = /^#[0-9a-f]{6}$/i.test(color.hex || "") ? color.hex : "#11b5c3";
  hex.defaultValue = hex.value;
  hex.addEventListener("input", () => { color.hex = hex.value; state.dirty = true; });
  const actions = document.createElement("div");
  actions.className = "color-row-actions";
  const up = button("↑", "");
  const down = button("↓", "");
  up.setAttribute("aria-label", "Subir color");
  down.setAttribute("aria-label", "Bajar color");
  up.type = "button";
  down.type = "button";
  up.disabled = index === 0;
  down.disabled = index === state.draft.colores.length - 1;
  up.addEventListener("click", () => moveColor(index, -1));
  down.addEventListener("click", () => moveColor(index, 1));
  actions.append(up, down);
  row.append(name, hex, actions);

  const photos = document.createElement("div");
  photos.className = "photo-strip";
  (color.imagenes || []).forEach((url, photoIndex) => {
    const item = document.createElement("div");
    item.className = "photo-item";
    const image = document.createElement("img");
    image.src = url;
    image.alt = `${color.nombre || "Color"} ${photoIndex + 1}`;
    const remove = button("×", "");
    remove.type = "button";
    remove.setAttribute("aria-label", "Quitar foto");
    remove.addEventListener("click", () => {
      const currentIndex = color.imagenes.indexOf(url);
      if (currentIndex !== -1) color.imagenes.splice(currentIndex, 1);
      state.dirty = true;
      renderColors();
    });
    item.append(image, remove);
    photos.append(item);
  });
  (state.pendingFiles.get(color) || []).forEach((file) => photos.append(renderPendingPhoto(color, file)));

  const picker = document.createElement("label");
  picker.className = "photo-picker";
  picker.append(document.createTextNode("Sacar foto o elegir de la galería"));
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.multiple = true;
  input.className = "sr-only";
  input.addEventListener("change", () => stageFiles(color, input.files, input));
  picker.append(input);
  row.append(photos, picker);
  return row;
}
function renderPendingPhoto(color, photo) {
  const item = document.createElement("div");
  item.className = "photo-item is-pending";
  item.dataset.photoKey = photo.key;
  const image = document.createElement("img");
  image.src = photo.preview;
  image.alt = photo.name;
  const progress = document.createElement("progress");
  progress.className = "photo-progress";
  progress.max = 1;
  progress.value = photo.url ? 1 : 0;
  progress.setAttribute("aria-label", photo.url ? "Foto subida" : "Foto pendiente");
  const status = document.createElement("small");
  status.className = "photo-upload-status";
  status.textContent = photo.url ? "Lista" : "Pendiente";
  const remove = button("×", "");
  remove.type = "button";
  remove.setAttribute("aria-label", "Quitar foto");
  remove.addEventListener("click", () => removePendingPhoto(color, photo));
  item.append(image, progress, status, remove);
  return item;
}
function removePendingPhoto(color, photo) {
  const files = state.pendingFiles.get(color) || [];
  const index = files.indexOf(photo);
  if (index !== -1) files.splice(index, 1);
  if (!files.length) state.pendingFiles.delete(color);
  if (photo.preview) URL.revokeObjectURL(photo.preview);
  if (photo.path && photo.url) {
    window.db.storage.from("productos").remove([photo.path]).catch(() => {});
    color.imagenes = color.imagenes.filter((url) => url !== photo.url);
  }
  const colorIndex = state.draft.colores.indexOf(color);
  const row = $("#colorsList").children[colorIndex];
  if (row) {
    const photoItem = [...row.querySelectorAll(".photo-item")].find((item) => item.dataset.photoKey === photo.key);
    photoItem?.remove();
  }
  state.dirty = true;
}
function moveColor(index, direction) {
  const target = index + direction;
  [state.draft.colores[index], state.draft.colores[target]] = [state.draft.colores[target], state.draft.colores[index]];
  state.dirty = true; renderColors();
}
async function compressImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo preparar la foto.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const webp = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", .82));
  const blob = webp || await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", .82));
  if (!blob) throw new Error("No se pudo preparar la foto.");
  const extension = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `${Date.now()}.${extension}`, { type: blob.type });
}
async function stageFiles(color, fileList, input) {
  const files = [...fileList];
  state.processingImages++;
  $("#saveProductButton").disabled = true;
  try {
    for (const file of files) {
      try {
        const compressed = await compressImage(file);
        const photo = {
          key: String(++state.photoSequence),
          file: compressed,
          name: file.name,
          preview: URL.createObjectURL(compressed),
          url: null,
          path: null
        };
        const pending = state.pendingFiles.get(color) || [];
        pending.push(photo);
        state.pendingFiles.set(color, pending);
        const colorIndex = state.draft.colores.indexOf(color);
        const row = $("#colorsList").children[colorIndex];
        const strip = row?.querySelector(".photo-strip");
        if (strip) strip.append(renderPendingPhoto(color, photo));
        state.dirty = true;
        message(editorFeedback, "");
      } catch (error) {
        message(editorFeedback, "No se pudo subir la foto. Probá con otra o con formato JPG.", true);
      }
    }
  } finally {
    input.value = "";
    state.processingImages = Math.max(0, state.processingImages - 1);
    $("#saveProductButton").disabled = state.savingProduct || state.processingImages > 0;
  }
}

async function uploadFiles(productId, saveToken) {
  for (const color of state.draft.colores) {
    for (const item of state.pendingFiles.get(color) || []) {
      if (item.url) continue;
      const photoElement = [...$("#colorsList").querySelectorAll(".photo-item")].find((element) => element.dataset.photoKey === item.key);
      const progress = photoElement?.querySelector("progress");
      const status = photoElement?.querySelector(".photo-upload-status");
      if (status) status.textContent = "Subiendo…";
      if (progress) {
        progress.removeAttribute("value");
        progress.setAttribute("aria-label", "Foto subiendo");
      }
      item.path = `productos/${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${item.file.type === "image/webp" ? "webp" : "jpg"}`;
      const result = await window.db.storage.from("productos").upload(item.path, item.file, { contentType: item.file.type, upsert: false });
      if (result.error) {
        const error = new Error(result.error.message || "No se pudo subir la foto.");
        error.storageUpload = true;
        error.status = Number(result.error.statusCode || result.error.status);
        throw error;
      }
      if (saveToken !== state.productSaveToken) {
        try { await window.db.storage.from("productos").remove([item.path]); } catch (error) {}
        throw Object.assign(new Error("Guardado cancelado."), { cancelled: true });
      }
      const { data } = window.db.storage.from("productos").getPublicUrl(item.path);
      item.url = data.publicUrl;
      color.imagenes = color.imagenes || [];
      color.imagenes.push(item.url);
      if (progress) {
        progress.value = 1;
        progress.setAttribute("aria-label", "Foto subida");
      }
      if (status) status.textContent = "Lista";
    }
  }
}
async function cleanupPendingUploads(pendingFiles = state.pendingFiles) {
  const paths = [];
  pendingFiles.forEach((photos) => photos.forEach((photo) => {
    if (photo.path && photo.url) paths.push(photo.path);
    if (photo.preview) URL.revokeObjectURL(photo.preview);
  }));
  if (!paths.length || !window.db) return;
  try {
    await window.db.storage.from("productos").remove(paths);
  } catch (error) {
    // Cancelar no debe quedar bloqueado por un fallo de limpieza.
  }
}
function clearPendingFiles() {
  state.pendingFiles.forEach((photos) => photos.forEach((photo) => {
    if (photo.preview) URL.revokeObjectURL(photo.preview);
  }));
  state.pendingFiles = new Map();
}
async function saveProduct(event) {
  event.preventDefault();
  if (state.processingImages || state.savingProduct) return;
  clearFieldErrors($("#productForm"));
  const draft = state.draft;
  draft.nombre = $("#productName").value.trim();
  draft.precio = Number($("#productPrice").value);
  draft.stock = Math.max(0, Math.round(Number($("#productStock").value) || 0));
  draft.categoria_id = $("#productCategory").value || null;
  draft.precio_oferta = $("#productOfferPrice").value ? Number($("#productOfferPrice").value) : null;
  const enOferta = $("#productOffer").checked;
  draft.en_oferta = enOferta;
  draft.estado = draft.stock === 0 && draft.estado !== "oculto" ? "agotado" : $("#productStatus").value;
  draft.orden = Math.round(Number($("#productOrder").value) || 0);
  draft.detalles = normalizarDetalles($("#productDetails").value);
  draft.descripcion = $("#productDescription").value.trim();
  if (!draft.nombre) return showFieldError($("#productName"), "Ingresá un nombre.");
  if (!$("#productPrice").value.trim() || !Number.isFinite(draft.precio) || draft.precio < 0) return showFieldError($("#productPrice"), "Ingresá un precio válido.");
  if (!draft.categoria_id) return showFieldError($("#productCategory"), "Elegí una categoría.");
  if (enOferta && draft.precio_oferta === null) return showFieldError($("#productOfferPrice"), "Ingresá el precio de oferta");
  if (draft.precio_oferta !== null && (draft.precio_oferta < 0 || draft.precio_oferta >= draft.precio)) return showFieldError($("#productOfferPrice"), "Debe ser menor al precio.");
  state.savingProduct = true;
  const saveToken = ++state.productSaveToken;
  $("#saveProductButton").disabled = true;
  message(editorFeedback, "Guardando…");
  try {
    await uploadFiles(draft.id, saveToken);
    if (saveToken !== state.productSaveToken) throw Object.assign(new Error("Guardado cancelado."), { cancelled: true });
    const payload = { id: draft.id, nombre: draft.nombre, precio: draft.precio, stock: draft.stock, categoria_id: draft.categoria_id, precio_oferta: draft.precio_oferta, en_oferta: enOferta, estado: draft.estado, detalles: normalizarDetalles(draft.detalles).join(" | "), descripcion: draft.descripcion, colores: draft.colores, orden: draft.orden };
    let saved;
    if (state.editing) {
      const result = await window.db.from("productos").update(payload).eq("id", state.editing.id).select().single();
      if (result.error) throw result.error;
      saved = result.data;
    } else {
      const result = await window.db.from("productos").insert(payload).select().single();
      if (result.error) throw result.error;
      saved = result.data;
    }
    if (saveToken !== state.productSaveToken) {
      if (!state.editing) await window.db.from("productos").delete().eq("id", saved.id);
      throw Object.assign(new Error("Guardado cancelado."), { cancelled: true });
    }
    state.draft = saved;
    clearPendingFiles();
    message(editorFeedback, "Guardado ✓");
    state.dirty = false;
    await loadCatalog();
    setTimeout(() => closeModal(editorDialog, "saved", true), 450);
  } catch (error) {
    if (error.cancelled) return;
    const errorText = String(error.message || error);
    if (error.storageUpload && (error.status === 403 || error.status === 401 || /row.level security|permission|not authorized|unauthorized/i.test(errorText))) {
      message(editorFeedback, "No tenés permiso para subir fotos. Cerrá sesión y volvé a entrar con el email del dueño.", true);
    } else if (error.storageUpload) {
      message(editorFeedback, "No se pudo subir la foto. Probá con otra o con formato JPG.", true);
    } else {
      message(editorFeedback, errorText || "No se pudo guardar.", true);
    }
  } finally {
    state.savingProduct = false;
    $("#saveProductButton").disabled = state.processingImages > 0;
  }
}

async function duplicateProduct(product) {
  const copy = { ...product, detalles: normalizarDetalles(product.detalles).join(" | "), nombre: `${product.nombre} (copia)`, id: undefined, created_at: undefined, updated_at: undefined };
  delete copy.id; delete copy.created_at; delete copy.updated_at;
  const { data, error } = await window.db.from("productos").insert(copy).select().single();
  if (error) { message(catalogFeedback, error.message, true); return; }
  await loadCatalog(); openEditor(data);
}
async function removeProduct(product) {
  const confirmed = await askConfirmation(`¿Eliminar ${product.nombre}?`);
  if (!confirmed) return;
  const paths = (product.colores || []).flatMap((color) => color.imagenes || []).map(escapePath).filter(Boolean);
  if (paths.length) await window.db.storage.from("productos").remove(paths);
  const { error } = await window.db.from("productos").delete().eq("id", product.id);
  if (error) { message(catalogFeedback, error.message, true); return; }
  await loadCatalog();
}
function renderCategoryList() {
  const list = $("#categoryList");
  list.replaceChildren();
  state.categories.forEach((category) => {
    const row = document.createElement("article");
    row.className = `category-row${category.visible === false ? " is-hidden" : ""}`;
    row.draggable = true;
    row.dataset.id = category.id;
    const image = document.createElement("img");
    image.src = category.imagen_url || publicImage({ colores: [] });
    image.alt = category.nombre;
    const info = document.createElement("div");
    const name = document.createElement("strong"); name.textContent = category.nombre;
    const count = document.createElement("small"); count.textContent = `${state.products.filter((product) => String(product.categoria_id) === String(category.id)).length} productos`;
    info.append(name, count);
    const actions = document.createElement("div");
    actions.className = "category-actions";
    const edit = button("✎", ""); const visibility = button(category.visible === false ? "○" : "●", ""); const remove = button("×", "");
    edit.setAttribute("aria-label", "Editar categoría"); visibility.setAttribute("aria-label", "Mostrar u ocultar categoría"); remove.setAttribute("aria-label", "Eliminar categoría");
    edit.addEventListener("click", () => openCategoryEditor(category)); visibility.addEventListener("click", () => updateCategory(category, { visible: category.visible === false })); remove.addEventListener("click", () => deleteCategory(category));
    actions.append(edit, visibility, remove);
    row.append(image, info, actions);
    row.addEventListener("dragstart", (event) => { event.dataTransfer.setData("text/plain", String(category.id)); });
    row.addEventListener("dragover", (event) => event.preventDefault());
    row.addEventListener("drop", async (event) => {
      event.preventDefault();
      const from = state.categories.findIndex((item) => String(item.id) === event.dataTransfer.getData("text/plain"));
      if (from >= 0 && from !== index) { const [moved] = state.categories.splice(from, 1); state.categories.splice(index, 0, moved); await saveCategoryOrder(); renderCategoryList(); renderCategories(); }
    });
    list.append(row);
  });
}
async function saveCategoryOrder() {
  for (const [index, category] of state.categories.entries()) {
    category.orden = index;
    await window.db.from("categorias").update({ orden: index }).eq("id", category.id);
  }
}
async function updateCategory(category, changes) {
  Object.assign(category, changes);
  const { error } = await window.db.from("categorias").update(changes).eq("id", category.id);
  if (error) message($("#categoryFeedback"), error.message, true);
  renderCategoryList();
}
function openCategoryEditor(category) {
  state.categoryEditing = category || null;
  state.categoryFiles = null;
  state.categoryDirty = false;
  state.categoryImageRemoved = false;
  if (state.categoryPreviewUrl) URL.revokeObjectURL(state.categoryPreviewUrl);
  state.categoryPreviewUrl = null;
  $("#categoryDialogTitle").textContent = category ? "Editar categoría" : "Nueva categoría";
  $("#categoryName").value = category?.nombre || "";
  $("#categoryImage").value = "";
  $("#categoryImageName").textContent = category?.imagen_url ? "Imagen actual" : "Ninguna imagen elegida";
  const preview = $("#categoryImagePreview");
  preview.hidden = !category?.imagen_url;
  if (category?.imagen_url) preview.querySelector("img").src = category.imagen_url;
  clearFieldErrors($("#categoryForm"));
  openModal($("#categoryDialog"), {
    dirty: () => state.categoryDirty,
    discard: () => {
      state.categoryDirty = false;
      state.categoryFiles = null;
      state.categoryImageRemoved = false;
      if (state.categoryPreviewUrl) URL.revokeObjectURL(state.categoryPreviewUrl);
      state.categoryPreviewUrl = null;
      $("#categoryForm").reset();
      $("#categoryImageName").textContent = "Ninguna imagen elegida";
      preview.hidden = true;
    }
  });
}
function showCategoryImage(file) {
  const preview = $("#categoryImagePreview");
  if (state.categoryPreviewUrl) URL.revokeObjectURL(state.categoryPreviewUrl);
  state.categoryPreviewUrl = URL.createObjectURL(file);
  preview.querySelector("img").src = state.categoryPreviewUrl;
  preview.hidden = false;
  $("#categoryImageName").textContent = file.name;
}
async function saveCategory(event) {
  event.preventDefault();
  clearFieldErrors($("#categoryForm"));
  const name = $("#categoryName").value.trim();
  if (!name) return showFieldError($("#categoryName"), "Ingresá un nombre.");
  let imageUrl = state.categoryImageRemoved ? "" : state.categoryEditing?.imagen_url || "";
  const file = $("#categoryImage").files[0];
  if (file) {
    const compressed = await compressImage(file);
    const id = state.categoryEditing?.id || crypto.randomUUID();
    const path = `categorias/${id}/${Date.now()}.webp`;
    const upload = await window.db.storage.from("productos").upload(path, compressed, { contentType: compressed.type, upsert: false });
    if (upload.error) return message($("#categoryFeedback"), upload.error.message, true);
    imageUrl = window.db.storage.from("productos").getPublicUrl(path).data.publicUrl;
  }
  const payload = { nombre: name, imagen_url: imageUrl };
  const result = state.categoryEditing
    ? await window.db.from("categorias").update(payload).eq("id", state.categoryEditing.id).select().single()
    : await window.db.from("categorias").insert({ ...payload, orden: state.categories.length, visible: true }).select().single();
  if (result.error) return message($("#categoryFeedback"), result.error.message, true);
  await closeModal($("#categoryDialog"), "saved", true);
  state.categoryDirty = false;
  if (state.categoryPreviewUrl) URL.revokeObjectURL(state.categoryPreviewUrl);
  state.categoryPreviewUrl = null;
  await loadCatalog(); renderCategoryList();
}
async function deleteCategory(category) {
  const products = state.products.filter((product) => String(product.categoria_id) === String(category.id));
  if (products.length) {
    const select = $("#moveCategoryValue");
    select.replaceChildren();
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "Sin categoría";
    select.append(empty);
    state.categories.filter((item) => String(item.id) !== String(category.id)).forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.nombre;
      select.append(option);
    });
    state.moveCategory = category;
    state.moveCategoryDirty = false;
    openModal($("#moveCategoryDialog"), {
      dirty: () => state.moveCategoryDirty,
      discard: () => { state.moveCategoryDirty = false; $("#moveCategoryForm").reset(); }
    });
    return;
  }
  await confirmDeleteCategory(category, null);
}
async function confirmDeleteCategory(category, target) {
  const products = state.products.filter((product) => String(product.categoria_id) === String(category.id));
  if (products.length && target !== null) {
    const result = await window.db.from("productos").update({ categoria_id: target || null }).eq("categoria_id", category.id);
    if (result.error) return message($("#categoryFeedback"), result.error.message, true);
  }
  if (!(await askConfirmation(`¿Eliminar la categoría ${category.nombre}?`))) return;
  const result = await window.db.from("categorias").delete().eq("id", category.id);
  if (result.error) return message($("#categoryFeedback"), result.error.message, true);
  await loadCatalog(); renderCategoryList();
}
function downloadFile(name, content, type) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 500);
}
function exportJson() {
  const date = new Date().toISOString().slice(0, 10);
  const productos = state.products.map((product) => ({ ...product, detalles: normalizarDetalles(product.detalles).join(" | ") }));
  downloadFile(`law-catalogo-${date}.json`, JSON.stringify({ fecha: new Date().toISOString(), categorias: state.categories, productos }, null, 2), "application/json");
}
function csvCell(value) { 
  return `"${String(value ?? "").replaceAll('"', '""')}"`; 
}

const IMPORT_HEADERS = ["id", "nombre", "categoria", "precio", "precio_oferta", "en_oferta", "stock", "estado", "detalles", "descripcion", "colores", "imagenes", "orden"];
function exportProductCsv(products, filename) {
  const lines = [IMPORT_HEADERS.map(csvCell).join(";")];
  products.forEach((product) => {
    const category = state.categories.find((item) => String(item.id) === String(product.categoria_id));
    const colors = (product.colores || []).map((color) => `${color.nombre || color.name || ""}${color.hex || color.value ? `:${color.hex || color.value}` : ""}`).join(" | ");
    const images = (product.colores || []).flatMap((color) => color.imagenes || []).filter((url) => /^https?:\/\//i.test(url)).join(" | ");
    const values = [
      product.id,
      product.nombre,
      category?.nombre || "",
      product.precio,
      product.precio_oferta ?? "",
      product.en_oferta ? "si" : "no",
      product.stock ?? "",
      product.estado || "activo",
      normalizarDetalles(product.detalles).join(" | "),
      product.descripcion || "",
      colors,
      images,
      product.orden ?? ""
    ];
    lines.push(values.map(csvCell).join(";"));
  });
  downloadFile(filename, `\uFEFF${lines.join("\r\n")}`, "text/csv;charset=utf-8");
}
function exportCsv() {
  exportProductCsv(state.products, `law-productos-${new Date().toISOString().slice(0, 10)}.csv`);
}

function importKey(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}
function normalizedHeader(value) {
  return importKey(value).replace(/[^a-z0-9]/g, "");
}
const IMPORT_ALIASES = {
  id: ["id", "producto id"],
  nombre: ["nombre", "producto", "name"],
  categoria: ["categoria", "category"],
  precio: ["precio", "price"],
  precio_oferta: ["precio oferta", "precio_oferta", "oferta", "precio promocional"],
  en_oferta: ["en oferta", "en_oferta", "oferta activa"],
  stock: ["stock", "cantidad", "existencias"],
  estado: ["estado", "status", "visibilidad"],
  detalles: ["detalles", "detalle", "caracteristicas", "caracteristicas del producto"],
  descripcion: ["descripcion", "description"],
  colores: ["colores", "color", "colores y hex"],
  imagenes: ["imagenes", "imagen", "fotos", "urls de imagen"],
  orden: ["orden", "posicion"]
};
const IMPORT_HEADER_LOOKUP = new Map(Object.entries(IMPORT_ALIASES).flatMap(([key, aliases]) => [key, ...aliases].map((alias) => [normalizedHeader(alias), key])));
function detectCsvDelimiter(text) {
  let commas = 0, semicolons = 0, tabs = 0, quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') i++;
      else quoted = !quoted;
    } else if (!quoted && (char === "\n" || char === "\r")) break;
    else if (!quoted && char === ",") commas++;
    else if (!quoted && char === ";") semicolons++;
    else if (!quoted && char === "\t") tabs++;
  }
  return tabs > semicolons && tabs > commas ? "\t" : semicolons >= commas ? ";" : ",";
}
function parseCsvText(text, delimiter) {
  const rows = [];
  let row = [], cell = "", quoted = false, line = 1, rowLine = 1;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && char === delimiter) {
      row.push(cell); cell = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((value) => String(value).trim())) rows.push({ values: row, line: rowLine });
      row = []; line++; rowLine = line;
    } else {
      cell += char;
      if (char === "\n") line++;
    }
  }
  row.push(cell);
  if (row.some((value) => String(value).trim())) rows.push({ values: row, line: rowLine });
  return rows;
}
function parseNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  let text = String(value ?? "").trim().replace(/\s/g, "").replace(/^\$/, "").replace(/\$/g, "");
  if (!text) return null;
  if (text.includes(",")) text = text.replace(/\./g, "").replace(",", ".");
  else if (/^-?\d{1,3}(?:\.\d{3})+$/.test(text)) text = text.replace(/\./g, "");
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}
function parseBoolean(value) {
  const key = importKey(value);
  if (["si", "1", "true", "verdadero"].includes(key)) return true;
  if (["no", "0", "false", "falso"].includes(key)) return false;
  return null;
}
function parseImportColors(value, product) {
  const items = String(value || "").split("|").map((item) => item.trim()).filter(Boolean);
  if (!items.length) return product ? (product.colores || []).map((color) => ({ ...color, imagenes: [...(color.imagenes || [])] })) : [{ nombre: "Único", hex: "#9ca3af", imagenes: [] }];
  const existing = product?.colores || [];
  return items.map((item) => {
    const match = item.match(/^(.*?)(?:\s*:\s*(#[0-9a-f]{3}(?:[0-9a-f]{3})?))?$/i);
    const nombre = (match?.[1] || item).trim();
    const current = existing.find((color) => importKey(color.nombre || color.name) === importKey(nombre));
    const known = state.products.flatMap((item) => item.colores || []).find((color) => importKey(color.nombre || color.name) === importKey(nombre));
    return { nombre, hex: match?.[2] || current?.hex || known?.hex || known?.value || "#9ca3af", imagenes: [...(current?.imagenes || [])] };
  });
}
function validImageUrls(value) {
  const urls = [], invalid = [];
  String(value || "").split("|").map((item) => item.trim()).filter(Boolean).forEach((item) => {
    try {
      const url = new URL(item);
      if (url.protocol === "http:" || url.protocol === "https:") urls.push(url.href);
      else invalid.push(item);
    } catch (error) { invalid.push(item); }
  });
  return { urls: [...new Set(urls)], invalid };
}
function mapImportColumns(headers) {
  const columns = new Map();
  headers.forEach((header, index) => {
    const key = IMPORT_HEADER_LOOKUP.get(normalizedHeader(header));
    if (key && !columns.has(key)) columns.set(key, index);
  });
  return columns;
}
function makeImportEntries(records) {
  if (!records.length) throw new Error("El archivo no contiene filas de productos.");
  const columns = mapImportColumns(records[0].values);
  if (!columns.has("nombre") || !columns.has("precio")) throw new Error("El archivo debe incluir las columnas Nombre y Precio.");
  const namesSeen = new Set();
  const entries = records.slice(1).map((record) => {
    const original = {};
    records[0].values.forEach((header, index) => { original[String(header || `Columna ${index + 1}`)] = record.values[index] ?? ""; });
    const value = (key) => columns.has(key) ? String(record.values[columns.get(key)] ?? "").trim() : "";
    const id = value("id");
    const name = value("nombre");
    const nameKey = importKey(name);
    const errors = [], warnings = [];
    if (!name) errors.push("Nombre obligatorio");
    if (name.length > 120) errors.push("Nombre supera 120 caracteres");
    let duplicate = false;
    if (nameKey && namesSeen.has(nameKey)) duplicate = true;
    if (nameKey) namesSeen.add(nameKey);
    if (duplicate) errors.push("Duplicado en el archivo");
    const existing = (id ? state.products.find((product) => String(product.id) === id) : null)
      || state.products.find((product) => importKey(product.nombre) === nameKey);
    const categoryName = value("categoria");
    const category = categoryName ? state.categories.find((item) => importKey(item.nombre) === importKey(categoryName)) : null;
    if (!categoryName) warnings.push("Sin categoría");
    const priceText = value("precio");
    const price = priceText ? parseNumber(priceText) : null;
    if (priceText && (price === null || price < 0)) errors.push("Precio inválido");
    if (!existing && !priceText) errors.push("Precio obligatorio");
    const offerText = value("precio_oferta");
    const offer = offerText ? parseNumber(offerText) : null;
    if (offerText && (offer === null || offer < 0)) errors.push("Precio de oferta inválido");
    const currentPrice = priceText ? price : Number(existing?.precio);
    if (offerText && offer !== null && currentPrice !== null && offer >= currentPrice) errors.push("La oferta debe ser menor al precio");
    const offerFlagText = value("en_oferta");
    const offerFlag = offerFlagText ? parseBoolean(offerFlagText) : null;
    if (offerFlagText && offerFlag === null) errors.push("Valor de En oferta inválido");
    const stockText = value("stock");
    const stockValue = stockText ? parseNumber(stockText) : null;
    if (stockText && (stockValue === null || !Number.isInteger(stockValue) || stockValue < 0)) errors.push("Stock debe ser un entero mayor o igual a 0");
    const statusText = value("estado");
    let status = importKey(statusText);
    if (status === "visible") status = "activo";
    if (statusText && !["activo", "agotado", "oculto"].includes(status)) errors.push("Estado inválido");
    const description = value("descripcion");
    if (description.length > 2000) errors.push("Descripción supera 2000 caracteres");
    const detailsText = value("detalles");
    const colorsText = value("colores");
    const imageResult = validImageUrls(value("imagenes"));
    if (imageResult.invalid.length) warnings.push(`${imageResult.invalid.length} URL de imagen inválida(s) omitida(s)`);
    const changes = {};
    if (name) changes.nombre = name;
    if (categoryName) changes.categoria_id = category?.id || null;
    if (priceText && price !== null) changes.precio = price;
    if (offerText && offer !== null) changes.precio_oferta = offer;
    if (offerFlagText) changes.en_oferta = offerFlag;
    else if (offerText && offer !== null) changes.en_oferta = true;
    if (stockText && stockValue !== null) changes.stock = stockValue;
    if (statusText) changes.estado = status;
    if (detailsText) changes.detalles = normalizarDetalles(detailsText).join(" | ");
    if (description) changes.descripcion = description;
    if (colorsText) {
      const importedColors = parseImportColors(colorsText, existing);
      if (existing) {
        const mergedColors = [...(existing.colores || [])];
        importedColors.forEach((color) => {
          const currentIndex = mergedColors.findIndex((item) => importKey(item.nombre || item.name) === importKey(color.nombre));
          if (currentIndex < 0) mergedColors.push(color);
          else mergedColors[currentIndex] = { ...mergedColors[currentIndex], nombre: color.nombre, hex: color.hex };
        });
        changes.colores = mergedColors;
      } else changes.colores = importedColors;
    }
    if (value("orden")) {
      const order = parseNumber(value("orden"));
      if (order === null || !Number.isInteger(order)) errors.push("Orden debe ser un número entero");
      else changes.orden = order;
    }
    if (imageResult.urls.length) {
      if (!changes.colores) changes.colores = parseImportColors("", existing);
      if (!changes.colores.length) changes.colores = [{ nombre: "Único", hex: "#9ca3af", imagenes: [] }];
      changes.colores[0].imagenes = [...new Set([...(changes.colores[0].imagenes || []), ...imageResult.urls])];
    }
    if (stockText && stockValue === 0) changes.estado = "agotado";
    if (existing && statusText === "" && stockText && stockValue === 0) changes.estado = "agotado";
    if (existing && !Object.keys(changes).length) warnings.push("No hay datos para actualizar");
    const next = existing ? { ...existing, ...changes } : {
      id: crypto.randomUUID(), nombre: name, categoria_id: category?.id || null, precio: price ?? 0, precio_oferta: offer ?? null,
      en_oferta: offerFlag ?? (offer !== null), stock: stockText ? stockValue : null,
      estado: stockValue === 0 && stockText ? "agotado" : (status || "activo"),
      detalles: detailsText ? normalizarDetalles(detailsText).join(" | ") : "",
      descripcion: description, colores: changes.colores || [{ nombre: "Único", hex: "#9ca3af", imagenes: [] }],
      orden: changes.orden ?? 0
    };
    if (!existing && !categoryName) next.categoria_id = null;
    return { line: record.line, original, id, name, categoryName, price: changes.precio ?? existing?.precio ?? "", offer: changes.precio_oferta ?? existing?.precio_oferta ?? "", stock: Object.hasOwn(changes, "stock") ? changes.stock : existing?.stock ?? "", existing, changes, next, errors, warnings, category };
  });
  if (entries.length > 1000) throw new Error("El archivo supera el máximo de 1000 filas de productos.");
  return entries;
}
function currentImportMode() { return document.querySelector('input[name="importMode"]:checked')?.value || "all"; }
function importEntryStatus(entry) {
  if (entry.errors.length) return "error";
  if (entry.warnings.length) return "warning";
  return entry.existing ? "update" : "new";
}
function shouldImportEntry(entry) { return !entry.errors.length && (currentImportMode() === "all" || !entry.existing); }
let productImport = { entries: [], running: false, cancelled: false, createdProducts: [], createdCategories: [], updated: [] };
function updateImportCount() {
  const count = productImport.entries.filter(shouldImportEntry).length;
  $("#startImportButton").textContent = `Importar ${count} productos`;
  $("#startImportButton").disabled = count === 0 || productImport.running;
}
function renderImportPreview() {
  const preview = $("#importPreview");
  preview.replaceChildren();
  const filter = $("#importFilter").value;
  const header = document.createElement("div");
  header.className = "import-row import-row-header";
  ["Fila", "Nombre", "Categoría", "Precio", "Oferta", "Stock", "Estado"].forEach((text) => {
    const cell = document.createElement("span"); cell.textContent = text; header.append(cell);
  });
  preview.append(header);
  productImport.entries.filter((entry) => filter === "all" || importEntryStatus(entry) === filter).forEach((entry) => {
    const row = document.createElement("div");
    row.className = "import-row";
    const values = [entry.line, entry.name || "—", entry.categoryName || "Sin categoría", entry.price === "" ? "—" : money(entry.price), entry.offer === "" || entry.offer == null ? "—" : money(entry.offer), entry.stock === "" || entry.stock == null ? "—" : entry.stock];
    values.forEach((value) => { const cell = document.createElement("span"); cell.textContent = String(value); row.append(cell); });
    const statusCell = document.createElement("span");
    const badge = document.createElement("span");
    const status = importEntryStatus(entry);
    badge.className = `import-status${status === "update" ? " is-update" : status === "error" ? " is-error" : status === "warning" ? " is-warning" : ""}`;
    badge.textContent = status === "new" ? "Nuevo" : status === "update" ? "Actualizar" : status === "error" ? "Error" : "Advertencia";
    statusCell.append(badge); row.append(statusCell);
    const messages = [...entry.errors, ...entry.warnings];
    if (messages.length) {
      const reason = document.createElement("small");
      reason.className = "import-message";
      reason.textContent = messages.join(" · ");
      row.append(reason);
    }
    preview.append(row);
  });
  const errors = productImport.entries.filter((entry) => entry.errors.length).length;
  const warnings = productImport.entries.filter((entry) => entry.warnings.length).length;
  const creates = productImport.entries.filter((entry) => !entry.errors.length && !entry.existing).length;
  const updates = productImport.entries.filter((entry) => !entry.errors.length && entry.existing).length;
  $("#importSummary").textContent = `${creates} nuevos, ${updates} a actualizar, ${errors} con errores, ${warnings} advertencias`;
  const categories = [...new Set(productImport.entries.filter((entry) => !entry.errors.length && entry.categoryName && !entry.category).map((entry) => entry.categoryName))];
  $("#importCategories").textContent = categories.length ? `Categorías que se crearán: ${categories.join(", ")}` : "No se crearán categorías.";
  $("#downloadImportErrors").disabled = errors === 0;
  updateImportCount();
}
function resetProductImport() {
  if (productImport.running) {
    productImport.cancelled = true;
    return;
  }
  productImport = { entries: [], running: false, cancelled: false, createdProducts: [], createdCategories: [], updated: [] };
  $("#importFile").value = "";
  $("#importFilter").value = "all";
  document.querySelector('input[name="importMode"][value="all"]').checked = true;
  $("#importStart").hidden = false;
  $("#importPreviewSection").hidden = true;
  $("#importProgressSection").hidden = true;
  $("#importFeedback").textContent = "";
  $("#startImportButton").hidden = true;
  $("#startImportButton").disabled = true;
  $("#cancelImportButton").hidden = true;
  $("#cancelImportButton").disabled = false;
  $("#finishImportButton").hidden = true;
  $("#downloadImportErrors").disabled = true;
  $("#undoImportResultButton").hidden = true;
}
function openProductImport(opener) {
  salirModoSeleccion();
  resetProductImport();
  $("#undoImportButton").hidden = !state.importUndo;
  $("#undoImportResultButton").hidden = true;
  openModal($("#importDialog"), { opener, discard: resetProductImport });
}
function loadSheetJs() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (window.sheetJsPromise) return window.sheetJsPromise;
  window.sheetJsPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
    script.onload = () => resolve(window.XLSX);
    script.onerror = () => { window.sheetJsPromise = null; reject(new Error("No se pudo cargar el lector de Excel. Probá con un archivo CSV.")); };
    document.head.append(script);
  });
  return window.sheetJsPromise;
}
async function readImportFile(file) {
  if (file.size > 5 * 1024 * 1024) throw new Error("El archivo supera el límite de 5 MB.");
  const extension = file.name.split(".").pop().toLowerCase();
  let records;
  if (extension === "csv") {
    const buffer = await file.arrayBuffer();
    let text;
    try { text = new TextDecoder("utf-8", { fatal: true }).decode(buffer); }
    catch (error) { text = new TextDecoder("windows-1252").decode(buffer); }
    text = text.replace(/^\uFEFF/, "");
    records = parseCsvText(text, detectCsvDelimiter(text));
  } else if (extension === "xlsx" || extension === "xls") {
    const XLSX = await loadSheetJs();
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", raw: false });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!firstSheet) throw new Error("El archivo de Excel no tiene hojas.");
    records = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "", raw: false }).map((values, index) => ({ values, line: index + 1 })).filter((row) => row.values.some((value) => String(value).trim()));
  } else throw new Error("Elegí un archivo CSV, XLSX o XLS.");
  if (!records.length) throw new Error("El archivo está vacío.");
  if (records.length - 1 > 1000) throw new Error("El archivo supera el máximo de 1000 filas de productos.");
  return makeImportEntries(records);
}
async function handleImportFile(file) {
  if (!file) return;
  $("#importFeedback").textContent = "";
  try {
    const entries = await readImportFile(file);
    productImport.entries = entries;
    $("#importStart").hidden = true;
    $("#importPreviewSection").hidden = false;
    $("#startImportButton").hidden = false;
    $("#downloadImportErrors").disabled = !entries.some((entry) => entry.errors.length);
    renderImportPreview();
  } catch (error) {
    $("#importFeedback").textContent = error.message || "No se pudo leer el archivo.";
  } finally {
    $("#importFile").value = "";
  }
}
function downloadImportTemplate() {
  const rows = [
    IMPORT_HEADERS,
    ["", "Botella térmica", "Botellas", "18900", "15900", "si", "12", "activo", "Capacidad: 750 ml | Material: acero inoxidable", "Botella térmica de ejemplo", "Turquesa:#14b8c4 | Negro:#111111", "https://example.com/imagen.jpg", "1"],
    ["", "Producto simple", "", "10000", "", "", "", "activo", "30 cm | 2 litros", "", "", "", ""]
  ];
  downloadFile("plantilla-productos.csv", `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`, "text/csv;charset=utf-8");
}
function downloadImportErrors() {
  const errors = productImport.entries.filter((entry) => entry.errors.length);
  if (!errors.length) return;
  const rows = [["Fila", "Motivo", ...IMPORT_HEADERS], ...errors.map((entry) => [
    entry.line, entry.errors.join(" | "), ...IMPORT_HEADERS.map((key) => {
      const mapped = IMPORT_ALIASES[key].map(normalizedHeader).find((alias) => Object.keys(entry.original).some((header) => normalizedHeader(header) === alias));
      const header = Object.keys(entry.original).find((item) => normalizedHeader(item) === mapped);
      return header ? entry.original[header] : "";
    })
  ])];
  downloadFile("errores-importacion.csv", `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`, "text/csv;charset=utf-8");
}
async function createImportCategories(entries) {
  const names = [...new Set(entries.filter((entry) => !entry.errors.length && entry.categoryName && !entry.category).map((entry) => entry.categoryName))];
  for (const name of names) {
    if (productImport.cancelled) break;
    try {
      const result = await window.db.from("categorias").insert({ nombre: name, visible: true, orden: Math.max(-1, ...state.categories.map((item) => Number(item.orden) || 0)) + 1 }).select().single();
      if (result.error) throw result.error;
      if (!result.data?.id) throw new Error("El servidor no devolvió la categoría creada.");
      state.importUndo.createdCategories.push(result.data.id);
      state.categories.push(result.data);
      entries.filter((entry) => importKey(entry.categoryName) === importKey(name)).forEach((entry) => {
        entry.category = result.data;
        entry.changes.categoria_id = result.data.id;
        entry.next.categoria_id = result.data.id;
      });
    } catch (error) {
      entries.filter((entry) => importKey(entry.categoryName) === importKey(name)).forEach((entry) => entry.errors.push(`No se pudo crear la categoría: ${error.message || error}`));
    }
  }
}
async function runProductImport() {
  if (productImport.running) return;
  const entries = productImport.entries.filter(shouldImportEntry);
  if (!entries.length) return;
  productImport.running = true;
  productImport.cancelled = false;
  state.importUndo = { createdProducts: [], createdCategories: [], updated: [] };
  $("#undoImportButton").hidden = true;
  $("#undoImportResultButton").hidden = true;
  $("#importStart").hidden = true;
  $("#importPreviewSection").hidden = true;
  $("#importProgressSection").hidden = false;
  $("#importProgress").value = 0;
  $("#importProgressText").textContent = "";
  $("#startImportButton").hidden = true;
  $("#cancelImportButton").disabled = false;
  $("#cancelImportButton").hidden = false;
  $("#importFeedback").textContent = "";
  let created = 0, updated = 0;
  try {
    await createImportCategories(entries);
    for (let offset = 0; offset < entries.length; offset += 50) {
      if (productImport.cancelled) break;
      const batch = entries.slice(offset, offset + 50).filter((entry) => !entry.errors.length);
      const newEntries = batch.filter((entry) => !entry.existing);
      for (const entry of batch.filter((item) => item.existing)) {
        if (productImport.cancelled) break;
        try {
          const before = { ...entry.existing };
          const result = await window.db.from("productos").update(entry.changes).eq("id", entry.existing.id);
          if (result.error) throw result.error;
          state.importUndo.updated.push({ id: entry.existing.id, before });
          updated++;
        } catch (error) {
          entry.errors.push(error.message || "No se pudo actualizar");
        }
      }
      if (newEntries.length && !productImport.cancelled) {
        try {
          const result = await window.db.from("productos").insert(newEntries.map((entry) => entry.next)).select();
          if (result.error) throw result.error;
          if (!Array.isArray(result.data)) throw new Error("El servidor no devolvió los productos importados.");
          result.data.forEach((product) => state.importUndo.createdProducts.push(product.id));
          created += result.data.length;
        } catch (error) {
          newEntries.forEach((entry) => entry.errors.push(error.message || "No se pudo crear el producto"));
        }
      }
      const done = Math.min(offset + 50, entries.length);
      $("#importProgress").value = Math.round(done / entries.length * 100);
      $("#importProgressText").textContent = `Procesados ${done} de ${entries.length} productos.`;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    const failed = productImport.entries.filter((entry) => entry.errors.length).length;
    await loadCatalog();
    renderImportPreview();
    $("#importPreviewSection").hidden = false;
    $("#importProgressSection").hidden = true;
    $("#cancelImportButton").hidden = true;
    $("#finishImportButton").hidden = false;
    $("#importFeedback").textContent = `${productImport.cancelled ? "Importación cancelada. " : ""}Creados ${created}, actualizados ${updated}, con errores ${failed}.`;
    const hasUndo = state.importUndo.createdProducts.length || state.importUndo.createdCategories.length || state.importUndo.updated.length;
    if (hasUndo) {
      state.importUndo.created = created;
      state.importUndo.updatedCount = updated;
      $("#undoImportButton").hidden = false;
      $("#undoImportResultButton").hidden = false;
    } else state.importUndo = null;
  } catch (error) {
    $("#importFeedback").textContent = error.message || "No se pudo completar la importación.";
    $("#importProgressSection").hidden = true;
    $("#importPreviewSection").hidden = false;
    $("#cancelImportButton").hidden = true;
    $("#finishImportButton").hidden = false;
  } finally {
    productImport.running = false;
    $("#cancelImportButton").disabled = false;
    updateImportCount();
  }
}
async function undoProductImport() {
  const undo = state.importUndo;
  if (!undo) return;
  const failures = [];
  try {
    for (const item of undo.updated) {
      const { id, before } = item;
      const restore = { ...before };
      delete restore.id; delete restore.created_at; delete restore.updated_at;
      const result = await window.db.from("productos").update(restore).eq("id", id);
      if (result.error) failures.push(result.error.message);
    }
    if (undo.createdProducts.length) {
      const result = await window.db.from("productos").delete().in("id", undo.createdProducts);
      if (result.error) failures.push(result.error.message);
    }
    if (undo.createdCategories.length) {
      const result = await window.db.from("categorias").delete().in("id", undo.createdCategories);
      if (result.error) failures.push(result.error.message);
    }
    await loadCatalog();
    if (failures.length) message(catalogFeedback, `No se pudo deshacer completamente: ${failures.join(" · ")}`, true);
    else {
      state.importUndo = null;
      $("#undoImportButton").hidden = true;
      $("#undoImportResultButton").hidden = true;
      message(catalogFeedback, "Importación deshecha.");
    }
  } catch (error) {
    message(catalogFeedback, error.message || "No se pudo deshacer la importación.", true);
  }
}


function askConfirmation(text) {
  const discard = text.startsWith("Hay cambios sin guardar.");
  if (discard) {
    $("#confirmTitle").textContent = "¿Descartar cambios?";
    $("#confirmAction").textContent = "Descartar";
    $("#confirmAction").className = "primary-button";
    $("#confirmDialog [data-cerrar].btn-cancelar").textContent = "Seguir editando";
  } else {
    $("#confirmTitle").textContent = "¿Eliminar producto?";
    $("#confirmAction").textContent = "Eliminar";
    $("#confirmAction").className = "danger-button";
    $("#confirmDialog [data-cerrar].btn-cancelar").textContent = "Cancelar";
  }
  $("#confirmText").textContent = text;
  return new Promise((resolve) => openModal(confirmDialog, { onClose: (value) => resolve(value === "confirm") }));
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFieldErrors(loginForm);
  if (!$("#loginEmail").value.trim()) return showFieldError($("#loginEmail"), "Ingresá tu email.");
  if (!$("#loginEmail").validity.valid) return showFieldError($("#loginEmail"), "Ingresá un email válido.");
  if (!$("#loginPassword").value) return showFieldError($("#loginPassword"), "Ingresá tu contraseña.");
  if (!window.db) { message(loginFeedback, "Supabase no está configurado.", true); return; }
  message(loginFeedback, "Ingresando…");
  const { data, error } = await window.db.auth.signInWithPassword({ email: $("#loginEmail").value.trim(), password: $("#loginPassword").value });
  if (error) { message(loginFeedback, "Email o contraseña incorrectos.", true); return; }
  await checkSession(data.session);
});
$("#togglePassword").addEventListener("click", () => {
  const input = $("#loginPassword");
  const visible = input.type === "text";
  input.type = visible ? "password" : "text";
  $("#togglePassword").textContent = visible ? "Mostrar" : "Ocultar";
});
$("#logoutButton").addEventListener("click", async () => { salirModoSeleccion(); await window.db.auth.signOut(); authView.hidden = false; adminView.hidden = true; $("#adminNav").hidden = true; });
$("#selectionButton").addEventListener("click", () => {
  if (state.modoSeleccion) salirModoSeleccion();
  else entrarModoSeleccion();
});
productList.addEventListener("change", (event) => {
  const checkbox = event.target.closest(".selection-box[data-selection-id]");
  if (!checkbox || !state.modoSeleccion) return;
  const id = checkbox.dataset.selectionId;
  if (checkbox.checked) state.selected.add(id);
  else state.selected.delete(id);
  checkbox.closest(".product-card")?.classList.toggle("is-selected", checkbox.checked);
  $("#selectedCount").textContent = String(state.selected.size);
});
$("#searchInput").addEventListener("input", (event) => { state.search = event.target.value; state.page = 30; renderProducts(); });
$("#categoryFilter").addEventListener("change", (event) => { state.category = event.target.value; state.page = 30; renderProducts(); });
$("#sortSelect").addEventListener("change", (event) => { state.sort = event.target.value; renderProducts(); });
$("#moreButton").addEventListener("click", () => { state.page += 30; renderProducts(); });
$("#newProductButton").addEventListener("click", () => openEditor());
$("#addColorButton").addEventListener("click", () => { state.draft.colores.push({ nombre: "", hex: "#11b5c3", imagenes: [] }); state.dirty = true; renderColors(); });
$("#productForm").addEventListener("submit", saveProduct);
$("#productOfferPrice").addEventListener("input", (event) => {
  const price = Number($("#productPrice").value);
  const offer = Number(event.target.value);
  if (event.target.closest(".campo")?.querySelector(".field-error")?.textContent) fieldError(event.target, "");
  $("#productOfferPercent").value = price && offer < price ? Math.round((1 - offer / price) * 100) : "";
});
$("#productOfferPercent").addEventListener("input", (event) => {
  const price = Number($("#productPrice").value);
  const percent = Number(event.target.value);
  if (price && percent >= 0 && percent <= 100) $("#productOfferPrice").value = Math.round(price * (1 - percent / 100));
});
$("#productForm").addEventListener("input", () => { state.dirty = true; });
$("#adminNav").addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (!button) return;
  const view = button.dataset.view;
  if (location.hash !== `#${view}`) history.pushState({ panelView: view }, "", `#${view}`);
  cambiarPantalla(view);
});
$("#newCategoryButton").addEventListener("click", () => openCategoryEditor());
$("#categoryForm").addEventListener("submit", saveCategory);
$("#categoryName").addEventListener("input", () => { state.categoryDirty = true; });
$("#categoryForm").addEventListener("input", (event) => {
  const error = event.target.closest(".campo")?.querySelector(".field-error");
  if (error?.textContent) fieldError(event.target, "");
});
$("#categoryImage").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  state.categoryFiles = file;
  state.categoryImageRemoved = false;
  state.categoryDirty = true;
  showCategoryImage(file);
});
$("#removeCategoryImage").addEventListener("click", () => {
  $("#categoryImage").value = "";
  state.categoryFiles = null;
  state.categoryImageRemoved = true;
  state.categoryDirty = true;
  $("#categoryImageName").textContent = "Ninguna imagen elegida";
  $("#categoryImagePreview").hidden = true;
  if (state.categoryPreviewUrl) URL.revokeObjectURL(state.categoryPreviewUrl);
  state.categoryPreviewUrl = null;
});
$("#bulkBar").addEventListener("click", (event) => {
  const action = event.target.closest("[data-bulk]")?.dataset.bulk;
  if (!action) return;
  if (action === "hide") updateBulkProducts(selectedProducts(), () => ({ estado: "oculto" }), "Productos ocultados.");
  else if (action === "show") updateBulkProducts(selectedProducts(), (product) => ({ estado: Number(product.stock) === 0 ? "agotado" : "activo" }), "Productos mostrados.");
  else if (action === "soldout") updateBulkProducts(selectedProducts(), () => ({ estado: "agotado", stock: 0 }), "Productos marcados como agotados.");
  else openBulkInput(action);
});
$("#selectAllButton").addEventListener("click", () => {
  const visible = visibleProducts();
  if (visible.every((product) => state.selected.has(productId(product)))) visible.forEach((product) => state.selected.delete(productId(product)));
  else visible.forEach((product) => state.selected.add(productId(product)));
  renderProducts();
});
$("#bulkInputForm").addEventListener("submit", applyBulkInput);
$("#bulkInputValue").addEventListener("input", () => { state.bulkDirty = true; });
$("#bulkInputValue").addEventListener("input", (event) => {
  if (event.target.closest(".campo")?.querySelector(".field-error")?.textContent) fieldError(event.target, "");
});
$("#bulkCategoryValue").addEventListener("change", () => { state.bulkDirty = true; });
$("#bulkCategoryForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const products = state.bulkCategoryProducts;
  const categoryId = $("#bulkCategoryValue").value;
  if (!categoryId) return showFieldError($("#bulkCategoryValue"), "Elegí una categoría.");
  await closeModal($("#bulkCategoryDialog"), "apply", true);
  await updateBulkProducts(products, () => ({ categoria_id: categoryId }), "Categoría actualizada.");
});
$("#moveCategoryValue").addEventListener("change", () => { state.moveCategoryDirty = true; });
$("#moveCategoryForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const category = state.moveCategory;
  const target = $("#moveCategoryValue").value;
  state.moveCategoryDirty = false;
  await closeModal($("#moveCategoryDialog"), "continue", true);
  if (category) await confirmDeleteCategory(category, target);
});
$("#offerValue").addEventListener("input", () => { state.offerDirty = true; });
$("#offerValue").addEventListener("input", (event) => {
  if ($("#offerValueError").textContent) fieldError(event.target, "");
});
$("#offerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFieldErrors($("#offerForm"));
  const raw = $("#offerValue").value.trim();
  const number = Number(raw);
  const product = state.offerProduct;
  if (!raw) return showFieldError($("#offerValue"), "Ingresá un precio o descuento.");
  if (!Number.isFinite(number) || number < 0) return showFieldError($("#offerValue"), "Ingresá un valor válido.");
  const precio_oferta = number < 100 ? Math.round(Number(product.precio) * (1 - number / 100)) : number;
  if (precio_oferta >= Number(product.precio)) return showFieldError($("#offerValue"), "Debe ser menor al precio actual.");
  if (await updateProduct(product, { precio_oferta, en_oferta: true })) {
    state.offerDirty = false;
    await closeModal($("#offerDialog"), "apply", true);
    renderProducts();
  }
});
$("#confirmAction").addEventListener("click", () => closeModal(confirmDialog, "confirm", true));
$("#categoryForm").addEventListener("reset", () => {
  clearFieldErrors($("#categoryForm"));
});
$("#exportJsonButton").addEventListener("click", exportJson);
$("#exportCsvButton").addEventListener("click", exportCsv);
$("#importProductsButton").addEventListener("click", (event) => openProductImport(event.currentTarget));
$("#downloadImportTemplate").addEventListener("click", downloadImportTemplate);
$("#importFile").addEventListener("change", (event) => handleImportFile(event.target.files?.[0]));
$("#importDropzone").addEventListener("dragover", (event) => { event.preventDefault(); event.currentTarget.classList.add("is-dragging"); });
$("#importDropzone").addEventListener("dragleave", (event) => event.currentTarget.classList.remove("is-dragging"));
$("#importDropzone").addEventListener("drop", (event) => {
  event.preventDefault();
  event.currentTarget.classList.remove("is-dragging");
  handleImportFile(event.dataTransfer.files?.[0]);
});
$("#importDropzone").addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); $("#importFile").click(); }
});
$("#importFilter").addEventListener("change", renderImportPreview);
document.querySelectorAll('input[name="importMode"]').forEach((input) => input.addEventListener("change", updateImportCount));
$("#downloadImportErrors").addEventListener("click", downloadImportErrors);
$("#startImportButton").addEventListener("click", runProductImport);
$("#cancelImportButton").addEventListener("click", () => {
  productImport.cancelled = true;
  $("#cancelImportButton").disabled = true;
  $("#importProgressText").textContent = "Cancelando después del lote actual…";
});
$("#finishImportButton").addEventListener("click", () => closeModal($("#importDialog"), "done", true));
$("#undoImportButton").addEventListener("click", undoProductImport);
$("#undoImportResultButton").addEventListener("click", undoProductImport);
$("#passwordForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  clearFieldErrors(event.currentTarget);
  const password = $("#newPassword").value;
  if (!password) return showFieldError($("#newPassword"), "Ingresá una contraseña.");
  if (password.length < 6) return showFieldError($("#newPassword"), "Usá al menos 6 caracteres.");
  if (password !== $("#repeatPassword").value) return showFieldError($("#repeatPassword"), "Las contraseñas no coinciden.");
  const { error } = await window.db.auth.updateUser({ password });
  if (error) return message($("#settingsFeedback"), error.message, true);
  event.target.reset(); message($("#settingsFeedback"), "Contraseña actualizada ✓");
});

if (window.db) {
  window.db.auth.getSession().then(({ data }) => checkSession(data.session));
  window.db.auth.onAuthStateChange((_event, session) => { if (!session) { salirModoSeleccion(); authView.hidden = false; adminView.hidden = true; $("#adminNav").hidden = true; } });
} else {
  message(loginFeedback, "Supabase no está configurado.", true);
}
