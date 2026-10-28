# Task Management System

A full-stack task manager with a REST API and a simple web UI. Built to practice backend fundamentals: CRUD, JWT authentication, authorization and data ownership.

**Live demo:** https://your-project.vercel.app

## Features

- Signup and login with JWT access tokens
- Refresh token rotation and logout (refresh token is revoked server-side)
- Create, update, delete tasks and mark them pending / completed
- Users can only modify their own tasks
- Admins can view all users' tasks
- Passwords hashed with bcrypt; security headers via Helmet
- Simple HTML/CSS/JS frontend served by the same app

## Tech Stack

Node.js, Express.js, MongoDB + Mongoose, JWT, bcryptjs, Vercel (PM2 optional for VPS)

## API

| Method | Endpoint             | Auth   | Description                          |
|--------|----------------------|--------|--------------------------------------|
| POST   | /api/auth/register   | No     | Create an account                    |
| POST   | /api/auth/login      | No     | Get access and refresh tokens        |
| POST   | /api/auth/refresh    | No     | Get a new token pair                 |
| POST   | /api/auth/logout     | Bearer | Revoke the refresh token             |
| GET    | /api/tasks           | Bearer | List your tasks (all, if admin)      |
| POST   | /api/tasks           | Bearer | Create a task                        |
| PUT    | /api/tasks/:id       | Bearer | Update a task you own                |
| DELETE | /api/tasks/:id       | Bearer | Delete a task you own                |

Send the token as `Authorization: Bearer <accessToken>`. `GET /api/tasks?status=pending` filters by status.

## Project Structure

```
api/index.js        Vercel entry point
public/             Frontend (index.html, style.css, app.js)
src/
  config/db.js      MongoDB connection
  models/           User, Task
  middleware/       auth, error handling
  controllers/      auth, task logic
  routes/           route definitions
  app.js            Express app
  server.js         Local / PM2 server
vercel.json
```

## Run Locally

```bash
git clone https://github.com/<your-username>/task-manager-api.git
cd task-manager-api
npm install
```

Create a `.env` file in the root:

```
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_ACCESS_SECRET=your_long_random_string
JWT_REFRESH_SECRET=another_long_random_string
ACCESS_EXPIRES=15m
REFRESH_EXPIRES=7d
```

Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Start the server:

```bash
npm run dev
```

Open http://localhost:5000

## Make a User an Admin

New users get the `user` role. To promote one, edit the user in MongoDB Atlas (Browse Collections, `users`) and set `role` to `admin`, then log in again.

## Deploy

**Vercel:** push to GitHub, import the repo in Vercel, add the five environment variables above, and deploy. In MongoDB Atlas, allow `0.0.0.0/0` under the IP Access List.

**PM2 (VPS/EC2):**

```bash
npm i -g pm2
pm2 start src/server.js --name task-api
pm2 save
```

## Security Notes

- Never commit `.env`
- The role is never accepted from the request body
- Tasks are filtered by owner in the database query itself
