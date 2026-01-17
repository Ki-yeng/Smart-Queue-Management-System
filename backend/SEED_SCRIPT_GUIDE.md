# Seed Script Documentation

## Overview

The seed script (`scripts/seedAdmin.js`) initializes the application database with a default admin user for first-time setup. This ensures the system has at least one admin account that can be used to log in and configure the application.

## File Location

```
backend/
├── scripts/
│   └── seedAdmin.js    ← Seed script
├── package.json        ← npm scripts
├── .env               ← Environment variables
└── src/
    └── models/
        └── User.js    ← User model
```

## Usage

### Run the Seed Script

```bash
# Navigate to backend directory
cd backend

# Run with npm script
npm run seed

# OR run directly with node
node scripts/seedAdmin.js
```

### Expected Output (First Run)

```
🔗 Connecting to MongoDB...
✅ MongoDB connected
🔍 Checking for existing admin user...
👤 Creating admin user...

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

⚠️  IMPORTANT:
   1. Change the default admin password immediately
   2. Never commit default credentials to version control
   3. Use strong, unique passwords in production
   4. Consider enabling 2FA for admin accounts

🔌 Database connection closed
```

### Expected Output (Subsequent Runs)

```
🔗 Connecting to MongoDB...
✅ MongoDB connected
🔍 Checking for existing admin user...

✅ Admin user already exists:
   Email: admin@kcau.ac.ke
   Name: KCAU Admin
   Department: Administration
   Created: 1/18/2026, 10:30:45 AM

⏭️  Skipping admin creation.

🔌 Database connection closed
```

## How It Works

### Step-by-Step Process

1. **Load Environment Variables**
   - Reads `.env` file using dotenv
   - Required: `MONGO_URI` for database connection

2. **Connect to MongoDB**
   - Uses `connectDB()` from `src/utils/db.js`
   - Establishes connection to MongoDB

3. **Check for Existing Admin**
   - Queries User collection for any user with role: "admin"
   - If found: Display details and exit
   - If not found: Proceed to create new admin

4. **Hash Password**
   - Uses bcrypt to securely hash the default password
   - Salt rounds: 10 (industry standard)

5. **Create Admin User**
   - Creates new User document with:
     - Name: KCAU Admin
     - Email: admin@kcau.ac.ke
     - Password: hashed "Admin@2024"
     - Role: admin
     - Department: Administration
     - isActive: true

6. **Save to Database**
   - Saves user document to MongoDB
   - Triggers timestamp fields (createdAt, updatedAt)

7. **Display Credentials**
   - Shows admin ID, name, email, role
   - Shows default login credentials
   - Displays security warnings

8. **Close Connection**
   - Disconnects from MongoDB
   - Exits process

### Error Handling

The script gracefully handles various error scenarios:

#### MongoDB Connection Error
```
❌ MongoDB connection error: [error details]
```
**Solution:** Verify MongoDB is running and `MONGO_URI` is correct in `.env`

#### Duplicate Email
```
❌ Error: Admin email already exists in database
   If you need to reset the admin account, delete it manually from the database first.
```
**Solution:** Admin already created. Use new credentials or delete from database first.

#### Validation Error
```
❌ Validation Error:
   name: Name is required
   email: Email is required
```
**Solution:** Check User model validation rules.

#### Connection Timeout
```
❌ Seed Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:** Ensure MongoDB is running on the correct host/port.

## Default Credentials

```
Email:    admin@kcau.ac.ke
Password: Admin@2024
Role:     admin
```

⚠️ **IMPORTANT:** Change these credentials immediately after first login!

## Configuration

### Customizing Admin Details

To create an admin with different credentials, edit the `DEFAULT_ADMIN` object in `scripts/seedAdmin.js`:

```javascript
const DEFAULT_ADMIN = {
  name: "KCAU Admin",           // Change admin name
  email: "admin@kcau.ac.ke",    // Change admin email
  password: "Admin@2024",        // Change admin password
  role: "admin",                 // Keep as admin
  department: "Administration",  // Change department
};
```

Then run: `npm run seed`

### Environment Variables

Required in `.env`:

```env
MONGO_URI=mongodb://localhost:27017/kcau-queue
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
PORT=5000
```

## Security Considerations

### ✅ What the Script Does Right

1. **Password Hashing:** Uses bcrypt with 10 salt rounds
2. **Idempotent:** Safe to run multiple times (skips if admin exists)
3. **Validation:** Enforces User model constraints
4. **Clean Shutdown:** Properly closes database connection
5. **Error Handling:** Catches and reports errors clearly

### ⚠️ Security Warnings

1. **Default Credentials Included**
   - Never use defaults in production
   - Change password immediately after setup
   - Consider environment-based credentials

2. **Hardcoded Values**
   - Script includes default password in source code
   - Don't commit with modified credentials
   - Use env variables for production

3. **Database Access**
   - Script has full database access
   - Restrict file permissions appropriately
   - Run only in trusted environments

## Troubleshooting

### Issue: "Cannot find module 'bcrypt'"

**Cause:** Dependencies not installed
**Solution:**
```bash
cd backend
npm install
```

### Issue: "Cannot find module '../src/models/User'"

**Cause:** Running from wrong directory
**Solution:**
```bash
# Correct way
cd backend
npm run seed

# Wrong way (don't do this)
node scripts/seedAdmin.js  # Run this from backend directory only
```

### Issue: "ECONNREFUSED - connection refused"

**Cause:** MongoDB not running
**Solution:**
```bash
# Start MongoDB (local)
mongod

# OR check MongoDB Atlas connection string
# Verify MONGO_URI in .env
```

### Issue: "Admin user already exists" but I want to reset

**Solution:** Delete existing admin from database:

```bash
# Using MongoDB Compass (GUI)
# 1. Connect to database
# 2. Find "users" collection
# 3. Delete the admin user
# 4. Run: npm run seed

# Using MongoDB CLI
mongo
use kcau-queue
db.users.deleteOne({ role: "admin" })
exit
# Then run: npm run seed
```

### Issue: Script exits with code 1 but no error message

**Solution:** Check MongoDB connection and logs:
```bash
# Verify MongoDB is running
# Check .env for correct MONGO_URI
# Look at MongoDB logs for connection issues
```

## Advanced Usage

### Creating Multiple Seed Scripts

For testing or different environments:

```bash
# Create new seed file
cp scripts/seedAdmin.js scripts/seedTest.js

# Edit seedTest.js to customize
# Run it:
node scripts/seedTest.js
```

### Running in CI/CD Pipeline

```yaml
# Example GitHub Actions workflow
- name: Seed Database
  run: |
    cd backend
    npm run seed
```

### Seed Script with Logging

The script logs all operations to console. Redirect to file:

```bash
npm run seed > seed.log 2>&1
```

## Integration with Setup

### Full Setup Sequence

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
# Create .env file with MONGO_URI and JWT secrets

# 3. Initialize database
npm run seed

# 4. Start application
npm run dev
```

### Verification After Seed

Login to the application:
1. Open http://localhost:5173
2. Click Login
3. Enter admin@kcau.ac.ke / Admin@2024
4. Should see Admin Dashboard

## Maintenance

### When to Run Seed Script

- **First deployment:** Always run once
- **Fresh database:** Run to initialize
- **Testing:** Run between test cycles
- **Safe to run:** Multiple times (idempotent)

### Monitoring

The script provides clear console output. Monitor for:
- Connection errors
- Validation failures
- Duplicate key errors
- Unexpected exceptions

### Logs

Check MongoDB logs for:
```bash
# MongoDB local logs
~/.local/share/mongodb/mongod.log

# MongoDB Atlas logs
# Check Atlas UI > Clusters > Activity
```

## Related Files

- [Authentication Controller](../src/controllers/authController.js) - Login/registration logic
- [User Model](../src/models/User.js) - User schema definition
- [Database Connection](../src/utils/db.js) - MongoDB connection setup
- [First Time Setup Guide](../../FIRST_TIME_SETUP.md) - Complete setup instructions

## Support

For issues or improvements to the seed script, check:
1. Error message and logs
2. Environment variables
3. MongoDB connection
4. File permissions
5. Node.js version compatibility
