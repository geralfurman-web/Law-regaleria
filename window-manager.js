(() => {
  const stack = [];
  const byId = new Map();
  const busy = new Set();
  const cancelBound = new WeakSet();

  function lockBackground() {
    document.body.classList.toggle("modal-open", stack.length > 0);
  }

  function focusOpener(entry) {
    const opener = entry.getOpener?.() || entry.opener;
    if (opener?.isConnected && typeof opener.focus === "function") {
      opener.focus({ preventScroll: true });
    }
  }

  function top() {
    return stack[stack.length - 1] || null;
  }

  function abrirVentana(id, options = {}) {
    const element = typeof id === "string" ? document.getElementById(id) : id;
    if (!element) throw new Error(`No existe la ventana "${id}".`);
    const existing = byId.get(element.id);
    if (existing) {
      if (existing !== top()) {
        stack.splice(stack.indexOf(existing), 1);
        stack.push(existing);
      }
      return element;
    }

    const entry = {
      element,
      opener: options.opener || document.activeElement,
      getOpener: options.getOpener || null,
      dirty: options.dirty || (() => false),
      confirmDirty: options.confirmDirty || null,
      reset: options.reset || (() => {
        element.querySelectorAll("form").forEach((form) => form.reset());
      }),
      onOpen: options.onOpen || (() => {}),
      onClose: options.onClose || (() => {}),
      backdrop: options.backdrop ? document.getElementById(options.backdrop) : null,
      openClass: options.openClass || "is-open"
    };

    if (element instanceof HTMLDialogElement) {
      if (!element.open) element.showModal();
      if (!cancelBound.has(element)) {
        element.addEventListener("cancel", (event) => {
          event.preventDefault();
          if (top()?.element === element) cerrarVentana(element.id, { reason: "cancel" });
        });
        cancelBound.add(element);
      }
    } else {
      element.classList.add(entry.openClass);
      element.setAttribute("aria-hidden", "false");
      entry.backdrop?.classList.add("is-visible");
      entry.backdrop?.setAttribute("aria-hidden", "false");
    }

    stack.push(entry);
    byId.set(element.id, entry);
    lockBackground();
    entry.onOpen();
    return element;
  }

  async function cerrarVentana(id, { force = false, reason = "cancel" } = {}) {
    const entry = top();
    if (!entry || (id && entry.element.id !== id) || busy.has(entry)) return false;
    busy.add(entry);
    try {
      if (!force && entry.dirty() && entry.confirmDirty && !(await entry.confirmDirty())) return false;
      if (reason === "cancel") entry.reset();

      if (entry.element instanceof HTMLDialogElement) {
        if (entry.element.open) entry.element.close(reason);
      } else {
        entry.element.classList.remove(entry.openClass);
        entry.element.setAttribute("aria-hidden", "true");
        entry.backdrop?.classList.remove("is-visible");
        entry.backdrop?.setAttribute("aria-hidden", "true");
      }

      stack.pop();
      byId.delete(entry.element.id);
      lockBackground();
      focusOpener(entry);
      entry.onClose(reason);
      return true;
    } finally {
      busy.delete(entry);
    }
  }

  document.addEventListener("click", (event) => {
    const entry = top();
    if (!entry) return;
    const closeButton = event.target.closest("[data-cerrar], .btn-cancelar");
    const backdropClick = entry.element instanceof HTMLDialogElement
      ? event.target === entry.element
      : event.target === entry.backdrop;
    if (!closeButton && !backdropClick) return;
    event.preventDefault();
    cerrarVentana(entry.element.id, { reason: "cancel" });
  });

  document.addEventListener("keydown", (event) => {
    const entry = top();
    if (!entry || event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    cerrarVentana(entry.element.id, { reason: "cancel" });
  }, true);

  window.abrirVentana = abrirVentana;
  window.cerrarVentana = cerrarVentana;
})();
