# MeetSphere

MeetSphere is a real-time video meeting web application built with React, Node.js, WebRTC, and Socket.io.  
It allows users to create or join meetings, manage meeting history, and communicate over live video in a responsive interface.

## Live Demo

- App: [https://meetsphere-frontend-kjop.onrender.com/](https://meetsphere-frontend-kjop.onrender.com/)

## Features

- User registration and login
- Create and join video meetings
- Real-time video and audio communication using WebRTC and Socket.io
- Meeting history for logged-in users
- Responsive UI for desktop and mobile
- Chat during meetings

## Tech Stack

- **Frontend:** React, React Router, Material UI (MUI)
- **Backend:** Node.js, Express, Socket.io
- **Database:** MongoDB Atlas with Mongoose
- **Deployment:** Render
- **Other:** WebRTC, bcrypt, crypto

## Project Structure

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

## Local Setup

### Prerequisites

- Node.js (LTS)
- npm or yarn
- MongoDB Atlas or local MongoDB

### Clone the repository

```bash
git clone https://github.com/akshat1602/MeetSphere.git
cd MeetSphere
```

### Backend setup

```bash
cd Backend
npm install
```

Create a `.env` file inside `Backend`:

```env
MONGO_URI=your-mongodb-connection-string
PORT=8080
```

Run the backend:

```bash
npm run dev
# or
npm start
```

The backend will run on `http://localhost:8080`.

### Frontend setup

```bash
cd ../frontend
npm install
```

Create a `.env` file inside `frontend`:

```env
REACT_APP_API_URL=http://localhost:8080
```

Run the frontend:

```bash
npm start
```

The frontend will run on `http://localhost:3000`.

## Deployment

### Frontend

- Root Directory: `frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `build`

### Backend

- Root Directory: `Backend`
- Build Command: `npm install`
- Start Command: `npm start`

Set environment variables in Render instead of committing production secrets to the repository.

## Notes

- The live application is accessed through the frontend link.
- Backend configuration should be managed through environment variables in deployment.
- For local development, use `.env` files in both frontend and backend.

## Future Improvements

- Replace deprecated WebRTC stream APIs with `addTrack` and `ontrack`
- Improve meeting layout further for group calls
- Add better chat and participant management
- Improve code modularity by splitting large components
