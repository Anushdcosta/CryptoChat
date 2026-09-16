require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('./models/User');
const Message = require('./models/Message');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://anushviston_db_user:KJQTdvsY3jK4jbbm@cluster0.dq4gfa4.mongodb.net/cryptochat?retryWrites=true&w=majority';
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB!'))
  .catch(err => console.error('MongoDB connection error:', err));

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-crypto-key';

// --- AUTH REST API ---

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: 'Username taken' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    const token = jwt.sign({ userId: newUser._id, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: newUser._id, username: newUser.username } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all users (except self)
app.get('/api/users', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const users = await User.find({ _id: { $ne: decoded.userId } }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get chat history between two users
app.get('/api/messages/:userId', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const myId = decoded.userId;
    const otherId = req.params.userId;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: otherId },
        { senderId: otherId, receiverId: myId }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// --- SOCKET.IO REALTIME ---

// Middleware to authenticate socket connections
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', async (socket) => {
  console.log(`User connected: ${socket.userId} on socket ${socket.id}`);
  
  // Update user as online
  await User.findByIdAndUpdate(socket.userId, { isOnline: true, socketId: socket.id });
  
  // Join a personal room for direct messages
  socket.join(socket.userId);
  
  // Broadcast to everyone that this user is online
  io.emit('user_status_change', { userId: socket.userId, isOnline: true });

  // Direct Messaging
  socket.on('send_direct_message', async (data) => {
    try {
      const { receiverId, plainText, scrambledText, timestamp } = data;
      
      // Save to database
      const newMessage = new Message({
        senderId: socket.userId,
        receiverId,
        plainText,
        scrambledText,
      });
      await newMessage.save();

      const payload = {
        _id: newMessage._id,
        senderId: socket.userId,
        receiverId,
        plainText,
        scrambledText,
        timestamp: newMessage.createdAt
      };

      // Emit to receiver's personal room
      socket.to(receiverId).emit('receive_direct_message', payload);
      // Also emit back to sender so they get confirmation
      socket.emit('receive_direct_message', payload);
      
    } catch (err) {
      console.error('Error saving message', err);
    }
  });

  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${socket.userId}`);
    await User.findByIdAndUpdate(socket.userId, { isOnline: false, socketId: null });
    io.emit('user_status_change', { userId: socket.userId, isOnline: false });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
