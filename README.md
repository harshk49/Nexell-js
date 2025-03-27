# Tasks & Notes App Backend

A robust backend API for managing tasks and notes with user authentication and preferences.

## Features

- User authentication with JWT
- Task management with categories and priorities
- Note management with rich text support
- User preferences (theme, notifications, view options)
- Rate limiting and security features
- Comprehensive error handling
- Production-ready logging
- Docker support for development and production

## Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 4.4
- npm or yarn
- Docker and Docker Compose (optional)

## Installation

### Without Docker

1. Clone the repository:

```bash
git clone <repository-url>
cd tasks-notes-app
```

2. Install dependencies:

```bash
npm install
```

3. Create environment file:

```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration values.

### With Docker

1. Clone the repository:

```bash
git clone <repository-url>
cd tasks-notes-app
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Update the `.env` file with your configuration values.

## Development

### Without Docker

Run the development server:

```bash
npm run dev
```

### With Docker

Start the development environment:

```bash
docker-compose -f docker-compose.dev.yml up --build
```

The application will be available at `http://localhost:5000` with hot-reloading enabled.

## Production Deployment

### Without Docker

1. Set up environment variables:

```bash
# Create .env file with production values
cp .env.example .env
# Edit .env with production values
```

2. Install production dependencies:

```bash
npm install --production
```

3. Start the production server:

```bash
npm run prod
```

### With Docker

1. Set up environment variables:

```bash
# Create .env file with production values
cp .env.example .env
# Edit .env with production values
```

2. Build and start the containers:

```bash
docker-compose up --build -d
```

The application will be available at `http://localhost:5000`.

## Docker Commands

### Development

- Start development environment:

```bash
docker-compose -f docker-compose.dev.yml up --build
```

- Stop development environment:

```bash
docker-compose -f docker-compose.dev.yml down
```

- View logs:

```bash
docker-compose -f docker-compose.dev.yml logs -f
```

### Production

- Start production environment:

```bash
docker-compose up -d
```

- Stop production environment:

```bash
docker-compose down
```

- View logs:

```bash
docker-compose logs -f
```

- Rebuild containers:

```bash
docker-compose up --build -d
```

## Environment Variables

Required environment variables:

- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_EXPIRES_IN`: JWT token expiration time
- `CLIENT_URL`: Frontend application URL (for CORS)

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Tasks

- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create new task
- `GET /api/tasks/:id` - Get single task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Notes

- `GET /api/notes` - Get all notes
- `POST /api/notes` - Create new note
- `GET /api/notes/:id` - Get single note
- `PUT /api/notes/:id` - Update note
- `DELETE /api/notes/:id` - Delete note

### User Preferences

- `GET /api/user/preferences` - Get user preferences
- `PUT /api/user/preferences` - Update user preferences

## Security Features

- JWT Authentication
- Rate Limiting
- CORS Protection
- XSS Protection
- NoSQL Injection Protection
- HTTP Parameter Pollution Protection
- Helmet Security Headers

## Error Handling

The API uses a consistent error response format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Logging

Logs are stored in the `logs` directory:

- `combined.log`: All logs
- `error.log`: Error logs only

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

ISC
