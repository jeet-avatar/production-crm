#!/bin/bash

echo "🚀 Setting up CRM & Marketing Automation Backend..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please update the .env file with your actual configuration values"
else
    echo "✅ .env file already exists"
fi

# Start Docker services if docker-compose.yml exists
if [ -f docker-compose.yml ]; then
    echo "🐳 Starting database services with Docker..."
    docker-compose up -d postgres redis
    
    # Wait for PostgreSQL to be ready
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 10
else
    echo "⚠️  docker-compose.yml not found. Please ensure PostgreSQL and Redis are running manually."
fi

# Run Prisma migrations
echo "🗄️  Running database migrations..."
npm run prisma:migrate

# Generate Prisma client (already done, but just in case)
echo "🔧 Generating Prisma client..."
npm run prisma:generate

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Update your .env file with the correct database credentials"
echo "   2. If using Docker: Ensure Docker is running and services are up"
echo "   3. Run 'npm run dev' to start the development server"
echo "   4. Visit http://localhost:3000/health to verify the server is running"
echo ""
echo "🔗 Available commands:"
echo "   npm run dev          - Start development server"
echo "   npm run build        - Build for production"
echo "   npm start           - Start production server"
echo "   npm run prisma:studio - Open Prisma Studio (database GUI)"
echo ""