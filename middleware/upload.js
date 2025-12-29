const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const userFolder = `uploads/${req.userId}`;
        if (!fs.existsSync(userFolder)) {
            fs.mkdirSync(userFolder, { recursive: true });
        }
        cb(null, userFolder);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Read allowed types from environment variable `ALLOWED_FILE_TYPES` (comma-separated),
    // fall back to a sensible default if not provided.
    const allowedEnv = process.env.ALLOWED_FILE_TYPES || 'jpeg,jpg,png,pdf,doc,docx,txt,xls,csv,xlsx,rar,zip';
    const allowedList = allowedEnv.split(',').map(s => s.trim()).filter(Boolean);

    // Escape any regex metacharacters and build a case-insensitive regex
    const escaped = allowedList.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const allowedRegex = new RegExp(escaped.join('|'), 'i');

    // Test extension (without the leading dot) and MIME type
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const extMatch = allowedRegex.test(ext);
    const mimeMatch = allowedRegex.test(file.mimetype);

    if (extMatch && mimeMatch) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Allowed types: ' + allowedList.join(', ')));
    }
};

module.exports = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: fileFilter
});