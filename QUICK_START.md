# Quick Start Reference Card

## 🚀 Quick Setup (5 Minutes)

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env: Set MONGO_URI
npm run seed
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Open Browser
- Frontend: http://localhost:5173
- Login: admin@kcau.ac.ke / Admin@2024

---

## 📋 Seed Script Commands

```bash
# Run seed script
cd backend
npm run seed

# Output: Admin details and login credentials
```

### Seed Script Features
✅ Creates initial admin user
✅ Idempotent (safe to run multiple times)
✅ Hashes password with bcrypt
✅ Validates user data
✅ Handles errors gracefully

---

## 🔐 Default Admin Credentials

```
Email:    admin@kcau.ac.ke
Password: Admin@2024
```

⚠️ **IMPORTANT:** Change password immediately after first login!

---

## 🛠️ Common Commands

```bash
# Backend
npm run start         # Production start
npm run dev          # Development with hot reload
npm run seed         # Initialize admin user

# Frontend
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build

# Database
mongod               # Start MongoDB (local)
mongo               # Connect to MongoDB CLI
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `backend/scripts/seedAdmin.js` | Seed script |
| `backend/.env.example` | Environment template |
| `backend/package.json` | Dependencies & scripts |
| `frontend/src/main.jsx` | Frontend entry point |
| `backend/src/index.js` | Backend entry point |

---

## 🔍 Troubleshooting

### Issue: "MongoDB connection error"
```bash
# Check MongoDB is running
mongod --version

# Verify .env MONGO_URI
# Check database credentials
```

### Issue: "Admin already exists"
```bash
# Safe to ignore - admin already created
# Use credentials to login
npm run seed  # Will skip creation
```

### Issue: Port 5000 already in use
```bash
# Kill process using port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

---

## 📚 Documentation

- **Full Setup Guide:** [FIRST_TIME_SETUP.md](../FIRST_TIME_SETUP.md)
- **Seed Script Details:** [backend/SEED_SCRIPT_GUIDE.md](SEED_SCRIPT_GUIDE.md)
- **Implementation Summary:** [SEED_SCRIPT_IMPLEMENTATION.md](../SEED_SCRIPT_IMPLEMENTATION.md)

---

## 🔒 Security Checklist

After first setup:

- [ ] Change default admin password
- [ ] Generate strong JWT secrets in .env
- [ ] Never commit .env to version control
- [ ] Enable HTTPS in production
- [ ] Set up database backups
- [ ] Configure CORS origins
- [ ] Enable IP whitelisting (MongoDB Atlas)
- [ ] Set up audit logging
- [ ] Enable 2FA for admin accounts (future)
- [ ] Regular security updates

---

## 🚀 Production Deployment

```bash
# 1. Build frontend
cd frontend
npm run build

# 2. Set production .env variables
MONGO_URI=production-db-uri
JWT_SECRET=strong-production-secret
NODE_ENV=production

# 3. Run backend in production
npm run start

# 4. Serve frontend from web server
# (or use backend to serve static files)
```

---

## 📞 Getting Help

1. Check documentation files
2. Review error messages carefully
3. Check MongoDB connection/credentials
4. Verify environment variables
5. Check file permissions
6. Review logs

---

**Last Updated:** January 18, 2026
**Status:** Ready for Production
