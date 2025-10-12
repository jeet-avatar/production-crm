# CRM & Marketing Automation - Development Setup

## Quick Start

1. **Install dependencies** (already done ✅)
   ```bash
   npm install
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Start database services**
   ```bash
   # Option 1: Using Docker (recommended)
   docker-compose up -d postgres redis
   
   # Option 2: Install locally
   # PostgreSQL 15+ and Redis 7+ required
   ```

4. **Initialize database**
   ```bash
   npm run prisma:migrate
   npm run prisma:generate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Test the API**
   - Health check: http://localhost:3000/health
   - API endpoints: http://localhost:3000/api/*

## Database Configuration

### Using Docker (Recommended)
The docker-compose.yml file includes PostgreSQL and Redis services.

```bash
docker-compose up -d postgres redis
```

Default connection string for Docker:
```
DATABASE_URL="postgresql://crm_user:crm_password@localhost:5432/crm_db?schema=public"
```

### Local Installation
If you prefer local installation:

**PostgreSQL:**
```bash
# macOS with Homebrew
brew install postgresql@15
brew services start postgresql@15

# Create database and user
createdb crm_db
createuser crm_user
```

**Redis:**
```bash
# macOS with Homebrew
brew install redis
brew services start redis
```

## Environment Variables

Key variables to configure in your `.env` file:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/crm_db?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# Email (SendGrid)
SENDGRID_API_KEY="your-sendgrid-api-key"
FROM_EMAIL="noreply@yourcompany.com"
FROM_NAME="Your Company Name"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"
```

## Development Tools

### Prisma Studio (Database GUI)
```bash
npm run prisma:studio
```
Opens at: http://localhost:5555

### API Testing
Use tools like:
- Postman
- Insomnia
- curl
- VS Code REST Client

### Sample API Calls

**Register User:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## Project Structure Overview

```
src/
├── app.ts              # Express app configuration
├── server.ts           # Server startup
├── config/             # Configuration files
├── controllers/        # Route controllers (to be implemented)
├── middleware/         # Authentication, error handling
├── routes/             # API route definitions
├── services/           # Business logic services
├── utils/              # Utility functions (auth, logger)
└── types/              # TypeScript type definitions

prisma/
├── schema.prisma       # Database schema
└── migrations/         # Database migration files
```

## Next Development Steps

1. **Complete Controllers**: Implement full CRUD operations for all entities
2. **Add Validation**: Enhance input validation and sanitization
3. **Implement Queues**: Set up Bull queues for email processing
4. **Add Tests**: Write comprehensive test suites
5. **Documentation**: Generate API documentation with Swagger
6. **Performance**: Add caching and optimization
7. **Monitoring**: Integrate application monitoring

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check if PostgreSQL is running
   - Verify DATABASE_URL in .env
   - Ensure database exists

2. **Port Already in Use**
   - Change PORT in .env
   - Kill existing process: `lsof -ti:3000 | xargs kill -9`

3. **Prisma Client Issues**
   - Run: `npm run prisma:generate`
   - Restart TypeScript server in VS Code

### Logs Location
- Application logs: `logs/combined.log`
- Error logs: `logs/error.log`
- Console logs: Development only