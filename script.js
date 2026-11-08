if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);
window.addEventListener("load", () => window.scrollTo(0, 0), { once: true });

const WHATSAPP_NUMBER = "5491100000000";
const CONSULTATION_STORAGE_KEY = "law_consulta";

let categoryData = [
  { name: "Carteras", visual: "cartera", color: "#b9dfe0" }, { name: "Mochilas", visual: "mochila", color: "#d8c6b8" },
  { name: "Botellas", visual: "botella", color: "#b8d7dc" }, { name: "Cocina", visual: "cocina", color: "#ead6aa" },
  { name: "Cerámica", visual: "cerámica", color: "#d6c6d9" }, { name: "Termos de mate", visual: "termo", color: "#c5d5be" },
  { name: "Peluches", visual: "peluche", color: "#dfc4d2" }, { name: "Accesorios", visual: "accesorio", color: "#c6c9df" }
];

function placeholderImage(label, background, accent = "#11b5c3") {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><rect width="640" height="480" rx="36" fill="${background}"/><circle cx="520" cy="85" r="120" fill="${accent}" opacity=".18"/><circle cx="130" cy="410" r="150" fill="#fff" opacity=".22"/><text x="320" y="265" text-anchor="middle" font-family="Arial,sans-serif" font-size="54" font-weight="700" fill="#101b2a" opacity=".72">${label}</text><path d="M190 335h260" stroke="${accent}" stroke-width="8" stroke-linecap="round" opacity=".8"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const PRODUCTOS_RESPALDO = [
  { id: 1, name: "Cartera esencial", category: "Carteras", price: 38500, colors: [{ name: "Arena", value: "#c7b9a6" }, { name: "Negro", value: "#20242b" }], details: ["24 × 18 cm", "Cuero ecológico", "Bolsillo interno"], description: "Una cartera liviana y versátil para acompañarte todos los días." },
  { id: 2, name: "Cartera bandolera", category: "Carteras", price: 32900, precio_oferta: 27965, en_oferta: true, estado: "activo", colors: [{ name: "Turquesa", value: "#11b5c3" }, { name: "Chocolate", value: "#6d5144" }], details: ["22 × 16 cm", "Correa regulable", "Cierre metálico"], description: "Diseño cómodo con el tamaño justo para salir con lo esencial." },
  { id: 3, name: "Mochila urbana", category: "Mochilas", price: 45900, colors: [{ name: "Piedra", value: "#9b9d98" }, { name: "Verde", value: "#7d9a83" }], details: ["42 × 30 cm", "Tela impermeable", "Bolsillo notebook"], description: "Espaciosa, resistente y lista para acompañar tu ritmo." },
  { id: 4, name: "Mochila mini", category: "Mochilas", price: 28500, colors: [{ name: "Rosa", value: "#d7aeb1" }, { name: "Negro", value: "#20242b" }], details: ["28 × 22 cm", "Lona reforzada", "Cierre superior"], description: "Una compañera compacta para paseos y días livianos." },
  { id: 5, name: "Botella térmica", category: "Botellas", price: 18900, colors: [{ name: "Turquesa", value: "#11b5c3" }, { name: "Crema", value: "#e5d7bd" }], details: ["750 ml", "Acero inoxidable", "24 h frío"], description: "Mantiene tus bebidas a la temperatura ideal durante todo el día." },
  { id: 6, name: "Botella de vidrio", category: "Botellas", price: 11200, colors: [{ name: "Lila", value: "#b9a9c5" }, { name: "Verde", value: "#8da98d" }], details: ["600 ml", "Vidrio templado", "Funda protectora"], description: "Una opción reutilizable, simple y linda para hidratarte." },
  { id: 7, name: "Set de utensilios", category: "Cocina", price: 16700, precio_oferta: 13360, en_oferta: true, estado: "activo", colors: [{ name: "Madera", value: "#bd8d61" }, { name: "Negro", value: "#20242b" }], details: ["6 piezas", "Silicona y madera", "Resiste 220 °C"], description: "Todo lo que necesitás para cocinar con comodidad y estilo." },
  { id: 8, name: "Tabla de bambú", category: "Cocina", price: 12400, colors: [{ name: "Bambú", value: "#d4ad72" }], details: ["35 × 25 cm", "Bambú natural", "Con canaleta"], description: "Práctica, resistente y perfecta para preparar tus recetas." },
  { id: 9, name: "Tazas de cerámica", category: "Cerámica", price: 21500, colors: [{ name: "Blanco", value: "#f7f5ef" }, { name: "Turquesa", value: "#11b5c3" }], details: ["Pack x4", "Cerámica esmaltada", "Aptas lavavajillas"], description: "Un set artesanal para hacer más lindos tus momentos de pausa." },
  { id: 10, name: "Fuente para horno", category: "Cerámica", price: 24900, colors: [{ name: "Terracota", value: "#b87859" }, { name: "Crema", value: "#e5d7bd" }], details: ["30 × 20 cm", "Apta horno", "Apta microondas"], description: "Del horno a la mesa: una fuente noble para compartir." },
  { id: 11, name: "Termo matero", category: "Termos de mate", price: 32000, colors: [{ name: "Negro", value: "#20242b" }, { name: "Turquesa", value: "#11b5c3" }], details: ["1 litro", "Acero inoxidable", "Pico cebador"], description: "Conserva el agua caliente y acompaña cada ronda de mate." },
  { id: 12, name: "Mate de calabaza", category: "Termos de mate", price: 14500, colors: [{ name: "Natural", value: "#b68b5c" }, { name: "Verde", value: "#78967d" }], details: ["350 ml", "Calabaza natural", "Virola de acero"], description: "El clásico de siempre, preparado para disfrutarlo a tu manera." },
  { id: 13, name: "Osito suave", category: "Peluches", price: 18500, colors: [{ name: "Crema", value: "#e5d7bd" }, { name: "Rosa", value: "#d7aeb1" }], details: ["28 cm", "Felpa suave", "Relleno hipoalergénico"], description: "Un compañero tierno para regalar y abrazar." },
  { id: 14, name: "Conejita de felpa", category: "Peluches", price: 22900, colors: [{ name: "Blanco", value: "#f7f5ef" }, { name: "Lila", value: "#b9a9c5" }], details: ["32 cm", "Felpa premium", "Lavable"], description: "Un detalle dulce para sorprender a alguien especial." },
  { id: 15, name: "Llavero corazón", category: "Accesorios", price: 6800, precio_oferta: 6120, en_oferta: true, estado: "activo", colors: [{ name: "Turquesa", value: "#11b5c3" }, { name: "Rosa", value: "#d7aeb1" }], details: ["8 cm", "Metal esmaltado", "Argolla reforzada"], description: "Pequeño, práctico y lleno de color para llevar con vos." },
  { id: 16, name: "Scrunchie textil", category: "Accesorios", price: 4900, colors: [{ name: "Verde", value: "#8da98d" }, { name: "Chocolate", value: "#6d5144" }], details: ["Unitario", "Tela suave", "Elástico reforzado"], description: "Un accesorio simple para sumar un toque especial." }
];

PRODUCTOS_RESPALDO.forEach((product) => product.colors.forEach((color) => {
  color.image = placeholderImage(product.name, color.value, color.value === "#20242b" ? "#11b5c3" : "#101b2a");
}));

let products = PRODUCTOS_RESPALDO;
const TIEMPO_OFERTA = 5000;
const discountOffers = [];
const CATALOG_CACHE_KEY = "law_catalogo_cache";
const PRODUCTS_PAGE_SIZE = 24;
const PRICE_RANGES = [
  { value: "low", label: "Hasta $20.000", test: (price) => price <= 20000 },
  { value: "middle", label: "$20.000 a $40.000", test: (price) => price > 20000 && price <= 40000 },
  { value: "high", label: "Más de $40.000", test: (price) => price > 40000 }
];

const header = document.querySelector("#header");
const menuToggle = document.querySelector("#menuToggle");
const mainNav = document.querySelector("#mainNav");
const categoryGrid = document.querySelector("#categoryGrid");
const productGrid = document.querySelector("#productGrid");
const catalogStatus = document.querySelector("#catalogStatus");
const retryCatalog = document.querySelector("#retryCatalog");
const loadMoreProducts = document.querySelector("#loadMoreProducts");
const searchInput = document.querySelector("#searchInput");
const emptyState = document.querySelector("#emptyState");
const categoryFilters = document.querySelector("#categoryFilters");
const colorFilters = document.querySelector("#colorFilters");
const priceFilters = document.querySelector("#priceFilters");
const filterToggle = document.querySelector("#filterToggle");
const filterPanel = document.querySelector("#filterPanel");
const activeFilterCount = document.querySelector("#activeFilterCount");
const clearFiltersButton = document.querySelector("#clearFilters");
const emptyClearFilters = document.querySelector("#emptyClearFilters");
const drawer = document.querySelector("#consultationDrawer");
const drawerItems = document.querySelector("#consultationItems");
const drawerEmpty = document.querySelector("#drawerEmpty");
const bagCount = document.querySelector(".bag__count");
const productModal = document.querySelector("#productModal");
const discountBanner = document.querySelector("#discountBanner");
const discountOffer = document.querySelector("#discountOffer");
const discountDots = document.querySelector("#discountDots");
const discountsSection = document.querySelector("#descuentos");
const contactForm = document.querySelector("#contactForm");
const formMessage = document.querySelector("#formMessage");
const scrollProgress = document.querySelector("#scrollProgress");
const consultation = [];
const filters = { category: "Todos", color: "Todos", price: "Todos", search: "" };
let modalProduct = null;
let modalColorIndex = 0;
let categoryDragMoved = false;
let modalOpenedFromKeyboard = false;
let visibleProductCount = PRODUCTS_PAGE_SIZE;
let catalogLoading = false;
let lastCatalogLoad = 0;
let catalogRetryTimer = null;

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[character]));
}
function setCatalogStatus(message, isError = false) {
  catalogStatus.querySelector("span").textContent = message;
  catalogStatus.classList.toggle("is-error", isError);
  retryCatalog.hidden = !isError;
}
function readCatalogCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CATALOG_CACHE_KEY) || "null");
    return cached?.data && Array.isArray(cached.data.categories) && Array.isArray(cached.data.products) ? cached.data : null;
  } catch (error) {
    console.warn("No se pudo leer la caché del catálogo.", error);
    return null;
  }
}
function writeCatalogCache(data) {
  try {
    localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify({ date: new Date().toISOString(), data }));
  } catch (error) {
    console.warn("No se pudo guardar la caché del catálogo.", error);
  }
}
function normalizeProduct(row) {
  if (row.name && row.colors) return row;
  const colors = Array.isArray(row.colores) ? row.colores.map((color) => ({
    name: color.nombre || color.name || "Natural",
    value: color.hex || color.value || "#11b5c3",
    image: Array.isArray(color.imagenes) && color.imagenes[0] ? color.imagenes[0] : (color.image || placeholderImage(row.nombre, color.hex || "#eef0f1"))
  })) : [];
  return {
    id: row.id,
    name: row.nombre,
    category: row.categoria?.nombre || row.categoria_nombre || "",
    categoryId: row.categoria_id,
    price: Number(row.precio) || 0,
    precio_oferta: row.precio_oferta == null ? null : Number(row.precio_oferta),
    en_oferta: Boolean(row.en_oferta),
    stock: row.stock == null ? null : Number(row.stock),
    estado: row.estado || "activo",
    colors: colors.length ? colors : [{ name: "Natural", value: "#eef0f1", image: placeholderImage(row.nombre, "#eef0f1") }],
    details: Array.isArray(row.detalles) ? row.detalles : String(row.detalles || "").split("|").map((item) => item.trim()).filter(Boolean),
    description: row.descripcion || ""
  };
}
function normalizeCategory(row) {
  return { id: row.id, name: row.nombre || row.name, image: row.imagen_url || row.image || "", order: row.orden || row.order || 0 };
}
function applyCatalogData(data) {
  categoryData = data.categories.map(normalizeCategory);
  products = data.products.map(normalizeProduct).filter((product) => product.estado !== "oculto");
  products.forEach((product) => product.colors.forEach((color) => {
    if (!color.image) color.image = placeholderImage(product.name, color.value);
  }));
  visibleProductCount = PRODUCTS_PAGE_SIZE;
  lastCatalogLoad = Date.now();
  consultation.length = 0;
  restoreConsultation();
  renderCategories();
  renderFilters();
  renderProducts();
  renderDrawer();
  renderDiscounts();
  observeReveals();
  setupSectionNavigation();
}
async function fetchCatalogData() {
  if (!window.db) throw new Error("Supabase todavía no está configurado.");
  const [categoriesResult, productsResult] = await Promise.all([
    window.db.from("categorias").select("id,nombre,imagen_url,orden,visible").eq("visible", true).order("orden", { ascending: true }),
    window.db.from("productos").select("id,nombre,categoria_id,precio,precio_oferta,en_oferta,stock,estado,detalles,descripcion,colores,orden,created_at,categoria:categorias(nombre)").neq("estado", "oculto").order("orden", { ascending: true }).order("created_at", { ascending: false })
  ]);
  if (categoriesResult.error) throw categoriesResult.error;
  if (productsResult.error) throw productsResult.error;
  return { categories: categoriesResult.data || [], products: productsResult.data || [] };
}
async function cargarCatalogo() {
  if (catalogLoading) return;
  catalogLoading = true;
  setCatalogStatus("Cargando catálogo…");
  const cached = readCatalogCache();
  if (cached) applyCatalogData(cached);
  try {
    const data = await fetchCatalogData();
    writeCatalogCache(data);
    applyCatalogData(data);
    if (!catalogStatus.querySelector("span").textContent.startsWith("Un producto")) setCatalogStatus("");
  } catch (error) {
    console.warn("No se pudo actualizar el catálogo.", error);
    if (cached) setCatalogStatus("Mostrando la última versión disponible.");
    else {
      applyCatalogData({ categories: categoryData, products: PRODUCTOS_RESPALDO });
      setCatalogStatus("No pudimos actualizar el catálogo. Podés reintentar.", true);
    }
  } finally {
    catalogLoading = false;
  }
}
let modalTrigger = null;
let modalTriggerKey = null;

function saveConsultation() {
  try {
    localStorage.setItem(CONSULTATION_STORAGE_KEY, JSON.stringify(consultation));
  } catch (error) {
    console.warn("No se pudo guardar la consulta local.", error);
  }
}
function restoreConsultation() {
  try {
    const saved = JSON.parse(localStorage.getItem(CONSULTATION_STORAGE_KEY) || "[]");
    if (!Array.isArray(saved)) return;
    let removedUnavailable = false;
    saved.forEach((entry) => {
      const item = typeof entry === "number" ? { id: entry, color: null, quantity: 1 } : entry;
      const product = products.find((candidate) => String(candidate.id) === String(item.id));
      if (!product) {
        removedUnavailable = true;
        return;
      }
      const color = product.colors.some((candidate) => candidate.name === item.color) ? item.color : product.colors[0].name;
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const existing = consultation.find((selected) => selected.id === product.id && selected.color === color);
      if (existing) existing.quantity += quantity;
      else consultation.push({ id: product.id, color, quantity });
    });
    if (removedUnavailable) {
      saveConsultation();
      if (catalogStatus && !catalogLoading) setCatalogStatus("Un producto ya no está disponible.");
    }
  } catch (error) {
    console.warn("No se pudo restaurar la consulta local.", error);
  }
}

function money(value) { return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value); }
function slug(value) { return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function whatsappUrl(message) { return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`; }
function productImage(product, index = 0) { return product.colors[index].image; }
function getProduct(id) { return products.find((item) => String(item.id) === String(id)); }

function renderCategories() {
  categoryGrid.innerHTML = categoryData.map((category) => `
    <button class="category-card reveal" type="button" role="button" tabindex="0" data-categoria="${escapeHTML(category.name)}" data-category="${escapeHTML(category.name)}">
      <img src="${escapeHTML(category.image || placeholderImage(category.name, "#eef0f1"))}" alt="${escapeHTML(category.name)}" loading="lazy" width="640" height="480">
      <strong>${escapeHTML(category.name)}</strong><span><b data-count-to="${products.filter((product) => product.category === category.name).length}">0</b> productos</span>
    </button>`).join("");
  categoryGrid.querySelectorAll(".category-card").forEach((card) => {
    const selectCategory = () => {
      if (categoryDragMoved) {
        categoryDragMoved = false;
        return;
      }
      filters.category = card.dataset.category;
      syncFilterButtons();
      renderProducts();
      requestAnimationFrame(() => {
        const destino = document.getElementById("catalogo");
        const y = destino.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: y, behavior: "smooth" });
        history.replaceState(null, "", "#catalogo");
      });
    };
    card.addEventListener("click", selectCategory);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectCategory();
      }
    });
  });
  categoryGrid.querySelectorAll("[data-count-to]").forEach((counter) => counter.classList.add("reveal"));
}

function renderFilters() {
  const colors = [...new Set(products.flatMap((product) => product.colors.map((color) => color.name)))];
  const option = (group, value, label, extra = "") => `<label class="filter-option"><input type="checkbox" data-group="${escapeHTML(group)}" data-value="${escapeHTML(value)}"><span class="checkbox-mark"></span>${extra}${escapeHTML(label)}</label>`;
  colorFilters.innerHTML = colors.map((color) => {
    const colorData = products.flatMap((product) => product.colors).find((item) => item.name === color);
    return option("color", color, color, `<i class="filter-swatch" style="--dot:${escapeHTML(colorData?.value || "#11b5c3")}"></i>`);
  }).join("");
  priceFilters.innerHTML = PRICE_RANGES.map((range) => option("price", range.value, range.label)).join("");
  categoryFilters.innerHTML = categoryData.map((category) => option("category", category.name, category.name, `<small>${products.filter((p) => p.category === category.name).length}</small>`)).join("");
  filterPanel.querySelectorAll("input").forEach((input) => input.addEventListener("change", () => {
    filters[input.dataset.group] = input.checked ? input.dataset.value : "Todos";
    syncFilterButtons();
    renderProducts();
  }));
  syncFilterButtons();
}
function syncFilterButtons() {
  filterPanel.querySelectorAll("input").forEach((input) => {
    input.checked = filters[input.dataset.group] === input.dataset.value;
  });
  document.querySelectorAll(".category-card").forEach((card) => {
    card.classList.toggle("is-active", filters.category === card.dataset.category);
  });
  const active = ["category", "color", "price"].filter((key) => filters[key] !== "Todos").length;
  activeFilterCount.textContent = active;
  clearFiltersButton.hidden = active === 0;
}
function matchesPrice(product) {
  const currentPrice = product.en_oferta && Number.isFinite(product.precio_oferta) ? product.precio_oferta : product.price;
  const range = PRICE_RANGES.find((item) => item.value === filters.price);
  if (range) return range.test(currentPrice);
  return true;
}
function filteredProducts() {
  const query = slug(filters.search.trim());
  return products.filter((product) => {
    const matchesText = !query || slug(product.name).includes(query);
    const matchesCategory = filters.category === "Todos" || product.category === filters.category;
    const matchesColor = filters.color === "Todos" || product.colors.some((color) => color.name === filters.color);
    return matchesText && matchesCategory && matchesColor && matchesPrice(product);
  });
}
function renderProducts() {
  const list = filteredProducts();
  emptyState.hidden = list.length > 0;
  const visible = list.slice(0, visibleProductCount);
  loadMoreProducts.hidden = visible.length >= list.length;
  productGrid.innerHTML = visible.map((product) => `
    <article class="product-card reveal" data-id="${product.id}">
      <div class="product-card__media" role="button" tabindex="0" aria-label="Ver detalle de ${escapeHTML(product.name)}"><img src="${escapeHTML(productImage(product))}" alt="${escapeHTML(product.name)}" loading="lazy" width="640" height="480">${product.estado === "agotado" ? '<span class="stock-badge">Agotado</span>' : ""}</div>
      <div class="product-card__body"><h3>${escapeHTML(product.name)}</h3><p class="product-details">${escapeHTML(product.details.join(" · "))}</p><button class="detail-link" type="button" data-detail="${product.id}">Ver detalle</button>
        <div class="product-card__meta"><div class="color-dots">${product.colors.map((color, index) => `<button class="color-dot ${index === 0 ? "is-selected" : ""}" type="button" title="${escapeHTML(color.name)}" aria-label="Color ${escapeHTML(color.name)}" data-color="${escapeHTML(color.name)}" data-product="${product.id}" style="--dot:${escapeHTML(color.value)}"></button>`).join("")}</div><strong>${product.en_oferta && Number.isFinite(product.precio_oferta) ? `<s>${money(product.price)}</s> ${money(product.precio_oferta)}` : money(product.price)}</strong></div>
        <div class="product-card__actions"><button class="whatsapp-button quick-whatsapp" type="button" data-product="${product.id}">${product.estado === "agotado" ? "Consultar disponibilidad" : "◔  Consultar este"}</button><button class="outline-button add-consultation" type="button" data-product="${product.id}" ${product.estado === "agotado" ? "disabled" : ""}>+ Agregar a consulta</button></div>
      </div>
    </article>`).join("");
  productGrid.querySelectorAll(".detail-link").forEach((button) => button.addEventListener("click", () => openModal(button.dataset.detail)));
  productGrid.querySelectorAll(".product-card__media").forEach((media) => {
    const open = () => openModal(media.closest(".product-card").dataset.id);
    media.addEventListener("click", open);
    media.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } });
  });
  productGrid.querySelectorAll(".color-dot").forEach((button) => button.addEventListener("click", () => {
    const product = getProduct(button.dataset.product);
    const card = button.closest(".product-card");
    card.querySelector("img").src = productImage(product, product.colors.findIndex((color) => color.name === button.dataset.color));
    card.querySelectorAll(".color-dot").forEach((dot) => dot.classList.toggle("is-selected", dot === button));
  }));
  productGrid.querySelectorAll(".quick-whatsapp").forEach((button) => button.addEventListener("click", () => contactProduct(button.dataset.product)));
  productGrid.querySelectorAll(".add-consultation").forEach((button) => button.addEventListener("click", () => {
    const card = button.closest(".product-card");
    const selected = card.querySelector(".color-dot.is-selected");
    addToConsultation(button.dataset.product, selected?.dataset.color);
  }));
  observeReveals();
}
function renderCatalogSkeletons() {
  productGrid.innerHTML = Array.from({ length: 6 }, () => '<article class="product-card skeleton-card" aria-hidden="true"><div class="skeleton-block"></div><div class="skeleton-line"></div><div class="skeleton-line skeleton-line--short"></div></article>').join("");
  emptyState.hidden = true;
  loadMoreProducts.hidden = true;
}

function renderDiscounts() {
  discountOffers.length = 0;
  products.filter((product) => product.en_oferta && Number.isFinite(product.precio_oferta) && product.estado !== "agotado" && product.estado !== "oculto")
    .map((product) => ({ productoId: product.id, discount: Math.round((1 - product.precio_oferta / product.price) * 100) }))
    .sort((a, b) => b.discount - a.discount)
    .slice(0, 8)
    .forEach((offer) => discountOffers.push(offer));
  if (!discountOffers.length) {
    discountsSection.hidden = true;
    document.querySelectorAll('.main-nav a[href="#descuentos"]').forEach((link) => link.hidden = true);
    actualizarReproduccion();
    return;
  }
  discountsSection.hidden = false;
  document.querySelectorAll('.main-nav a[href="#descuentos"]').forEach((link) => link.hidden = false);
  discountIndex = Math.min(discountIndex, discountOffers.length - 1);
  document.querySelectorAll("#discountPrev, #discountNext").forEach((button) => { button.hidden = discountOffers.length < 2; });
  renderDiscountDots();
  renderDiscountOffer(false);
  observeReveals();
}
function renderDiscountDots() {
  discountDots.replaceChildren();
  if (discountOffers.length < 2) return;
  discountOffers.forEach((_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", `Ver oferta ${index + 1} de ${discountOffers.length}`);
    dot.addEventListener("click", (event) => { event.preventDefault(); showDiscount(index, true); });
    discountDots.append(dot);
  });
}
function renderDiscountOffer(animate = true) {
  if (!discountOffers.length) return;
  const offer = discountOffers[discountIndex];
  const product = getProduct(offer.productoId);
  discountOffer.replaceChildren();
  discountOffer.setAttribute("aria-label", `Oferta ${discountIndex + 1} de ${discountOffers.length}`);
  const content = document.createElement("div");
  content.className = "discount-offer__copy";
  const badge = document.createElement("span");
  badge.className = "discount-offer__badge";
  badge.textContent = `${offer.discount}% OFF`;
  const name = document.createElement("h3");
  name.textContent = product.name;
  const description = document.createElement("p");
  description.textContent = "Aprovechá este descuento en tus productos favoritos.";
  const price = document.createElement("div");
  price.className = "discount-offer__price";
  const originalPrice = document.createElement("s");
  originalPrice.textContent = money(product.price);
  const salePrice = document.createElement("strong");
  salePrice.textContent = money(product.precio_oferta);
  price.append(originalPrice, salePrice);
  const detail = document.createElement("button");
  detail.type = "button";
  detail.className = "discount-offer__button";
  detail.textContent = "Ver producto  ›";
  detail.addEventListener("click", () => openModal(product.id, offer));
  content.append(badge, name, description, price, detail);
  const media = document.createElement("div");
  media.className = "discount-offer__media";
  media.setAttribute("role", "button");
  media.setAttribute("tabindex", "0");
  media.setAttribute("aria-label", `Ver detalle de ${product.name}`);
  const image = document.createElement("img");
  image.src = productImage(product);
  image.alt = product.name;
  image.loading = "eager";
  media.append(image);
  const percent = document.createElement("span");
  percent.className = "discount-offer__percent";
  percent.textContent = "%";
  media.append(percent);
  media.addEventListener("click", () => openModal(product.id, offer));
  media.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openModal(product.id, offer); } });
  discountOffer.append(content, media);
  discountDots.querySelectorAll("button").forEach((dot, index) => dot.classList.toggle("is-active", index === discountIndex));
  const activeDot = discountDots.querySelector(".is-active");
  if (activeDot) {
    activeDot.classList.remove("is-active");
    void activeDot.offsetWidth;
    activeDot.classList.add("is-active");
  }
  if (discountAnimationTimer) clearTimeout(discountAnimationTimer);
  discountOffer.classList.remove("is-changing");
  void discountOffer.offsetWidth;
  discountOffer.classList.toggle("is-changing", animate);
  if (animate) discountAnimationTimer = setTimeout(() => discountOffer.classList.remove("is-changing"), 800);
  const next = discountOffers[(discountIndex + 1) % discountOffers.length];
  const nextProduct = getProduct(next.productoId);
  if (nextProduct) { const preload = new Image(); preload.src = productImage(nextProduct); }
}
let discountIndex = 0;
let discountTimer = null;
let discountWatchdog = null;
let discountVisible = false;
let discountAnimationTimer = null;
function getReducedMotion() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
function showDiscount(index) {
  if (discountOffers.length < 2) return;
  discountIndex = (index + discountOffers.length) % discountOffers.length;
  renderDiscountOffer(!getReducedMotion());
  actualizarReproduccion();
}
function actualizarReproduccion() {
  const hover = discountBanner.matches(":hover");
  const focused = discountBanner.contains(document.activeElement) && document.activeElement.matches(":focus-visible");
  const paused = hover || focused || productModal.open || document.hidden || !discountVisible;
  if (discountTimer) {
    clearTimeout(discountTimer);
    discountTimer = null;
  }
  discountBanner.classList.toggle("is-paused", paused);
  discountOffer.setAttribute("aria-live", paused ? "polite" : "off");
  if (!paused && discountOffers.length > 1 && !getReducedMotion()) {
    discountTimer = setTimeout(() => {
      discountTimer = null;
      showDiscount(discountIndex + 1);
    }, TIEMPO_OFERTA);
  }
}
function setupSectionNavigation() {
  const links = [...document.querySelectorAll(".main-nav a")];
  const sectionMap = [
    { selector: "#inicio", link: "#inicio" },
    { selector: ".categories", link: "#catalogo" },
    { selector: "#catalogo", link: "#catalogo" },
    { selector: "#descuentos", link: "#descuentos" },
    { selector: "#sobre-mi", link: "#sobre-mi" },
    { selector: "#contacto", link: "#contacto" }
  ].map((item) => ({ ...item, element: document.querySelector(item.selector) })).filter((item) => item.element);
  let frame = null;
  const setActive = (target) => {
    links.forEach((link) => {
      const active = link.getAttribute("href") === target;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  };
  const update = () => {
    frame = null;
    const threshold = window.scrollY + header.getBoundingClientRect().height + 120;
    let active = "#inicio";
    sectionMap.forEach((item) => {
      if (item.element.offsetTop <= threshold) active = item.link;
    });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) active = "#contacto";
    setActive(active);
  };
  const requestUpdate = () => {
    if (frame === null) frame = requestAnimationFrame(update);
  };
  links.forEach((link) => link.addEventListener("click", () => setActive(link.getAttribute("href"))));
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  window.addEventListener("load", requestUpdate, { once: true });
  requestUpdate();
}

function contactProduct(id, colorName) {
  const product = getProduct(id);
  if (!product) return;
  const color = colorName || product.colors[0].name;
  const currentPrice = product.en_oferta && Number.isFinite(product.precio_oferta) ? product.precio_oferta : product.price;
  const availability = product.estado === "agotado" ? " ¿Podrían avisarme cuándo vuelve a haber stock?" : "";
  window.open(whatsappUrl(`Hola, quiero consultar por "${product.name}" en color ${color}. Precio vigente: ${money(currentPrice)}.${availability}`), "_blank", "noopener");
}
function addToConsultation(id, colorName) {
  const product = getProduct(id);
  if (!product || product.estado === "agotado") return;
  const color = colorName || product.colors[0].name;
  const existing = consultation.find((item) => item.id === id && item.color === color);
  if (existing) existing.quantity += 1;
  else consultation.push({ id, color, quantity: 1 });
  saveConsultation();
  renderDrawer();
  openDrawer();
}
function renderDrawer() {
  const total = consultation.reduce((sum, item) => sum + item.quantity, 0);
  bagCount.textContent = total;
  document.querySelector(".bag").setAttribute("aria-label", `Consultar productos, ${total} artículos`);
  drawerEmpty.hidden = consultation.length > 0;
  document.querySelector("#consultAll").disabled = consultation.length === 0;
  drawerItems.innerHTML = consultation.map((item, index) => {
    const product = getProduct(item.id);
    if (!product) return "";
    const colorIndex = product.colors.findIndex((color) => color.name === item.color);
    const currentPrice = product.en_oferta && Number.isFinite(product.precio_oferta) ? product.precio_oferta : product.price;
    return `<div class="drawer-item" data-detail-id="${escapeHTML(product.id)}" data-detail-color="${escapeHTML(item.color)}" role="button" tabindex="0" aria-label="Ver detalle de ${escapeHTML(product.name)}">
      <img src="${escapeHTML(productImage(product, colorIndex))}" alt="${escapeHTML(product.name)}" loading="lazy" width="120" height="120">
      <div class="drawer-item__info"><strong>${escapeHTML(product.name)}</strong><span>${escapeHTML(item.color)} · ${item.quantity} × ${money(currentPrice)}</span><small class="detail-link">Ver detalle</small></div>
      <div class="drawer-item__quantity" aria-label="Cantidad">
        <button type="button" data-decrease="${index}" aria-label="Restar una unidad de ${escapeHTML(product.name)}">−</button>
        <span>${item.quantity}</span>
        <button type="button" data-increase="${index}" aria-label="Sumar una unidad de ${product.name}">+</button>
      </div>
      <button type="button" data-remove="${index}" aria-label="Quitar ${escapeHTML(product.name)}">×</button>
    </div>`;
  }).join("");
  drawerItems.querySelectorAll("[data-detail-id]").forEach((item) => {
    const open = () => {
      modalTrigger = item;
      modalTriggerKey = { id: item.dataset.detailId, color: item.dataset.detailColor };
      openModal(item.dataset.detailId, null, item.dataset.detailColor);
    };
    item.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      open();
    });
    item.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && !event.target.closest("button")) {
        event.preventDefault();
        open();
      }
    });
  });
  drawerItems.querySelectorAll("[data-increase]").forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    consultation[Number(button.dataset.increase)].quantity += 1;
    saveConsultation();
    renderDrawer();
  }));
  drawerItems.querySelectorAll("[data-decrease]").forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    const item = consultation[Number(button.dataset.decrease)];
    item.quantity -= 1;
    if (item.quantity <= 0) consultation.splice(Number(button.dataset.decrease), 1);
    saveConsultation();
    renderDrawer();
  }));
  drawerItems.querySelectorAll("[data-remove]").forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    consultation.splice(Number(button.dataset.remove), 1);
    saveConsultation();
    renderDrawer();
  }));
  if (modalTriggerKey) {
    modalTrigger = [...drawerItems.querySelectorAll("[data-detail-id]")].find((item) =>
      item.dataset.detailId === modalTriggerKey.id && item.dataset.detailColor === modalTriggerKey.color
    ) || modalTrigger;
  }
}
function openDrawer() { drawer.classList.add("is-open"); drawer.setAttribute("aria-hidden", "false"); document.querySelector("#drawerBackdrop").classList.add("is-visible"); }
function closeDrawer() { drawer.classList.remove("is-open"); drawer.setAttribute("aria-hidden", "true"); document.querySelector("#drawerBackdrop").classList.remove("is-visible"); }
function openModal(id, offer = null, colorName = null) {
  modalProduct = getProduct(id);
  if (!modalProduct) return;
  modalOpenedFromKeyboard = discountBanner.contains(document.activeElement) && document.activeElement.matches(":focus-visible");
  modalColorIndex = Math.max(0, modalProduct.colors.findIndex((color) => color.name === colorName));
  document.querySelector("#modalCategory").textContent = modalProduct.category;
  document.querySelector("#modalName").textContent = modalProduct.name;
  const offerPrice = modalProduct.en_oferta && Number.isFinite(modalProduct.precio_oferta) ? modalProduct.precio_oferta : null;
  document.querySelector("#modalPrice").innerHTML = offerPrice
    ? `<s>${money(modalProduct.price)}</s><strong>${money(offerPrice)}</strong><span>${Math.round((1 - offerPrice / modalProduct.price) * 100)}% OFF</span>`
    : `<strong>${money(modalProduct.price)}</strong>`;
  document.querySelector("#modalDescription").textContent = modalProduct.description;
  document.querySelector("#modalImage").src = productImage(modalProduct, modalColorIndex);
  document.querySelector("#modalImage").alt = modalProduct.name;
  document.querySelector("#modalStats").innerHTML = modalProduct.details.map((detail) => `<span><strong>${escapeHTML(detail.split(" ")[0])}</strong><small>${escapeHTML(detail.substring(detail.indexOf(" ") + 1))}</small></span>`).join("");
  document.querySelector("#modalColors").innerHTML = modalProduct.colors.map((color, index) => `<button class="color-dot ${index === modalColorIndex ? "is-selected" : ""}" type="button" aria-label="Color ${escapeHTML(color.name)}" data-modal-color="${index}" style="--dot:${escapeHTML(color.value)}"></button>`).join("");
  document.querySelectorAll("[data-modal-color]").forEach((button) => button.addEventListener("click", () => setModalColor(Number(button.dataset.modalColor))));
  updateModalAddLabel();
  productModal.showModal();
  actualizarReproduccion();
  document.querySelector("#closeModal").focus({ preventScroll: true });
}
function setModalColor(index) {
  modalColorIndex = (index + modalProduct.colors.length) % modalProduct.colors.length;
  document.querySelector("#modalImage").src = productImage(modalProduct, modalColorIndex);
  document.querySelectorAll("[data-modal-color]").forEach((button) => button.classList.toggle("is-selected", Number(button.dataset.modalColor) === modalColorIndex));
  updateModalAddLabel();
}
function updateModalAddLabel() {
  const selectedColor = modalProduct?.colors[modalColorIndex]?.name;
  const selected = consultation.find((item) => item.id === modalProduct?.id && item.color === selectedColor);
  document.querySelector("#modalAdd").textContent = selected ? `En tu consulta ✓ (${selected.quantity})` : "+ Agregar a consulta";
}
function closeModal() {
  if (productModal.open) productModal.close();
  if (modalTrigger && document.body.contains(modalTrigger)) {
    modalTrigger.focus({ preventScroll: true });
    if (!modalOpenedFromKeyboard && discountBanner.contains(modalTrigger)) modalTrigger.blur();
  }
  if (!modalOpenedFromKeyboard && discountBanner.contains(document.activeElement)) document.activeElement.blur();
  modalTrigger = null;
  modalTriggerKey = null;
  setTimeout(actualizarReproduccion, 150);
}

function observeReveals() {
  const items = document.querySelectorAll(".reveal:not(.is-visible)");
  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      if (entry.target.dataset.countTo) animateCounter(entry.target);
      currentObserver.unobserve(entry.target);
    });
  }, { threshold: .12, rootMargin: "0px 0px -8% 0px" });
  items.forEach((item, index) => {
    item.style.setProperty("--reveal-delay", `${(index % 4) * .1}s`);
    observer.observe(item);
  });
}
function animateCounter(element) {
  if (element.dataset.counted) return;
  element.dataset.counted = "true";
  const target = Number(element.dataset.countTo);
  const start = performance.now();
  const tick = (now) => {
    const progress = Math.min((now - start) / 900, 1);
    element.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3)));
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function setupCategoryCarousel() {
  const carousel = categoryGrid;
  const previous = document.querySelector("#categoryPrev");
  const next = document.querySelector("#categoryNext");
  const updateArrows = () => {
    previous.hidden = carousel.scrollLeft <= 2;
    next.hidden = carousel.scrollLeft + carousel.clientWidth >= carousel.scrollWidth - 2;
  };
  const page = () => carousel.clientWidth * .92;
  previous.addEventListener("click", () => carousel.scrollBy({ left: -page(), behavior: "smooth" }));
  next.addEventListener("click", () => carousel.scrollBy({ left: page(), behavior: "smooth" }));
  carousel.addEventListener("scroll", updateArrows, { passive: true });
  let startX = 0;
  let dragging = false;
  carousel.addEventListener("pointerdown", (event) => {
    startX = event.clientX;
    dragging = true;
    categoryDragMoved = false;
  });
  carousel.addEventListener("pointerup", (event) => {
    if (!dragging) return;
    dragging = false;
    const distance = startX - event.clientX;
    if (Math.abs(distance) > 5) categoryDragMoved = true;
    if (Math.abs(distance) > 40) carousel.scrollBy({ left: distance, behavior: "smooth" });
  });
  carousel.addEventListener("pointercancel", () => { dragging = false; categoryDragMoved = false; });
  carousel.addEventListener("click", (event) => {
    if (!categoryDragMoved) return;
    event.preventDefault();
    event.stopPropagation();
    categoryDragMoved = false;
  }, true);
  updateArrows();
}

function updateHeader() { header.classList.toggle("is-scrolled", window.scrollY > 24); }
function closeMenu() { mainNav.classList.remove("is-open"); menuToggle.setAttribute("aria-expanded", "false"); menuToggle.setAttribute("aria-label", "Abrir menú"); }
document.querySelectorAll(".brand").forEach((logo) => logo.addEventListener("click", (event) => {
  event.preventDefault();
  history.replaceState(null, "", location.pathname + location.search);
  window.scrollTo(0, 0);
  location.reload();
}));
menuToggle.addEventListener("click", () => { const isOpen = mainNav.classList.toggle("is-open"); menuToggle.setAttribute("aria-expanded", String(isOpen)); menuToggle.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú"); });
mainNav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
window.addEventListener("scroll", updateHeader, { passive: true });
window.addEventListener("scroll", () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  scrollProgress.style.transform = `scaleX(${max ? window.scrollY / max : 0})`;
}, { passive: true });
window.addEventListener("scroll", () => {
  const aboutImage = document.querySelector(".about-media img");
  if (aboutImage && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    aboutImage.style.transform = `translateY(${Math.min(window.scrollY * .018, 12)}px)`;
  }
}, { passive: true });
searchInput.addEventListener("input", () => { filters.search = searchInput.value; renderProducts(); });
function clearAllFilters() { filters.category = "Todos"; filters.color = "Todos"; filters.price = "Todos"; filters.search = ""; searchInput.value = ""; syncFilterButtons(); renderProducts(); }
clearFiltersButton.addEventListener("click", clearAllFilters);
emptyClearFilters.addEventListener("click", clearAllFilters);
filterToggle.addEventListener("click", () => {
  const open = filterPanel.classList.toggle("is-open");
  filterToggle.setAttribute("aria-expanded", String(open));
  filterPanel.setAttribute("aria-hidden", String(!open));
});
document.querySelector(".bag").addEventListener("click", (event) => { event.preventDefault(); openDrawer(); });
document.querySelector("#closeDrawer").addEventListener("click", closeDrawer);
document.querySelector("#drawerBackdrop").addEventListener("click", closeDrawer);
document.querySelector("#consultAll").addEventListener("click", () => {
  const names = consultation.map((item) => {
    const product = getProduct(item.id);
    return product ? `${product.name} (${item.color}, cantidad ${item.quantity})` : null;
  }).filter(Boolean).join(", ");
  window.open(whatsappUrl(`Hola, quiero consultar por estos productos: ${names}.`), "_blank", "noopener");
});
document.querySelector("#closeModal").addEventListener("click", closeModal);
document.querySelector("#modalPrev").addEventListener("click", () => setModalColor(modalColorIndex - 1));
document.querySelector("#modalNext").addEventListener("click", () => setModalColor(modalColorIndex + 1));
document.querySelector("#modalWhatsapp").addEventListener("click", () => contactProduct(modalProduct.id, modalProduct.colors[modalColorIndex].name));
document.querySelector("#modalAdd").addEventListener("click", () => {
  addToConsultation(modalProduct.id, modalProduct.colors[modalColorIndex].name);
  updateModalAddLabel();
});
productModal.addEventListener("click", (event) => { if (event.target === productModal) closeModal(); });
document.querySelector("#discountPrev").addEventListener("click", (event) => { event.preventDefault(); showDiscount(discountIndex - 1); });
document.querySelector("#discountNext").addEventListener("click", (event) => { event.preventDefault(); showDiscount(discountIndex + 1); });
document.addEventListener("visibilitychange", () => {
  actualizarReproduccion();
});
new IntersectionObserver((entries) => {
  discountVisible = entries.some((entry) => entry.isIntersecting);
  if (discountVisible && !discountWatchdog) {
    discountWatchdog = setInterval(() => {
      if (!document.hidden && discountVisible && !discountTimer) actualizarReproduccion();
    }, 2000);
  } else if (!discountVisible && discountWatchdog) {
    clearInterval(discountWatchdog);
    discountWatchdog = null;
  }
  actualizarReproduccion();
}, { threshold: .3 }).observe(discountsSection);
discountBanner.addEventListener("mouseenter", actualizarReproduccion);
discountBanner.addEventListener("mouseleave", actualizarReproduccion);
discountBanner.addEventListener("focusin", actualizarReproduccion);
discountBanner.addEventListener("focusout", actualizarReproduccion);
let discountSwipeStart = null;
discountBanner.addEventListener("pointerdown", (event) => { discountSwipeStart = event.clientX; });
discountBanner.addEventListener("pointerup", (event) => {
  if (discountSwipeStart === null) return;
  const distance = event.clientX - discountSwipeStart;
  discountSwipeStart = null;
  if (Math.abs(distance) > 5) showDiscount(discountIndex + (distance < 0 ? 1 : -1), true);
});
discountBanner.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") { event.preventDefault(); showDiscount(discountIndex + 1, true); }
  if (event.key === "ArrowLeft") { event.preventDefault(); showDiscount(discountIndex - 1, true); }
});
contactForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.querySelector("#contactName").value.trim();
  const email = document.querySelector("#contactEmail").value.trim();
  const message = document.querySelector("#contactMessage").value.trim();
  if (!name || !email || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    formMessage.textContent = "Completá nombre, email y mensaje para continuar.";
    formMessage.className = "form-message is-error";
    return;
  }
  formMessage.textContent = "Abriendo WhatsApp…";
  formMessage.className = "form-message is-success";
  window.open(whatsappUrl(`Hola, soy ${name} (${email}). ${message}`), "_blank", "noopener");
});
document.addEventListener("click", (event) => {
  if (filterPanel.classList.contains("is-open") && !filterPanel.contains(event.target) && !filterToggle.contains(event.target)) {
    filterPanel.classList.remove("is-open");
    filterToggle.setAttribute("aria-expanded", "false");
    filterPanel.setAttribute("aria-hidden", "true");
  }
});
document.addEventListener("keydown", (event) => {
  if (productModal.open && event.key === "Tab") {
    const focusable = [...productModal.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])")].filter((element) => !element.disabled);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
    return;
  }
  if (event.key === "Escape") {
    if (productModal.open || modalTrigger) {
      closeModal();
      return;
    }
    if (drawer.classList.contains("is-open")) closeDrawer();
    filterPanel.classList.remove("is-open");
    filterToggle.setAttribute("aria-expanded", "false");
    filterPanel.setAttribute("aria-hidden", "true");
  }
  if (event.key.toLowerCase() === "r" && !event.ctrlKey && !event.metaKey && !event.altKey) {
    document.body.classList.remove("is-replaying");
    void document.body.offsetWidth;
    document.body.classList.add("is-replaying");
  }
});
window.addEventListener("storage", (event) => {
  if (event.key !== CONSULTATION_STORAGE_KEY) return;
  consultation.length = 0;
  restoreConsultation();
  renderDrawer();
});

document.querySelectorAll(".categories, .catalog, .section-heading, .catalog-tools, .benefits, .discounts, .about, .contact, .site-footer, .benefit-card, .discount-card, .about-media, .about-copy, .contact-copy, .contact-form").forEach((element) => element.classList.add("reveal"));
document.querySelectorAll("[data-count-to]").forEach((element) => element.classList.add("reveal"));
restoreConsultation();
renderCatalogSkeletons();
renderDrawer();
setupCategoryCarousel();
observeReveals();
setupSectionNavigation();
updateHeader();
loadMoreProducts.addEventListener("click", () => {
  visibleProductCount += PRODUCTS_PAGE_SIZE;
  renderProducts();
});
retryCatalog.addEventListener("click", cargarCatalogo);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && Date.now() - lastCatalogLoad > 60000) cargarCatalogo();
});
setTimeout(cargarCatalogo, 0);
