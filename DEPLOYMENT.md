# Deploy Beta3M

## Frontend → Vercel
1. New Project → importar repo → Root: frontend/
2. Framework: Vite
3. Env vars: VITE_API_URL=https://TU-BACKEND.railway.app/api

## Backend → Railway
1. New Project → Deploy from GitHub → Root: backend/
2. Env vars necesarias:
   - NODE_ENV=production
   - PORT=3000
   - JWT_SECRET=
   - OPENAI_API_KEY=
   - DB_PASSWORD=
   - SUPABASE_URL=
   - SUPABASE_ANON_KEY=
   - SUPABASE_SERVICE_ROLE_KEY=
   - FRONTEND_URL=https://TU-FRONTEND.vercel.app
   - API_URL=https://TU-BACKEND.railway.app

## Post-deploy
- Actualizar VITE_API_URL en Vercel con URL real de Railway
- Verificar /health endpoint responde OK
