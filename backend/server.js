require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { MongoMemoryServer } = require('mongodb-memory-server');
const journeyRoutes = require('./routes/journeyRoutes');
const contactRoutes = require('./routes/contactRoutes');
const zoneRoutes = require('./routes/zoneRoutes');
const Journey = require('./models/Journey');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const path = require('path');

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'AURA Safety Net Backend API',
    endpoints: {
      contacts: '/api/contacts',
      journeys: '/api/journeys'
    }
  });
});

app.use('/api/journeys', journeyRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/zones', zoneRoutes);

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Catch-all route to serve React app for any other request
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

let mongoServer;

const startServer = async () => {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log(`Connected to external MongoDB at ${process.env.MONGODB_URI}`);
    } else {
      // Start In-Memory MongoDB (compatible with Debian 12/Bookworm on Render)
      mongoServer = await MongoMemoryServer.create({
        binary: {
          version: '7.0.3',
        },
      });
      const mongoUri = mongoServer.getUri();

      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log(`In-memory MongoDB connected successfully at ${mongoUri}`);
    }

    // Seed Danger Zones if empty
    const DangerZone = require('./models/DangerZone');
    const zoneCount = await DangerZone.countDocuments();
    if (zoneCount === 0) {
      await DangerZone.insertMany([
        { address: 'Tenderloin, San Francisco', lat: 37.7833, lng: -122.4167, description: 'High crime rate area, extreme caution recommended.', severity: 95 },
        { address: 'Mission St & 16th, SF', lat: 37.765, lng: -122.419, description: 'Reports of harassment in the evenings.', severity: 85 },
        { address: 'Golden Gate Park (Night)', lat: 37.769, lng: -122.486, description: 'Unlit areas, highly isolated after dark.', severity: 60 },
        { address: 'Market St Station', lat: 37.79, lng: -122.39, description: 'Minor incidents and pickpockets.', severity: 40 }
      ]);
      console.log("Seeded default danger zones.");
    }

    app.listen(PORT, () => {
      console.log(`Backend Server running on port ${PORT}`);
      startDeadMansSwitch();
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer();

// Dead Man's Switch: Auto-escalation loop
function startDeadMansSwitch() {
  console.log("Dead Man's Switch monitoring activated.");
  setInterval(async () => {
    try {
      const activeJourneys = await Journey.find({ status: 'ACTIVE' });
      const now = new Date();
      
      for (const journey of activeJourneys) {
        // Calculate expiration time (startTime + duration in minutes)
        const expirationTime = new Date(journey.startTime.getTime() + journey.durationMinutes * 60000);
        
        if (now > expirationTime) {
          console.log(`[DEAD MAN'S SWITCH] Journey ${journey._id} expired without a SAFE check-in! Auto-escalating to ALERT.`);
          journey.status = 'ALERT';
          await journey.save();
        }
      }
    } catch (err) {
      console.error("Error in Dead Man's Switch loop:", err);
    }
  }, 10000); // Check every 10 seconds
}
