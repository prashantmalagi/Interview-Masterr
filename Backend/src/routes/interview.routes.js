const express = require("express")
const authMiddleware = require("../middlewares/auth.middleware")
const interviewController = require("../controllers/interview.controller")
const upload = require("../middlewares/file.middleware")
const multer = require("multer")

const interviewRouter = express.Router()

// Wrapper middleware to catch Multer/fileFilter errors gracefully
const handleUpload = (req, res, next) => {
    upload.single("resume")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: `Multer upload error: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ message: err.message || "Failed to upload file." });
        }
        next();
    });
};

/**
 * @route POST /api/interview/
 * @description generate new interview report on the basis of user self description,resume pdf/docx and job description.
 * @access private
 */
interviewRouter.post("/", authMiddleware.authUser, handleUpload, interviewController.generateInterViewReportController)

/**
 * @route GET /api/interview/report/:interviewId
 * @description get interview report by interviewId.
 * @access private
 */
interviewRouter.get("/report/:interviewId", authMiddleware.authUser, interviewController.getInterviewReportByIdController)

/**
 * @route GET /api/interview/
 * @description get all interview reports of logged in user.
 * @access private
 */
interviewRouter.get("/", authMiddleware.authUser, interviewController.getAllInterviewReportsController)

/**
 * @route GET /api/interview/resume/pdf
 * @description generate resume pdf on the basis of user self description, resume content and job description.
 * @access private
 */
interviewRouter.post("/resume/pdf/:interviewReportId", authMiddleware.authUser, interviewController.generateResumePdfController)

module.exports = interviewRouter