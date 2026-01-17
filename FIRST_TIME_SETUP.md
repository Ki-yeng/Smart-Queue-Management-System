# First-Time Setup Guide

This guide explains how to set up the KCAU Smart Queue Management System for the first time.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- Environment variables configured (see `.env.example`)

## Setup Steps

### 1. Backend Setup

#### Install Dependencies
```bash
cd backend
npm install
```

#### Configure Environment Variables
Create a `.env` file in the `backend` directory:

```env
# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/kcau-queue
# OR for MongoDB Atlas:
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/kcau-queue

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production

# API Port
PORT=5000
```

#### Initialize Admin User
Run the seed script to create the initial admin user:

```bash
npm run seed
```

**Output:**
```
✅ Admin user created successfully!

📋 Admin Details:
   ID: 507f1f77bcf86cd799439011
   Email: admin@kcau.ac.ke
   Name: KCAU Admin
   Role: admin
   Department: Administration
   Active: true
   Created: 1/18/2026, 10:30:45 AM

🔐 Login Credentials:
   Email: admin@kcau.ac.ke
   Password: Admin@2024
```

**Note:** If admin already exists, script will skip creation and show existing admin details.

### 2. Frontend Setup

#### Install Dependencies
```bash
cd frontend
npm install
```

#### Configure Environment Variables
Create a `.env` file in the `frontend` directory:

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Start the Application

#### Development Mode (Two Terminal Windows)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Expected output:
```
✅ MongoDB connected
🚀 Server running on port 5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Expected output:
```
  VITE v4.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

### 4. First Login

1. Open browser: `http://localhost:5173`
2. Click "Login"
3. Enter admin credentials:
   - **Email:** `admin@kcau.ac.ke`
   - **Password:** `Admin@2024`
4. Click "Login"

You should see the Admin Dashboard.

## Important Security Notes

⚠️ **CRITICAL - Change Default Credentials:**

1. **Immediately change the admin password:**
   - Login as admin
   - Go to Settings/Profile
   - Update password to a strong, unique value
   - **Never use default password in production**

2. **Environment Variables:**
   - Generate strong JWT secrets using:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - Never commit `.env` files to version control
   - Use a secure secret management system in production

3. **Database Security:**
   - If using MongoDB Atlas, enable IP whitelisting
   - Use strong database credentials
   - Enable encryption at rest
   - Regular backups

4. **Production Deployment:**
   - Use HTTPS/TLS
   - Enable CORS appropriately (not `*`)
   - Use strong session tokens
   - Implement rate limiting
   - Set proper CORS origins to known frontend URLs

## Seed Script Reference

### File Location
`backend/scripts/seedAdmin.js`

### Usage
```bash
# Run with npm
npm run seed

# Or run directly
node scripts/seedAdmin.js
```

### What It Does
1. Connects to MongoDB
2. Checks if an admin user already exists
3. If exists: Shows admin details and exits
4. If not: Creates new admin with hashed password
5. Displays login credentials and security recommendations
6. Closes database connection

### Default Admin Credentials
```
Email:    admin@kcau.ac.ke
Password: Admin@2024
Role:     admin
```

### Error Handling
- **Duplicate Email:** Shows error if admin email exists
- **Validation Errors:** Shows field-by-field validation issues
- **Database Errors:** Shows connection/query errors

## Troubleshooting

### Seed Script Errors

#### "MongoDB connection error"
- Ensure MongoDB is running
- Verify `MONGO_URI` in `.env`
- Check MongoDB credentials if using Atlas

#### "Admin email already exists"
- Admin already created
- Use `npm run seed` to check existing admin
- To reset, manually delete admin from database

#### "Cannot find module 'dotenv'"
- Run `npm install` in backend directory
- Ensure `package.json` has dotenv dependency

### Application Won't Start

#### Backend Port Already in Use
```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill process (Windows)
taskkill /PID <PID> /F
```

#### Frontend Can't Connect to Backend
- Verify backend is running on correct port
- Check `VITE_API_URL` in frontend `.env`
- Check CORS settings in `backend/src/index.js`

## Next Steps After Setup

1. **Create Staff Users:**
   - Login as admin
   - Go to User Management
   - Create staff accounts (assigned to counters)

2. **Configure Counters:**
   - Create counters in Admin Dashboard
   - Assign staff to counters
   - Assign services to counters

3. **Test the System:**
   - Create student account
   - Generate ticket as student
   - View ticket as staff
   - Update counter status as staff

4. **Customize:**
   - Update system name/branding
   - Configure services
   - Set up departments

## Database Backup

```bash
# MongoDB local backup
mongodump --db kcau-queue --out ./backup

# MongoDB Atlas backup (via UI)
# Go to Atlas console > Clusters > Backup
```

## Additional Resources

- [Node.js Documentation](https://nodejs.org/docs/)
- [Express.js Guide](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [React Documentation](https://react.dev/)
- [Socket.IO Documentation](https://socket.io/docs/)
