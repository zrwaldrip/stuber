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

5. **First admin (manual):** After the schema includes `user_level`, promote at least one account so you can open the Admin UI in the app:

```sql
UPDATE users SET user_level = 'admin' WHERE user_id = 1;
-- or: WHERE email = 'yourname@byu.edu';
```

Then sign in as that user; the Profile page shows **Admin — manage users**.

6. Start the server:
```bash
npm run dev
```

The server will run on `http://localhost:3000`

## API Endpoints

- `GET /api/users` - List all users (**admin only**; requires `X-Acting-User-Id` header matching an admin user)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update profile (**requires `X-Acting-User-Id`**; self-edit or admin; admins may set `email` and `userLevel`)
- `DELETE /api/users/:id` - Delete user (**admin only**; requires `X-Acting-User-Id`; cannot delete yourself or the last admin)
- `PUT /api/users/:id/username` - Update username
- `GET /health` - Health check
