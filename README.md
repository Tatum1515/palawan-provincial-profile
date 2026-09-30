# PPDO Palawan Investment Portal

Clean release structure:

- `frontend/` — React + Vite public investment portal. Main entry: `frontend/src/PPDO.jsx`.
- `backend/` — Node + Express API. MongoDB is optional for local/demo use.

## Local development

### Frontend

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`.

### Backend

In a second terminal:

```powershell
cd backend
npm install
Copy-Item .env.example .env
npm run dev
```

API health: `http://localhost:5000/api/health`

MongoDB is disabled by default in `.env.example`, so the public site can run locally without MongoDB.

## Tests

Frontend:

```powershell
cd frontend
npm test
npm run lint
npm run build
```

Backend:

```powershell
cd backend
npm test
```

## Cloudflare Pages deployment

The frontend is a Vite React SPA. In Cloudflare Pages use:

- Root directory: `frontend`
- Build command: `npm run build`
- Build output directory: `dist`
- Production branch: `main`

Set `VITE_API_URL` to the public backend API URL when the backend is deployed. The frontend can still display starter/public content when the API is unavailable.

For the current Express backend, deploy the API separately (for example on Render or another Node host) unless the backend is later migrated to Cloudflare Workers.

Do not upload `.env` files or secrets to GitHub.
