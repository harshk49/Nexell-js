# Nexell - Task and Note Management API

A robust RESTful API for managing tasks and notes, built with Node.js, Express, and MongoDB.

## 🌐 Live API

The API is now live and available at:

```
https://tasknexus-backend.onrender.com
```

## 🚀 Features

- User Authentication (JWT)
- Task Management
- Note Management
- User Profile Management
- Rate Limiting
- Security Features
- Error Handling
- Logging System

## 🛠️ Tech Stack

- Node.js
- Express.js
- MongoDB
- JWT Authentication
- Winston Logger
- Jest (Testing)

## 📝 API Documentation

### Base URL

```
https://tasknexus-backend.onrender.com
```

### Authentication Routes

```bash
# Register User
POST /api/auth/register
Headers:
  Content-Type: application/json
Body:
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123",
  "firstName": "Test",    # Required
  "lastName": "User"      # Optional
}

# Login User (via email or username)
POST /api/auth/login
Headers:
  Content-Type: application/json
Body:
{
  "emailOrUsername": "test@example.com",  # Can be either email or username
  "password": "password123"
}

# Google OAuth Authentication
GET /api/auth/google

# Google OAuth Callback
GET /api/auth/google/callback

# GitHub OAuth Authentication
GET /api/auth/github

# GitHub OAuth Callback
GET /api/auth/github/callback

# Logout User
POST /api/auth/logout
Headers:
  Authorization: Bearer <your_jwt_token>
```

### OAuth Setup

To enable Google and GitHub authentication:

1. **Google OAuth**:

   - Go to the [Google Developer Console](https://console.developers.google.com/)
   - Create a new project
   - Configure the OAuth consent screen
   - Create OAuth 2.0 credentials
   - Set authorized redirect URI as `http://your-domain/api/auth/google/callback`
   - Add the credentials to your .env file

2. **GitHub OAuth**:
   - Go to your [GitHub Settings](https://github.com/settings/developers)
   - Navigate to Developer Settings > OAuth Apps
   - Register a new OAuth application
   - Set the Authorization callback URL as `http://your-domain/api/auth/github/callback`
   - Add the credentials to your .env file

### Notes Routes

```bash
# Get All Notes
GET /api/notes
Headers:
  Authorization: Bearer <your_jwt_token>

# Create Note
POST /api/notes
Headers:
  Authorization: Bearer <your_jwt_token>
  Content-Type: application/json
Body:
{
  "title": "My Note",
  "content": "Note content here",
  "color": "#ff0000"
}

# Get Single Note
GET /api/notes/:id
Headers:
  Authorization: Bearer <your_jwt_token>

# Update Note
PUT /api/notes/:id
Headers:
  Authorization: Bearer <your_jwt_token>
  Content-Type: application/json
Body:
{
  "title": "Updated Note",
  "content": "Updated content",
  "color": "#00ff00"
}

# Delete Note
DELETE /api/notes/:id
Headers:
  Authorization: Bearer <your_jwt_token>
```

### Tasks Routes

```bash
# Get All Tasks
GET /api/tasks
Headers:
  Authorization: Bearer <your_jwt_token>

# Create Task
POST /api/tasks
Headers:
  Authorization: Bearer <your_jwt_token>
  Content-Type: application/json
Body:
{
  "title": "My Task",
  "description": "Task description",
  "dueDate": "2024-03-30",
  "priority": "high",
  "status": "pending"
}

# Get Single Task
GET /api/tasks/:id
Headers:
  Authorization: Bearer <your_jwt_token>

# Update Task
PUT /api/tasks/:id
Headers:
  Authorization: Bearer <your_jwt_token>
  Content-Type: application/json
Body:
{
  "title": "Updated Task",
  "description": "Updated description",
  "dueDate": "2024-03-31",
  "priority": "medium",
  "status": "in-progress"
}

# Delete Task
DELETE /api/tasks/:id
Headers:
  Authorization: Bearer <your_jwt_token>
```

### User Routes

```bash
# Get User Profile
GET /api/user/profile
Headers:
  Authorization: Bearer <your_jwt_token>

# Update User Profile
PUT /api/user/profile
Headers:
  Authorization: Bearer <your_jwt_token>
  Content-Type: application/json
Body:
{
  "username": "newusername",
  "email": "newemail@example.com"
}

# Change Password
PUT /api/user/change-password
Headers:
  Authorization: Bearer <your_jwt_token>
  Content-Type: application/json
Body:
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}
```

### Health Check

```bash
# Check API Health
GET /health
Headers:
  None
```

## 🔒 Security Features

- JWT Authentication
- Password Hashing
- Rate Limiting
- CORS Protection
- XSS Protection
- NoSQL Injection Protection
- HTTP Parameter Pollution Protection
- Security Headers (Helmet)

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- MongoDB
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone https://github.com/harshk49/TaskNexus-js.git
cd TaskNexus-js
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
```

4. Start the development server:

```bash
npm run dev
```

## 🧪 Testing

Run tests:

```bash
npm test
```

## 📝 Environment Variables

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000

# OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
SESSION_SECRET=your_session_secret_key

# Logging and Security
LOG_LEVEL=info
LOG_FORMAT=combined
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX_REQUESTS=5
ENABLE_SECURITY_HEADERS=true
ENABLE_CORS=true
ENABLE_RATE_LIMIT=true
ENABLE_COMPRESSION=true
ENABLE_LOGGING=true
ENABLE_HEALTH_CHECK=true
```

## 📄 License

This project is licensed under the ISC License.

## 👥 Author

Harsh Kardile

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
