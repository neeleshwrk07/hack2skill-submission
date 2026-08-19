const mongoose = require('mongoose');

const DangerZoneSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true
  },
  lat: {
    type: Number,
    required: true
  },
  lng: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    default: 'Reported safety concern'
  },
  severity: {
    type: Number,
    default: 80 // 1-100 where higher is more dangerous
  },
  reportedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('DangerZone', DangerZoneSchema);
