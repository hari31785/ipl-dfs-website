#!/bin/bash

# Database Setup Script for IPL DFS Website
# This script helps you set up your development database environment

set -e

echo "🏏 IPL DFS Website - Database Setup"
echo "===================================="
echo ""

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker Desktop."
        exit 1
    fi
    echo "✅ Docker is running"
}

# Function to setup PostgreSQL development environment
setup_postgres() {
    echo "🐘 Setting up PostgreSQL development environment..."
    
    check_docker
    
    # Copy PostgreSQL environment
    cp .env.postgres .env
    echo "✅ Copied PostgreSQL environment to .env"
    
    # Start Docker containers
    echo "🚀 Starting PostgreSQL container..."
    docker-compose up -d postgres
    
    # Wait for PostgreSQL to be ready
    echo "⏳ Waiting for PostgreSQL to be ready..."
    until docker-compose exec postgres pg_isready -U admin; do
        sleep 2
    done
    
    echo "✅ PostgreSQL is ready!"
    
    # Generate Prisma client
    echo "🔄 Generating Prisma client..."
    npx prisma generate
    
    # Run migrations
    echo "🔄 Running database migrations..."
    npx prisma migrate dev --name init
    
    echo ""
    echo "🎉 PostgreSQL development environment is ready!"
    echo "   Database: postgresql://admin:password123@localhost:5432/ipl_dfs_dev"
    echo "   pgAdmin: http://localhost:8080 (admin@localhost.com / admin123)"
    echo ""
}

# Function to setup SQLite development environment
setup_sqlite() {
    echo "📁 Setting up SQLite development environment..."
    
    # Copy SQLite environment
    cp .env.sqlite .env
    echo "✅ Copied SQLite environment to .env"
    
    # Update schema for SQLite
    sed -i '' 's/provider = "postgresql"/provider = "sqlite"/' prisma/schema.prisma
    echo "✅ Updated schema for SQLite"
    
    # Generate Prisma client
    echo "🔄 Generating Prisma client..."
    npx prisma generate
    
    # Run migrations
    echo "🔄 Running database migrations..."
    npx prisma migrate dev --name init
    
    echo ""
    echo "🎉 SQLite development environment is ready!"
    echo "   Database: file:./prisma/dev.db"
    echo ""
}

# Function to reset to PostgreSQL production schema
reset_postgres_schema() {
    echo "🔄 Resetting schema to PostgreSQL..."
    sed -i '' 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma
    echo "✅ Schema reset to PostgreSQL"
}

# Function to clean up
cleanup() {
    echo "🧹 Cleaning up..."
    docker-compose down
    rm -rf node_modules/.prisma
    echo "✅ Cleanup complete"
}

# Main menu
echo "Choose your setup:"
echo "1) PostgreSQL (Recommended - matches production)"
echo "2) SQLite (Quick setup, but may cause migration issues)"
echo "3) Reset schema to PostgreSQL"
echo "4) Cleanup and stop containers"
echo "5) Exit"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        setup_postgres
        ;;
    2)
        setup_sqlite
        ;;
    3)
        reset_postgres_schema
        ;;
    4)
        cleanup
        ;;
    5)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac