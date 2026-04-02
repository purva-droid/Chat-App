const socket = io()
const messageForm = document.getElementById('send-container')
const messageInput = document.getElementById('message-input')
const messageContainer = document.getElementById('message-container')
const typingIndicator = document.getElementById('typing-indicator')
const userListEl = document.getElementById('user-list')
const roomListEl = document.getElementById('room-list')
const currentRoomEl = document.getElementById('current-room')
const themeToggle = document.getElementById('theme-toggle')
const replyPreview = document.getElementById('reply-preview')
const replyText = document.getElementById('reply-text')
const replyCancel = document.getElementById('reply-cancel')
const createRoomBtn = document.getElementById('create-room-btn')

let audioCtx = null
const typingUsers = new Set()
let typingTimeout = null
let replyTo = null
let currentRoom = 'general'
let messageIdCounter = 0
const reactionsMap = {}

const AVATAR_COLORS = [
    '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
    '#3b82f6', '#ef4444', '#06b6d4', '#f97316'
]

function getAvatarColor(name) {
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function playNotification() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, audioCtx.currentTime)
    osc.frequency.setValueAtTime(1100, audioCtx.currentTime + 0.08)
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25)
    osc.start(audioCtx.currentTime)
    osc.stop(audioCtx.currentTime + 0.25)
}

// Username persistence
const savedName = localStorage.getItem('chat-username')
let name = prompt('What is your name?', savedName || '')
if (!name || !name.trim()) name = 'Anonymous'
localStorage.setItem('chat-username', name)
appendMessage('You joined', 'system')
socket.emit('new-user', name)

// Theme toggle
const savedTheme = localStorage.getItem('chat-theme') || 'dark'
document.body.setAttribute('data-theme', savedTheme)
themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙'

themeToggle.addEventListener('click', () => {
    const current = document.body.getAttribute('data-theme')
    const next = current === 'dark' ? 'light' : 'dark'
    document.body.setAttribute('data-theme', next)
    localStorage.setItem('chat-theme', next)
    themeToggle.textContent = next === 'dark' ? '☀️' : '🌙'
})

// Reply
replyCancel.addEventListener('click', () => {
    replyTo = null
    replyPreview.style.display = 'none'
})

// Room creation
createRoomBtn.addEventListener('click', () => {
    const room = prompt('Room name:')
    if (room && room.trim()) {
        socket.emit('create-room', room.trim().toLowerCase())
        socket.emit('join-room', room.trim().toLowerCase())
    }
})

// Typing
messageInput.addEventListener('focus', () => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume()
}, { once: true })

messageInput.addEventListener('input', () => {
    socket.emit('typing')
    clearTimeout(typingTimeout)
    typingTimeout = setTimeout(() => {
        socket.emit('stop-typing')
    }, 1500)
})

// Socket events
socket.on('user-typing', userName => {
    typingUsers.add(userName)
    updateTypingIndicator()
})

socket.on('user-stop-typing', userName => {
    typingUsers.delete(userName)
    updateTypingIndicator()
})

socket.on('chat-message', data => {
    appendMessage(`${data.name}: ${data.message}`, 'other', data.time, data.id, data.replyTo)
    playNotification()
})

socket.on('user-connected', name => {
    appendMessage(`${name} connected`, 'system')
})

socket.on('user-disconnected', name => {
    appendMessage(`${name} disconnected`, 'system')
})

socket.on('user-list', users => {
    userListEl.innerHTML = ''
    users.forEach(u => {
        const li = document.createElement('li')
        li.className = 'user-item'
        const avatar = document.createElement('span')
        avatar.className = 'user-avatar-small'
        avatar.style.backgroundColor = getAvatarColor(u.name)
        avatar.textContent = u.initial
        const nameSpan = document.createElement('span')
        nameSpan.textContent = u.name
        li.appendChild(avatar)
        li.appendChild(nameSpan)
        userListEl.appendChild(li)
    })
})

socket.on('room-list', rooms => {
    roomListEl.innerHTML = ''
    rooms.forEach(room => {
        const li = document.createElement('li')
        li.className = room === currentRoom ? 'room-item active' : 'room-item'
        li.textContent = `# ${room}`
        li.addEventListener('click', () => {
            if (room !== currentRoom) {
                socket.emit('join-room', room)
            }
        })
        roomListEl.appendChild(li)
    })
})

socket.on('joined-room', room => {
    currentRoom = room
    currentRoomEl.textContent = `# ${room}`
    messageContainer.innerHTML = ''
    appendMessage(`Joined #${room}`, 'system')
    document.querySelectorAll('.room-item').forEach(el => {
        el.classList.toggle('active', el.textContent === `# ${room}`)
    })
})

socket.on('message-reaction', data => {
    const msgEl = document.querySelector(`[data-id="${data.messageId}"]`)
    if (!msgEl) return
    let reactionsDiv = msgEl.querySelector('.reactions')
    if (!reactionsDiv) {
        reactionsDiv = document.createElement('div')
        reactionsDiv.className = 'reactions'
        msgEl.appendChild(reactionsDiv)
    }
    const existing = reactionsDiv.querySelector(`[data-emoji="${data.emoji}"]`)
    if (existing) {
        const count = parseInt(existing.dataset.count || '1') + 1
        existing.dataset.count = count
        existing.textContent = `${data.emoji} ${count}`
    } else {
        const btn = document.createElement('button')
        btn.className = 'reaction-btn'
        btn.dataset.emoji = data.emoji
        btn.dataset.count = 1
        btn.textContent = data.emoji
        btn.addEventListener('click', () => {
            socket.emit('reaction', { messageId: data.messageId, emoji: data.emoji })
        })
        reactionsDiv.appendChild(btn)
    }
})

// Form submit
messageForm.addEventListener('submit', e => {
    e.preventDefault()
    const message = messageInput.value
    if (!message.trim()) return
    const id = `msg-${++messageIdCounter}`
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    appendMessage(`You: ${message}`, 'self', time, id, replyTo)
    socket.emit('send-chat-message', { id, message, replyTo })
    socket.emit('stop-typing')
    messageInput.value = ''
    replyTo = null
    replyPreview.style.display = 'none'
})

function updateTypingIndicator() {
    if (typingUsers.size === 0) {
        typingIndicator.textContent = ''
    } else if (typingUsers.size === 1) {
        typingIndicator.textContent = `${[...typingUsers][0]} is typing...`
    } else {
        typingIndicator.textContent = `${typingUsers.size} people are typing...`
    }
}

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

function appendMessage(message, type = 'default', time = null, id = null, replyInfo = null) {
    const messageElement = document.createElement('div')
    messageElement.classList.add(`message-${type}`)
    if (id) messageElement.setAttribute('data-id', id)

    if (type === 'system') {
        messageElement.textContent = message
    } else {
        const parts = message.split(': ')
        const sender = parts[0]
        const text = parts.slice(1).join(': ')

        if (replyInfo) {
            const replyEl = document.createElement('div')
            replyEl.className = 'reply-ref'
            replyEl.textContent = `↩ ${replyInfo.name}: ${replyInfo.message}`
            messageElement.appendChild(replyEl)
        }

        const header = document.createElement('div')
        header.className = 'message-header'

        if (type === 'other') {
            const avatar = document.createElement('span')
            avatar.className = 'user-avatar'
            avatar.style.backgroundColor = getAvatarColor(sender)
            avatar.textContent = sender.charAt(0).toUpperCase()
            header.appendChild(avatar)
        }

        const nameSpan = document.createElement('span')
        nameSpan.className = 'message-sender'
        nameSpan.textContent = sender
        header.appendChild(nameSpan)

        if (time) {
            const timeSpan = document.createElement('span')
            timeSpan.className = 'message-time'
            timeSpan.textContent = time
            header.appendChild(timeSpan)
        }

        messageElement.appendChild(header)

        const textSpan = document.createElement('span')
        textSpan.className = 'message-text'
        textSpan.textContent = text
        messageElement.appendChild(textSpan)

        if (type !== 'system') {
            const actions = document.createElement('div')
            actions.className = 'message-actions'

            const replyBtn = document.createElement('button')
            replyBtn.className = 'action-btn'
            replyBtn.textContent = '↩'
            replyBtn.title = 'Reply'
            replyBtn.addEventListener('click', () => {
                replyTo = { name: sender, message: text }
                replyText.textContent = `${sender}: ${text}`
                replyPreview.style.display = 'flex'
                messageInput.focus()
            })
            actions.appendChild(replyBtn)

            const reactBtn = document.createElement('button')
            reactBtn.className = 'action-btn'
            reactBtn.textContent = '😊'
            reactBtn.title = 'React'
            reactBtn.addEventListener('click', (e) => {
                e.stopPropagation()
                const existing = actions.querySelector('.emoji-picker')
                if (existing) { existing.remove(); return }
                const picker = document.createElement('div')
                picker.className = 'emoji-picker'
                EMOJI_OPTIONS.forEach(emoji => {
                    const btn = document.createElement('button')
                    btn.textContent = emoji
                    btn.addEventListener('click', () => {
                        if (id) socket.emit('reaction', { messageId: id, emoji })
                        picker.remove()
                    })
                    picker.appendChild(btn)
                })
                actions.appendChild(picker)
            })
            actions.appendChild(reactBtn)

            messageElement.appendChild(actions)
        }
    }

    messageContainer.append(messageElement)
    messageContainer.scrollTop = messageContainer.scrollHeight
}
