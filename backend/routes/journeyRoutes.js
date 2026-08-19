const express = require('express');
const router = express.Router();
const Journey = require('../models/Journey');
const { analyzeDistress } = require('../services/aiService');

// Start a new journey
router.post('/', async (req, res) => {
  const journey = new Journey({
    activity: req.body.activity,
    durationMinutes: req.body.durationMinutes
  });

  try {
    const newJourney = await journey.save();
    res.status(201).json(newJourney);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update journey status (e.g. SAFE or ALERT)
router.patch('/:id', async (req, res) => {
  try {
    const journey = await Journey.findById(req.params.id);
    if (req.body.status) {
      journey.status = req.body.status;
    }
    if (req.body.location) {
      journey.location = req.body.location;
    }
    const updatedJourney = await journey.save();
    res.json(updatedJourney);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Analyze voice/text check-in
router.post('/:id/analyze', async (req, res) => {
  try {
    const text = req.body.text;
    if (!text) return res.status(400).json({ message: 'No text provided' });
    
    const analysis = await analyzeDistress(text);
    
    // Auto-escalate if distress is detected
    if (analysis === 'DISTRESS') {
      const journey = await Journey.findById(req.params.id);
      if (journey) {
        journey.status = 'ALERT';
        await journey.save();
      }
    }
    
    res.json({ analysis, status: analysis === 'DISTRESS' ? 'ALERT' : 'ACTIVE' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
