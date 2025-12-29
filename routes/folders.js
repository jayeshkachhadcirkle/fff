const express = require('express');
const Folder = require('../models/Folder');
const File = require('../models/File');
const auth = require('../middleware/auth');
const router = express.Router();

// Create folder
router.post('/', auth, async (req, res) => {
    try {
        const { name, parentFolder } = req.body;

        const folder = new Folder({
            name,
            userId: req.userId,
            parentFolder: parentFolder || null
        });

        await folder.save();
        res.status(201).json({ message: 'Folder created', folder });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all folders
router.get('/', auth, async (req, res) => {
    try {
        const folders = await Folder.find({ userId: req.userId }).sort({ createdAt: -1 });
        res.json({ folders });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete folder
router.delete('/:id', auth, async (req, res) => {
    try {
        const folder = await Folder.findOne({ _id: req.params.id, userId: req.userId });

        if (!folder) {
            return res.status(404).json({ message: 'Folder not found' });
        }

        // Delete all files in folder
        await File.deleteMany({ folderId: req.params.id });

        // Delete folder
        await Folder.deleteOne({ _id: req.params.id });

        res.json({ message: 'Folder deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;