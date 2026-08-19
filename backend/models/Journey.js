const mongoose = require('mongoose');

const journeySchema = new mongoose.Schema({
  activity: { type: String, required: true },
  durationMinutes: { type: Number, required: true },
  startTime: { type: Date, default: Date.now },
  status: { type: String, enum: ['ACTIVE', 'SAFE', 'ALERT'], default: 'ACTIVE' },
  location: {
    lat: { type: Number },
    lng: { type: Number }
  }
});

module.exports = mongoose.model('Journey', journeySchema);
