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
  selected: new Set(),
  undo: null,
  categoryEditing: null,
  categoryFiles: null,
  bulkMode: false
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

function message(element, text, error = false) {
  element.textContent = text;
  element.classList.toggle("error", error);
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
  state.products = productsResult.data || [];
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
    if (ok) { original = input.value; flash(input, "Guardado ✓"); } else input.value = original;
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
  const list = visibleProducts();
  productList.replaceChildren();
  list.slice(0, state.page).forEach((product) => productList.append(createProductCard(product)));
  $("#bulkBar").hidden = !state.bulkMode;
  $("#selectedCount").textContent = state.selected.size;
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
  const selection = document.createElement("input");
  selection.type = "checkbox";
  selection.className = "selection-box";
  selection.checked = state.selected.has(productId(product));
  selection.setAttribute("aria-label", `Seleccionar ${product.nombre}`);
  selection.hidden = !state.bulkMode;
  selection.addEventListener("change", () => {
    if (selection.checked) state.selected.add(productId(product)); else state.selected.delete(productId(product));
    card.classList.toggle("is-selected", selection.checked);
    $("#selectedCount").textContent = state.selected.size;
  });
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
  const price = inlineNumber(product.precio, `Precio de ${product.nombre}`, (value) => updateProduct(product, { precio: value }));
  const stockControl = document.createElement("div");
  stockControl.className = "stock-control";
  const minus = button("−");
  const stock = inlineNumber(product.stock, `Stock de ${product.nombre}`, (value) => updateStock(product, value));
  const plus = button("+");
  minus.setAttribute("aria-label", "Restar stock");
  plus.setAttribute("aria-label", "Sumar stock");
  minus.addEventListener("click", () => updateStock(product, Math.max(0, Number(product.stock) - 1)));
  plus.addEventListener("click", () => updateStock(product, Number(product.stock) + 1));
  stockControl.append(minus, stock, plus);
  values.append(price, stockControl);
  main.append(name, meta);
  const switches = document.createElement("div");
  switches.className = "quick-switches";
  switches.append(toggle("Visible", product.estado !== "oculto", () => updateProduct(product, { estado: product.estado === "oculto" ? (Number(product.stock) === 0 ? "agotado" : "activo") : "oculto" })));
  switches.append(toggle("Agotado", product.estado === "agotado", () => updateStock(product, 0)));
  switches.append(toggle("En oferta", Boolean(product.en_oferta), () => toggleOffer(product)));
  const actions = document.createElement("div");
  actions.className = "product-actions";
  const menuButton = button("⋯");
  menuButton.setAttribute("aria-label", `Acciones de ${product.nombre}`);
  const wrap = document.createElement("div");
  wrap.className = "menu-wrap";
  wrap.append(menuButton);
  menuButton.addEventListener("click", () => showMenu(wrap, product));
  actions.append(wrap);
  const pressTimer = { id: null };
  card.addEventListener("pointerdown", (event) => {
    if (state.bulkMode || event.target.closest("input,button")) return;
    pressTimer.id = setTimeout(() => {
      state.bulkMode = true;
      state.selected.add(productId(product));
      renderProducts();
    }, 550);
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((type) => card.addEventListener(type, () => clearTimeout(pressTimer.id)));
  card.prepend(selection);
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
function showMenu(wrapper, product) {
  document.querySelectorAll(".menu-popover").forEach((menu) => menu.remove());
  const menu = document.createElement("div");
  menu.className = "menu-popover";
  [["Editar", () => openEditor(product)], ["Destacar arriba", () => featureProduct(product)], ["Duplicar", () => duplicateProduct(product)], ["Eliminar", () => removeProduct(product)]].forEach(([label, action]) => {
    const item = button(label, "");
    item.addEventListener("click", () => { menu.remove(); action(); });
    menu.append(item);
  });
  wrapper.append(menu);
}

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
  if (changes.precio !== undefined) renderProducts();
  renderStats();
  return true;
}
async function updateStock(product, value) {
  const stock = Math.max(0, Math.round(Number(value) || 0));
  const estado = stock === 0 ? "agotado" : product.estado === "agotado" ? "activo" : product.estado;
  const ok = await updateProduct(product, { stock, estado });
  if (ok) renderProducts();
  return ok;
}
async function toggleOffer(product) {
  if (!product.en_oferta && (!product.precio_oferta || Number(product.precio_oferta) >= Number(product.precio))) {
    const value = window.prompt("Precio de oferta o % de descuento", "");
    if (value === null) return;
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) { message(catalogFeedback, "Ingresá un valor válido.", true); return; }
    const precio_oferta = number < 100 ? Math.round(Number(product.precio) * (1 - number / 100)) : number;
    if (precio_oferta >= Number(product.precio)) { message(catalogFeedback, "El precio de oferta debe ser menor al precio.", true); return; }
    await updateProduct(product, { precio_oferta, en_oferta: true });
  } else {
    await updateProduct(product, { en_oferta: !product.en_oferta });
  }
  renderProducts();
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
function setBulkMode(enabled) {
  state.bulkMode = enabled;
  if (!enabled) state.selected.clear();
  renderProducts();
}
function snapshotProducts(products) {
  return products.map((product) => ({ id: product.id, record: JSON.parse(JSON.stringify(product)), values: { estado: product.estado, precio: product.precio, precio_oferta: product.precio_oferta, en_oferta: product.en_oferta, categoria_id: product.categoria_id, stock: product.stock, orden: product.orden } }));
}
async function updateBulkProducts(products, changesFactory, successText = "Cambios aplicados.") {
  const snapshot = snapshotProducts(products);
  for (const product of products) {
    const changes = changesFactory(product);
    Object.assign(product, changes);
    const { error } = await window.db.from("productos").update(changes).eq("id", product.id);
    if (error) {
      message(catalogFeedback, error.message, true);
      await restoreSnapshot(snapshot, false);
      return false;
    }
  }
  state.undo = { snapshot, expires: Date.now() + 10000 };
  message(catalogFeedback, "");
  showUndo(successText);
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
    const options = state.categories.map((category) => `${category.id}: ${category.nombre}`).join("\n");
    const value = window.prompt(`Ingresá el ID de la categoría:\n${options}`, state.categories[0]?.id || "");
    if (value !== null) updateBulkProducts(products, () => ({ categoria_id: value }), "Categoría actualizada.");
    return;
  }
  if (type === "delete") {
    askConfirmation(`¿Eliminar ${products.length} productos?`).then(async (confirmed) => {
      if (!confirmed) return;
      const snapshot = snapshotProducts(products);
      const results = await Promise.all(products.map((product) => window.db.from("productos").delete().eq("id", product.id)));
      const failed = results.find((result) => result.error);
      if (failed) return message(catalogFeedback, failed.error.message, true);
      state.products = state.products.filter((product) => !state.selected.has(productId(product)));
      state.selected.clear();
      state.undo = { snapshot, expires: Date.now() + 10000 };
      showUndo("Productos eliminados.");
      renderStats(); renderProducts();
    });
    return;
  }
  $("#bulkInputTitle").textContent = type === "price" ? "Ajustar precios" : "Poner en oferta";
  $("#bulkInputLabel").firstChild.textContent = type === "price" ? "Porcentaje (positivo aumenta, negativo reduce)" : "Porcentaje de descuento";
  $("#bulkInputValue").value = "";
  $("#bulkInputValue").min = type === "price" ? "-100" : "0";
  $("#bulkRoundingLabel").hidden = type !== "price";
  $("#bulkInputForm").dataset.type = type;
  $("#bulkInputDialog").showModal();
}
async function applyBulkInput(event) {
  event.preventDefault();
  const type = $("#bulkInputForm").dataset.type;
  const amount = Number($("#bulkInputValue").value);
  if (!Number.isFinite(amount) || (type === "offer" && (amount < 0 || amount > 100))) return;
  const rounding = Number($("#bulkRounding").value) || 0;
  $("#bulkInputDialog").close();
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
    $("#previewDialog").showModal();
    $("#applyPreview").onclick = async () => {
      $("#previewDialog").close();
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
  return { nombre: "", precio: 0, stock: 0, categoria_id: state.categories[0]?.id || "", precio_oferta: null, en_oferta: false, estado: "activo", detalles: [], descripcion: "", colores: [{ nombre: "Natural", hex: "#11b5c3", imagenes: [] }] };
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
  $("#productDetails").value = Array.isArray(state.draft.detalles) ? state.draft.detalles.join(" | ") : state.draft.detalles || "";
  $("#productDescription").value = state.draft.descripcion || "";
  state.dirty = false;
  renderColors();
  message(editorFeedback, "");
}
function openEditor(product) {
  fillEditor(product);
  editorDialog.showModal();
}
function renderColors() {
  const list = $("#colorsList");
  list.replaceChildren();
  state.draft.colores.forEach((color, index) => {
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
    hex.addEventListener("input", () => { color.hex = hex.value; state.dirty = true; });
    const actions = document.createElement("div");
    actions.className = "color-row-actions";
    const up = button("↑", "");
    const down = button("↓", "");
    up.setAttribute("aria-label", "Subir color");
    down.setAttribute("aria-label", "Bajar color");
    up.disabled = index === 0; down.disabled = index === state.draft.colores.length - 1;
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
      image.src = url; image.alt = `${color.nombre || "Color"} ${photoIndex + 1}`;
      const remove = button("×", "");
      remove.setAttribute("aria-label", "Quitar foto");
      remove.addEventListener("click", () => { color.imagenes.splice(photoIndex, 1); state.dirty = true; renderColors(); });
      item.append(image, remove); photos.append(item);
    });
    const files = state.pendingFiles.get(index) || [];
    files.forEach((file) => {
      const item = document.createElement("div");
      item.className = "photo-item";
      const image = document.createElement("img"); image.src = file.preview; image.alt = file.name;
      item.append(image); photos.append(item);
    });
    const picker = document.createElement("label");
    picker.className = "photo-picker";
    picker.textContent = "Sacar foto o elegir de la galería";
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*"; input.multiple = true; input.className = "sr-only";
    input.addEventListener("change", () => stageFiles(index, input.files));
    picker.append(input);
    row.append(photos, picker);
    list.append(row);
  });
}
function moveColor(index, direction) {
  const target = index + direction;
  [state.draft.colores[index], state.draft.colores[target]] = [state.draft.colores[target], state.draft.colores[index]];
  const files = state.pendingFiles.get(index);
  const targetFiles = state.pendingFiles.get(target);
  if (files) state.pendingFiles.set(target, files); else state.pendingFiles.delete(target);
  if (targetFiles) state.pendingFiles.set(index, targetFiles); else state.pendingFiles.delete(index);
  state.dirty = true; renderColors();
}
async function compressImage(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const webp = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", .82));
  const blob = webp || await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", .82));
  return new File([blob], `${Date.now()}.webp`, { type: blob.type });
}
async function stageFiles(index, fileList) {
  const files = [];
  for (const file of [...fileList]) {
    try { const compressed = await compressImage(file); files.push({ file: compressed, name: file.name, preview: URL.createObjectURL(compressed) }); }
    catch (error) { message(editorFeedback, "No se pudo procesar una imagen.", true); }
  }
  state.pendingFiles.set(index, [...(state.pendingFiles.get(index) || []), ...files]);
  state.dirty = true; renderColors();
}

async function uploadFiles(productId) {
  for (const [index, files] of state.pendingFiles) {
    for (const item of files) {
      const path = `productos/${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
      const result = await window.db.storage.from("productos").upload(path, item.file, { contentType: item.file.type, upsert: false });
      if (result.error) throw result.error;
      const { data } = window.db.storage.from("productos").getPublicUrl(path);
      state.draft.colores[index].imagenes.push(data.publicUrl);
    }
  }
}
async function saveProduct(event) {
  event.preventDefault();
  const draft = state.draft;
  draft.nombre = $("#productName").value.trim();
  draft.precio = Number($("#productPrice").value);
  draft.stock = Math.max(0, Math.round(Number($("#productStock").value) || 0));
  draft.categoria_id = $("#productCategory").value || null;
  draft.precio_oferta = $("#productOfferPrice").value ? Number($("#productOfferPrice").value) : null;
  draft.en_oferta = $("#productOffer").checked;
  draft.estado = draft.stock === 0 && draft.estado !== "oculto" ? "agotado" : $("#productStatus").value;
  draft.orden = Math.round(Number($("#productOrder").value) || 0);
  draft.detalles = $("#productDetails").value.split("|").map((item) => item.trim()).filter(Boolean);
  draft.descripcion = $("#productDescription").value.trim();
  if (!draft.nombre) { message(editorFeedback, "El nombre es obligatorio.", true); return; }
  if (!Number.isFinite(draft.precio) || draft.precio < 0) { message(editorFeedback, "El precio debe ser mayor o igual a 0.", true); return; }
  if (draft.precio_oferta !== null && (draft.precio_oferta < 0 || draft.precio_oferta >= draft.precio)) { message(editorFeedback, "El precio de oferta debe ser menor al precio.", true); return; }
  $("#saveProductButton").disabled = true;
  message(editorFeedback, "Guardando…");
  try {
    const payload = { nombre: draft.nombre, precio: draft.precio, stock: draft.stock, categoria_id: draft.categoria_id, precio_oferta: draft.precio_oferta, en_oferta: draft.en_oferta, estado: draft.estado, detalles: draft.detalles, descripcion: draft.descripcion, colores: draft.colores, orden: draft.orden };
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
    state.draft = saved;
    await uploadFiles(saved.id);
    if (state.pendingFiles.size) {
      const result = await window.db.from("productos").update({ colores: state.draft.colores }).eq("id", saved.id);
      if (result.error) throw result.error;
    }
    message(editorFeedback, "Guardado ✓");
    state.dirty = false;
    await loadCatalog();
    setTimeout(() => editorDialog.close(), 450);
  } catch (error) {
    message(editorFeedback, error.message || "No se pudo guardar.", true);
  } finally { $("#saveProductButton").disabled = false; }
}

async function duplicateProduct(product) {
  const copy = { ...product, nombre: `${product.nombre} (copia)`, id: undefined, created_at: undefined, updated_at: undefined };
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
  state.categories.forEach((category, index) => {
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
    const up = button("↑", ""); const down = button("↓", ""); const edit = button("✎", ""); const visibility = button(category.visible === false ? "○" : "●", ""); const remove = button("×", "");
    up.disabled = index === 0; down.disabled = index === state.categories.length - 1;
    up.setAttribute("aria-label", "Subir categoría"); down.setAttribute("aria-label", "Bajar categoría"); edit.setAttribute("aria-label", "Editar categoría"); visibility.setAttribute("aria-label", "Mostrar u ocultar categoría"); remove.setAttribute("aria-label", "Eliminar categoría");
    up.addEventListener("click", () => moveCategory(index, -1)); down.addEventListener("click", () => moveCategory(index, 1));
    edit.addEventListener("click", () => openCategoryEditor(category)); visibility.addEventListener("click", () => updateCategory(category, { visible: category.visible === false })); remove.addEventListener("click", () => deleteCategory(category));
    actions.append(up, down, edit, visibility, remove);
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
async function moveCategory(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= state.categories.length) return;
  [state.categories[index], state.categories[target]] = [state.categories[target], state.categories[index]];
  await saveCategoryOrder(); renderCategoryList(); renderCategories();
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
  $("#categoryDialogTitle").textContent = category ? "Editar categoría" : "Nueva categoría";
  $("#categoryName").value = category?.nombre || "";
  $("#categoryImage").value = "";
  $("#categoryDialog").showModal();
}
async function saveCategory(event) {
  event.preventDefault();
  const name = $("#categoryName").value.trim();
  if (!name) return;
  let imageUrl = state.categoryEditing?.imagen_url || "";
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
  $("#categoryDialog").close(); await loadCatalog(); renderCategoryList();
}
async function deleteCategory(category) {
  const products = state.products.filter((product) => String(product.categoria_id) === String(category.id));
  if (products.length) {
    const target = window.prompt(`La categoría tiene ${products.length} productos. Ingresá otra categoría para moverlos o dejá vacío para dejarlos sin categoría.`, "");
    if (target === null) return;
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
  downloadFile(`law-catalogo-${date}.json`, JSON.stringify({ fecha: new Date().toISOString(), categorias: state.categories, productos: state.products }, null, 2), "application/json");
}
function csvCell(value) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }
function exportCsv() {
  const lines = [["Nombre", "Categoría", "Precio", "Oferta", "Stock", "Estado"].map(csvCell).join(",")];
  state.products.forEach((product) => lines.push([product.nombre, state.categories.find((category) => String(category.id) === String(product.categoria_id))?.nombre || "", product.precio, product.en_oferta ? product.precio_oferta : "", product.stock ?? "", product.estado].map(csvCell).join(",")));
  downloadFile(`law-productos-${new Date().toISOString().slice(0, 10)}.csv`, `\uFEFF${lines.join("\n")}`, "text/csv;charset=utf-8");
}
function askConfirmation(text) {
  $("#confirmText").textContent = text;
  confirmDialog.showModal();
  return new Promise((resolve) => {
    const finish = (value) => { confirmDialog.removeEventListener("close", onClose); resolve(value); };
    const onClose = () => finish(confirmDialog.returnValue === "confirm");
    confirmDialog.addEventListener("close", onClose, { once: true });
  });
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
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
$("#logoutButton").addEventListener("click", async () => { await window.db.auth.signOut(); authView.hidden = false; adminView.hidden = true; $("#adminNav").hidden = true; });
$("#selectionButton").addEventListener("click", () => {
  state.bulkMode = !state.bulkMode;
  if (!state.bulkMode) state.selected.clear();
  $("#selectionButton").textContent = state.bulkMode ? "Cancelar selección" : "Seleccionar";
  renderProducts();
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
  $("#productOfferPercent").value = price && offer < price ? Math.round((1 - offer / price) * 100) : "";
});
$("#productOfferPercent").addEventListener("input", (event) => {
  const price = Number($("#productPrice").value);
  const percent = Number(event.target.value);
  if (price && percent >= 0 && percent <= 100) $("#productOfferPrice").value = Math.round(price * (1 - percent / 100));
});
$("#closeEditor").addEventListener("click", async () => {
  if (state.dirty && !(await askConfirmation("Hay cambios sin guardar. ¿Cerrar igualmente?"))) return;
  editorDialog.close();
});
editorDialog.addEventListener("cancel", async (event) => {
  if (state.dirty) { event.preventDefault(); $("#closeEditor").click(); }
});
$("#productForm").addEventListener("input", () => { state.dirty = true; });
$("#adminNav").addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (!button) return;
  document.querySelectorAll("#adminNav button").forEach((item) => item.classList.toggle("is-active", item === button));
  const view = button.dataset.view;
  adminView.hidden = view !== "products";
  $("#categoriesView").hidden = view !== "categories";
  $("#settingsView").hidden = view !== "settings";
  if (view === "categories") renderCategoryList();
});
$("#newCategoryButton").addEventListener("click", () => openCategoryEditor());
$("#categoryForm").addEventListener("submit", saveCategory);
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
$("#exportJsonButton").addEventListener("click", exportJson);
$("#exportCsvButton").addEventListener("click", exportCsv);
$("#passwordForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = $("#newPassword").value;
  if (password !== $("#repeatPassword").value) return message($("#settingsFeedback"), "Las contraseñas no coinciden.", true);
  const { error } = await window.db.auth.updateUser({ password });
  if (error) return message($("#settingsFeedback"), error.message, true);
  event.target.reset(); message($("#settingsFeedback"), "Contraseña actualizada ✓");
});

if (window.db) {
  window.db.auth.getSession().then(({ data }) => checkSession(data.session));
  window.db.auth.onAuthStateChange((_event, session) => { if (!session) { authView.hidden = false; adminView.hidden = true; $("#adminNav").hidden = true; } });
} else {
  message(loginFeedback, "Supabase no está configurado.", true);
}
