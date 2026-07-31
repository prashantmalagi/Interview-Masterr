const multer = require("multer")
const path = require("path")

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 3 * 1024 * 1024 // 3MB
    },
    fileFilter: (req, file, cb) => {
        const allowedExtensions = [".pdf", ".docx"];
        const ext = path.extname(file.originalname).toLowerCase();
        
        const allowedMimeTypes = [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ];

        if (allowedExtensions.includes(ext) || allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only PDF and DOCX files are allowed."));
        }
    }
})

module.exports = upload