# Registro de Patrocinios · Casa Semilla

Página web para que todo el equipo de Patrocinios registre su trabajo desde cualquier dispositivo. La información se guarda automáticamente en una base de datos permanente y puede descargarse en Excel en cualquier momento.

## Qué incluye

Tres secciones, iguales a las hojas del Excel original:

1. **Posibles Patrocinios** — empresa, contacto, clasificación, encargado, lista, valor aproximado, observaciones.
2. **Estado de Patrocinios** — empresa, contacto, estado, encargado, descripción de la posible donación, tipo de patrocinio, valor aproximado.
3. **Registro de Donaciones** — empresa, contacto, encargado, tipo de donación, descripción, valor aproximado, asignación, tipo de patrocinio, observaciones adicionales.

Todas las listas desplegables (14 encargados, 6 estados, 14 tipos de patrocinio, 3 tipos de donación) vienen del Excel original. Los campos de **contacto** y **valor aproximado** están presentes en las tres secciones.

Además: contadores en la parte superior, suma automática del valor total donado, buscador y filtros por encargado y por estado, edición y borrado de registros, y botón **Descargar Excel** que genera el archivo con las tres hojas.

---

## Paso 1 — Crear la base de datos gratuita (Supabase)

Este paso es el que garantiza que la información **no se pierda nunca**.

1. Entre a https://supabase.com y cree una cuenta gratuita (puede entrar con GitHub).
2. Clic en **New project**.
3. Complete:
   - **Name:** `patrocinios-casa-semilla`
   - **Database Password:** cree una contraseña y **guárdela**, se usa en el siguiente paso.
   - **Region:** elija la más cercana (por ejemplo, East US).
4. Clic en **Create new project** y espere 1-2 minutos.
5. Cuando termine, vaya a **Connect** (botón arriba a la derecha) → sección **Connection string** → pestaña **URI**.
6. Copie el texto que aparece. Se ve así:

   ```
   postgresql://postgres.xxxxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

7. Reemplace `[YOUR-PASSWORD]` por la contraseña que creó en el punto 3. Ese texto completo es su **DATABASE_URL**.

---

## Paso 2 — Subir el código a GitHub

1. Entre a https://github.com y cree un repositorio nuevo (por ejemplo `patrocinios-casa-semilla`).
2. En la página del repositorio, clic en **Add file** → **Upload files**.
3. Suba estos archivos y carpetas:
   - `app.py`, `catalogos.py`, `requirements.txt`, `Procfile`, `.gitignore`, `README.md`
   - la carpeta `templates` (con `index.html`)
   - la carpeta `static` (con `style.css` y `script.js`)
4. Clic en **Commit changes**.

---

## Paso 3 — Publicar la página (Render)

1. Entre a https://render.com y cree una cuenta gratuita.
2. Clic en **New +** → **Web Service**.
3. Conecte el repositorio de GitHub que creó (o use la pestaña **Public Git Repository** y pegue la URL del repositorio).
4. Verifique la configuración:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app`
   - **Instance Type:** **Free**
5. **Importante:** en la sección **Environment Variables**, agregue:
   - **Key:** `DATABASE_URL`
   - **Value:** el texto completo que copió de Supabase en el Paso 1.
6. Clic en **Create Web Service**.

En 2-3 minutos Render le entrega una dirección pública (por ejemplo `https://patrocinios-casa-semilla.onrender.com`). Esa es la página, accesible desde cualquier computadora o celular.

> Si no agrega la variable `DATABASE_URL`, la página igual funciona, pero los datos se borrarán cada vez que Render reinicie el servicio. **No omita ese paso.**

---

## Notas de uso

- **Descargar Excel:** el botón blanco arriba a la derecha genera un archivo `.xlsx` con las tres hojas y todos los registros al día. Se recomienda descargarlo periódicamente como respaldo adicional.
- **Primera carga lenta:** en el plan gratuito de Render, el servicio se duerme tras un rato sin uso y puede tardar unos 50 segundos en despertar la primera vez. Después responde normal.
- **Acceso:** la página quedó abierta, sin contraseña. Cualquiera con el enlace puede escribir. Si más adelante desea protegerla, se puede agregar una contraseña compartida.

## Probar en una computadora antes de publicar

```
pip install -r requirements.txt
python app.py
```

Abra http://127.0.0.1:5000. Sin `DATABASE_URL` usa un archivo local `patrocinios.db` para pruebas.

## Estructura

```
app.py              → servidor, base de datos y generación del Excel
catalogos.py        → listas de encargados, estados y tipos (tomadas del Excel)
templates/index.html → estructura de la página
static/style.css     → diseño
static/script.js     → funcionamiento de formularios, filtros y tablas
requirements.txt     → librerías necesarias
Procfile             → comando de arranque para Render
```
