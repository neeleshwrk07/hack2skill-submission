const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');

// Get all contacts
router.get('/', async (req, res) => {
  try {
    const contacts = await Contact.find();
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a contact
router.post('/', async (req, res) => {
  const contact = new Contact({
    name: req.body.name,
    phone: req.body.phone,
    relationship: req.body.relationship
  });

  try {
    const newContact = await contact.save();
    res.status(201).json(newContact);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a contact
router.delete('/:id', async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted contact' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
