# StockWise Inventory Management

A beginner-friendly inventory web app using HTML, CSS, JavaScript, Supabase Auth, and PostgreSQL.

## Features
- Email/password sign-up and sign-in
- Per-user product catalog
- Stock-in and stock-out transactions
- Low-stock alerts and dashboard totals
- Stock summary and CSV export
- Row Level Security (RLS) so signed-in users only access their own records

## Setup

### 1. Create the database
1. Create a project at https://supabase.com/
2. Open **SQL Editor** in the Supabase dashboard.
3. Create a new query, paste all of `supabase.sql`, and run it.
4. In **Authentication → Providers**, make sure Email authentication is enabled.
5. For a simple test, you may disable email confirmation in **Authentication → Settings**. For a real deployment, keep email confirmation enabled and configure your email provider/settings.

### 2. Connect the web app to Supabase
1. In Supabase, open **Project Settings → API** (the exact labels may vary).
2. Copy the **Project URL** and the browser-safe **publishable key** (or legacy `anon` key).
3. Open `app.js` and replace:
   - `YOUR_SUPABASE_PROJECT_URL`
   - `YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY`
4. Never put a `service_role` key, secret key, or database password in browser code or a public repository.

### 3. Create the GitHub repository
1. Create a repository named `inventory-management-system`.
2. Add `index.html`, `style.css`, `app.js`, and `supabase.sql`.
3. Commit the files to the `main` branch.

### 4. Test locally
Because `app.js` uses JavaScript modules, open the folder with a local web server rather than opening `index.html` as a `file://` URL. One easy option is the VS Code Live Server extension. After installing it, right-click `index.html` and choose **Open with Live Server**.

### 5. Publish with GitHub Pages
1. Push the files to GitHub.
2. Open repository **Settings → Pages**.
3. Under the build/deployment settings, select **Deploy from a branch**.
4. Select branch `main` and folder `/ (root)`, then save.
5. Wait for the deployment to finish and open the URL GitHub Pages displays.

## Important notes
- This starter app uses a public browser key by design; database security comes from Supabase Row Level Security. Never expose a secret/service-role key.
- Product SKUs must be unique within each user account.
- Use the Stock movements page for all stock changes after a product is created. The opening quantity is recorded as an opening-stock transaction.
- If email confirmation is enabled, confirm the address before signing in.
- CSV reports contain inventory quantities and prices. Store exported files securely.
- This is a starter project, not a substitute for a reviewed production system. Before using it for critical business operations, test backups, access policies, error handling, and recovery procedures.
