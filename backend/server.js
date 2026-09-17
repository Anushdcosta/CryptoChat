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
const Room = require('./models/Room');

const multer = require('multer');
const { OAuth2Client } = require('google-auth-library');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// TODO: Replace with real client ID when user provides it
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'PLACEHOLDER_CLIENT_ID';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

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
    const { email, username, password } = req.body;
    if (!email || !password || !username) return res.status(400).json({ error: 'All fields are required' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ email, username, password: hashedPassword });
    await newUser.save();

    const token = jwt.sign({ userId: newUser._id, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: newUser._id, username: newUser.username, email: newUser.email, avatar: newUser.avatar, status: newUser.status } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.password) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, email: user.email, avatar: user.avatar, status: user.status } });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Google Auth
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        email,
        username: name,
        googleId,
        avatar: picture
      });
      await user.save();
    } else if (!user.googleId) {
      user.googleId = googleId;
      if (!user.avatar) user.avatar = picture;
      await user.save();
    }

    const token = jwt.sign({ userId: user._id, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, email: user.email, avatar: user.avatar, status: user.status } });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(400).json({ error: 'Invalid Google Token' });
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
      if (msg.senderId && msg.senderId.toString() !== myId) userIds.add(msg.senderId.toString());
      if (msg.receiverId && msg.receiverId.toString() !== myId) userIds.add(msg.receiverId.toString());
    });

    const users = await User.find({ _id: { $in: Array.from(userIds) } }).select('-password');
    const usersWithUnread = await Promise.all(users.map(async u => {
      const unreadCount = await Message.countDocuments({
        senderId: u._id,
        receiverId: myId,
        read: false
      });
      return { ...u.toObject(), unreadCount };
    }));

    const rooms = await Room.find({ members: myId });

    const formattedRooms = rooms.map(room => ({
      _id: room._id,
      username: room.name,
      isGroup: true,
      isOnline: true,
      status: `${room.members.length} members`,
      unreadCount: 0
    }));

    res.json([...formattedRooms, ...usersWithUnread]);
  } catch (error) {
    console.error('Recent error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get chat history (can be a user or a room)
app.get('/api/messages/:chatId', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const myId = decoded.userId;
    const chatId = req.params.chatId;

    const isRoom = await Room.findById(chatId);
    let messages;

    if (isRoom) {
      messages = await Message.find({ roomId: chatId })
        .sort({ createdAt: 1 })
        .populate('senderId', 'username');
    } else {
      messages = await Message.find({
        $or: [
          { senderId: myId, receiverId: chatId },
          { senderId: chatId, receiverId: myId }
        ]
      }).sort({ createdAt: 1 });
    }

    const decryptedMessages = messages.map(msg => ({
      _id: msg._id,
      senderId: isRoom ? msg.senderId._id : msg.senderId,
      senderName: isRoom ? msg.senderId.username : undefined,
      receiverId: msg.receiverId,
      roomId: msg.roomId,
      replyTo: msg.replyTo,
      reactions: msg.reactions,
      plainText: decrypt(msg.plainText),
      scrambledText: msg.scrambledText,
      attachment: msg.attachment ? decrypt(msg.attachment) : null,
      viewed: msg.viewed,
      read: msg.read,
      createdAt: msg.createdAt
    }));

    res.json(decryptedMessages);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile (avatar and status)
app.put('/api/users/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const { avatar, status } = req.body;
    
    const updateData = {};
    if (avatar !== undefined) updateData.avatar = avatar;
    if (status !== undefined) updateData.status = status;

    const updatedUser = await User.findByIdAndUpdate(
      decoded.userId,
      updateData,
      { new: true }
    ).select('-password');

    res.json(updatedUser);
  } catch (error) {
    console.error('Profile update error:', error);
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

  // Auto-join groups
  const userRooms = await Room.find({ members: socket.userId });
  userRooms.forEach(room => socket.join(room._id.toString()));

  // Create Group
  socket.on('create_group', async (data) => {
    try {
      const { name, members } = data;
      if (!members.includes(socket.userId)) members.push(socket.userId);
      const newRoom = new Room({ name, members, admin: socket.userId });
      await newRoom.save();
      
      members.forEach(memberId => {
        io.to(memberId.toString()).emit('group_created', newRoom);
      });
      socket.join(newRoom._id.toString());
    } catch (e) {
      console.error('Create group error:', e);
    }
  });

  // Direct Messaging
  socket.on('send_direct_message', async (data) => {
    try {
      const { receiverId, plainText, scrambledText, attachment, replyTo } = data;
      
      const encryptedText = encrypt(plainText);
      const encryptedAttachment = attachment ? encrypt(attachment) : null;

      // Save to database
      const newMessage = new Message({
        senderId: socket.userId,
        receiverId,
        replyTo,
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
        replyTo,
        plainText,
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

  // Group Messaging
  socket.on('send_group_message', async (data) => {
    try {
      const { roomId, plainText, scrambledText, attachment, replyTo } = data;
      const encryptedText = encrypt(plainText);
      const encryptedAttachment = attachment ? encrypt(attachment) : null;
      
      const newMessage = new Message({
        senderId: socket.userId,
        roomId,
        replyTo,
        plainText: encryptedText,
        scrambledText,
        attachment: encryptedAttachment
      });
      await newMessage.save();

      const sender = await User.findById(socket.userId);

      const payload = {
        _id: newMessage._id,
        senderId: socket.userId,
        senderName: sender.username,
        roomId,
        replyTo,
        plainText,
        scrambledText,
        attachment,
        timestamp: newMessage.createdAt
      };

      io.to(roomId).emit('receive_group_message', payload);
    } catch (e) {
      console.error('Group message error:', e);
    }
  });

  socket.on('add_group_member', async (data) => {
    try {
      const { roomId, userId } = data;
      const room = await Room.findById(roomId);
      if (room && !room.members.includes(userId)) {
        room.members.push(userId);
        await room.save();
        io.emit('group_updated', room);
      }
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('remove_group_member', async (data) => {
    try {
      const { roomId, userId } = data;
      const room = await Room.findById(roomId);
      if (room) {
        room.members = room.members.filter(m => m.toString() !== userId);
        await room.save();
        io.emit('group_updated', room);
      }
    } catch (e) {
      console.error(e);
    }
  });

  // Reactions
  socket.on('react_message', async (data) => {
    try {
      const { messageId, emoji } = data;
      const msg = await Message.findById(messageId);
      if (!msg) return;

      // Check if user already reacted
      const existingReactionIndex = msg.reactions.findIndex(r => r.userId.toString() === socket.userId);
      if (existingReactionIndex >= 0) {
        msg.reactions[existingReactionIndex].emoji = emoji;
      } else {
        msg.reactions.push({ userId: socket.userId, emoji });
      }
      await msg.save();

      const reactionPayload = {
        messageId,
        userId: socket.userId,
        emoji,
        roomId: msg.roomId,
        receiverId: msg.receiverId,
        senderId: msg.senderId
      };

      // Broadcast reaction
      if (msg.roomId) {
        io.to(msg.roomId.toString()).emit('message_reacted', reactionPayload);
      } else {
        io.to(msg.receiverId.toString()).emit('message_reacted', reactionPayload);
        io.to(msg.senderId.toString()).emit('message_reacted', reactionPayload);
      }
    } catch (e) {
      console.error('Reaction error:', e);
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

  // Mark Messages Read
  socket.on('mark_messages_read', async (data) => {
    try {
      const { senderId } = data; 
      const result = await Message.updateMany(
        { senderId, receiverId: socket.userId, read: false },
        { read: true }
      );
      
      if (result.modifiedCount > 0) {
        io.to(senderId.toString()).emit('messages_read', { receiverId: socket.userId });
      }
    } catch (e) {
      console.error('Mark read error:', e);
    }
  });

  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${socket.userId}`);
    const now = new Date();
    await User.findByIdAndUpdate(socket.userId, { isOnline: false, socketId: null, lastSeen: now });
    io.emit('user_status_change', { userId: socket.userId, isOnline: false, lastSeen: now });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
