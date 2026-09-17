require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

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
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("CRITICAL ERROR: MONGO_URI environment variable is missing.");
  process.exit(1);
}
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB!'))
  .catch(err => console.error('MongoDB connection error:', err));

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-crypto-key';

// --- ENCRYPTION UTILS ---
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; // Must be 32 bytes
const IV_LENGTH = 16; // AES blocksize

function encrypt(text) {
  let iv = crypto.randomBytes(IV_LENGTH);
  let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  try {
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    return "Error: Could not decrypt message";
  }
}

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

// Get recent users (users we have a chat history with)
app.get('/api/users/recent', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const myId = decoded.userId;

    // Find all messages where I am sender or receiver
    const messages = await Message.find({
      $or: [{ senderId: myId }, { receiverId: myId }]
    });

    // Extract unique user IDs that are not me
    const userIds = new Set();
    messages.forEach(msg => {
      if (msg.senderId.toString() !== myId) userIds.add(msg.senderId.toString());
      if (msg.receiverId.toString() !== myId) userIds.add(msg.receiverId.toString());
    });

    const users = await User.find({ _id: { $in: Array.from(userIds) } }).select('-password');
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

    const decryptedMessages = messages.map(msg => ({
      _id: msg._id,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      plainText: decrypt(msg.plainText),
      scrambledText: msg.scrambledText,
      attachment: msg.attachment ? decrypt(msg.attachment) : null,
      viewed: msg.viewed,
      createdAt: msg.createdAt,
      read: msg.read
    }));

    res.json(decryptedMessages);
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
      const { receiverId, plainText, scrambledText, attachment, timestamp } = data;
      
      const encryptedText = encrypt(plainText);
      const encryptedAttachment = attachment ? encrypt(attachment) : null;

      // Save to database
      const newMessage = new Message({
        senderId: socket.userId,
        receiverId,
        plainText: encryptedText,
        scrambledText,
        attachment: encryptedAttachment,
        viewed: false
      });
      await newMessage.save();

      const payload = {
        _id: newMessage._id,
        senderId: socket.userId,
        receiverId,
        plainText, // We send the decrypted version back over the wire
        scrambledText,
        attachment,
        viewed: false,
        timestamp: newMessage.createdAt
      };

      // Emit to receiver's personal room
      socket.to(receiverId).emit('receive_direct_message', payload);
      // Also emit back to sender so they get confirmation
      socket.emit('receive_direct_message', payload);
      
    } catch (error) {
      console.error('Message error:', error);
    }
  });

  // Mark View Once Image as Viewed
  socket.on('mark_viewed', async (messageId) => {
    try {
      const msg = await Message.findById(messageId);
      if (msg) {
        msg.attachment = null; // Delete the image payload forever
        msg.viewed = true;
        await msg.save();
        
        // Notify both parties
        io.to(msg.receiverId.toString()).emit('message_viewed', messageId);
        io.to(msg.senderId.toString()).emit('message_viewed', messageId);
      }
    } catch (error) {
      console.error('Mark viewed error:', error);
    }
  });

  // Delete Message (Unsend)
  socket.on('delete_message', async (messageId) => {
    try {
      const msg = await Message.findById(messageId);
      if (msg && msg.senderId.toString() === socket.userId) {
        await Message.findByIdAndDelete(messageId);
        // Notify both parties
        io.to(msg.receiverId.toString()).emit('message_deleted', messageId);
        io.to(msg.senderId.toString()).emit('message_deleted', messageId);
      }
    } catch (error) {
      console.error('Delete message error:', error);
    }
  });

  // Typing Indicators
  socket.on('typing', (data) => {
    if (data.receiverId) {
      socket.to(data.receiverId).emit('typing', { senderId: socket.userId });
    }
  });

  socket.on('stop_typing', (data) => {
    if (data.receiverId) {
      socket.to(data.receiverId).emit('stop_typing', { senderId: socket.userId });
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
