# Anika Jewelry - Premium E-commerce & Admin Platform

Welcome to the **Anika Jewelry Platform**, a premium, full-stack e-commerce and administrative control system designed for a high-end fashion jewelry brand. This monorepo is engineered with a modern customer-facing storefront, a comprehensive admin portal, a secure serverless database layer, serverless Edge Functions, infrastructure-as-code configuration, and automated pipelines.

---

## 📌 Table of Contents

- [💎 System Architecture](#-system-architecture)
- [⚡ Quick Link: Fully Offline Setup](#-fully-offline-setup-local-development)
- [💻 Frontend Track](#-frontend-track)
- [⚙️ Backend Track (Edge Functions)](#%EF%B8%8F-backend-track-edge-functions)
- [🗄️ Database Track](#%EF%B8%8F-database-track)
- [🚀 DevOps Track (CI/CD, Terraform, Hosting)](#-devops-track-cicd-terraform-hosting)
- [🤖 AI-Assisted Development Track (.agent & OpenSpec)](#-ai-assisted-development-track-agent--openspec)

---

## 💎 System Architecture

Below is a conceptual map of the architecture showing how the component blocks interact:

```mermaid
graph TD
    subgraph Client Application [Frontend Portal - React 19 / Vite]
        Storefront["Storefront Customer Portal"]
        Admin["Admin Management Console"]
        Zustand["Zustand (Global State & Local Cache)"]
    end

    subgraph Hosting & Networking [Vercel & GoDaddy]
        GoDaddy["GoDaddy (Custom DNS Domain)"]
        Vercel["Vercel SPA Hosting (vercel.json)"]
    end

    subgraph Backend Services [Supabase Project]
        Auth["Supabase Auth (OTP / Session)"]
        DB["PostgreSQL DB (RLS Enabled)"]
        Edge["Deno Edge Functions Runtime"]
        Inbucket["Inbucket Email SMTP Catcher (Local Dev Only)"]
    end

    subgraph External Integrations
        Razorpay["Razorpay API (Payments)"]
        Ekart["Ekart API (Delivery / Logisitics)"]
        Resend["Resend SMTP (Production Emails)"]
    end

    %% Routing
    GoDaddy --> Vercel
    Vercel --> Client Application
    Storefront --> Auth
    Storefront --> DB
    Admin --> DB
    
    %% Edge Runtime Interactions
    Storefront --> Edge
    Edge -- "Verify Session & Amount" --> DB
    Edge -- "Initiate Orders & Verify HMAC" --> Razorpay
    Edge -- "Check Serviceability & Waybills" --> Ekart

    %% Auth Emails
    Auth -- "Local SMTP Forward" --> Inbucket
    Auth -- "Production SMTP API" --> Resend
```

---

## 🔌 Fully Offline Setup (Local Development)

This section guides you through spinning up the entire stack on your local machine with **zero external connectivity dependencies** (no remote database, no real payment calls, and no active email servers required).

### 📋 Prerequisites
Ensure the following are installed:
- **Node.js** (v18+ recommended)
- **Docker Desktop** (required for running local Supabase containers)
- **Supabase CLI** (installed globally or run via npx)

---

### Step 1: Install Dependencies
Install packages at the workspace root and inside the frontend application:
```bash
# In the repository root
npm install

# Navigate to the frontend directory
cd web
npm install
cd ..
```

---

### Step 2: Spin Up Local Supabase Stack
Start Docker Desktop on your system. Then, from the repository root, run:
```bash
npm run supabase:start
```
*Note: This spins up the Supabase local suite via Docker, applies all versioned migrations (`supabase/migrations/`), and loads mock catalog seed data from `supabase/seed.sql`.*

Upon success, the CLI will output your local endpoints. Make a note of these:
*   **API URL**: `http://127.0.0.1:54321`
*   **DB URL**: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
*   **Studio URL** (DB visual manager): `http://localhost:54323`
*   **Inbucket URL** (Local email catcher): `http://localhost:54324`
*   **anon key** & **service_role key**

---

### Step 3: Serve Local Edge Functions
To serve the Deno Edge Functions locally with hot-reloading:
```bash
npm run supabase:functions:serve
```
This runs the local edge runtime server listening on `http://127.0.0.1:54321/functions/v1/`.
Before serving, ensure you configure the local secrets file at [supabase/functions/.env.development.local](supabase/functions/.env.development.local) using [supabase/functions/.env.example](supabase/functions/.env.example) as a guide.

---

### Step 4: Configure Frontend Environment
Navigate to the `web` folder and copy the environment template:
```bash
cd web
cp .env.example .env.local
```
Update [web/.env.local](web/.env.local) with your local keys:
```env
VITE_SUPABASE_URL="http://127.0.0.1:54321"
VITE_SUPABASE_ANON_KEY="YOUR_LOCAL_ANON_KEY_FROM_STEP_2"
VITE_ADMIN_CONSOLE_URL="http://localhost:5173"
```

---

### Step 5: Start the Frontend Dev Server
Run the local Vite builder:
```bash
npm run dev
```
Open `http://localhost:5173` to browse the storefront.

---

### Step 6: Local Passwordless Login Testing
1. Visit `http://localhost:5173/account/login` and enter one of the seeded user emails:
   - **Customer account**: `customer@example.com`
   - **Admin account**: `admin@anika.com`
2. Click **Send OTP**.
3. Open the **Inbucket Email Catcher** console at `http://localhost:54324`.
4. Copy the 6-digit OTP code received in the simulated email, paste it back on the frontend login page, and submit.
5. If logging in as `admin@anika.com`, click **Go to Admin** in the header or navigate directly to `http://localhost:5173/admin` to manage the system.

---

## 💻 Frontend Track

The frontend is a single-page application (SPA) designed to feel elegant and premium.

### 🛠️ Tech Stack & Key Libraries
*   **Core**: React 19 (functional components)
*   **Build tool**: Vite (fast builds, hot module replacement)
*   **Routing**: React Router DOM (v7)
*   **State Management**: Zustand (stores for global auth, cart status, wishlist caching)
*   **Styling**: Pure Vanilla CSS styled with custom design variables (fonts: Cinzel, Cormorant Garamond, Inter)

### 📁 Layout Structure
The frontend source code is organized within [web/src/](web/src/):
*   `/account`: Code relating to login, registration, and OTP validation pages.
*   `/admin`: Protected router and layouts for admin dashboards, products management (CRUD), category controllers, orders monitor, homepage banner modifiers, and systems configurations.
*   `/components`: Reusable storefront layouts (cart drawer, checkout address selectors, global headers, footers).
*   `/hooks`: Zustand state hooks (e.g. `useAuth`, `useCart`).
*   `/services`: API requests wrapping Supabase client communication.
*   `App.jsx`: Master router config.

### 🏗️ Scripts
Run these inside the `/web` directory:
*   `npm run dev`: Boots up the local Vite hot-reload server.
*   `npm run build`: Bundles assets to production-ready files in `/dist`.
*   `npm run preview`: Hosts the local `/dist` directory for inspection.

---

## ⚙️ Backend Track (Edge Functions)

The serverless backend logic runs as Supabase Edge Functions.

### 🛠️ Tech Stack
*   **Runtime**: Deno 2 / Supabase Edge Runtime
*   **Dependency Management**: Unified import maps via local `deno.json` in each function directory.

### ⚡ Available Functions

#### 1. Razorpay Payment Function (`supabase/functions/razorpay/`)
Facilitates secure online checkout payments.
*   **Actions**:
    *   `create_order`: Validates user authentication via authorization headers, queries the Postgres database to verify the product's actual price (blocking price tampering on the client side), and issues a Razorpay order ID.
    *   `verify_payment`: Computes SHA256 HMAC signature verification using `RAZORPAY_KEY_SECRET`, writes the paid order status to the database, and flags it ready for shipping.

#### 2. Ekart Logistics Function (`supabase/functions/ekart/`)
Integrates the storefront with Ekart courier systems.
*   **Actions**:
    *   `check_serviceability`: Verifies route support for customer pincodes.
    *   `book_shipment`: Hands order details to Ekart to book shipment, retrieves waybill strings, and writes them to the DB.
    *   `track_shipment`: Fetches live tracking logs and milestones.
    *   `cancel_order`: Cancels booked courier packages on demand.

### 🔒 Environment Configurations
Create `.env.development.local` (for development) and `.env.production.local` (for production) in the [supabase/functions/](supabase/functions/) directory. Mapped variables:
```env
# Razorpay Credentials
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="secret_..."

# Ekart Courier Credentials
EKART_SANDBOX="true"
EKART_BASE_URL="https://..."
EKART_CLIENT_ID="client_..."
EKART_USERNAME="user_..."
EKART_PASSWORD="pass_..."

# Merchant Seller Info (Used in Ekart Shipments)
SELLER_NAME="Anika Jewelry"
SELLER_ADDRESS="123 Fashion Street, Mumbai"
SELLER_GST_TIN="27AAAAA0000A1Z5"
SELLER_PHONE="9876543210"
SELLER_PIN="400001"
```

---

## 🗄️ Database Track

Database services are built on PostgreSQL, deployed on Supabase, and version-controlled via database migrations.

### 📊 Core Database Entity Schema

| Table Name | Description | RLS Read Policy | RLS Write Policy |
| :--- | :--- | :--- | :--- |
| `public.products` | Product listings (price, sku, descriptions, images) | Public Read | Admin users only |
| `public.categories` | Catalog taxonomy categories | Public Read | Admin users only |
| `public.orders` | Orders metadata, payment states, and waybill numbers | User's own orders | User's own / Admin write |
| `public.order_items` | Products breakdown mapping to individual orders | User's own items | User's own / Admin write |
| `public.cart` | Persistent shopping cart items per user session | User's own records | User's own records |
| `public.wishlist` | Logged in user saved wishlist listings | User's own records | User's own records |
| `public.admin_users` | Secure list of authorized administrators | Authenticated users | System Admin only |

---

### 🛡️ Row-Level Security (RLS)
Security is implemented directly at the database level:
*   Users are authenticated securely via email OTP.
*   User-specific tables assert identity checks: `auth.uid() = user_id`.
*   Administrative tables check if the authenticated user's ID exists in `public.admin_users`.

### 📂 Database Migrations & Commands
Migrations are stored in [supabase/migrations/](supabase/migrations/) as sequential SQL files.
*   Run local migration updates: `supabase db push` (or `npm run supabase:db:push`).
*   Rebuild database from scratch: `supabase db reset` (resets schema and applies seed data).

---

## 🚀 DevOps Track (CI/CD, Terraform, Hosting)

This section maps out remote hosting orchestration, DNS routing, and CI/CD automation.

### 🔄 CI/CD Pipeline Workflow
The automated deployment pipeline is hosted in [.github/workflows/deploy.yml](.github/workflows/deploy.yml) and runs on pushes to `dev` (targeting development environment) and `main` (targeting production).

```
   [Git Push to dev/main]
             │
             ▼
   ┌───────────────────┐
   │   Terraform Run   │ ──► Provision remote database settings & custom domains
   └───────────────────┘
             │
             ▼
   ┌───────────────────┐
   │   DB Migrations   │ ──► Deploy updated SQL migrations to remote Supabase DB
   └───────────────────┘
             │
             ▼
   ┌───────────────────┐
   │  Deploy Secrets   │ ──► Package Env secrets and inject to Supabase config
   └───────────────────┘
             │
             ▼
   ┌───────────────────┐
   │  Edge Functions   │ ──► Deploy Razorpay & Ekart endpoints to Deno runtime
   └───────────────────┘
```

---

### 🏗️ Infrastructure as Code (Terraform)
Located in the [terraform/](terraform/) directory. It manages cloud resources and Supabase project state.
*   **Environments**: Dev and Prod inputs are managed via `.tfvars` config blocks.
    - Copy [terraform/environments/dev.tfvars.example](terraform/environments/dev.tfvars.example) to `dev.tfvars` and set target values.
*   **Execution**:
    ```bash
    cd terraform
    terraform init
    terraform workspace select anika-fashion-ecom-dev
    terraform apply -var-file="environments/dev.tfvars"
    ```

---

### 🕸️ Domain Registrations (GoDaddy) & Hosting (Vercel)
*   **Web store hosting**: Deployed to Vercel. Build commands: `npm run build`, Output directory: `dist`.
*   **vercel.json rewrite rules**: Handles client-side routing fallback for the single page React app:
    ```json
    {
      "rewrites": [
        { "source": "/((?!api/.*).*)", "destination": "/index.html" }
      ]
    }
    ```
*   **GoDaddy DNS configuration**:
    - Manage domain settings on GoDaddy.
    - Point the GoDaddy domains (`anikafashion.in` or its staging subdomains) to Vercel Nameservers or configure CNAME records to point to Vercel/Supabase endpoints.

---

### 📧 Email SMTP configuration (Resend.com)
Authenticating OTP login emails is handled via Resend SMTP server:
*   Configure custom domain verification on Resend.com.
*   Update SMTP options inside Terraform tfvars:
    - Host: `smtp.resend.com` (Port: 587)
    - Username: `resend`
    - Password: `re_your_resend_api_key` (passed securely as `smtp_pass`)

---

## 🤖 AI-Assisted Development Track (.agent & OpenSpec)

This repository is optimized for AI-assisted workflows using OpenSpec and Graphify.

### 📝 OpenSpec Workflow (Design & Task Driven)
We manage software changes through spec-driven capability models located in the [openspec/](openspec/) directory.

*   **Capabilities & Specs**: Core functionality specs reside in `openspec/specs/`.
*   **Change Management Flow**:
    1. **Propose**: Generate capability proposals under `openspec/changes/` (run `/opsx-propose`).
    2. **Apply**: Implement code changes task by task (run `/opsx-apply`).
    3. **Sync**: Update the main specification models with changes from delta files (run `/opsx-sync`).
    4. **Archive**: Move completed change proposals to `openspec/changes/archive/` (run `/opsx-archive`).

---

### 🕸️ Graphify (AST-based Codebase Graph)
A static index of workspace dependencies is kept in `graphify-out/`.
*   **Architecture Query**: Run `graphify query "Where is Razorpay signature verified?"` or use graphify query shortcuts.
*   **Updating index**: After modifying codebase files in your session, you **MUST** refresh the graph index:
    ```bash
    graphify update .
    ```
    *(AST-only operation, runs locally with no API costs).*
