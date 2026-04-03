# Real-Time Chat App

A modern, feature-complete real-time chat application built with Node.js, Express, and Socket.IO.

## 🚀 Live Demo
https://purva-droid.github.io/Chat-App/

## ✨ Features
- Real-time WebSocket communication with Socket.IO
- Multiple chat rooms with creation support
- User presence tracking and online user list
- Message replies and emoji reactions
- Typing indicators
- Dark/Light theme toggle with persistence
- Audio notifications
- Responsive glassmorphism UI
- Demo mode for client-side only usage

## 🛠️ Local Development

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation & Running Locally

```bash
# Clone the repository
git clone https://github.com/Purva-droid/Chat-App.git
cd Chat-App

# Install dependencies
npm install

# Start development server (with auto-reload)
npm run devStart

# OR start production server
npm start
```

The app will be running at `http://localhost:3000`

## 🌐 Deployment

### Frontend (GitHub Pages)
The frontend is hosted on GitHub Pages at https://purva-droid.github.io/Chat-App/

### Backend
The backend is deployed on Render at `https://chat-app-server-wf2d.onrender.com`

## 📁 Project Structure
```
Chat App/
├── index.html      # Frontend UI + CSS
├── script.js       # Client-side logic
├── server.js       # Node.js backend server
├── package.json    # Dependencies & scripts
└── README.md
```

## 🔌 Socket Events
| Client → Server     | Server → Client      |
|---------------------|----------------------|
| `new-user`          | `chat-message`       |
| `join-room`         | `user-connected`     |
| `create-room`       | `user-disconnected`  |
| `send-chat-message` | `user-typing`        |
| `typing`            | `user-stop-typing`   |
| `stop-typing`       | `user-list`          |
| `reaction`          | `room-list`          |
|                     | `joined-room`        |
|                     | `message-reaction`   |

## 🎨 Tech Stack
- **Backend**: Node.js, Express 5.x, Socket.IO 4.x
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Styling**: Modern CSS Variables, Glassmorphism design
- **Real-time**: WebSockets via Socket.IO
