# ACROVIX — Corporate Website

Enterprise technology, cybersecurity, and infrastructure solutions website for
**ACROVIX INNOVATIONS PRIVATE LIMITED**.

- **Frontend:** React 19 + Vite + Tailwind CSS (`/frontend`)
- **Backend:** Java 21 + Spring Boot (`/backend`) — powers the Enquiry form (saves to
  PostgreSQL and sends a notification email via Brevo)
- **Live site:** https://acrovix.com

---

## What was updated in this pass

### 1. AI Chatbot — now fully live (previously "Coming Soon")
The chatbot UI (`frontend/src/ai/`) was already built — floating button, chat
window, typing indicator, quick actions — but it only displayed a **"Coming
Soon"** placeholder. It is now fully functional:

- Opens with an instant **welcome message** + quick-action buttons.
- Answers questions about **services, products, industries, portfolio,
  pricing, careers, contact info, and the XDA platform** by matching the
  visitor's message against the site's own data files
  (`services.js`, `industries.js`, `products.js`, `portfolio.js`, `company.js`).
- Every answer can include a **"Learn more" button** that deep-links to the
  right page (e.g. asking about "ransomware" links straight to the
  Cybersecurity & Observability service page).
- **100% free forever** — it's a local, rule-based knowledge engine that runs
  entirely in the browser. No external AI API, no API key, no per-message
  cost, and no server dependency, so it will never stop working or start
  costing money.
- The response logic lives in one file:
  `frontend/src/ai/data/demoChatData.js` — edit the `getAIResponse()` function
  here to add more phrases or topics. Because it pulls live from the data
  files, updating a service/product/industry description automatically
  updates what the chatbot says about it too.

> Want a true generative AI chatbot instead (e.g. powered by Claude or GPT)?
> That requires a paid API key and a small backend proxy endpoint (to avoid
> exposing the key in the browser). The current bot was built to be
> genuinely useful with **zero ongoing cost**, which is what was requested.
> If you'd like to upgrade later, the `getAIResponse()` function is the only
> place that needs to change.

### 2. SEO — search-engine optimization pass
- **`frontend/src/components/SEO.jsx`** was upgraded from a bare
  title/description setter into a full per-page SEO manager: canonical URLs,
  Open Graph tags, Twitter Card tags, robots meta, and JSON-LD
  structured data.
- **Every page** now sets a canonical URL and targeted keywords. The
  **Products page had no SEO tags at all** — this was fixed.
- **Rich structured data (JSON-LD)** added for:
  - Sitewide `Organization` schema (`index.html`)
  - `WebSite` schema on the homepage
  - `Service` schema (with capability list) on each service detail page
  - `BreadcrumbList` schema on Services and Industry detail pages
  - `CreativeWork` schema on case study pages
  - `ContactPage` schema on the Contact page
- **`frontend/public/sitemap.xml`** — created, lists every static and
  dynamic route (services, industries, portfolio case studies).
- **`frontend/public/robots.txt`** — created, points crawlers to the sitemap.
- **`frontend/public/og-image.jpg`** — a branded 1200×630 social-share
  preview image was generated (used for Open Graph/Twitter previews when the
  site is shared on WhatsApp, LinkedIn, etc.).
- Verified: every page already had exactly one `<h1>` and every `<img>` had a
  descriptive `alt` attribute — good practice that was already in place and
  has been preserved.

**Important — ranking is not instant.** Adding correct SEO tags is necessary
but not sufficient to rank in the "top 10" for a competitive term like "IT
services". That also depends on content depth, backlinks, page speed, domain
age/authority, and consistent publishing over time. After deploying:
1. Submit `https://acrovix.com/sitemap.xml` in **Google Search Console** and
   **Bing Webmaster Tools**.
2. Set up **Google Business Profile** for local search visibility.
3. Keep adding real case studies/blog content — search engines reward fresh,
   substantive content over time.

### 3. Cleanup — removed files that weren't part of the actual project
- `frontend/node_modules/`, `frontend/dist/`, `backend/target/` — regenerable
  build artifacts (see setup steps below to rebuild them).
- `hs_err_pid*.log`, `replay_pid*.log` — JVM crash logs, not project files.
- `.github/modernize/` — leftover scaffold from an IDE code-modernization
  extension, unrelated to the app.
- `backend/.idea/` — local IntelliJ IDE settings, machine-specific.
- `frontend/src/ai/components/AIComingSoon.jsx` — the old placeholder
  component, no longer used now that the real chat window is wired up.

The real CI/CD workflow (`.github/workflows/deploy.yml`) and git history
(`.git/`) were kept — those are legitimate parts of the project.

---

## Local setup

### Frontend
```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
npm run build      # production build -> frontend/dist
```

### Backend
```bash
cd backend
mvn spring-boot:run
```
The backend needs these environment variables (see
`backend/src/main/resources/application.properties`):
`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `BREVO_API_KEY`, and optionally
`MAIL_FROM_EMAIL`, `MAIL_FROM_NAME`, `ENQUIRY_NOTIFICATION_EMAIL`,
`CORS_ALLOWED_ORIGINS`, `PORT`.

---

## Deployment
`.github/workflows/deploy.yml` builds the frontend and publishes
`frontend/dist` to the `hostinger-prod` branch on every push to `main` that
touches `frontend/**`. Point your Hostinger deployment at that branch.
