const pdfParse = require("pdf-parse")
const mongoose = require("mongoose")
const mammoth = require("mammoth")
const { generateInterviewReport, generateResumePdf } = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")

/**
 * @description Controller to generate interview report based on user self description, resume and job description.
 */
async function generateInterViewReportController(req, res) {
    try {
        const { selfDescription, jobDescription } = req.body

        // Validation for jobDescription
        if (!jobDescription || typeof jobDescription !== "string" || !jobDescription.trim()) {
            return res.status(400).json({
                message: "Job description is required."
            })
        }

        let resumeText = ""

        // Validate and parse PDF/DOCX file if provided
        if (req.file) {
            const isPdf = req.file.mimetype === "application/pdf" || req.file.originalname.toLowerCase().endsWith(".pdf");
            const isDocx = req.file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || req.file.originalname.toLowerCase().endsWith(".docx");

            if (!isPdf && !isDocx) {
                return res.status(400).json({
                    message: "Only PDF and DOCX resumes are supported."
                })
            }

            if (isPdf) {
                try {
                    const pdfParserInstance = new pdfParse.PDFParse(Uint8Array.from(req.file.buffer))
                    const resumeContent = await pdfParserInstance.getText()
                    resumeText = resumeContent.text || ""
                } catch (parseError) {
                    console.error("PDF Parsing error:", parseError)
                    return res.status(400).json({
                        message: "Failed to parse the uploaded PDF resume."
                    })
                }
            } else if (isDocx) {
                try {
                    const result = await mammoth.extractRawText({ buffer: req.file.buffer })
                    resumeText = result.value || ""
                } catch (parseError) {
                    console.error("DOCX Parsing error:", parseError)
                    return res.status(400).json({
                        message: "Failed to parse the uploaded DOCX resume."
                    })
                }
            }
        }

        // At least one of selfDescription or resume is required
        const cleanSelfDescription = selfDescription ? selfDescription.trim() : ""
        if (!cleanSelfDescription && !resumeText.trim()) {
            return res.status(400).json({
                message: "Please provide either a resume PDF/DOCX or a self description."
            })
        }

        // Call AI Service
        let interViewReportByAi
        try {
            interViewReportByAi = await generateInterviewReport({
                resume: resumeText,
                selfDescription: cleanSelfDescription,
                jobDescription: jobDescription.trim()
            })
        } catch (aiError) {
            console.error("AI Generation error:", aiError)
            return res.status(502).json({
                message: "AI service failed to generate the interview report. Please try again."
            })
        }

        // Save to Database
        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resume: resumeText,
            selfDescription: cleanSelfDescription,
            jobDescription: jobDescription.trim(),
            ...interViewReportByAi
        })

        return res.status(201).json({
            message: "Interview report generated successfully.",
            interviewReport
        })
    } catch (error) {
        console.error("Generate interview report error:", error)
        return res.status(500).json({
            message: "Internal server error while generating interview report."
        })
    }
}

/**
 * @description Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res) {
    try {
        const { interviewId } = req.params

        if (!mongoose.Types.ObjectId.isValid(interviewId)) {
            return res.status(400).json({
                message: "Invalid interview ID format."
            })
        }

        const interviewReport = await interviewReportModel.findById(interviewId).populate("user")

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found."
            })
        }

        // Explicit 403 Forbidden check
        const ownerId = interviewReport.user._id || interviewReport.user;
        if (ownerId.toString() !== req.user.id.toString()) {
            return res.status(403).json({
                message: "Access forbidden. You do not own this report."
            })
        }

        return res.status(200).json({
            message: "Interview report fetched successfully.",
            interviewReport
        })
    } catch (error) {
        console.error("Get interview report by ID error:", error)
        return res.status(500).json({
            message: "Internal server error while fetching interview report."
        })
    }
}

/** 
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res) {
    try {
        const interviewReports = await interviewReportModel.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")

        return res.status(200).json({
            message: "Interview reports fetched successfully.",
            interviewReports
        })
    } catch (error) {
        console.error("Get all interview reports error:", error)
        return res.status(500).json({
            message: "Internal server error while fetching interview reports."
        })
    }
}

/**
 * @description Controller to generate resume PDF based on user self description, resume and job description.
 */
async function generateResumePdfController(req, res) {
    try {
        const { interviewReportId } = req.params

        if (!mongoose.Types.ObjectId.isValid(interviewReportId)) {
            return res.status(400).json({
                message: "Invalid interview report ID format."
            })
        }

        const interviewReport = await interviewReportModel.findById(interviewReportId).populate("user")

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found."
            })
        }

        // Explicit 403 Forbidden check
        const ownerId = interviewReport.user._id || interviewReport.user;
        if (ownerId.toString() !== req.user.id.toString()) {
            return res.status(403).json({
                message: "Access forbidden. You do not own this report."
            })
        }

        const { resume, jobDescription, selfDescription } = interviewReport

        let pdfBuffer
        try {
            pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription })
        } catch (pdfError) {
            console.error("PDF generation error:", pdfError)
            return res.status(502).json({
                message: "Failed to generate PDF from AI resume data."
            })
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'attachment; filename="ATS_Resume.pdf"');

        return res.send(pdfBuffer)
    } catch (error) {
        console.error("Generate resume PDF error:", error)
        return res.status(500).json({
            message: "Internal server error while generating resume PDF."
        })
    }
}

module.exports = {
    generateInterViewReportController,
    getInterviewReportByIdController,
    getAllInterviewReportsController,
    generateResumePdfController
}