function normalizarDetalles(valor) {
  let actual = valor;
  for (let intentos = 0; intentos < 3; intentos++) {
    if (Array.isArray(actual)) {
      if (actual.length === 1 && typeof actual[0] === "string" && /^\s*(?:\[|["'])/.test(actual[0])) {
        actual = actual[0];
        continue;
      }
      break;
    }
    if (typeof actual !== "string") break;
    const texto = actual.trim();
    if (!texto) return [];
    if (!/^(?:\[|["'])/.test(texto)) {
      actual = texto.split("|");
      break;
    }
    try {
      actual = JSON.parse(texto);
    } catch (error) {
      break;
    }
  }
  const elementos = Array.isArray(actual) ? actual : typeof actual === "string" ? actual.split("|") : [];
  const resultado = [];
  elementos.forEach((elemento) => {
    if (typeof elemento !== "string" && typeof elemento !== "number") return;
    const limpio = String(elemento)
      .trim()
      .replace(/\\/g, "")
      .replace(/^["']+|["']+$/g, "")
      .trim();
    if (limpio && !resultado.includes(limpio) && resultado.length < 12) resultado.push(limpio);
  });
  return resultado;
}
