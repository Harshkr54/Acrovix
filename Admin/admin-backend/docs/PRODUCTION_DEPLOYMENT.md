# ACROVIX Admin Panel - Production Deployment Guide

This document outlines the exact steps required to deploy the Admin Panel to a production environment.

## 1. Required Production Environment Variables

### Admin Backend (Spring Boot)
Supply these variables in your hosting platform (e.g., Render Web Service Environment settings):

- `DATABASE_URL`: `jdbc:postgresql://<PRODUCTION_NEON_DB_URL>?sslmode=require`
- `DATABASE_USERNAME`: `<PRODUCTION_NEON_DB_USER>`
- `DATABASE_PASSWORD`: `<PRODUCTION_NEON_DB_PASSWORD>`
- `PORT`: `8081` (or let Render set this automatically)
- `JWT_SECRET`: A very strong random string (do not use the dev one).
- `JWT_EXPIRATION_MS`: `86400000` (24 hours)
- `INITIAL_ADMIN_NAME`: `Super Admin`
- `INITIAL_ADMIN_EMAIL`: `<your_admin_email>`
- `INITIAL_ADMIN_PASSWORD`: `<your_secure_password>` (It will be BCrypt hashed on first boot)
- `CORS_ALLOWED_ORIGINS`: `https://admin.acrovix.com`
- `GEMINI_API_KEY`: Your Google Gemini API Key
- `BREVO_API_KEY`: Your Brevo SMTP API Key
- `MAIL_FROM_EMAIL`: `sales@acrovix.com`
- `MAIL_FROM_NAME`: `ACROVIX Sales`
- `ENQUIRY_NOTIFICATION_EMAIL`: `admin@acrovix.com`

### Admin Frontend (React/Vite)
Create a `.env` file locally before building for production:
- `VITE_API_BASE_URL`: `https://<YOUR_RENDER_BACKEND_URL>/api/admin`

---

## 2. Production Database Preparation

1. On first production startup, Hibernate/JPA automatically creates/updates the required schema from the Admin entities.
2. Ensure you have pointed the `DATABASE_URL` to the Neon PRODUCTION database.
3. The existing `enquiries` table remains the single source of truth; Hibernate will simply add the missing `status`, `assigned_to`, `notes`, and `updated_at` columns automatically while preserving existing data.

---

## 3. Backend Deployment (Render)

1. Connect your GitHub repository to Render.
2. Create a new **Web Service**.
3. **Build Command**: Render will detect the `Dockerfile` in the `Admin/admin-backend` root if you set the repository sub-directory correctly, OR use native Java:
   - **Root Directory**: `Admin/admin-backend`
   - **Build Command**: `mvn clean package -DskipTests=true`
   - **Start Command**: `java -jar target/admin-backend-0.0.1-SNAPSHOT.jar`
4. Add all environment variables listed in Section 1.
5. Deploy and verify the Health Check.

### Health Check
Once deployed, verify it's up without authentication:
```bash
GET https://<YOUR_RENDER_BACKEND_URL>/api/health
# Should return: {"status": "UP"}
```

---

## 4. Frontend Deployment (Hostinger)

1. Set the production backend URL in your `.env`:
   ```env
   VITE_API_BASE_URL=https://<YOUR_RENDER_BACKEND_URL>/api/admin
   ```
2. Build the React app:
   ```bash
   npm run build
   ```
3. Upload the contents of the `Admin/admin-frontend/dist` directory to your Hostinger File Manager under the `admin.acrovix.com` subdomain folder.
4. The `.htaccess` file in the build output ensures that React SPA deep linking (like `/admin/login`) works perfectly.

---

## 5. DNS & HTTPS Configuration

- **Admin Frontend**: Ensure `admin.acrovix.com` is configured as a subdomain in Hostinger pointing to the uploaded folder.
- **HTTPS**: Force HTTPS for the subdomain via Hostinger's SSL dashboard.
- **Admin Backend**: Render automatically provisions HTTPS. Ensure `CORS_ALLOWED_ORIGINS` precisely matches `https://admin.acrovix.com`.

---

## 6. Initial SUPER_ADMIN Setup & Login Verification

1. On the very first start, the backend reads `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD`.
2. It hashes the password using BCrypt and inserts the SUPER_ADMIN into the database ONLY if that email doesn't exist.
3. Visit `https://admin.acrovix.com/login` and log in with those credentials.
4. Go to **Admin Users** in the sidebar to create additional admins (Sales, Editor) as needed.

---

## 7. Rollback Procedure

- **Frontend Rollback**: Simply re-upload the previous `dist/` folder to Hostinger.
- **Backend Rollback**: Use Render's "Deploy previous commit" feature.
- **Database Rollback**: Since `ddl-auto=update` only *adds* tables and columns, rolling back backend code is safe. If you must revert DB changes, drop the new tables and drop the new columns from `enquiries` (ensure you have a Neon branch backup/checkpoint beforehand).
