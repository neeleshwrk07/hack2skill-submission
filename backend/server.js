const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { MongoMemoryServer } = require('mongodb-memory-server');
const journeyRoutes = require('./routes/journeyRoutes');
const contactRoutes = require('./routes/contactRoutes');
const Journey = require('./models/Journey');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/journeys', journeyRoutes);
app.use('/api/contacts', contactRoutes);

let mongoServer;

const startServer = async () => {
  try {
    // Start In-Memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`In-memory MongoDB connected successfully at ${mongoUri}`);

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
