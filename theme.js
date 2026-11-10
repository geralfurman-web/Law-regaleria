(() => {
  const storageKey = "law-theme";
  const root = document.documentElement;
  const toggleButtons = document.querySelectorAll("[data-theme-toggle]");

  function applyTheme(theme) {
    const isDark = theme === "dark";
    root.dataset.theme = isDark ? "dark" : "light";
    toggleButtons.forEach((button) => {
      const label = isDark ? "Activar modo claro" : "Activar modo oscuro";
      button.setAttribute("aria-label", label);
      button.setAttribute("title", label);
      button.setAttribute("aria-pressed", String(isDark));
      button.firstElementChild.textContent = isDark ? "☀" : "☾";
    });
  }

  let savedTheme = "light";
  try {
    savedTheme = localStorage.getItem(storageKey) === "dark" ? "dark" : "light";
  } catch (error) {
    console.warn("No se pudo recuperar el tema guardado.", error);
  }
  applyTheme(savedTheme);

  toggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const theme = root.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(theme);
      try {
        localStorage.setItem(storageKey, theme);
      } catch (error) {
        console.warn("No se pudo guardar la preferencia de tema.", error);
      }
    });
  });
})();
