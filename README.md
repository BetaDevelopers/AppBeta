# Beta 3M — App de apuntes con IA

Aplicación web para digitalizar y organizar apuntes con inteligencia artificial. Editor de notas enriquecido, asignaturas con color e icono, OCR matemático, herramientas de geometría y chat con IA.

---

## Requisitos previos

| Herramienta | Versión mínima | Descarga |
|-------------|----------------|---------|
| Node.js | 18.x o superior | https://nodejs.org |
| npm | 9.x o superior | (incluido con Node.js) |
| Cuenta Supabase | — | https://supabase.com |

---

## Estructura del proyecto

```
AppBeta/
├── backend/          # API REST — Node.js + Express
│   ├── src/
│   │   ├── app.js
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── config/
│   ├── database.sql  # Schema completo de la base de datos
│   └── package.json
└── frontend/         # React + TypeScript + Vite
    ├── src/
    └── package.json
```

---

## 1. Configurar la base de datos (Supabase)

1. Crear un proyecto en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor** en el panel de Supabase
3. Copiar y ejecutar todo el contenido de `backend/database.sql`
4. Anotar los siguientes datos del proyecto Supabase:
   - **Project URL** (ej: `https://xxxx.supabase.co`)
   - **Anon public key**
   - **Database password** (Settings → Database → Database password)
   - **Connection string** (host, puerto, usuario)

> Si la tabla `subjects` ya existe y le faltan las columnas `icon` o `position`, ejecutar:
> ```sql
> ALTER TABLE subjects ADD COLUMN IF NOT EXISTS icon TEXT;
> ALTER TABLE subjects ADD COLUMN IF NOT EXISTS position INTEGER;
> ```

---

## 2. Configurar el backend

```bash
cd backend
npm install
```

Crear el archivo `.env` en la carpeta `backend/`:

```env
# Puerto del servidor (opcional, por defecto 3000)
PORT=3000

# JWT
JWT_SECRET=una_clave_secreta_muy_larga_y_aleatoria

# Base de datos Supabase (connection pooler)
DB_PASSWORD=tu_password_de_supabase

# OpenAI (necesario para las funciones de IA)
OPENAI_API_KEY=sk-...

# Supabase (para autenticación con Supabase Auth, opcional)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

> El host y usuario de la base de datos están hardcodeados en `backend/src/config/db.js` apuntando al proyecto Supabase. Si usas otro proyecto, actualiza `host` y `user` en ese archivo.

Iniciar el backend:

```bash
# Desarrollo (con hot-reload)
npm run dev

# Producción
npm start
```

El servidor arranca en `http://localhost:3000`. Verificar con: `http://localhost:3000/` → debe responder `{"status":"ok"}`.

---

## 3. Configurar el frontend

```bash
cd frontend
npm install
```

Crear el archivo `.env` en la carpeta `frontend/`:

```env
# URL del backend (sin barra final)
VITE_API_URL=http://localhost:3000/api

# Supabase (mismos valores que el backend)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Iniciar el frontend:

```bash
# Desarrollo
npm run dev
```

La app abre en `http://localhost:5173`.

Para construir para producción:

```bash
npm run build
# Los archivos estáticos quedan en frontend/dist/
```

---

## 4. Arrancar todo (orden correcto)

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Abrir el navegador en `http://localhost:5173`.

---

## Variables de entorno — resumen

### `backend/.env`

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `PORT` | No | Puerto del servidor (default: 3000) |
| `JWT_SECRET` | Sí | Clave para firmar tokens JWT |
| `DB_PASSWORD` | Sí | Password de la base de datos Supabase |
| `OPENAI_API_KEY` | Sí (para IA) | Clave de OpenAI |
| `SUPABASE_URL` | Sí | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | Sí | Clave pública de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí | Clave de servicio de Supabase |

### `frontend/.env`

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `VITE_API_URL` | No | URL del backend (default: `http://localhost:3000/api`) |
| `VITE_SUPABASE_URL` | Sí | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Sí | Clave pública de Supabase |

---

## Dependencias principales

### Backend
- **express** — Servidor HTTP
- **pg** — Cliente PostgreSQL (conexión a Supabase)
- **jsonwebtoken** — Autenticación JWT
- **bcryptjs** — Hash de contraseñas
- **@supabase/supabase-js** — SDK de Supabase
- **express-rate-limit** — Protección contra abuso
- **dotenv** — Variables de entorno
- **cors** — CORS headers

### Frontend
- **React 19** + **TypeScript** — UI
- **Vite** — Bundler y dev server
- **Tailwind CSS 4** — Estilos
- **Zustand** — Estado global
- **React Router 7** — Navegación
- **Dexie** — Base de datos local (IndexedDB, para modo offline)
- **TipTap 3** — Editor de texto enriquecido
- **@supabase/supabase-js** — Auth y storage
- **framer-motion** — Animaciones
- **lucide-react** — Iconos
- **chart.js** + **react-chartjs-2** — Gráficos
- **katex** — Renderizado de fórmulas matemáticas
- **@excalidraw/excalidraw** — Canvas de dibujo

---

## Solución de problemas frecuentes

**`DB_PASSWORD no definit`** — Falta el archivo `backend/.env` o la variable `DB_PASSWORD`.

**CORS error en el frontend** — Verificar que `VITE_API_URL` apunta al puerto correcto del backend.

**`Cannot find module`** — Ejecutar `npm install` dentro de la carpeta correspondiente (`backend/` o `frontend/`).

**Columna `icon` o `position` no existe** — Ejecutar el SQL de la sección 1 (ALTER TABLE).

**El frontend carga pero no hay datos** — Revisar que el backend esté corriendo y que `VITE_API_URL` sea correcto.
