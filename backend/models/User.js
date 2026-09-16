const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: 'Hey there! I am using CryptoChat.'
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  socketId: {
    type: String,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
