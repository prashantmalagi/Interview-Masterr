const mongoose = require('mongoose');

const technicalQuestionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [ true, "Technical question is required" ]
    },
    intention: {
        type: String,
        required: [ true, "Intention is required" ]
    },
    answer: {
        type: String,
        required: [ true, "Answer is required" ]
    },
    difficulty: {
        type: String,
        enum: [ "easy", "medium", "hard" ],
        default: "medium"
    },
    commonMistakes: {
        type: String,
        default: ""
    },
    followUpQuestions: [ {
        type: String
    } ]
}, {
    _id: false
})

const behavioralQuestionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [ true, "Behavioral question is required" ]
    },
    intention: {
        type: String,
        default: ""
    },
    answer: {
        type: String,
        default: ""
    },
    tips: {
        type: String,
        default: ""
    },
    sampleAnswer: {
        type: String,
        default: ""
    }
}, {
    _id: false
})

const skillGapSchema = new mongoose.Schema({
    skill: {
        type: String,
        required: [ true, "Skill is required" ]
    },
    severity: {
        type: String,
        enum: [ "low", "medium", "high" ],
        required: [ true, "Severity is required" ]
    },
    whyItMatters: {
        type: String,
        default: ""
    },
    learningResources: [ {
        type: String
    } ],
    estimatedTime: {
        type: String,
        default: ""
    },
    priority: {
        type: String,
        enum: [ "low", "medium", "high" ],
        default: "medium"
    }
}, {
    _id: false
})

const preparationPlanSchema = new mongoose.Schema({
    day: {
        type: Number,
        required: [ true, "Day is required" ]
    },
    focus: {
        type: String,
        required: [ true, "Focus is required" ]
    },
    topic: {
        type: String,
        default: ""
    },
    theory: {
        type: String,
        default: ""
    },
    practiceProblems: [ {
        type: String
    } ],
    interviewQuestions: [ {
        type: String
    } ],
    resources: [ {
        type: String
    } ],
    estimatedTime: {
        type: String,
        default: ""
    },
    category: {
        type: String,
        default: "DSA"
    },
    tasks: [ {
        type: String,
        required: [ true, "Task is required" ]
    } ]
})

const matchScoreDetailsSchema = new mongoose.Schema({
    overallScore: { type: Number, default: 0 },
    technicalSkills: { type: Number, default: 0 },
    softSkills: { type: Number, default: 0 },
    resumeQuality: { type: Number, default: 0 },
    keywordMatch: { type: Number, default: 0 },
    educationMatch: { type: Number, default: 0 },
    experienceMatch: { type: Number, default: 0 },
    projectsMatch: { type: Number, default: 0 }
}, {
    _id: false
})

const interviewReportSchema = new mongoose.Schema({
    jobDescription: {
        type: String,
        required: [ true, "Job description is required" ]
    },
    resume: {
        type: String,
    },
    selfDescription: {
        type: String,
    },
    matchScore: {
        type: Number,
        min: 0,
        max: 100,
    },
    matchScoreDetails: {
        type: matchScoreDetailsSchema,
        default: () => ({})
    },
    atsAnalysis: {
        type: String,
        default: ""
    },
    strengths: [ {
        type: String
    } ],
    weaknesses: [ {
        type: String
    } ],
    recommendations: [ {
        type: String
    } ],
    technicalQuestions: [ technicalQuestionSchema ],
    behavioralQuestions: [ behavioralQuestionSchema ],
    skillGaps: [ skillGapSchema ],
    preparationPlan: [ preparationPlanSchema ],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    },
    title: {
        type: String,
        required: [ true, "Job title is required" ]
    }
}, {
    timestamps: true
})

const interviewReportModel = mongoose.model("InterviewReport", interviewReportSchema);

module.exports = interviewReportModel;