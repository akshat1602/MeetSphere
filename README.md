# MeetSphere

MeetSphere is a real‑time video meeting web application built with React, Node.js, WebRTC, and Socket.io.  
It lets users create or join meetings, manage their meeting history, and communicate over live video.

## Live Demo

- Frontend: https://YOUR-FRONTEND-ON-RENDER.onrender.com  
- Backend API: https://YOUR-BACKEND-ON-RENDER.onrender.com

## Features

- User registration and login (with hashed passwords and auth tokens)
- Create and join video meetings using WebRTC and Socket.io
- Real‑time video/audio streaming between participants
- Meeting history stored per user in MongoDB
- Responsive UI built with React and MUI

## Tech Stack

- **Frontend**: React, React Router, Material UI (MUI)
- **Backend**: Node.js, Express, Socket.io
- **Database**: MongoDB Atlas (via Mongoose)
- **Deployment**:
  - Frontend: Render Static Site
  - Backend: Render Web Service
- **Other**: WebRTC, bcrypt, crypto

## Getting Started (Local Development)

### Prerequisites

- Node.js (LTS)
- npm or yarn
- MongoDB Atlas (or local MongoDB)

### 1. Clone the repository

```bash
git clone https://github.com/akshat1602/MeetSphere.git
cd MeetSphere
```

### 2. Backend setup

```bash
cd Backend
npm install
```

Create a `.env` file (or set env vars) for your backend:

```env
MONGO_URI=your-mongodb-atlas-connection-string
PORT=8080
```

Run the backend:

```bash
npm run dev
# or
npm start
```

The backend should now be running on `http://localhost:8080`.

### 3. Frontend setup

```bash
cd ../frontend
npm install
```

Create a `.env` file in `frontend`:

```env
REACT_APP_API_URL=http://localhost:8080
```

Run the frontend:

```bash
npm start
```

The frontend should now be available at `http://localhost:3000`.

## Deployment

### Backend (Render)

- **Root Directory**: `Backend`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- Ensure `MONGO_URI` is set as an environment variable in Render.
- The app must listen on `process.env.PORT` (fallback to 8080 for local dev).

### Frontend (Render Static Site)

- **Root Directory**: `frontend`
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `build`
- Set `REACT_APP_API_URL` in Render env vars to your backend Render URL.

## Folder Structure

```text
MeetSphere/
  Backend/
    app.js
    controllers/
    models/
    routes/
    package.json
  frontend/
    src/
    public/
    package.json
```
