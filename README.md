# M1 Villa Management System - PostgreSQL Edition

A comprehensive villa management system with PostgreSQL backend and Next.js frontend.

## 🚀 Features

- **Villa Management**: Complete CRUD operations for villa properties
- **Owner Management**: Detailed owner information and contact management
- **Staff Management**: Staff assignment and role management
- **Document Management**: Secure document storage with SharePoint integration
- **Photo Management**: Property photo galleries
- **Facilities Management**: Comprehensive facilities checklist
- **Bank Details**: Encrypted storage of financial information
- **OTA Credentials**: Secure storage of Online Travel Agency credentials
- **Onboarding Workflow**: Step-by-step villa onboarding process
- **Real-time Updates**: ElectricSQL integration for real-time data sync (optional)

## 📋 Prerequisites

- Node.js 18+ and npm 8+
- PostgreSQL 14+
- Git

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone [repository-url]
cd M1-PostgreSQL-Standalone
```

2. **Install dependencies**
```bash
npm run install:all
```

3. **Database Setup**

Create a PostgreSQL database and user:
```sql
CREATE USER taif_me WITH PASSWORD 'taif_me' CREATEDB;
CREATE DATABASE ils_m1_villa_management OWNER taif_me;
GRANT ALL PRIVILEGES ON DATABASE ils_m1_villa_management TO taif_me;
```

4. **Configure Environment Variables**

Backend configuration (`backend/.env`):
```env
DATABASE_URL="postgresql://taif_me:taif_me@localhost:5432/ils_m1_villa_management"
JWT_SECRET=your-secret-key-here
PORT=4001
```

Frontend configuration (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:4001
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-key
CLERK_SECRET_KEY=your-clerk-secret
```

5. **Run Database Migrations**
```bash
npm run db:setup
```

6. **Seed Initial Data (Optional)**
```bash
npm run db:seed
```

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```

This will start:
- Backend API server on http://localhost:4001
- Frontend application on http://localhost:3000

### Production Build
```bash
npm run build
```

## 📁 Project Structure

```
M1-PostgreSQL-Standalone/
├── backend/                 # PostgreSQL backend
│   ├── prisma/              # Database schema and migrations
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Express middleware
│   │   └── utils/           # Utility functions
│   └── package.json
├── frontend/                # Next.js frontend
│   ├── app/                 # Next.js app directory
│   ├── components/
│   │   ├── dashboard/       # Dashboard components
│   │   ├── onboarding/      # Onboarding wizard
│   │   └── villa-profile/   # Villa profile sections
│   ├── lib/                 # Utility libraries
│   └── package.json
└── package.json            # Root package.json

```

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Villas
- `GET /api/villas` - List all villas
- `GET /api/villas/:id` - Get villa details
- `POST /api/villas` - Create new villa
- `PUT /api/villas/:id` - Update villa
- `DELETE /api/villas/:id` - Delete villa

### Owners
- `GET /api/owners/:villaId` - Get owner details
- `PUT /api/owners/:villaId` - Update owner

### Staff
- `GET /api/staff/villa/:villaId` - Get villa staff
- `POST /api/staff` - Add staff member
- `PUT /api/staff/:id` - Update staff
- `DELETE /api/staff/:id` - Remove staff

### Onboarding
- `GET /api/onboarding/:villaId` - Get onboarding progress
- `PUT /api/onboarding/:villaId` - Update progress
- `POST /api/onboarding/:villaId/complete` - Complete onboarding

## 🗄️ Database Management with DBeaver

To connect to the database using DBeaver:

1. Create new PostgreSQL connection
2. Use these settings:
   - Host: `localhost`
   - Port: `5432`
   - Database: `ils_m1_villa_management`
   - Username: `taif_me`
   - Password: `taif_me`

## 🔒 Security Features

- JWT-based authentication
- Encrypted storage for sensitive data (bank details, OTA credentials)
- Role-based access control
- Input validation and sanitization
- CORS configuration
- Rate limiting

## 🧪 Testing

```bash
# Run all tests
npm test

# Backend tests only
npm run test:backend

# Frontend tests only
npm run test:frontend
```

## 📝 Environment Variables

### Backend (.env)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `ENCRYPTION_KEY` - Key for encrypting sensitive data
- `PORT` - Server port (default: 4001)

### Frontend (.env.local)
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk authentication
- `CLERK_SECRET_KEY` - Clerk secret key

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is proprietary and confidential.

## 👥 Support

For support and questions, please contact the ILS development team.