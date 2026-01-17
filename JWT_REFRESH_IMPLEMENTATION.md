## JWT Token Refresh Mechanism - Implementation Complete

### Overview
Implemented a complete JWT token refresh system with:
- Short-lived access tokens (15 minutes)
- Long-lived refresh tokens (7 days)
- Automatic token refresh on 401 responses
- Database persistence of refresh tokens
- Request queuing during refresh

---

## Architecture

### Token Lifecycle

```
1. LOGIN
   └─> Generate access token (15m) + refresh token (7d)
       └─> Store refresh token in DB
           └─> Return both tokens to client

2. API CALL with access token
   └─> If successful: ✅ Proceed
   └─> If 401 (expired): 
       └─> Use refresh token to get new access token
           └─> Retry original request
                └─> ✅ Success or redirect to login

3. LOGOUT
   └─> Clear both tokens from client
       └─> Clear refresh token from DB (optional)
```

---

## Backend Changes

### 1. User Model Enhancement
**File**: `backend/src/models/User.js`

Added fields:
```javascript
{
  refreshToken: String,           // Stores the refresh token
  refreshTokenExpires: Date,      // Expiration time
}
```

### 2. Auth Controller Updates
**File**: `backend/src/controllers/authController.js`

**New Functions**:
- `generateAccessToken()` - Creates short-lived access token (15m)
- `generateRefreshToken()` - Creates long-lived refresh token (7d)
- `refreshAccessToken()` - New endpoint handler

**Updated Functions**:
- `login()` - Now stores refresh token in DB and returns both tokens

**Token Payload**:

Access Token:
```json
{
  "id": "user_id",
  "role": "student|staff|admin",
  "email": "user@example.com"
}
```

Refresh Token:
```json
{
  "id": "user_id",
  "type": "refresh"
}
```

### 3. Auth Routes
**File**: `backend/src/routes/authRoutes.js`

**New Route**:
```
POST /api/auth/refresh
Body: { "refreshToken": "token_string" }
Response: { "token": "new_access_token", "user": {...} }
```

---

## Frontend Changes

### 1. Auth Service Updates
**File**: `frontend/src/services/authService.js`

**New Functions**:
- `refreshAccessToken()` - Calls backend refresh endpoint
  - Retries automatically if token is invalid
  - Clears tokens on refresh failure
  - Returns new token or null

**Updated Functions**:
- `loginUser()` - Now saves refresh token to localStorage
- `logoutUser()` - Clears both access and refresh tokens

**Storage**:
```javascript
localStorage.setItem("token", accessToken);
localStorage.setItem("refreshToken", refreshToken);
localStorage.setItem("user", JSON.stringify(user));
```

### 2. Axios Interceptor
**File**: `frontend/src/services/axiosInterceptor.js` (NEW)

**Features**:
- Intercepts 401 responses
- Automatically calls refresh endpoint
- Retries original request with new token
- Queues requests during refresh (prevents race conditions)
- Redirects to login if refresh fails

**Setup**:
```javascript
// In main.jsx
setupAxiosInterceptors();
```

---

## API Endpoints

### Login (Existing)
```
POST /api/auth/login

Request:
{
  "email": "student@kcau.ac.ke",
  "password": "password123"
}

Response:
{
  "message": "Login successful",
  "token": "eyJhbG...",
  "refreshToken": "eyJhbG...",
  "user": { "id": "...", "name": "...", "role": "customer" }
}
```

### Refresh Access Token (NEW)
```
POST /api/auth/refresh

Request:
{
  "refreshToken": "eyJhbG..."
}

Response:
{
  "message": "Token refreshed successfully",
  "token": "eyJhbG...",
  "user": { "id": "...", "name": "...", "role": "customer" }
}
```

---

## Client-Side Behavior

### Without Interceptor (Manual):
```javascript
try {
  await api.get("/tickets");
} catch (err) {
  if (err.status === 401) {
    const result = await refreshAccessToken();
    if (result) {
      // Retry with new token
      await api.get("/tickets");
    } else {
      // Redirect to login
      navigate("/");
    }
  }
}
```

### With Interceptor (Automatic):
```javascript
// Just make the request - interceptor handles everything
const tickets = await api.get("/tickets");
// If token expired:
// 1. Interceptor catches 401
// 2. Calls refresh endpoint
// 3. Retries request automatically
// 4. Returns result to your code
```

---

## Token Configuration

**Access Token** (Short-lived):
- Expires: 15 minutes
- Env variable: `JWT_EXPIRES_IN` (default: "15m")
- Used for: Regular API requests

**Refresh Token** (Long-lived):
- Expires: 7 days
- Env variable: `JWT_REFRESH_EXPIRES_IN` (default: "7d")
- Used for: Obtaining new access tokens
- Stored: In database + localStorage

**Secrets**:
- Access: `JWT_SECRET` (default: "dev_secret")
- Refresh: `JWT_REFRESH_SECRET` (default: "dev_refresh_secret")

### Update .env:
```bash
JWT_SECRET=your_super_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

---

## Security Features

✅ **Refresh tokens stored in database** - Can be revoked
✅ **Token expiration tracking** - Validates refresh token age
✅ **Request queuing** - Prevents race conditions during refresh
✅ **Account status check** - Disabled accounts can't get new tokens
✅ **Atomic token updates** - Uses findByIdAndUpdate
✅ **Automatic retry** - Seamless user experience on token expiration
✅ **Error handling** - Gracefully redirects on refresh failure

---

## Testing

### Test Access Token Expiration:

1. **Login**:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@kcau.ac.ke","password":"password123"}'
```

2. **Make API call** (within 15 minutes):
```bash
curl -X GET http://localhost:5000/api/tickets \
  -H "Authorization: Bearer <access_token>"
```

3. **Wait 15+ minutes**, then try again
   - Browser will automatically refresh token
   - Request will succeed with new token

4. **Test Refresh Manually**:
```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh_token>"}'
```

---

## Error Scenarios

| Scenario | Result | User Action |
|----------|--------|-------------|
| Access token expired | Auto-refresh | Transparent (no action needed) |
| Refresh token invalid | Redirect to login | Must re-login |
| Refresh token expired | Redirect to login | Must re-login |
| Account disabled | Deny refresh | Must contact admin |
| Network error on refresh | Retry queued | Uses cached data if available |

---

## Files Modified

1. ✅ `backend/src/models/User.js` - Added refresh token fields
2. ✅ `backend/src/controllers/authController.js` - Token generation & refresh logic
3. ✅ `backend/src/routes/authRoutes.js` - Added /refresh route
4. ✅ `frontend/src/services/authService.js` - Added refresh function
5. ✅ `frontend/src/services/axiosInterceptor.js` - NEW interceptor setup
6. ✅ `frontend/src/main.jsx` - Initialize interceptor on app load

---

## Next Steps

- [ ] Test with frontend and backend running
- [ ] Verify tokens persist across browser refresh
- [ ] Test manual token refresh endpoint
- [ ] Monitor console for refresh logs
- [ ] Implement token revocation (optional)
- [ ] Add "remember me" for longer session (optional)

---

## Troubleshooting

**Tokens not being refreshed:**
- Check browser DevTools > Application > LocalStorage for tokens
- Verify `JWT_REFRESH_SECRET` is set in .env
- Check backend logs for refresh errors

**Request failing after manual token expiration:**
- Clear localStorage and login again
- Ensure interceptor is initialized in main.jsx
- Check network tab for 401 responses

**Redirect to login happening too quickly:**
- Verify refresh token exists in DB
- Check refresh token expiration date
- Ensure account is still active (isActive: true)
