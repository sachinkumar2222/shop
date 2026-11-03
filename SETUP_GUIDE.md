# Shree Pooja Ghar - Complete Setup Guide

Welcome to the **Shree Pooja Ghar** POS and Inventory Management System. This guide will help you set up the project on a new machine from scratch.

## 📋 Prerequisites
Before you begin, ensure you have the following installed on your system:
- **Docker** and **Docker Compose** (Required for easiest setup)
- **Node.js 20+** (Optional, if you want to run things outside Docker)
- **Git** (Optional, for version control)

## 🚀 Quick Start (Docker)

The easiest way to run the entire stack (Frontend, Backend, and local PostgreSQL database) is using Docker.

1. **Unzip the project** and open a terminal in the root directory (the folder containing `docker-compose.yml`).
2. **Start the containers**:
   ```bash
   sudo docker compose up --build -d
   ```
   *Note: On Windows or Mac, you can omit `sudo`.*
3. **Wait a few moments** for the database to initialize and the servers to start.
4. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## 🔐 Default Credentials

When you start the application for the first time, a default Admin account is automatically seeded into the database. You can use these to log in to the POS.

- **Email:** `admin@shreepooja.com`
- **Password:** `admin123`

*(Note: No categories, products, or customers are pre-seeded. The database is a clean slate, ready for your business data.)*

## ⚙️ Environment Variables

The project relies on environment files for configuration. If they are missing, you should create them:

### Backend (`backend/.env`)
```env
# Database connection string for the local Docker PostgreSQL
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/shreepooja?schema=public"

# JWT Secret for authentication
JWT_SECRET="shreepoojaghr-super-secret-jwt-key-2024"

# Environment
NODE_ENV="development"
PORT="3001"
```

### Frontend (`frontend/.env.local`)
```env
# URL pointing to the local backend API
NEXT_PUBLIC_API_URL="http://localhost:3001/api/v1"
```

## 🔄 Supabase (Cloud Database) Integration

This system includes a feature to backup/sync your local database to a remote **Supabase** instance.

1. Create a free account at [Supabase](https://supabase.com) and create a new project.
2. Open the **SQL Editor** in your Supabase dashboard.
3. Open the `backend/supabase_schema.sql` file from this repository, copy its contents, and run it in the Supabase SQL Editor. This will create all necessary tables.
4. In your Supabase dashboard, go to **Project Settings -> Database** and copy the **Connection String (URI)**. *Make sure to use the Session Mode port (5432).*
5. Open the POS app at http://localhost:3000, log in, and go to **Settings > Database Sync**.
6. Paste the URL, click **Save URL**, then click **Local → Supabase (Push)** to sync your data!

## 🛠️ Troubleshooting & Common Commands

**View Logs:**
```bash
sudo docker compose logs -f
```

**Restart the App:**
```bash
sudo docker compose restart
```

**Reset the Local Database (Warning: Deletes all local data):**
If you ever need to completely wipe your local database and start fresh:
```bash
sudo docker compose down -v
sudo docker compose up --build -d
```
*(This will wipe the data volume, recreate the database, and re-seed the default admin user.)*

---
*Built with Next.js, Node.js, Express, Prisma, and PostgreSQL.*
