# Nexell - Task and Note Management API

A modern, secure, and scalable RESTful API for managing tasks, notes, teams, and organizations, built with Node.js, Express, and MongoDB.

![Node.js](https://img.shields.io/badge/Node.js-20.x-green)
![Express](https://img.shields.io/badge/Express-4.x-blue)
![MongoDB](https://img.shields.io/badge/MongoDB-6.x-green)
![Docker](https://img.shields.io/badge/Docker-Enabled-blue)

## 🌐 Live Deployments

The application is now live and available at:

- **Frontend**: [https://nexell-digitalhub.vercel.app](https://nexell-digitalhub.vercel.app)
- **Backend API**: [https://nexell-js.onrender.com/api](https://nexell-js.onrender.com/api)
- **API Documentation**: [https://nexell-js.onrender.com](https://nexell-js.onrender.com)

> **Note about Render's Free Tier**: The backend is hosted on Render's free tier which spins down after 15 minutes of inactivity. The first request after inactivity may take up to 30 seconds to respond as the service spins up. See the [Server Ping](#server-ping) section for a solution.

## 🚀 Features

- **Authentication**:

  - JWT-based authentication
  - OAuth support (Google, GitHub)
  - Role-based access control
  - Session management
  - Password reset/recovery

- **Task Management**:

  - Create, read, update, delete tasks
  - Task categories and tags
  - Task assignments
  - Task dependencies
  - Due dates and reminders
  - Task status tracking

- **Note Management**:

  - Rich text notes
  - Categorization and tagging
  - Sharing capabilities
  - Version history

- **Team & Organization**:

  - Multi-organization support
  - Team management
  - User roles and permissions
  - Invitation system

- **Time Tracking**:

  - Track time spent on tasks
  - Reporting and analytics
  - Export capabilities

- **Advanced Features**:

  - Real-time notifications
  - Data export (CSV, PDF)
  - Search and filters
  - Custom dashboards
  - Activity logging

- **Security Features**:
  - Rate limiting
  - XSS protection
  - CSRF protection
  - NoSQL injection prevention
  - Parameter pollution prevention
  - Secure HTTP headers

## 🛠️ Tech Stack

- **Backend**:

  - Node.js 20+
  - Express.js
  - MongoDB 6+
  - Redis (caching, session store)

- **Authentication**:

  - JWT
  - Passport.js
  - OAuth 2.0

- **Security**:

  - Helmet.js
  - Rate limiting
  - Content security policy
  - Input validation

- **DevOps**:

  - Docker
  - Docker Compose
  - Nginx
  - MongoDB Replica Set

- **Testing & Quality**:

  - Jest
  - Supertest
  - ESLint
  - Prettier

- **Logging & Monitoring**:
  - Winston
  - Morgan
  - Request ID tracking

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (20+ recommended)
- Docker & Docker Compose (for containerized setup)
- MongoDB 6+ (provided via Docker)
- Redis (provided via Docker)

### Environment Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/nexell.git
   cd nexell
   ```

2. Create environment file:

   ```bash
   cp .env.example .env
   ```

3. Edit the `.env` file with your configuration

### Development Setup

#### Option 1: Using Docker (Recommended)

1. Start the development environment:

   ```bash
   docker-compose -f docker-compose.dev.yml up
   ```

   This will start:

   - API server on port 5000
   - MongoDB on port 27017
   - Redis on port 6379
   - Mongo Express on port 8081
   - Redis Commander on port 8082

2. Access the application:
   - API: http://localhost:5000
   - MongoDB Admin: http://localhost:8081
   - Redis Admin: http://localhost:8082

#### Option 2: Local Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start MongoDB (if not using Docker):

   ```bash
   # Install MongoDB and start the service
   # See MongoDB documentation: https://docs.mongodb.com/manual/installation/
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

### Production Deployment

1. Build and start the production containers:

   ```bash
   docker-compose up -d
   ```

2. The application will be available at http://localhost:5000

## 📝 API Documentation

### Base URL

```
https://nexell-js.onrender.com/api
```

For local development:

```
http://localhost:5000/api
```

### Authentication

#### Register a new user

```
POST /api/auth/register
```

Request body:

```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login

```
POST /api/auth/login
```

Request body:

```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

Response:

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "60a1b2c3d4e5f6g7h8i9j0",
    "username": "johndoe",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### Tasks

#### Get all tasks

```
GET /api/tasks
```

Query parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `sortBy`: Field to sort by (default: createdAt)
- `sortOrder`: Sort order (asc/desc, default: desc)
- `status`: Filter by status
- `priority`: Filter by priority
- `search`: Search in title and description

#### Create a new task

```
POST /api/tasks
```

Request body:

```json
{
  "title": "Complete project proposal",
  "description": "Draft the project proposal for client review",
  "priority": "high",
  "status": "in-progress",
  "dueDate": "2025-06-30T15:00:00.000Z",
  "tags": ["proposal", "client"],
  "project": "60a1b2c3d4e5f6g7h8i9j0"
}
```

See the full API documentation at [https://nexell-js.onrender.com](https://nexell-js.onrender.com)

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
  "timestamp": "2025-06-17T18:36:28.816Z"
}
```

## 🧪 Testing

Run tests using Jest:

```bash
npm test
```

Run tests with coverage report:

```bash
npm run test:coverage
```

## 📁 Project Structure

```
nexell/
├── config/              # Configuration files
├── controllers/         # Request handlers
├── middleware/          # Custom middleware functions
├── models/              # Mongoose models
├── routes/              # API routes
├── services/            # Business logic
├── utils/               # Utility functions
├── logs/                # Application logs
├── tests/               # Test files
├── docker-compose.yml   # Production Docker Compose
└── docker-compose.dev.yml # Development Docker Compose
```

## 🔒 Security

The application implements several security measures:

- JWT authentication
- Password hashing
- Rate limiting
- XSS protection
- Content Security Policy
- NoSQL injection prevention
- Parameter pollution prevention

## 📄 License

This project is licensed under the ISC License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
