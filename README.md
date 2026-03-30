## App Summary

Many college students have limited access to transportation but still rely on cars for groceries and other errands. Blue Ride facilitates voluntary ridesharing between students and local residents who have vehicles and those who do not. If a car owner plans to go to the grocery store and is willing to offer seats, they can post a ride on Blue Ride for others to view and request to join. For security and trust, users have profiles and verified account indicators. Primary users include both riders seeking transportation and drivers offering available seats.

## Tech Stack
![TechStack](img/TechStack.png)

## Architecture Diagram
![Architecture Diagram](img/ArchitectureDiagram.png)

---

## PREREQUISITES

Before running this project, ensure you have the following software installed on your machine:

- **Node.js** (v18 or higher) — [Official Site](https://nodejs.org/)
- **PostgreSQL** (Database Server) — [Official Site](https://www.postgresql.org/download/)
- **psql** (Command Line Tools) — Note: This is usually included with your PostgreSQL installation. Ensure it is added to your system PATH so it can be run from any terminal.

**Verification Commands:** To check if these are installed correctly, run the following in your terminal:

- Check Node: `node -v`
- Check psql: `psql --version`

---

## INSTALLATION AND SETUP

### Step 1: Install Dependencies

Navigate to the project root and install packages for both the frontend and backend:

- **For the backend:** `cd backend` then `npm install`
- **For the frontend:** `cd ../frontend` then `npm install`
- **Return to root:** `cd ..`

### Step 2: Database Configuration

Ensure your PostgreSQL server is active. Run these three commands in order to create and populate your database:

0. **Reset Database:** `psql -U postgres -c "DROP DATABASE IF EXISTS stuber;"`

1. **Create Database:** `psql -U postgres -c "CREATE DATABASE stuber;"`
2. **Run Schema:** `psql -U postgres -d stuber -f backend/db/schema.sql`
3. **Run Seed Data:** `psql -U postgres -d stuber -f backend/db/seed.sql`

### Step 3: Environment Variables

1. Navigate to the `/backend` folder.
2. Create a file named `.env` (you can copy `.env.example` as a template).
3. Open `.env` and verify your credentials (`DB_USER`, `DB_PASSWORD`, etc.) match your local PostgreSQL settings.

---

## RUNNING THE APPLICATION

You will need two separate terminal windows or tabs running at the same time.

**Terminal 1 (Backend):**

```bash
cd backend
npm run dev
```

The server will start at: http://localhost:3000

**Terminal 2 (Frontend):**

```bash
cd frontend
npm run dev
```

The frontend will start at the URL shown in your terminal (usually http://localhost:8080). Open this URL in your browser to view the app.

---

## VERIFYING THE VERTICAL SLICE

Follow these steps to confirm the full stack is working correctly:

1. **Log in and verify default view:** Log in, refresh the page, and confirm you return to the Rides screen (not Login) while still authenticated.
2. **Post a ride:** Open **Post** from the bottom navbar and submit a one-time ride.
3. **Verify DB-backed rides:** Return to **Rides** and confirm the new ride appears in the list.
4. **Verify DB-backed live count:** Confirm the header's **Live** count reflects available rides from the backend.
5. **Verify profile persistence:** Open **Profile**, edit profile details, save, refresh, and confirm changes persist.
6. **Verify navigation and sign-out:** Confirm navigation is available from the bottom navbar (**Rides**, **My Rides**, **Post**, **Profile**) and sign out from the Profile page.

## EARS Requirements
**Completed**
- The database shall hold user, car, and ride information
- When the user clicks a different page, the system will load the specified page
- When the user changes profile information, the system shall save the updated information
- When the user is logged in, the system shall display the available rides page
- When a user posts a ride, the system shall add it to the available ride page
- The system shall display all available rides
- The system shall show a "My Rides" page displaying your booking and offers

**Not completed**
- When a user selects a ride, the booking information is shown
- When a user books a ride, the information is sent to the ride owner
- When the user selects my offers, the system shall display who has filled the seats
- When the user selects my bookings, the system shall display the ride information
