const express = require("express")
const cors = require("cors")
const cookieParser = require("cookie-parser")

const app = express()

// Define allowed origins for development and production
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://interview-masterr.vercel.app"
]

// CORS middleware placed at the very top of the stack to handle preflights correctly
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, postman)
        if (!origin) return callback(null, true);
        
        // Match allowed origins list or regex for localhost on any port
        if (allowedOrigins.indexOf(origin) !== -1 || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true
}))

app.use(express.json())
app.use(cookieParser())

/* require all the routes here */
const authRouter = require("./routes/auth.routes")
const interviewRouter = require("./routes/interview.routes")

/* using all the routes here */
app.use("/api/auth", authRouter)
app.use("/api/interview", interviewRouter)

module.exports = a