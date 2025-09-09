# M1 Villa Management Backend - PostgreSQL + ElectricSQL

## 🚀 Overview

This is the production-ready backend for the M1 Villa Management System, migrated from Convex to PostgreSQL with ElectricSQL for blazing-fast real-time synchronization.

## ✨ Features

- **PostgreSQL Database**: Robust, scalable relational database
- **ElectricSQL**: Real-time data synchronization
- **Prisma ORM**: Type-safe database access
- **Express.js API**: RESTful API endpoints
- **JWT Authentication**: Secure authentication system
- **Role-based Access Control**: Fine-grained permissions
- **Data Encryption**: Sensitive data protection
- **SharePoint Integration**: Document management
- **Real-time Updates**: WebSocket support via ElectricSQL

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- Redis (for caching)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
```bash
cd microservices/m1/backend-postgres
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Set up the database**
```bash
# Make the setup script executable
chmod +x scripts/setup-database.sh

# Run the setup script
./scripts/setup-database.sh
```

Or manually:
```bash
# Run Prisma migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Seed the database (optional)
npm run db:seed
```

## 🗄️ Database Setup for DBBeaver

1. **Install PostgreSQL**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql
brew services start postgresql
```

2. **Create database and user**
```sql
-- Connect to PostgreSQL as superuser
sudo -u postgres psql

-- Create database
CREATE DATABASE ils_m1_villa_management;

-- Create user
CREATE USER m1_user WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ils_m1_villa_management TO m1_user;

-- Enable required extensions
\c ils_m1_villa_management
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

3. **Configure DBBeaver Connection**
   - Host: `localhost`
   - Port: `5432`
   - Database: `ils_m1_villa_management`
   - Username: `m1_user`
   - Password: `your_secure_password`

## ⚡ ElectricSQL Setup

1. **Install ElectricSQL CLI**
```bash
npm install -g electric-sql
```

2. **Initialize ElectricSQL**
```bash
electric-sql init
```

3. **Start ElectricSQL service**
```bash
electric-sql start
```

4. **Configure sync rules**
The sync rules are defined in `electric-config.json`

## 🚀 Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### With PM2 (recommended for production)
```bash
npm install -g pm2
pm2 start ecosystem.config.js
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - User logout

### Villas
- `GET /api/villas` - List all villas
- `GET /api/villas/:id` - Get villa details
- `POST /api/villas` - Create new villa
- `PUT /api/villas/:id` - Update villa
- `DELETE /api/villas/:id` - Archive villa
- `GET /api/villas/:id/stats` - Get villa statistics

### Onboarding
- `GET /api/onboarding/:villaId` - Get onboarding progress
- `POST /api/onboarding/:villaId/step` - Update step
- `POST /api/onboarding/:villaId/submit` - Submit for review
- `POST /api/onboarding/:villaId/approve` - Approve onboarding

### Bookings
- `GET /api/bookings` - List bookings
- `GET /api/bookings/:id` - Get booking details
- `POST /api/bookings` - Create booking
- `PUT /api/bookings/:id` - Update booking
- `DELETE /api/bookings/:id` - Cancel booking

### Dashboard
- `GET /api/dashboard/overview` - Dashboard overview
- `GET /api/dashboard/metrics` - Key metrics
- `GET /api/dashboard/recent-activity` - Recent activities

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- Data encryption for sensitive fields
- Rate limiting
- CORS configuration
- Helmet.js for security headers
- Input validation with Zod

## 📊 Database Schema

The database schema is defined in `prisma/schema.prisma` and includes:

- **Villa Management**: Villas, Owners, Contractual Details
- **Staff Management**: Staff records with compensation
- **Document Management**: Photos, Documents, Agreements
- **Booking System**: Bookings, Partners, Commissions
- **Facilities**: Detailed facility checklists
- **Onboarding**: Multi-step onboarding workflow

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📈 Monitoring

- Health check endpoint: `GET /health`
- Metrics endpoint: `GET /metrics`
- Logging with Winston
- Error tracking with Sentry (optional)

## 🚢 Deployment

### Digital Ocean Deployment

1. **Create a Droplet**
   - Ubuntu 22.04 LTS
   - 2GB RAM minimum
   - Add SSH keys

2. **Set up the server**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install PM2
sudo npm install -g pm2

# Clone repository
git clone <your-repo-url>
cd ils-backoffice/microservices/m1/backend-postgres

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
nano .env

# Run database setup
./scripts/setup-database.sh

# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

3. **Configure Nginx**
```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/m1-backend

# Add configuration
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

sudo ln -s /etc/nginx/sites-available/m1-backend /etc/nginx/sites-enabled
sudo nginx -t
sudo systemctl restart nginx
```

## 📝 Environment Variables

Key environment variables (see `.env.example` for full list):

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ils_m1_villa_management

# ElectricSQL
ELECTRIC_URL=http://localhost:5133
ELECTRIC_SYNC_URL=ws://localhost:5133/ws

# Server
PORT=4001
NODE_ENV=production

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=32-character-key
ENCRYPTION_IV=16-character-iv
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests
4. Submit a pull request

## 📄 License

Proprietary - ILS Villa Management System

## 🆘 Support

For issues or questions, contact the development team.