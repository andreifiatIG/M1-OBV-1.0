# M1 Villa Management System - Claude Agents

## Project Overview
This is a comprehensive villa management system with PostgreSQL backend, Next.js frontend, and advanced integrations including SharePoint, ElectricSQL, and Clerk authentication.

## Available Specialized Agents

### 🗃️ Database Specialist
**Focus**: PostgreSQL, Prisma ORM, database optimization
- Handles complex villa-owner-onboarding relationships  
- Manages database migrations and schema updates
- Optimizes queries for dashboard and villa profile operations
- **Current Priority**: Fix onboarding progress tracking and admin approval database integration

### 🚀 Backend API Specialist  
**Focus**: Express.js APIs, service layer, integrations
- Develops REST API endpoints for villa management
- Handles SharePoint, ElectricSQL, and email integrations
- Manages authentication and file upload services
- **Current Priority**: Replace admin approval mock data with real database APIs

### 🎨 Frontend Specialist
**Focus**: Next.js 15, React 19, TypeScript components
- Develops onboarding wizard and admin approval interfaces
- Manages villa profile components and dashboard UI
- Handles real-time updates and user experience optimization  
- **Current Priority**: Fix OnboardingWizardEnhanced integration and admin approval data connection

### 🔗 Integration Specialist
**Focus**: External services, DevOps, testing, system orchestration
- Manages SharePoint document management integration
- Handles ElectricSQL real-time synchronization
- Oversees testing strategy and production deployment
- **Current Priority**: Ensure proper service integration across onboarding and approval workflows

## Quick Start Guide

### For Database Tasks
```
> Use database-specialist for schema changes, query optimization, or database-related issues
```

### For Backend API Development
```
> Use backend-api-specialist for API endpoints, service layer logic, or external integrations
```

### For Frontend Development  
```
> Use frontend-specialist for React components, Next.js pages, or UI/UX improvements
```

### For System Integration
```
> Use integration-specialist for external service integration, testing, or deployment issues
```

## Agent Coordination Strategy

### Cross-Agent Collaboration Workflows

#### 1. Database Schema Changes
1. **Database Specialist**: Creates migration and updates schema
2. **Backend API Specialist**: Updates service layer for new fields
3. **Frontend Specialist**: Updates components to use new data structures
4. **Integration Specialist**: Tests end-to-end integration

#### 2. New Feature Development
1. **Database Specialist**: Designs data model requirements
2. **Backend API Specialist**: Implements API endpoints and business logic
3. **Frontend Specialist**: Creates user interface components
4. **Integration Specialist**: Handles external service integration and testing

#### 3. Bug Fixes and Optimization
1. Identify primary responsible agent based on issue domain
2. Secondary agents provide support for integration points
3. **Integration Specialist** validates fix across entire system

## Current Development Priorities

### 🔴 High Priority Issues
1. **Onboarding Database Integration** (Database + Backend + Frontend)
2. **Admin Approval System Mock Data** (Backend + Frontend)
3. **Villa Profile Data Loading** (Database + Backend + Frontend)

### 🟡 Medium Priority Tasks  
1. **SharePoint Integration Optimization** (Integration + Backend)
2. **Dashboard Performance** (Database + Frontend)
3. **Real-time Sync Enhancement** (Integration + Backend)

### 🟢 Low Priority Enhancements
1. **UI/UX Improvements** (Frontend)
2. **Advanced Testing Coverage** (Integration)
3. **Performance Monitoring** (Integration)

## Technology Stack by Agent

### Database Specialist
- PostgreSQL with advanced features
- Prisma ORM with TypeScript  
- Database migrations and indexing
- Query optimization and performance tuning

### Backend API Specialist
- Express.js REST APIs
- Clerk SDK for authentication
- Microsoft Graph for SharePoint
- Nodemailer for email services
- Winston logging and validation

### Frontend Specialist
- Next.js 15 with App Router
- React 19 with TypeScript
- Tailwind CSS styling
- React Hook Form and Zod validation
- ElectricSQL React integration

### Integration Specialist  
- Docker containerization
- ElectricSQL real-time sync
- SharePoint document management
- Testing frameworks (Vitest, integration tests)
- Production deployment and monitoring

## Usage Guidelines

### When to Use Each Agent
- **Complex database queries or schema changes**: Database Specialist
- **API endpoint development or external integrations**: Backend API Specialist  
- **UI components or user experience issues**: Frontend Specialist
- **Cross-system integration or deployment issues**: Integration Specialist

### Agent Switching Strategy
- Start with the most relevant specialist for your primary concern
- Ask for coordination with other agents when issues span multiple domains
- Use Integration Specialist for comprehensive system-wide issues

## Upgrading
```
> Use agent-architect to upgrade agents
```

The agent-architect will check for updates and preserve any custom configurations.
