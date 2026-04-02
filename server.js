const express = require('express');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const io = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

const users = {}
const rooms = { 'general': {} }

function getUserList(room) {
  return Object.entries(rooms[room] || {}).map(([id, name]) => ({
    id,
    name,
    initial: name.charAt(0).toUpperCase()
  }))
}

io.on('connection', socket => {
    socket.on('new-user', (name, room = 'general') => {
        users[socket.id] = { name, room }
        if (!rooms[room]) rooms[room] = {}
        rooms[room][socket.id] = name
        socket.join(room)
        socket.emit('room-list', Object.keys(rooms))
        socket.emit('joined-room', room)
        io.to(room).emit('user-list', getUserList(room))
        socket.to(room).emit('user-connected', name)
    })

    socket.on('join-room', room => {
        const user = users[socket.id]
        if (!user) return
        const oldRoom = user.room
        socket.leave(oldRoom)
        delete rooms[oldRoom][socket.id]
        socket.to(oldRoom).emit('user-disconnected', user.name)
        io.to(oldRoom).emit('user-list', getUserList(oldRoom))

        if (!rooms[room]) rooms[room] = {}
        user.room = room
        rooms[room][socket.id] = user.name
        socket.join(room)
        io.emit('room-list', Object.keys(rooms))
        socket.emit('joined-room', room)
        io.to(room).emit('user-list', getUserList(room))
        socket.to(room).emit('user-connected', user.name)
    })

    socket.on('create-room', room => {
        if (!rooms[room]) {
            rooms[room] = {}
            io.emit('room-list', Object.keys(rooms))
        }
    })

    socket.on('send-chat-message', data => {
        const user = users[socket.id]
        if (!user) return
        socket.to(user.room).emit('chat-message', {
            id: data.id,
            message: data.message,
            name: user.name,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            replyTo: data.replyTo || null
        })
    })

    socket.on('typing', () => {
        const user = users[socket.id]
        if (!user) return
        socket.to(user.room).emit('user-typing', user.name)
    })

    socket.on('stop-typing', () => {
        const user = users[socket.id]
        if (!user) return
        socket.to(user.room).emit('user-stop-typing', user.name)
    })

    socket.on('reaction', data => {
        const user = users[socket.id]
        if (!user) return
        io.to(user.room).emit('message-reaction', {
            messageId: data.messageId,
            emoji: data.emoji,
            name: user.name
        })
    })

    socket.on('disconnect', () => {
        const user = users[socket.id]
        if (user) {
            const room = user.room
            delete rooms[room][socket.id]
            socket.to(room).emit('user-disconnected', user.name)
            io.to(room).emit('user-list', getUserList(room))
            delete users[socket.id]
        }
    })
})
