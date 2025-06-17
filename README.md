# Nexell - Task and Note Management API

A robust RESTful API for managing tasks and notes, built with Node.js, Express, and MongoDB.

## 🌐 Live Deployments

The application is now live and available at:

- **Frontend**: [https://nexell-digitalhub.vercel.app](https://nexell-digitalhub.vercel.app)
- **Backend API**: [https://nexell-js.onrender.com/api](https://nexell-js.onrender.com/api)
- **API Documentation**: [https://nexell-js.onrender.com](https://nexell-js.onrender.com)

> **Note about Render's Free Tier**: The backend is hosted on Render's free tier which spins down after 15 minutes of inactivity. The first request after inactivity may take up to 30 seconds to respond as the service spins up. See the [Server Ping](#server-ping) section for a solution.

## 🚀 Features

- User Authentication (JWT)
- Task Management
- Note Management
- Time Tracking System
- User Profile Management
- Team, Organization & Role Management
- Role-based Access Control
- Invitation System
- Reports & Analytics Engine
- Data Export (CSV)
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
https://nexell-js.onrender.com/api
```

### Server Ping

To prevent the initial delay when accessing the application after a period of inactivity, a ping endpoint has been implemented that can be called when the frontend application loads:

```
GET https://nexell-js.onrender.com/ping
```

This endpoint returns a lightweight response to wake up the server without putting load on the database or other resources:

```json
{
  "status": "success",
  "message": "pong",
  "timestamp": "2025-04-05T18:36:28.816Z"
}
```

#### Frontend Implementation

You can implement this in your React frontend by adding the following code to your app's entry point component (e.g., App.jsx):

```jsx
import { useEffect } from "react";

function App() {
  useEffect(() => {
    // Ping the backend to wake it up when the app loads
    const pingServer = async () => {
      try {
        const response = await fetch("https://nexell-js.onrender.com/ping", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        console.log("Server ping successful:", data);
      } catch (error) {
        console.error("Server ping failed:", error);
      }
    };

    pingServer();
  }, []);

  // Rest of your app...
}
```

This will ping the server when your application loads, minimizing wait time for users.

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
   - Set authorized redirect URI as `https://nexell-js.onrender.com/api/auth/google/callback`
   - Add the credentials to your .env file

2. **GitHub OAuth**:
   - Go to your [GitHub Settings](https://github.com/settings/developers)
   - Navigate to Developer Settings > OAuth Apps
   - Register a new OAuth application
   - Set the Authorization callback URL as `https://nexell-js.onrender.com/api/auth/github/callback`
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

### Time Tracking Routes

```bash
# Start Timer
POST /api/time-tracking/tasks/:taskId/start
Headers:
  Content-Type: application/json
  Authorization: Bearer YOUR_TOKEN

# Stop Timer
POST /api/time-tracking/tasks/:taskId/stop
Headers:
  Content-Type: application/json
  Authorization: Bearer YOUR_TOKEN
Body:
{
  "comment": "Worked on feature X"  # Optional
}

# Add Manual Time Entry
POST /api/time-tracking/tasks/:taskId/entries
Headers:
  Content-Type: application/json
  Authorization: Bearer YOUR_TOKEN
Body:
{
  "duration": 45,         # Minutes
  "date": "2025-04-01",   # YYYY-MM-DD
  "comment": "Worked on feature X",  # Optional
  "startTime": "14:30"    # Optional, HH:MM format
}

# Get Time Entries for a Task
GET /api/time-tracking/tasks/:taskId/entries
Headers:
  Authorization: Bearer YOUR_TOKEN

# Delete Time Entry
DELETE /api/time-tracking/entries/:entryId
Headers:
  Authorization: Bearer YOUR_TOKEN

# Get Time Reports
GET /api/time-tracking/reports
Headers:
  Authorization: Bearer YOUR_TOKEN
Query Parameters:
  startDate: 2025-04-01    # YYYY-MM-DD
  endDate: 2025-04-07      # YYYY-MM-DD
  groupBy: day             # Optional: 'day', 'task', 'category'
```

### Organization & Team Management Routes

```bash
# Create a New Organization
POST /api/organizations
Headers:
  Content-Type: application/json
  Authorization: Bearer YOUR_TOKEN
Body:
{
  "name": "Acme Inc",
  "description": "Software development team",
  "logo": "https://example.com/logo.png",  # Optional
  "website": "https://acme.com",           # Optional
  "settings": {                            # Optional
    "defaultTaskView": "board",
    "defaultNoteView": "grid",
    "timeTracking": {
      "enabled": true,
      "roundingInterval": 5,
      "requireComment": true
    }
  }
}

# Get User's Organizations
GET /api/organizations
Headers:
  Authorization: Bearer YOUR_TOKEN

# Get Organization Details
GET /api/organizations/:organizationId
Headers:
  Authorization: Bearer YOUR_TOKEN

# Update Organization
PUT /api/organizations/:organizationId
Headers:
  Content-Type: application/json
  Authorization: Bearer YOUR_TOKEN
Body:
{
  "name": "Acme Corporation",
  "description": "Updated description",
  "logo": "https://example.com/new-logo.png",
  "settings": {
    "defaultTaskView": "calendar"
  }
}

# Delete Organization (Admin only)
DELETE /api/organizations/:organizationId
Headers:
  Authorization: Bearer YOUR_TOKEN

# Set Current Organization
POST /api/organizations/:organizationId/set-current
Headers:
  Authorization: Bearer YOUR_TOKEN

# Leave Organization
POST /api/organizations/:organizationId/leave
Headers:
  Authorization: Bearer YOUR_TOKEN
```

### Organization Membership Routes

```bash
# Get Organization Members
GET /api/organizations/:organizationId/members
Headers:
  Authorization: Bearer YOUR_TOKEN
Query Parameters:
  page: 1                 # Optional, default 1
  limit: 10               # Optional, default 10
  sortBy: joinedAt        # Optional, default joinedAt
  sortOrder: desc         # Optional, default desc
  role: admin             # Optional, filter by role

# Get Specific Membership
GET /api/organizations/:organizationId/members/:membershipId
Headers:
  Authorization: Bearer YOUR_TOKEN

# Update Member Role or Title (Admin only)
PUT /api/organizations/:organizationId/members/:membershipId
Headers:
  Content-Type: application/json
  Authorization: Bearer YOUR_TOKEN
Body:
{
  "role": "admin",       # Optional
  "title": "CTO"         # Optional
}

# Remove Member (Admin only)
DELETE /api/organizations/:organizationId/members/:membershipId
Headers:
  Authorization: Bearer YOUR_TOKEN
```

### Organization Invitation Routes

```bash
# Invite a User to Organization
POST /api/organizations/:organizationId/invitations
Headers:
  Content-Type: application/json
  Authorization: Bearer YOUR_TOKEN
Body:
{
  "email": "newmember@example.com",
  "role": "member",               # "admin", "member", or "viewer"
  "message": "Please join our organization" # Optional
}

# Get Organization's Pending Invitations
GET /api/organizations/:organizationId/invitations
Headers:
  Authorization: Bearer YOUR_TOKEN
Query Parameters:
  status: pending         # Optional, filter by status

# Cancel Invitation (Admin only)
DELETE /api/organizations/:organizationId/invitations/:invitationId
Headers:
  Authorization: Bearer YOUR_TOKEN

# Resend Invitation (Admin only)
POST /api/organizations/:organizationId/invitations/:invitationId/resend
Headers:
  Authorization: Bearer YOUR_TOKEN

# Get Pending Invitations for Current User
GET /api/invitations
Headers:
  Authorization: Bearer YOUR_TOKEN

# Accept Invitation
POST /api/invitations/accept/:token
Headers:
  Authorization: Bearer YOUR_TOKEN
```

### Reports & Analytics Routes

```bash
# Time Tracking Reports
GET /api/reports/time-tracking
Headers:
  Authorization: Bearer YOUR_TOKEN
Query Parameters:
  startDate: 2025-04-01    # Start date (YYYY-MM-DD)
  endDate: 2025-04-30      # End date (YYYY-MM-DD)
  groupBy: day             # Group by: "day", "week", "month", "user", "task", "category"
  userId: 5f8d0e..         # Optional: Filter by specific user
  organizationId: 5f8d0e.. # Optional: Filter by organization
  taskId: 5f8d0e..         # Optional: Filter by specific task
  category: "Development"  # Optional: Filter by task category
  tags: "feature,urgent"   # Optional: Filter by task tags (comma-separated)

# Task Completion Reports
GET /api/reports/task-completion
Headers:
  Authorization: Bearer YOUR_TOKEN
Query Parameters:
  startDate: 2025-04-01    # Start date (YYYY-MM-DD)
  endDate: 2025-04-30      # End date (YYYY-MM-DD)
  period: daily            # Period: "daily", "weekly", "monthly"
  groupBy: date            # Group by: "date", "user", "category", "priority"
  userId: 5f8d0e..         # Optional: Filter by specific user
  organizationId: 5f8d0e.. # Optional: Filter by organization

# Organization Productivity Report
GET /api/reports/organizations/:organizationId/productivity
Headers:
  Authorization: Bearer YOUR_TOKEN
Query Parameters:
  startDate: 2025-04-01    # Optional: Start date (YYYY-MM-DD), defaults to 30 days ago
  endDate: 2025-04-30      # Optional: End date (YYYY-MM-DD), defaults to today

# Export Reports to CSV
GET /api/reports/export/:reportType
Headers:
  Authorization: Bearer YOUR_TOKEN
Path Parameters:
  reportType: time         # Report type: "time", "tasks", or "productivity"
Query Parameters:
  # Same query parameters as the respective report endpoints
```

### Base URL Endpoints

```bash
# Base URL Welcome Message
GET /
Response:
{
  "status": "success",
  "message": "Welcome to Nexell API",
  "documentation": "https://github.com/your-repo/nexell",
  "endpoints": {
    "api": "/api",
    "health": "/health",
    "ping": "/ping"
  }
}

# Check API Health
GET /health
Response:
{
  "status": "success",
  "message": "Server is healthy",
  "timestamp": "2025-04-05T18:36:28.816Z",
  "environment": "production",
  "uptime": 3600.212
}

# Ping Server (for waking up from sleep)
GET /ping
Response:
{
  "status": "success",
  "message": "pong",
  "timestamp": "2025-04-05T18:36:28.816Z"
}
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

### Local Development

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

## 🐳 Docker Deployment

This project includes Docker configuration for easy deployment:

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Using Docker Directly

```bash
# Build the image
docker build -t nexell-api .

# Run the container
docker run -p 5000:5000 --env-file .env -d nexell-api
```

### Docker in Production

For production deployment, we recommend:

1. Using the multi-stage build Dockerfile (already configured)
2. Setting appropriate environment variables
3. Using Docker volumes for persistent data
4. Setting up a reverse proxy (nginx) for SSL termination

## 📝 Environment Variables

For local development, create a `.env` file with these variables:

```env
# Server Configuration
NODE_ENV=development
PORT=5000

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/nexell

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
SESSION_SECRET=your_session_secret_key

# Client URL (for CORS)
CLIENT_URL=http://localhost:3000

# Logging and Security
LOG_LEVEL=info
LOG_FORMAT=combined
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_WINDOW_MS=3600000
AUTH_RATE_LIMIT_MAX_REQUESTS=5
```

For production deployment on Render, see the `.env.render` file or use the environment variables UI in the Render dashboard.

## 🚀 Deployment on Render

### Backend Deployment Steps

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Choose the main branch and select the root directory
4. Select "Node" as the runtime environment
5. Set the build command: `npm install`
6. Set the start command: `node server.js`
7. Add the environment variables from `.env.render`
8. Click "Create Web Service"

### Frontend Deployment on Vercel

1. Push your frontend code to GitHub
2. Create a new project on Vercel
3. Connect your GitHub repository
4. Set the root directory to your frontend folder
5. Configure environment variables if needed
6. Click "Deploy"

## 📄 License

This project is licensed under the ISC License.

## 👥 Author

Harsh Kardile

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
