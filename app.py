import io
import os
from datetime import datetime
from urllib.parse import quote_plus

from flask import Flask, jsonify, render_template, request, send_file
from sqlalchemy import (
    Column,
    DateTime,
    Integer,
    Numeric,
    String,
    Text,
    create_engine,
)
from sqlalchemy.orm import declarative_base, scoped_session, sessionmaker

import catalogos

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SQLITE_URL = "sqlite:///" + os.path.join(BASE_DIR, "patrocinios.db")


# ---------------------------------------------------------------------------
# Conexión a la base de datos
# En DATABASE_URL puede escribirse la dirección completa o solo la contraseña.
# ---------------------------------------------------------------------------
def construir_url(valor):
    valor = (valor or "").strip()
    if not valor:
        return ""

    if valor.startswith("postgres://"):
        return valor.replace("postgres://", "postgresql://", 1)
    if valor.startswith("postgresql://"):
        return valor

    usuario = os.environ.get("DB_USER", "postgres.lurwsacrharocadxdahs")
    host = os.environ.get("DB_HOST", "aws-0-ca-central-1.pooler.supabase.com")
    puerto = os.environ.get("DB_PORT", "5432")
    nombre = os.environ.get("DB_NAME", "postgres")
    return f"postgresql://{usuario}:{quote_plus(valor)}@{host}:{puerto}/{nombre}"


def crear_engine(url):
    kwargs = {"pool_pre_ping": True}
    if url.startswith("sqlite"):
        kwargs["connect_args"] = {"check_same_thread": False}
    else:
        kwargs["pool_recycle"] = 280
        kwargs["connect_args"] = {"connect_timeout": 10}
    return create_engine(url, **kwargs)


DATABASE_URL = construir_url(
    os.environ.get("DATABASE_URL") or os.environ.get("DB_PASSWORD")
)

# Indica si la información se está guardando de forma permanente.
ESTADO_BD = {"permanente": False, "detalle": ""}

if DATABASE_URL:
    try:
        engine = crear_engine(DATABASE_URL)
        with engine.connect():
            pass
        ESTADO_BD["permanente"] = True
    except Exception as error:  # noqa: BLE001
        ESTADO_BD["detalle"] = str(error)[:200]
        engine = crear_engine(SQLITE_URL)
else:
    ESTADO_BD["detalle"] = "No se configuró DATABASE_URL."
    engine = crear_engine(SQLITE_URL)

SessionLocal = scoped_session(sessionmaker(bind=engine, autoflush=False))
Base = declarative_base()

app = Flask(__name__)


# ---------------------------------------------------------------------------
# Modelo único: un registro por empresa, que avanza entre estados
# ---------------------------------------------------------------------------
class Registro(Base):
    __tablename__ = "registros"

    id = Column(Integer, primary_key=True)
    empresa = Column(String(300), nullable=False)
    contacto = Column(Text, default="")
    responsable = Column(String(200), default="")
    estado = Column(String(100), default="")
    tipo_aporte = Column(Text, default="")
    descripcion = Column(Text, default="")
    valor_aproximado = Column(Numeric(14, 2))
    asignacion = Column(String(100), default="")
    observaciones = Column(Text, default="")
    creado_en = Column(DateTime, default=datetime.utcnow)
    actualizado_en = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


CAMPOS = [
    "empresa",
    "contacto",
    "responsable",
    "estado",
    "tipo_aporte",
    "descripcion",
    "valor_aproximado",
    "asignacion",
    "observaciones",
]

ENCABEZADOS = [
    "#",
    "Empresa",
    "Contacto",
    "Responsable",
    "Estado",
    "Tipo de aporte",
    "Descripción",
    "Valor aproximado",
    "Asignación",
    "Observaciones",
    "Registrado",
    "Última actualización",
]

Base.metadata.create_all(engine)


@app.teardown_appcontext
def cerrar_sesion(exception=None):
    SessionLocal.remove()


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------
def limpiar_valor(valor):
    """Convierte el valor aproximado a número; devuelve None si viene vacío."""
    if valor is None:
        return None
    texto = str(valor).strip()
    if not texto:
        return None
    texto = texto.replace("₡", "").replace("$", "").replace(" ", "").replace(",", "")
    try:
        numero = float(texto)
    except ValueError:
        return None
    return numero if numero >= 0 else None


def a_dict(registro):
    datos = {"id": registro.id}
    for campo in CAMPOS:
        valor = getattr(registro, campo)
        if campo == "valor_aproximado":
            datos[campo] = float(valor) if valor is not None else None
        else:
            datos[campo] = valor or ""
    datos["creado_en"] = (
        registro.creado_en.strftime("%d/%m/%Y") if registro.creado_en else ""
    )
    datos["actualizado_en"] = (
        registro.actualizado_en.strftime("%d/%m/%Y") if registro.actualizado_en else ""
    )
    return datos


def aplicar_datos(registro, datos, parcial=False):
    for campo in CAMPOS:
        if parcial and campo not in datos:
            continue
        valor = datos.get(campo, "")
        if campo == "valor_aproximado":
            setattr(registro, campo, limpiar_valor(valor))
        else:
            setattr(registro, campo, str(valor).strip() if valor is not None else "")
    return registro


# ---------------------------------------------------------------------------
# Vistas
# ---------------------------------------------------------------------------
@app.route("/")
def inicio():
    return render_template("index.html", cat=catalogos)


@app.route("/api/registros", methods=["GET"])
def listar():
    db = SessionLocal()
    consulta = db.query(Registro)

    buscar = request.args.get("buscar", "").strip()
    responsable = request.args.get("responsable", "").strip()
    estado = request.args.get("estado", "").strip()

    if buscar:
        consulta = consulta.filter(Registro.empresa.ilike(f"%{buscar}%"))
    if responsable:
        consulta = consulta.filter(Registro.responsable.ilike(f"%{responsable}%"))
    if estado:
        consulta = consulta.filter(Registro.estado == estado)

    registros = consulta.order_by(Registro.actualizado_en.desc(), Registro.id.desc())
    return jsonify([a_dict(r) for r in registros.all()])


@app.route("/api/registros", methods=["POST"])
def crear():
    datos = request.get_json(silent=True) or {}
    if not str(datos.get("empresa", "")).strip():
        return jsonify({"error": "El nombre de la empresa es obligatorio."}), 400

    estado = str(datos.get("estado", "")).strip()
    if estado and estado not in catalogos.ESTADOS:
        return jsonify({"error": "El estado seleccionado no es válido."}), 400
    if not estado:
        datos["estado"] = catalogos.ESTADOS[0]

    db = SessionLocal()
    registro = aplicar_datos(Registro(), datos)
    db.add(registro)
    db.commit()
    db.refresh(registro)
    return jsonify(a_dict(registro)), 201


@app.route("/api/registros/<int:registro_id>", methods=["PUT"])
def actualizar(registro_id):
    db = SessionLocal()
    registro = db.get(Registro, registro_id)
    if registro is None:
        return jsonify({"error": "Registro no encontrado."}), 404

    datos = request.get_json(silent=True) or {}
    if "empresa" in datos and not str(datos.get("empresa", "")).strip():
        return jsonify({"error": "El nombre de la empresa es obligatorio."}), 400

    estado = datos.get("estado")
    if estado is not None and str(estado).strip() not in catalogos.ESTADOS:
        return jsonify({"error": "El estado seleccionado no es válido."}), 400

    aplicar_datos(registro, datos, parcial=True)
    db.commit()
    db.refresh(registro)
    return jsonify(a_dict(registro))


@app.route("/api/registros/<int:registro_id>", methods=["DELETE"])
def borrar(registro_id):
    db = SessionLocal()
    registro = db.get(Registro, registro_id)
    if registro is None:
        return jsonify({"error": "Registro no encontrado."}), 404
    db.delete(registro)
    db.commit()
    return "", 204


@app.route("/api/estado-bd")
def estado_bd():
    return jsonify(
        {"permanente": ESTADO_BD["permanente"], "detalle": ESTADO_BD["detalle"]}
    )


@app.route("/api/resumen")
def resumen():
    db = SessionLocal()
    registros = db.query(Registro).all()

    por_estado = {estado: 0 for estado in catalogos.ESTADOS}
    total_recibido = 0.0
    total_comprometido = 0.0

    for r in registros:
        if r.estado in por_estado:
            por_estado[r.estado] += 1
        valor = float(r.valor_aproximado) if r.valor_aproximado is not None else 0.0
        if r.estado == catalogos.ESTADO_RECIBIDO:
            total_recibido += valor
        elif r.estado == "Aceptada":
            total_comprometido += valor

    en_proceso = sum(por_estado.get(e, 0) for e in catalogos.ESTADOS_EN_PROCESO)

    return jsonify(
        {
            "total": len(registros),
            "por_estado": por_estado,
            "en_proceso": en_proceso,
            "recibidas": por_estado.get(catalogos.ESTADO_RECIBIDO, 0),
            "total_recibido": total_recibido,
            "total_comprometido": total_comprometido,
        }
    )


@app.route("/exportar")
def exportar():
    """Genera el Excel: una hoja con todo y una hoja por cada estado."""
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.utils import get_column_letter

    db = SessionLocal()
    todos = db.query(Registro).order_by(Registro.id).all()

    wb = Workbook()
    wb.remove(wb.active)

    relleno = PatternFill("solid", fgColor="1F4E79")
    fuente = Font(color="FFFFFF", bold=True)

    def agregar_hoja(titulo, registros):
        ws = wb.create_sheet(title=titulo[:31])
        ws.append(ENCABEZADOS)
        for celda in ws[1]:
            celda.fill = relleno
            celda.font = fuente
            celda.alignment = Alignment(horizontal="center", vertical="center")

        for indice, r in enumerate(registros, start=1):
            fila = [indice]
            for campo in CAMPOS:
                valor = getattr(r, campo)
                if campo == "valor_aproximado":
                    fila.append(float(valor) if valor is not None else None)
                else:
                    fila.append(valor or "")
            fila.append(r.creado_en.strftime("%d/%m/%Y") if r.creado_en else "")
            fila.append(
                r.actualizado_en.strftime("%d/%m/%Y") if r.actualizado_en else ""
            )
            ws.append(fila)

        columna = ENCABEZADOS.index("Valor aproximado") + 1
        for fila_num in range(2, ws.max_row + 1):
            ws.cell(row=fila_num, column=columna).number_format = '"₡"#,##0'

        anchos = [5, 32, 28, 22, 22, 26, 34, 18, 14, 30, 13, 18]
        for i in range(1, len(ENCABEZADOS) + 1):
            ancho = anchos[i - 1] if i - 1 < len(anchos) else 20
            ws.column_dimensions[get_column_letter(i)].width = ancho

        ws.freeze_panes = "A2"
        ws.auto_filter.ref = f"A1:{get_column_letter(len(ENCABEZADOS))}1"

    agregar_hoja("Todos los registros", todos)
    for estado in catalogos.ESTADOS:
        agregar_hoja(estado, [r for r in todos if r.estado == estado])

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    nombre = f"Control_Patrocinios_{datetime.now().strftime('%Y-%m-%d')}.xlsx"
    return send_file(
        buffer,
        as_attachment=True,
        download_name=nombre,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


if __name__ == "__main__":
    puerto = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=puerto, debug=True)
