# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview
M1 Villa Management System is a comprehensive villa management platform with PostgreSQL backend, Next.js frontend, and advanced integrations including SharePoint, ElectricSQL, and Clerk authentication.

## Development Commands

### Setup and Installation
```bash
# Install all dependencies (backend + frontend)
npm run install:all

# Database setup
npm run db:setup

# Optional: Seed initial data
npm run db:seed
```

### Development Workflow
```bash
# Start full development stack (backend + frontend)
npm run dev

# Start individual services
npm run dev:backend
npm run dev:frontend

# Backend only (runs on port 4001)
cd backend && npm run dev

# Frontend only (runs on port 3000/3001)
cd frontend && npm run dev
```

### Database Management
```bash
# Run database migrations
cd backend && npm run db:migrate

# Reset and recreate database
cd backend && npm run db:reset

# Database operations (using Prisma)
cd backend && npx prisma generate
cd backend && npx prisma migrate dev
cd backend && npx prisma studio  # Database GUI
```

### ElectricSQL Real-time Sync
```bash
# Start ElectricSQL service (Docker required)
cd backend && npm run electric:up

# Stop ElectricSQL service
cd backend && npm run electric:down
```

### Testing
```bash
# Run all tests
npm test

# Backend-specific tests
cd backend && npm run test
cd backend && npm run test:integration
cd backend && npm run test:sync        # ElectricSQL tests
cd backend && npm run test:graph       # Microsoft Graph tests

# Frontend tests
cd frontend && npm test
```

### Build and Production
```bash
# Build both applications
npm run build

# Production deployment with Docker
docker-compose -f docker-compose.prod.yml up -d

# Backend production start
cd backend && npm run build && npm start
```

## Architecture Overview

### Technology Stack
- **Backend**: Express.js + TypeScript, Prisma ORM, PostgreSQL 14+
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Authentication**: Clerk SDK
- **Real-time Sync**: ElectricSQL with logical replication
- **Document Management**: Microsoft SharePoint via Graph API
- **Deployment**: Docker Compose with Nginx reverse proxy

### Key System Components

#### Database Layer (PostgreSQL + Prisma)
- Villa-centric schema with complex relationships
- Core entities: Villa, Owner, Staff, Documents, Photos, Onboarding
- Enhanced onboarding tracking: OnboardingProgress, OnboardingSession, OnboardingStepProgress
- Financial data: BankDetails, OTACredentials (encrypted sensitive fields)

#### API Layer (Express.js)
Routes located in `backend/src/routes/`:
- **Onboarding**: Multi-step wizard with autosave and field-level progress tracking
- **Villa Management**: Full CRUD operations with document/photo handling
- **SharePoint Integration**: Document upload/management via Microsoft Graph
- **Dashboard**: Real-time analytics and villa statistics
- **Authentication**: Clerk-based JWT authentication

#### Frontend Layer (Next.js 15)
- **App Router**: Modern Next.js architecture with app directory
- **Onboarding Wizard**: 10-step flow with autosave, local backup, field-level progress
- **Villa Profiles**: Comprehensive villa management interface
- **Real-time Updates**: ElectricSQL React integration for live data sync

### Data Flow Patterns

#### Onboarding System
- Frontend wizard → REST APIs → Prisma → PostgreSQL
- Autosave: Debounced step-level saves every 3-5 seconds
- Field-level progress tracking via dedicated endpoints
- Local backup system with recovery capabilities (`OnboardingBackupService`)

#### Real-time Synchronization (ElectricSQL)
- Backend service initializes Electric client
- Role-based subscriptions over Shape API
- Production-synchronized tables: Villa, Owner, Staff, Documents, Onboarding data
- WebSocket connection for live updates

#### Document Management (SharePoint)
- Microsoft Graph API integration for file operations
- Structured folder hierarchy: `/villas/{villaCode}/{category}/`
- Secure upload with validation and virus scanning
- Direct SharePoint links for document access

## Development Environment Setup

### Prerequisites
- Node.js 18+, npm 8+
- PostgreSQL 14+
- Docker and Docker Compose (for ElectricSQL)
- Git

### Environment Variables
Backend (`.env`):
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/ils_m1_villa_management"
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=32-character-key
CLERK_SECRET_KEY=your-clerk-secret
AZURE_CLIENT_ID=sharepoint-app-id
AZURE_CLIENT_SECRET=sharepoint-secret
AZURE_TENANT_ID=azure-tenant-id
```

Frontend (`.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:4001
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-key
```

### Database Connection (DBeaver)
- Host: `localhost`
- Port: `5432`
- Database: `ils_m1_villa_management`
- Username: `taif_me` (development) / configured user (production)

## Agent Specialization (Claude Integration)

This codebase includes specialized Claude agents in `.claude/` directory:

### Available Specialists
- **Database Specialist**: PostgreSQL, Prisma ORM, complex relationships
- **Backend API Specialist**: Express.js APIs, SharePoint integration, ElectricSQL
- **Frontend Specialist**: Next.js 15, React 19, onboarding wizard
- **Integration Specialist**: External services, DevOps, system orchestration

### Agent Usage
- Database schema changes: Use `database-specialist`
- API endpoint development: Use `backend-api-specialist`
- UI components/UX: Use `frontend-specialist`
- Cross-system integration: Use `integration-specialist`

## Key Architectural Decisions

### Removed Systems (Production)
- Admin approval workflow (submit/approve/reject) - removed for production launch
- Notifications system (Novu + email triggers) - removed from onboarding flows

### Critical Integration Points
- **ElectricSQL**: Handles real-time sync between PostgreSQL and frontend
- **SharePoint**: Centralized document storage with Graph API integration
- **Clerk**: User authentication and session management
- **Prisma**: Type-safe database operations with advanced relationship mapping

### Performance Considerations
- Database indexing on frequently queried fields (villaCode, status, location)
- Redis caching layer for dashboard metrics and frequent queries
- ElectricSQL Shape API for optimized real-time data synchronization
- Debounced autosave to prevent excessive database writes

## Troubleshooting Common Issues

### ElectricSQL Connection Issues
```bash
# Check Electric service status
docker ps | grep electric

# Restart Electric service
cd backend && npm run electric:down && npm run electric:up
```

### Database Migration Issues
```bash
# Reset and recreate migrations
cd backend && npx prisma migrate reset
cd backend && npx prisma generate
```

### Build Issues
```bash
# Clear Next.js cache
cd frontend && rm -rf .next

# Reinstall dependencies
rm -rf node_modules && npm install
```
