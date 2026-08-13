// ===================== Estado de la aplicación =====================
const CAMPOS = [
  "empresa",
  "contacto",
  "responsable",
  "estado",
  "tipo_aporte",
  "descripcion",
  "valor_aproximado",
  "asignacion",
  "observaciones",
];

let estadoActual = "";   // "" = todos
let registros = [];
let pendienteBorrar = null;

const form = document.getElementById("formulario");
const cuerpoTabla = document.getElementById("cuerpo-tabla");
const vacio = document.getElementById("vacio");
const btnGuardar = document.getElementById("btn-guardar");
const btnCancelar = document.getElementById("btn-cancelar");

// ===================== Utilidades =====================
function escapar(texto) {
  const div = document.createElement("div");
  div.textContent = texto == null ? "" : texto;
  return div.innerHTML;
}

function celda(valor, larga = false) {
  return `<td class="${larga ? "celda-larga" : ""}">${valor ? escapar(valor) : "—"}</td>`;
}

function moneda(valor) {
  if (valor === null || valor === undefined || valor === "") return `<td class="numero">—</td>`;
  return `<td class="numero">₡${Number(valor).toLocaleString("es-CR")}</td>`;
}

function etiquetaEstado(valor) {
  if (!valor) return `<td>—</td>`;
  const clase = window.CAT.estadosClase[valor] || "";
  return `<td><span class="etiqueta-estado ${clase}">${escapar(valor)}</span></td>`;
}

function mostrarAviso(mensaje, esError = false) {
  const aviso = document.getElementById("aviso");
  aviso.textContent = mensaje;
  aviso.className = "aviso" + (esError ? " error" : "");
  clearTimeout(aviso._t);
  aviso._t = setTimeout(() => aviso.classList.add("oculto"), 3200);
}

// ===================== Carga y render =====================
function parametros() {
  const p = new URLSearchParams();
  const buscar = document.getElementById("f-buscar").value.trim();
  const responsable = document.getElementById("f-responsable").value.trim();
  if (estadoActual) p.set("estado", estadoActual);
  if (buscar) p.set("buscar", buscar);
  if (responsable) p.set("responsable", responsable);
  return p.toString();
}

async function cargar() {
  const query = parametros();
  try {
    const res = await fetch(`/api/registros${query ? "?" + query : ""}`);
    if (!res.ok) throw new Error();
    registros = await res.json();
    render();
  } catch (e) {
    mostrarAviso("No se pudo cargar la información. Revise su conexión.", true);
  }
}

function render() {
  cuerpoTabla.innerHTML = "";
  vacio.classList.toggle("oculto", registros.length > 0);

  registros.forEach((r, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML =
      `<td>${registros.length - i}</td>` +
      celda(r.empresa) +
      celda(r.contacto, true) +
      celda(r.responsable) +
      etiquetaEstado(r.estado) +
      celda(r.tipo_aporte, true) +
      celda(r.descripcion, true) +
      moneda(r.valor_aproximado) +
      celda(r.asignacion) +
      `<td><div class="acciones-fila">
         <button class="btn-secundario" data-accion="editar" data-id="${r.id}">Editar</button>
         <button class="btn-peligro" data-accion="borrar" data-id="${r.id}">Borrar</button>
       </div></td>`;
    cuerpoTabla.appendChild(tr);
  });

  cuerpoTabla.querySelectorAll("[data-accion]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);
      if (btn.dataset.accion === "editar") editar(id);
      else pedirBorrado(id);
    });
  });
}

async function cargarResumen() {
  try {
    const d = await fetch("/api/resumen").then((r) => r.json());
    document.getElementById("r-total").textContent = d.total;
    document.getElementById("r-proceso").textContent = d.en_proceso;
    document.getElementById("r-recibidas").textContent = d.recibidas;
    document.getElementById("r-monto").textContent =
      "₡" + Number(d.total_recibido || 0).toLocaleString("es-CR");

    document.getElementById("c-todos").textContent = d.total;
    document.querySelectorAll("[data-conteo]").forEach((el) => {
      el.textContent = d.por_estado[el.dataset.conteo] ?? 0;
    });
  } catch (e) {
    /* silencioso */
  }
}

// ===================== Formulario =====================
function editar(id) {
  const r = registros.find((x) => x.id === id);
  if (!r) return;

  form.elements["id"].value = r.id;
  CAMPOS.forEach((campo) => {
    if (form.elements[campo]) {
      const v = r[campo];
      form.elements[campo].value = v === null || v === undefined ? "" : v;
    }
  });

  btnCancelar.classList.remove("oculto");
  btnGuardar.textContent = "Guardar cambios";
  document.getElementById("titulo-form").textContent = `Editando: ${r.empresa}`;
  actualizarAyudas();
  document.getElementById("titulo-form").scrollIntoView({ behavior: "smooth", block: "center" });
}

function reiniciar() {
  form.reset();
  form.elements["id"].value = "";
  btnCancelar.classList.add("oculto");
  btnGuardar.textContent = "Guardar registro";
  document.getElementById("titulo-form").textContent = "Agregar registro";
  // Si hay una pantalla seleccionada, el nuevo registro arranca en ese estado.
  if (estadoActual) form.elements["estado"].value = estadoActual;
  actualizarAyudas();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {};
  CAMPOS.forEach((campo) => {
    if (form.elements[campo]) payload[campo] = form.elements[campo].value;
  });

  if (!payload.empresa.trim()) {
    mostrarAviso("El nombre de la empresa es obligatorio.", true);
    return;
  }

  const id = form.elements["id"].value;
  const url = id ? `/api/registros/${id}` : "/api/registros";

  btnGuardar.disabled = true;
  try {
    const res = await fetch(url, {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      mostrarAviso(d.error || "No se pudo guardar el registro.", true);
      return;
    }
    const guardado = await res.json();
    reiniciar();
    await cargar();
    cargarResumen();
    mostrarAviso(
      id
        ? `Registro actualizado. Ahora aparece en "${guardado.estado}".`
        : `Registro guardado en la pantalla "${guardado.estado}".`
    );
  } catch (err) {
    mostrarAviso("Error de conexión. El registro no se guardó.", true);
  } finally {
    btnGuardar.disabled = false;
  }
});

btnCancelar.addEventListener("click", reiniciar);

// ===================== Borrado =====================
function pedirBorrado(id) {
  const r = registros.find((x) => x.id === id);
  pendienteBorrar = id;
  document.getElementById("modal-texto").textContent = r
    ? `¿Seguro que desea eliminar el registro de "${r.empresa}"? Esta acción no se puede deshacer.`
    : "¿Seguro que desea eliminar este registro?";
  document.getElementById("modal-fondo").classList.remove("oculto");
}

document.getElementById("modal-cancelar").addEventListener("click", () => {
  pendienteBorrar = null;
  document.getElementById("modal-fondo").classList.add("oculto");
});

document.getElementById("modal-confirmar").addEventListener("click", async () => {
  if (pendienteBorrar === null) return;
  const id = pendienteBorrar;
  pendienteBorrar = null;
  document.getElementById("modal-fondo").classList.add("oculto");
  try {
    const res = await fetch(`/api/registros/${id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) throw new Error();
    await cargar();
    cargarResumen();
    mostrarAviso("Registro eliminado.");
  } catch (e) {
    mostrarAviso("No se pudo eliminar el registro.", true);
  }
});

// ===================== Pantallas (pestañas por estado) =====================
document.querySelectorAll(".pestana").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".pestana").forEach((b) => b.classList.remove("activa"));
    btn.classList.add("activa");
    estadoActual = btn.dataset.estado || "";

    document.getElementById("desc-pantalla").textContent = estadoActual
      ? window.CAT.estadosDesc[estadoActual] || ""
      : "Todos los registros ingresados.";

    // Si no se está editando, el formulario se prepara para esta pantalla.
    if (!form.elements["id"].value) {
      form.elements["estado"].value = estadoActual || window.CAT.estados[0];
      actualizarAyudas();
    }
    cargar();
  });
});

// ===================== Ayudas dinámicas =====================
function actualizarAyudas() {
  const estado = document.getElementById("select-estado").value;
  document.getElementById("ayuda-estado").textContent =
    window.CAT.estadosDesc[estado] || "";

  const asignacion = document.getElementById("select-asignacion").value;
  document.getElementById("ayuda-asignacion").textContent =
    window.CAT.asignacionesDesc[asignacion] || "";

  // La asignación solo tiene sentido cuando el aporte ya se recibió.
  const campoAsig = document.getElementById("campo-asignacion");
  campoAsig.classList.toggle("atenuado", estado !== window.CAT.estadoRecibido);
}

document.getElementById("select-estado").addEventListener("change", actualizarAyudas);
document.getElementById("select-asignacion").addEventListener("change", actualizarAyudas);

// ===================== Filtros =====================
document.getElementById("f-buscar").addEventListener("input", cargar);
document.getElementById("f-responsable").addEventListener("input", cargar);

// ===================== Estado de la base de datos =====================
async function verificarBaseDatos() {
  try {
    const d = await fetch("/api/estado-bd").then((r) => r.json());
    document.getElementById("aviso-bd").classList.toggle("oculto", d.permanente === true);
  } catch (e) {
    /* silencioso */
  }
}

// ===================== Inicio =====================
cargar();
cargarResumen();
actualizarAyudas();
verificarBaseDatos();
