const express = require('express');
const fs = require('fs');
const File = require('../models/File');
const auth = require('../middleware/auth');
// const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const router = express.Router();

// Upload file (creates new file or overwrites existing file with same name in same folder)
router.post('/upload', auth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const folderId = req.body.folderId || null;

        // Check if a file with the same original name already exists for this user in the same folder
        const existingFile = await File.findOne({
            originalName: req.file.originalname,
            userId: req.userId,
            folderId: folderId
        });

        if (existingFile) {
            // Delete the old physical file if it exists
            try {
                if (existingFile.path && fs.existsSync(existingFile.path)) {
                    fs.unlinkSync(existingFile.path);
                }
            } catch (fsErr) {
                // Log but continue — we still want to replace the DB record
                console.error('Failed to delete old file:', fsErr);
            }

            // Update existing DB record with new file info
            existingFile.filename = req.file.filename;
            existingFile.originalName = req.file.originalname;
            existingFile.mimetype = req.file.mimetype;
            existingFile.size = req.file.size;
            existingFile.path = req.file.path;
            existingFile.uploadedAt = Date.now();

            await existingFile.save();
            return res.json({ message: 'File overwritten successfully', file: existingFile });
        }

        // No existing file: create a new record
        const file = new File({
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path,
            userId: req.userId,
            folderId: folderId
        });

        await file.save();
        res.status(201).json({ message: 'File uploaded successfully', file });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all files
router.get('/', auth, async (req, res) => {
    try {

        const query = { userId: req.userId };
        const filesAll = await File.find(query);

        // console.log('Retrieved files:', filesAll);
        let totalSize = 0;
        filesAll.forEach(file => {
            totalSize += file.size;
        });
        console.log('Total used storage (MB):', (totalSize / (1024 * 1024)).toFixed(2));

        const { folderId } = req.query;

        if (folderId) {
            query.folderId = folderId;
        } else {
            query.folderId = null;
        }

        const files = await File.find(query).sort({ uploadedAt: -1 });
        res.json({ files });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Download file
router.get('/download/:id', auth, async (req, res) => {
    try {
        const file = await File.findOne({ _id: req.params.id, userId: req.userId });

        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        res.download(file.path, file.originalName);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete file
router.delete('/:id', auth, async (req, res) => {
    try {
        const file = await File.findOne({ _id: req.params.id, userId: req.userId });

        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        // Delete physical file
        fs.unlinkSync(file.path);

        // Delete from database
        await File.deleteOne({ _id: req.params.id });

        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// // Update/Override file
// router.put('/:id', auth, upload.single('file'), async (req, res) => {
//     try {
//         const existingFile = await File.findOne({ _id: req.params.id, userId: req.userId });

//         if (!existingFile) {
//             return res.status(404).json({ message: 'File not found' });
//         }

//         if (req.file) {
//             // Delete old file
//             fs.unlinkSync(existingFile.path);

//             // Update with new file
//             existingFile.filename = req.file.filename;
//             existingFile.originalName = req.file.originalname;
//             existingFile.mimetype = req.file.mimetype;
//             existingFile.size = req.file.size;
//             existingFile.path = req.file.path;
//             existingFile.uploadedAt = Date.now();
//         }

//         await existingFile.save();
//         res.json({ message: 'File updated successfully', file: existingFile });
//     } catch (error) {
//         res.status(500).json({ message: 'Server error', error: error.message });
//     }
// });

module.exports = router;