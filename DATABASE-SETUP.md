# Database Setup Guide

## Problem: Dev/Prod Database Mismatch

This project previously had a mismatch between development (SQLite) and production (PostgreSQL), causing constant migration issues during deployment.

## Solution: PostgreSQL for Both Environments ✅

### Quick Setup (Recommended)

```bash
# Run the interactive setup script
npm run db:setup

# Or manually:
npm run db:postgres
npm run db:migrate
```

### Manual Setup

#### Option 1: PostgreSQL with Docker (Recommended)

1. **Start PostgreSQL container:**
   ```bash
   docker-compose up -d postgres
   ```

2. **Switch to PostgreSQL environment:**
   ```bash
   cp .env.postgres .env
   ```

3. **Run migrations:**
   ```bash
   npm run db:migrate
   ```

4. **Access your database:**
   - **Database**: `postgresql://admin:password123@localhost:5432/ipl_dfs_dev`
   - **pgAdmin**: http://localhost:8080 (admin@localhost.com / admin123)

#### Option 2: SQLite (Not Recommended - causes migration issues)

```bash
npm run db:sqlite
npm run db:migrate
```

### Available Scripts

```bash
npm run db:setup      # Interactive database setup
npm run db:postgres   # Switch to PostgreSQL
npm run db:sqlite     # Switch to SQLite
npm run db:migrate    # Run migrations
npm run db:reset      # Reset database
npm run db:studio     # Open Prisma Studio
npm run db:stop       # Stop Docker containers
```

### Environment Files

- **`.env`** - Current environment (auto-generated)
- **`.env.postgres`** - PostgreSQL development settings
- **`.env.sqlite`** - SQLite development settings (legacy)

### Migration Workflow

1. **Development**: Create migrations with PostgreSQL
2. **Deploy**: Migrations work seamlessly in production
3. **No more issues**: Same database engine in both environments

### Benefits

✅ **No more deployment failures** due to database differences  
✅ **Consistent migrations** between dev and production  
✅ **Same SQL features** available in both environments  
✅ **Easier debugging** - same database behavior  
✅ **Team consistency** - everyone uses the same setup  

### Troubleshooting

**Docker not starting?**
```bash
# Check Docker is running
docker info

# Restart containers
docker-compose down
docker-compose up -d postgres
```

**Migration issues?**
```bash
# Reset and start fresh
npm run db:reset
npm run db:migrate
```

**Schema issues?**
```bash
# Ensure schema uses PostgreSQL
npm run db:setup
# Choose option 3 to reset schema
```

### Production Deployment

Your production environment (Railway/Vercel) uses PostgreSQL, so migrations created with this setup will work perfectly.

**No more dev/prod database mismatch issues!** 🎉