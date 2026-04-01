const io = require('socket.io')(3000, {
  cors: {
    origin: "http://127.0.0.1:5500",
    methods: ["GET", "POST"]
  }
})

const users = {}

io.on('connection', socket => {
    socket.on('new-user', name => {
        users[socket.id] = name
        socket.broadcast.emit('user-connected', name) //to send the message to all the other clients except the sender
    })
    socket.on('send-chat-message', message => {
        //console.log(message)
        socket.broadcast.emit('chat-message', {message : message, name: 
            users[socket.id]}  ) //to send the message to all the other clients except the sender
    })
})  