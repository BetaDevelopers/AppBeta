# Requisitos y Dependencias - Beta 3M 🛠️

Este documento detalla los pasos para instalar, actualizar y mantener las dependencias del proyecto.

## 🚀 Instalación "One-Click"
Para instalar **todas** las dependencias del proyecto de una sola vez (equivalente al "pip install" en Python), ejecuta el siguiente comando en la raíz del proyecto:

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities @tailwindcss/postcss @tailwindcss/vite @tanstack/react-query clsx dexie firebase framer-motion fuse.js idb-keyval katex lucide-react mathjax react react-dom slate slate-history slate-react tailwind-merge tesseract.js typescript vite zustand --save
```

Y para las dependencias de desarrollo:

```bash
npm install autoprefixer postcss tailwindcss jszip html2canvas jspdf @types/react @types/react-dom @types/node @types/slate @types/slate-react @types/jszip @types/katex --save-dev
```

> [!TIP]
> **Nota para usuarios de Python**: Aunque el comando es `npm`, la funcionalidad es la misma que `pip install -r requirements.txt`. Este comando descargará y configurará todo lo necesario para que el proyecto funcione.

## 🔄 Actualización de Dependencias
Si se han añadido nuevos paquetes o necesitas actualizar los existentes:

```bash
# Actualizar paquetes a la versión compatible más reciente
npm update

# Forzar reinstalación si hay problemas de caché
npm install --force
```

## 📦 Dependencias Principales
El proyecto utiliza las siguientes librerías clave:

### UI & Animación
- `framer-motion`: Animaciones fluidas y transiciones.
- `lucide-react`: Set de iconos profesionales.
- `clsx` y `tailwind-merge`: Utilidades para clases dinámicas.

### Estado & Datos
- `zustand`: Gestión de estado global simplificada.
- `dexie`: Wrapper de IndexedDB para almacenamiento local persistente.

### Editor & Herramientas
- `slate`, `slate-react`, `slate-history`: Framework para el editor de texto enriquecido.
- `tesseract.js`: Motor OCR para reconocimiento de texto en imágenes.
- `jszip`: Generación de archivos .zip para exportaciones de carpetas.

### Desarrollo
- `typescript`: Tipado estático para robustez del código.
- `vite`: Bundler ultra rápido para el servidor de desarrollo.

## 📋 Comandos Útiles
```bash
npm run dev      # Inicia el servidor de desarrollo
npm run build    # Genera el bundle de producción
npm run lint     # Ejecuta el análisis de código estático
```
