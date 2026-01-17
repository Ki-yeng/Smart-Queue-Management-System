# KCAU Smart Queue Management System - Documentation Index

## 🎯 Start Here

New to the project? Start with:
1. [QUICK_START.md](QUICK_START.md) - 5-minute setup guide
2. [FIRST_TIME_SETUP.md](FIRST_TIME_SETUP.md) - Complete setup instructions
3. Run: `npm run seed` in backend directory

---

## 📖 Main Documentation

### Setup & Installation
- **[QUICK_START.md](QUICK_START.md)** - Quick reference (5 min read)
- **[FIRST_TIME_SETUP.md](FIRST_TIME_SETUP.md)** - Complete setup guide (15 min read)
- **[backend/.env.example](backend/.env.example)** - Environment template

### Seed Script Documentation
- **[SEED_SCRIPT_GUIDE.md](backend/SEED_SCRIPT_GUIDE.md)** - Detailed technical reference (20 min read)
- **[SEED_SCRIPT_IMPLEMENTATION.md](SEED_SCRIPT_IMPLEMENTATION.md)** - Implementation summary (10 min read)
- **[SEED_SCRIPT_COMPLETE.md](SEED_SCRIPT_COMPLETE.md)** - Final summary (5 min read)

### Socket.IO Stability (Previously Implemented)
- **[SOCKET_FIX_DOCUMENTATION.md](SOCKET_FIX_DOCUMENTATION.md)** - Socket.IO connection stability (reference)

---

## 🚀 Quick Commands

```bash
# Backend Setup
cd backend
npm install
npm run seed          # Initialize admin user
npm run dev          # Start development server
npm run start        # Start production server

# Frontend Setup
cd frontend
npm install
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

---

## 🔐 Default Admin Credentials

```
Email:    admin@kcau.ac.ke
Password: Admin@2024
```

⚠️ **IMPORTANT:** Change immediately after first login!

---

## 📂 Project Structure

```
KCAU Smart Queue Management System/
│
├── 📄 QUICK_START.md                    ← Start here!
├── 📄 FIRST_TIME_SETUP.md              ← Full setup guide
├── 📄 SEED_SCRIPT_IMPLEMENTATION.md    ← Implementation details
├── 📄 SEED_SCRIPT_COMPLETE.md          ← Final summary
├── 📄 SOCKET_FIX_DOCUMENTATION.md      ← Socket stability
│
├── backend/
│   ├── 📄 SEED_SCRIPT_GUIDE.md         ← Technical reference
│   ├── 📄 .env.example                 ← Environment template
│   ├── scripts/
│   │   └── seedAdmin.js                ← Main seed script
│   ├── package.json                    ← With "seed" script
│   ├── src/
│   │   ├── index.js                    ← Server entry point
│   │   ├── controllers/                ← Business logic
│   │   ├── models/                     ← Database schemas
│   │   ├── routes/                     ← API endpoints
│   │   ├── middleware/                 ← Auth & validation
│   │   ├── pages/                      ← Static pages
│   │   └── utils/                      ← Helpers & DB
│   └── ...
│
├── frontend/
│   ├── package.json
│   ├── src/
│   │   ├── main.jsx                    ← Entry point
│   │   ├── pages/                      ← React pages
│   │   ├── components/                 ← React components
│   │   ├── services/                   ← API services
│   │   └── ...
│   └── ...
│
└── public/
    └── ...
```

---

## 🔑 Key Features Implemented

### ✅ Authentication System
- User registration (students)
- Login with JWT tokens
- Token refresh mechanism (auto-refresh via axios interceptor)
- Password hashing with bcrypt
- Role-based access control (RBAC)

### ✅ Role-Based Access Control (RBAC)
- **Admin:** Full system access, user management, counter configuration
- **Staff:** Ticket operations, counter management, queue handling
- **Customer:** Ticket generation, status checking, queue viewing

### ✅ Real-Time Features
- Socket.IO connection with stable reconnection
- Live queue updates
- Counter status notifications
- Ticket status tracking

### ✅ Seed Script System
- Automated admin user initialization
- Idempotent design (safe to run multiple times)
- Error handling with clear messages
- Security best practices

---

## 📋 Setup Checklist

- [ ] Install Node.js and MongoDB
- [ ] Clone/extract project
- [ ] Backend: `npm install`
- [ ] Frontend: `npm install`
- [ ] Create backend/.env from .env.example
- [ ] Set MONGO_URI in .env
- [ ] Run: `npm run seed` in backend
- [ ] Start backend: `npm run dev`
- [ ] Start frontend: `npm run dev`
- [ ] Open http://localhost:5173
- [ ] Login with admin@kcau.ac.ke / Admin@2024
- [ ] Change admin password immediately
- [ ] Create staff users
- [ ] Configure counters and services

---

## 🔒 Security Checklist

- [ ] Change default admin password
- [ ] Generate strong JWT secrets
- [ ] Configure .env with strong values
- [ ] Set NODE_ENV=production for production
- [ ] Enable HTTPS in production
- [ ] Configure CORS properly
- [ ] Set up database backups
- [ ] Enable IP whitelisting (MongoDB Atlas)
- [ ] Use strong database credentials
- [ ] Never commit .env to version control
- [ ] Regular security updates
- [ ] Monitor access logs
- [ ] Plan for 2FA implementation

---

## 🛠️ Technology Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB
- **Authentication:** JWT + bcrypt
- **Real-Time:** Socket.IO
- **Middleware:** Custom auth/RBAC middleware

### Frontend
- **Framework:** React 19
- **Build Tool:** Vite
- **HTTP Client:** Axios
- **Routing:** React Router
- **Styling:** Tailwind CSS
- **Real-Time:** Socket.IO client

---

## 📚 Documentation by Purpose

### "How do I..."

| Question | Document |
|----------|----------|
| Set up the project for the first time? | [FIRST_TIME_SETUP.md](FIRST_TIME_SETUP.md) |
| Get started quickly? | [QUICK_START.md](QUICK_START.md) |
| Run the seed script? | [SEED_SCRIPT_GUIDE.md](backend/SEED_SCRIPT_GUIDE.md) |
| Understand the seed script? | [SEED_SCRIPT_IMPLEMENTATION.md](SEED_SCRIPT_IMPLEMENTATION.md) |
| Configure environment variables? | [backend/.env.example](backend/.env.example) |
| Fix Socket.IO issues? | [SOCKET_FIX_DOCUMENTATION.md](SOCKET_FIX_DOCUMENTATION.md) |
| Deploy to production? | [FIRST_TIME_SETUP.md](FIRST_TIME_SETUP.md) (Production section) |
| Create an admin user? | [SEED_SCRIPT_GUIDE.md](backend/SEED_SCRIPT_GUIDE.md) |
| Troubleshoot common issues? | [QUICK_START.md](QUICK_START.md) (Troubleshooting) |

---

## 🎯 Common Workflows

### First-Time Setup (New Developer)
```bash
# 1. Backend setup
cd backend
npm install
npm run seed
npm run dev

# 2. Frontend setup (new terminal)
cd frontend
npm install
npm run dev

# 3. Open browser
# http://localhost:5173
# Login: admin@kcau.ac.ke / Admin@2024
# Change password immediately
```

### Fresh Database Reset
```bash
# 1. Delete MongoDB database
# (via MongoDB Compass or CLI)

# 2. Re-seed
cd backend
npm run seed

# 3. Restart backend
npm run dev
```

### Production Deployment
```bash
# 1. Build frontend
cd frontend
npm run build

# 2. Configure production .env
# Set NODE_ENV=production
# Set strong JWT secrets
# Set production MONGO_URI

# 3. Initialize admin
cd backend
npm run seed

# 4. Start server
npm run start
```

---

## 🚨 Troubleshooting Quick Links

| Issue | Document | Section |
|-------|----------|---------|
| MongoDB connection error | [QUICK_START.md](QUICK_START.md) | Troubleshooting |
| Port already in use | [QUICK_START.md](QUICK_START.md) | Troubleshooting |
| Admin already exists | [SEED_SCRIPT_GUIDE.md](backend/SEED_SCRIPT_GUIDE.md) | Troubleshooting |
| Socket connection issues | [SOCKET_FIX_DOCUMENTATION.md](SOCKET_FIX_DOCUMENTATION.md) | - |
| Frontend can't connect to backend | [FIRST_TIME_SETUP.md](FIRST_TIME_SETUP.md) | Troubleshooting |
| Permission denied errors | [SEED_SCRIPT_GUIDE.md](backend/SEED_SCRIPT_GUIDE.md) | Troubleshooting |

---

## 📞 Getting Help

1. **Read QUICK_START.md first** - Most issues have quick answers
2. **Check error message in console** - Often indicates exact problem
3. **Verify .env configuration** - Missing MONGO_URI is common
4. **Check MongoDB connection** - Ensure MongoDB is running
5. **Review detailed guides** - FIRST_TIME_SETUP.md has extensive troubleshooting

---

## 📊 Status Overview

| Component | Status | Documentation |
|-----------|--------|-----------------|
| Seed Script | ✅ Complete | [SEED_SCRIPT_GUIDE.md](backend/SEED_SCRIPT_GUIDE.md) |
| Authentication | ✅ Complete | [FIRST_TIME_SETUP.md](FIRST_TIME_SETUP.md) |
| RBAC | ✅ Complete | [SEED_SCRIPT_IMPLEMENTATION.md](SEED_SCRIPT_IMPLEMENTATION.md) |
| Socket.IO Stability | ✅ Complete | [SOCKET_FIX_DOCUMENTATION.md](SOCKET_FIX_DOCUMENTATION.md) |
| Token Refresh | ✅ Complete | [FIRST_TIME_SETUP.md](FIRST_TIME_SETUP.md) |
| API Endpoints | ✅ Complete | Inline in route files |
| Frontend UI | ✅ Complete | React components |
| Database | ✅ Configured | MongoDB connection |

---

## 🎓 Learning Resources

### Understanding the Seed Script
1. Read: [QUICK_START.md](QUICK_START.md) - Overview
2. Examine: [backend/scripts/seedAdmin.js](backend/scripts/seedAdmin.js) - Code
3. Study: [SEED_SCRIPT_GUIDE.md](backend/SEED_SCRIPT_GUIDE.md) - Deep dive

### Understanding the Architecture
1. Start: [FIRST_TIME_SETUP.md](FIRST_TIME_SETUP.md) - Setup overview
2. Backend: [backend/src/index.js](backend/src/index.js) - Server setup
3. Frontend: [frontend/src/main.jsx](frontend/src/main.jsx) - Client setup
4. Auth: [backend/src/middleware/authMiddleware.js](backend/src/middleware/authMiddleware.js) - RBAC

### Understanding the Stack
- Node.js/Express: Backend framework
- MongoDB: Database
- React: Frontend framework
- Socket.IO: Real-time communication
- JWT: Authentication tokens
- Bcrypt: Password hashing

---

## 🔄 Release Notes

### Current Version (January 18, 2026)
- ✅ Seed script for admin initialization
- ✅ Comprehensive documentation (5 guides)
- ✅ Role-based access control (RBAC)
- ✅ JWT token refresh mechanism
- ✅ Socket.IO stability fixes
- ✅ Complete error handling
- ✅ Security best practices
- ✅ Environment configuration template

### MVP Features
- ✅ User authentication (admin, staff, customer)
- ✅ Ticket management system
- ✅ Queue management
- ✅ Counter management
- ✅ Real-time updates
- ✅ Dashboard analytics
- ✅ Role-based permissions

---

## 📝 Notes

- **Last Updated:** January 18, 2026
- **Status:** Production Ready
- **Node Version:** v14 or higher recommended
- **MongoDB:** Local or Atlas supported
- **Browser Support:** Modern browsers (Chrome, Firefox, Safari, Edge)

---

## 🎉 You're Ready!

Everything is set up and documented. Follow [QUICK_START.md](QUICK_START.md) to get running in 5 minutes!

**Next Step:** Run `npm run seed` in the backend directory.

---

*For detailed information about any topic, refer to the specific documentation file listed above.*
