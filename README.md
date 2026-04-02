# CivilCOPZ - Civil Grievance Management Platform

A production-ready, enterprise-grade grievance management platform built with Vue 3, Express.js, and PostgreSQL. Features comprehensive security hardening, containerization, and scalable architecture for national-scale deployment.

## 🚀 Features

### Core Functionality
- **User Authentication**: JWT-based authentication with role-based access control
- **Case Management**: Create, update, and track grievance cases with status workflow
- **File Uploads**: Secure file upload with validation and storage
- **Pagination**: Efficient data pagination for large datasets
- **Real-time Updates**: Live case status updates and notifications

### Security Features
- **Rate Limiting**: Configurable rate limits (100 req/15min general, 5 req/15min auth)
- **Input Validation**: Comprehensive Joi validation schemas
- **Security Headers**: Helmet.js with CSP, HSTS, and other security headers
- **CORS Protection**: Strict CORS configuration
- **Database Security**: Enum constraints, indexing, and parameterized queries
- **Logging**: Morgan HTTP request logging
- **Container Security**: Non-root user execution, minimal base images

### Technical Stack
- **Frontend**: Vue 3 + Vue Router + Pinia + Tailwind CSS
- **Backend**: Express.js + Prisma ORM + PostgreSQL
- **Authentication**: JWT with bcrypt hashing
- **File Storage**: Local file system with validation
- **Testing**: Jest + Supertest (backend), Vitest (frontend)
- **Containerization**: Docker + Docker Compose
- **Deployment**: Ready for cloud platforms (Vercel, Railway, Render)

## 🛠️ Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL 15+ (for local development)

### Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd civilcopz
   ```

2. **Start the application**
   ```bash
   docker-compose up --build
   ```

3. **Access the application**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:3000

### Local Development

1. **Setup Database**
   ```bash
   # Install PostgreSQL and create database
   createdb civilcopz
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your database URL and JWT secret
   npx prisma migrate dev
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 🔒 Security Configuration

### Environment Variables
Create a `.env` file in the backend directory:

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@localhost:5432/civilcopz
JWT_SECRET=your-super-secure-jwt-secret-change-in-production
JWT_EXPIRY=24h
PORT=3000
```

### Security Features Implemented

1. **Rate Limiting**
   - General endpoints: 100 requests per 15 minutes
   - Authentication endpoints: 5 requests per 15 minutes

2. **Input Validation**
   - All user inputs validated with Joi schemas
   - File uploads restricted to specific types and sizes

3. **Database Security**
   - Enum constraints for user roles and case statuses
   - Indexed fields for performance and integrity
   - Parameterized queries via Prisma ORM

4. **HTTP Security Headers**
   - Content Security Policy (CSP)
   - X-Frame-Options, X-XSS-Protection
   - Strict-Transport-Security (HSTS)

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### End-to-End Testing
```bash
# Start services
docker-compose up -d

# Run E2E tests
npm run test:e2e
```

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**
   ```bash
   # Set production environment variables
   export DATABASE_URL="postgresql://..."
   export JWT_SECRET="your-production-secret"
   export NODE_ENV=production
   ```

2. **Database Migration**
   ```bash
   npx prisma migrate deploy
   ```

3. **Build and Deploy**
   ```bash
   # Using Docker Compose
   docker-compose -f docker-compose.prod.yml up --build -d

   # Or deploy to cloud platforms
   # Frontend: Vercel, Netlify
   # Backend: Railway, Render, Heroku
   # Database: Supabase, PlanetScale
   ```

### Cloud Deployment Options

- **Frontend**: Vercel (recommended), Netlify
- **Backend**: Railway (recommended), Render, Heroku
- **Database**: Supabase (recommended), PlanetScale, AWS RDS

## 📁 Project Structure

```
civilcopz/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── utils/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── tests/
│   ├── Dockerfile
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── views/
│   │   └── stores/
│   ├── tests/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
└── README.md
```

## 🔧 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Case Management Endpoints
- `GET /api/cases` - List cases (paginated)
- `POST /api/cases` - Create new case
- `GET /api/cases/:id` - Get case details
- `PUT /api/cases/:id` - Update case
- `DELETE /api/cases/:id` - Delete case

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation for common solutions

## 🔄 Future Enhancements

- [ ] AI-powered case classification
- [ ] Real-time notifications via WebSocket
- [ ] Advanced analytics dashboard
- [ ] Mobile application
- [ ] Multi-language support
- [ ] Integration with government APIs
  - `/submit-case` - Case submission form

## Testing

- Backend: `cd backend && npm test`
- Frontend: `cd frontend && npm test`

## Notes

- For local testing, use a PostgreSQL instance and set `DATABASE_URL` accordingly.
- JWT secret is required.
- File uploads are stored in `backend/uploads`; can be swapped to S3 later.
- Admin users can update case statuses and view all cases.

