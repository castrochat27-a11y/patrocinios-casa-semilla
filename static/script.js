// ===================== Configuración de secciones =====================
const SECCIONES = {
  posibles: {
    campos: ["empresa", "contacto", "clasificacion", "encargado", "lista", "valor_aproximado", "observaciones"],
    titulo: "posible patrocinio",
    columnas: (r) => [
      celda(r.empresa),
      celda(r.contacto, true),
      etiqueta(r.clasificacion),
      celda(r.encargado),
      celda(r.lista),
      moneda(r.valor_aproximado),
      celda(r.observaciones, true),
    ],
  },
  estado: {
    campos: ["empresa", "contacto", "estado", "encargado", "descripcion", "tipo_patrocinio", "valor_aproximado"],
    titulo: "seguimiento",
    columnas: (r) => [
      celda(r.empresa),
      celda(r.contacto, true),
      etiqueta(r.estado),
      celda(r.encargado),
      celda(r.descripcion, true),
      celda(r.tipo_patrocinio, true),
      moneda(r.valor_aproximado),
    ],
  },
  donaciones: {
    campos: ["empresa", "contacto", "encargado", "tipo_donacion", "descripcion", "valor_aproximado", "asignacion", "tipo_patrocinio", "observaciones"],
    titulo: "donación",
    columnas: (r) => [
      celda(r.empresa),
      celda(r.contacto, true),
      celda(r.encargado),
      celda(r.tipo_donacion, true),
      celda(r.descripcion, true),
      moneda(r.valor_aproximado),
      etiqueta(r.asignacion),
      celda(r.observaciones, true),
    ],
  },
};

const datosPorSeccion = { posibles: [], estado: [], donaciones: [] };
let pendienteBorrar = null;

// ===================== Utilidades de presentación =====================
function escapar(texto) {
  const div = document.createElement("div");
  div.textContent = texto == null ? "" : texto;
  return div.innerHTML;
}

function celda(valor, larga = false) {
  const contenido = valor ? escapar(valor) : "—";
  return `<td class="${larga ? "celda-larga" : ""}">${contenido}</td>`;
}

function moneda(valor) {
  if (valor === null || valor === undefined || valor === "") return `<td class="numero">—</td>`;
  return `<td class="numero">₡${Number(valor).toLocaleString("es-CR")}</td>`;
}

function claseEtiqueta(texto) {
  const mapa = {
    "Primer contacto": "e-primer-contacto",
    "Interés/Evaluación": "e-interes",
    "Negociación": "e-negociacion",
    "Cierre/Confirmación": "e-cierre",
    "Activación/Registro": "e-activacion",
    "Negado": "e-negado",
    "Asignado": "e-asignado",
    "Pendiente": "e-pendiente",
    "A contactar": "e-contactar",
    "No relevante": "e-norelevante",
  };
  return mapa[texto] || "";
}

function etiqueta(valor) {
  if (!valor) return `<td>—</td>`;
  return `<td><span class="etiqueta-estado ${claseEtiqueta(valor)}">${escapar(valor)}</span></td>`;
}

function mostrarAviso(mensaje, esError = false) {
  const aviso = document.getElementById("aviso");
  aviso.textContent = mensaje;
  aviso.className = "aviso" + (esError ? " error" : "");
  clearTimeout(aviso._t);
  aviso._t = setTimeout(() => aviso.classList.add("oculto"), 3000);
}

// ===================== Carga y render =====================
function parametrosFiltro(seccion) {
  const p = new URLSearchParams();
  const buscar = document.querySelector(`.f-buscar[data-seccion="${seccion}"]`).value.trim();
  const encargado = document.querySelector(`.f-encargado[data-seccion="${seccion}"]`).value;
  const filtro = document.querySelector(`.f-filtro[data-seccion="${seccion}"]`).value;
  if (buscar) p.set("buscar", buscar);
  if (encargado) p.set("encargado", encargado);
  if (filtro) p.set("filtro", filtro);
  return p.toString();
}

async function cargar(seccion) {
  const query = parametrosFiltro(seccion);
  try {
    const res = await fetch(`/api/${seccion}${query ? "?" + query : ""}`);
    if (!res.ok) throw new Error("respuesta inválida");
    const datos = await res.json();
    datosPorSeccion[seccion] = datos;
    render(seccion, datos);
  } catch (e) {
    mostrarAviso("No se pudo cargar la información. Revise su conexión.", true);
  }
}

function render(seccion, datos) {
  const tbody = document.getElementById(`tbody-${seccion}`);
  const vacio = document.getElementById(`vacio-${seccion}`);
  tbody.innerHTML = "";
  vacio.classList.toggle("oculto", datos.length > 0);

  datos.forEach((r, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML =
      `<td>${datos.length - i}</td>` +
      SECCIONES[seccion].columnas(r).join("") +
      `<td><div class="acciones-fila">
         <button class="btn-secundario" data-accion="editar" data-id="${r.id}">Editar</button>
         <button class="btn-peligro" data-accion="borrar" data-id="${r.id}">Borrar</button>
       </div></td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("[data-accion]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);
      if (btn.dataset.accion === "editar") editar(seccion, id);
      else pedirBorrado(seccion, id);
    });
  });
}

async function cargarResumen() {
  try {
    const res = await fetch("/api/resumen");
    const d = await res.json();
    document.getElementById("r-posibles").textContent = d.posibles;
    document.getElementById("r-estado").textContent = d.estado;
    document.getElementById("r-donaciones").textContent = d.donaciones;
    document.getElementById("r-total").textContent =
      "₡" + Number(d.total_donado || 0).toLocaleString("es-CR");
  } catch (e) {
    /* silencioso */
  }
}

// ===================== Formularios =====================
function formulario(seccion) {
  return document.getElementById(`form-${seccion}`);
}

function editar(seccion, id) {
  const registro = datosPorSeccion[seccion].find((r) => r.id === id);
  if (!registro) return;
  const form = formulario(seccion);

  form.elements["id"].value = registro.id;
  SECCIONES[seccion].campos.forEach((campo) => {
    if (form.elements[campo]) {
      const valor = registro[campo];
      form.elements[campo].value = valor === null || valor === undefined ? "" : valor;
    }
  });

  form.querySelector(".cancelar").classList.remove("oculto");
  form.querySelector(".btn-principal").textContent = "Guardar cambios";
  document.getElementById(`titulo-${seccion}`).textContent = `Editando ${SECCIONES[seccion].titulo}`;
  actualizarAyudas();
  form.scrollIntoView({ behavior: "smooth", block: "center" });
}

function reiniciar(seccion) {
  const form = formulario(seccion);
  form.reset();
  form.elements["id"].value = "";
  form.querySelector(".cancelar").classList.add("oculto");
  form.querySelector(".btn-principal").textContent = "Guardar";
  const titulos = {
    posibles: "Agregar posible patrocinio",
    estado: "Agregar seguimiento de patrocinio",
    donaciones: "Agregar donación recibida",
  };
  document.getElementById(`titulo-${seccion}`).textContent = titulos[seccion];
  actualizarAyudas();
}

Object.keys(SECCIONES).forEach((seccion) => {
  const form = formulario(seccion);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {};
    SECCIONES[seccion].campos.forEach((campo) => {
      if (form.elements[campo]) payload[campo] = form.elements[campo].value;
    });

    if (!payload.empresa || !payload.empresa.trim()) {
      mostrarAviso("El nombre de la empresa es obligatorio.", true);
      return;
    }

    const id = form.elements["id"].value;
    const url = id ? `/api/${seccion}/${id}` : `/api/${seccion}`;
    const metodo = id ? "PUT" : "POST";

    const boton = form.querySelector(".btn-principal");
    boton.disabled = true;
    try {
      const res = await fetch(url, {
        method: metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        mostrarAviso(d.error || "No se pudo guardar el registro.", true);
        return;
      }
      reiniciar(seccion);
      await cargar(seccion);
      cargarResumen();
      mostrarAviso(id ? "Registro actualizado correctamente." : "Registro guardado correctamente.");
    } catch (err) {
      mostrarAviso("Error de conexión. El registro no se guardó.", true);
    } finally {
      boton.disabled = false;
    }
  });

  form.querySelector(".cancelar").addEventListener("click", () => reiniciar(seccion));

  ["f-buscar", "f-encargado", "f-filtro"].forEach((clase) => {
    const el = document.querySelector(`.${clase}[data-seccion="${seccion}"]`);
    const evento = clase === "f-buscar" ? "input" : "change";
    el.addEventListener(evento, () => cargar(seccion));
  });
});

// ===================== Borrado con confirmación propia =====================
function pedirBorrado(seccion, id) {
  const registro = datosPorSeccion[seccion].find((r) => r.id === id);
  pendienteBorrar = { seccion, id };
  document.getElementById("modal-texto").textContent = registro
    ? `¿Seguro que desea eliminar el registro de "${registro.empresa}"? Esta acción no se puede deshacer.`
    : "¿Seguro que desea eliminar este registro?";
  document.getElementById("modal-fondo").classList.remove("oculto");
}

document.getElementById("modal-cancelar").addEventListener("click", () => {
  pendienteBorrar = null;
  document.getElementById("modal-fondo").classList.add("oculto");
});

document.getElementById("modal-confirmar").addEventListener("click", async () => {
  if (!pendienteBorrar) return;
  const { seccion, id } = pendienteBorrar;
  document.getElementById("modal-fondo").classList.add("oculto");
  pendienteBorrar = null;
  try {
    const res = await fetch(`/api/${seccion}/${id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) throw new Error();
    await cargar(seccion);
    cargarResumen();
    mostrarAviso("Registro eliminado.");
  } catch (e) {
    mostrarAviso("No se pudo eliminar el registro.", true);
  }
});

// ===================== Pestañas =====================
document.querySelectorAll(".pestana").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".pestana").forEach((b) => b.classList.remove("activa"));
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("activo"));
    btn.classList.add("activa");
    document.getElementById(`panel-${btn.dataset.seccion}`).classList.add("activo");
  });
});

// ===================== Textos de ayuda dinámicos =====================
function ponerAyuda(idSelect, idAyuda, mapa, prefijo = "") {
  const select = document.getElementById(idSelect);
  const ayuda = document.getElementById(idAyuda);
  if (!select || !ayuda) return;
  const texto = mapa[select.value];
  ayuda.textContent = texto ? prefijo + texto : "";
}

function actualizarAyudas() {
  ponerAyuda("select-estado", "ayuda-estado", window.AYUDAS.estados);
  ponerAyuda("select-tipo-donacion", "ayuda-tipo-donacion", window.AYUDAS.tiposDonacion);
  ponerAyuda("select-asignacion", "ayuda-asignacion", window.AYUDAS.asignaciones);
  ponerAyuda("select-tipo-estado", "ayuda-tipo-estado", window.AYUDAS.seguimiento, "Seguimiento: ");
  ponerAyuda("select-tipo-donacion-patro", "ayuda-tipo-donacion-patro", window.AYUDAS.seguimiento, "Seguimiento: ");
}

["select-estado", "select-tipo-donacion", "select-asignacion", "select-tipo-estado", "select-tipo-donacion-patro"]
  .forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", actualizarAyudas);
  });

// ===================== Estado de la base de datos =====================
async function verificarBaseDatos() {
  try {
    const res = await fetch("/api/estado-bd");
    const d = await res.json();
    document.getElementById("aviso-bd").classList.toggle("oculto", d.permanente === true);
  } catch (e) {
    /* silencioso */
  }
}

// ===================== Inicio =====================
Object.keys(SECCIONES).forEach((s) => cargar(s));
cargarResumen();
actualizarAyudas();
verificarBaseDatos();
