# Cloudflare Pages deployment — PPDO Palawan Investment Portal

This project uses React + Vite in `frontend/`.

## 1) Local test

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

## 2) GitHub

Create a GitHub repository and push this clean project. Do not commit `.env` files.

## 3) Cloudflare Pages

In Cloudflare Dashboard:

Workers & Pages → Create application → Pages → Import an existing Git repository.

Configure:

- Production branch: `main`
- Root directory: `frontend`
- Build command: `npm run build`
- Build output directory: `dist`

Cloudflare Pages will build the Vite app and provide a `*.pages.dev` address.

## 4) Backend API

The current backend is Node + Express. Keep it deployed separately unless you later migrate it to Cloudflare Workers.

When the API has a public URL, add the Cloudflare Pages environment variable:

`VITE_API_URL=https://YOUR-API-DOMAIN/api`

Then redeploy the Pages project.

## 5) Custom domain

In your Pages project:

Custom domains → Set up a domain.

For an apex domain, Cloudflare requires the domain to be a Cloudflare zone and the nameservers pointed to Cloudflare. For a subdomain, a CNAME can point to the Pages `*.pages.dev` hostname after the custom domain is added to the Pages project.

## 6) SPA routing

This is a React single-page application using BrowserRouter. `frontend/public/_redirects` is included as an explicit fallback to `/index.html` so internal routes such as `/economy` and `/locations` continue to work on direct visits.

## 7) Production checklist

- Replace all starter opportunity records with approved project data.
- Replace placeholder contact details with official PGP/PPDO contact information.
- Set `VITE_API_URL` to the real public API.
- Never upload `.env` or secrets.
- Configure the custom domain only after the Pages deployment is working on `pages.dev`.
