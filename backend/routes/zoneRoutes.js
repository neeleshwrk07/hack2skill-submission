const express = require('express');
const router = express.Router();
const DangerZone = require('../models/DangerZone');

// Get all danger zones
router.get('/', async (req, res) => {
  try {
    const zones = await DangerZone.find();
    res.json(zones);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch zones' });
  }
});

// Add a new danger zone (from frontend after geocoding)
router.post('/', async (req, res) => {
  try {
    const { address, lat, lng, description, severity } = req.body;
    
    if (!address || !lat || !lng) {
      return res.status(400).json({ error: 'Missing required location data' });
    }

    const newZone = new DangerZone({
      address,
      lat,
      lng,
      description: description || 'User reported danger zone',
      severity: severity || 80
    });

    await newZone.save();
    res.status(201).json(newZone);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save danger zone' });
  }
});

module.exports = router;
