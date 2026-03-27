# Backend Server

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the `backend` directory (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Update the `.env` file with your PostgreSQL credentials:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stuber
DB_USER=postgres
DB_PASSWORD=your_password_here
PORT=3000
```

4. Set up the database (from the `backend` directory):
   - Create a PostgreSQL database named `stuber`
   - Run the schema: `psql -U postgres -d stuber -f db/schema.sql`
   - Run the seed data: `psql -U postgres -d stuber -f db/seed.sql`

5. Start the server:
```bash
npm run dev
```

The server will run on `http://localhost:3000`

## API Endpoints

- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id/username` - Update username
- `GET /health` - Health check
