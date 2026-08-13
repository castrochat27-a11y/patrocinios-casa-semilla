# Control de Patrocinios y Donaciones

Página web para que el equipo registre el seguimiento de patrocinios desde cualquier dispositivo. La información se guarda automáticamente en una base de datos permanente y puede descargarse en Excel en cualquier momento.

## Cómo funciona

Hay **un solo formulario**. Se completan los datos de la empresa una vez y, según el **estado** que se elija, el registro aparece automáticamente en la pantalla que corresponde. Cuando el estado cambia, el registro se mueve solo de pantalla.

Estados disponibles:

| Estado | Significado |
|---|---|
| Pendiente de contactar | Todavía no se ha hecho el primer contacto. |
| En espera de respuesta | Ya se envió la propuesta y se espera respuesta. |
| En negociación | La empresa mostró interés y se define el aporte. |
| Aceptada | Confirmó el patrocinio, pero el aporte aún no se recibe. |
| Donación realizada | El aporte ya fue entregado y recibido. |
| Negada | La empresa indicó que no desea participar. |

### Campos

Empresa (obligatorio), Contacto, Responsable (texto libre), Estado, Tipo de aporte, Valor aproximado, Asignación, Descripción del aporte y Observaciones.

### Otras funciones

- Contadores arriba: registros totales, gestiones en proceso, donaciones realizadas y valor total recibido.
- Cada pestaña muestra cuántos registros hay en esa pantalla.
- Buscador por empresa y filtro por responsable.
- Botón **Descargar Excel**: genera un archivo con una hoja de todos los registros más una hoja por cada estado.

---

## Configuración de la base de datos

La página funciona sin configuración, pero en ese caso los datos son temporales y aparece un aviso naranja en pantalla.

Para que la información sea permanente, en Render se define la variable de entorno `DATABASE_URL`. Acepta dos formatos:

1. **Solo la contraseña** de la base de datos de Supabase (lo más simple). El programa arma la dirección y codifica los símbolos automáticamente.
2. **La dirección completa**, por ejemplo:
   `postgresql://usuario:contraseña@servidor:5432/postgres`

Si se usa otro proyecto de Supabase, se pueden ajustar con estas variables opcionales: `DB_USER`, `DB_HOST`, `DB_PORT`, `DB_NAME`.

Cuando la conexión funciona, el aviso naranja desaparece. Si falla, la página sigue operando con almacenamiento temporal y muestra el aviso, en lugar de dejar de funcionar.

---

## Publicar los cambios

1. Subir los archivos modificados al repositorio de GitHub.
2. En Render: **Manual Deploy** → **Deploy latest commit**.

En 2-3 minutos los cambios están en línea.

## Probar en una computadora

```
pip install -r requirements.txt
python app.py
```

Abrir http://127.0.0.1:5000. Sin `DATABASE_URL` usa un archivo local de pruebas.

## Estructura

```
app.py               → servidor, base de datos y generación del Excel
catalogos.py         → estados y sus descripciones
templates/index.html → estructura de la página
static/style.css     → diseño
static/script.js     → formulario, pantallas, filtros y tabla
requirements.txt     → librerías necesarias
Procfile             → comando de arranque
```
