const userModel = require("../models/user.model")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const tokenBlacklistModel = require("../models/blacklist.model")

/**
 * @name registerUserController
 * @description register a new user, expects username, email and password in the request body
 * @access Public
 */
async function registerUserController(req, res) {
    try {
        const { username, email, password } = req.body

        if (!username || typeof username !== "string" || !username.trim()) {
            return res.status(400).json({ message: "Please provide a valid username." })
        }
        if (!email || typeof email !== "string" || !email.trim() || !email.includes("@")) {
            return res.status(400).json({ message: "Please provide a valid email address." })
        }
        if (!password || typeof password !== "string" || password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long." })
        }

        const trimmedUsername = username.trim()
        const trimmedEmail = email.trim().toLowerCase()

        const isUserAlreadyExists = await userModel.findOne({
            $or: [ { username: trimmedUsername }, { email: trimmedEmail } ]
        })

        if (isUserAlreadyExists) {
            return res.status(400).json({
                message: "Account already exists with this email address or username"
            })
        }

        const hash = await bcrypt.hash(password, 10)

        const user = await userModel.create({
            username: trimmedUsername,
            email: trimmedEmail,
            password: hash
        })

        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        )

        // Set HttpOnly cookie with cross-site compatibility settings (secure + sameSite "none")
        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        })

        return res.status(201).json({
            message: "User registered successfully",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        })
    } catch (error) {
        console.error("Register user error:", error)
        return res.status(500).json({ message: "Internal server error during registration." })
    }
}


/**
 * @name loginUserController
 * @description login a user, expects email and password in the request body
 * @access Public
 */
async function loginUserController(req, res) {
    try {
        const { email, password } = req.body

        if (!email || typeof email !== "string" || !email.trim()) {
            return res.status(400).json({ message: "Please provide email address." })
        }
        if (!password || typeof password !== "string") {
            return res.status(400).json({ message: "Please provide password." })
        }

        const trimmedEmail = email.trim().toLowerCase()
        const user = await userModel.findOne({ email: trimmedEmail })

        if (!user) {
            return res.status(400).json({
                message: "Invalid email or password"
            })
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return res.status(400).json({
                message: "Invalid email or password"
            })
        }

        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        )

        // Set HttpOnly cookie with cross-site compatibility settings (secure + sameSite "none")
        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        })

        return res.status(200).json({
            message: "User loggedIn successfully.",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        })
    } catch (error) {
        console.error("Login user error:", error)
        return res.status(500).json({ message: "Internal server error during login." })
    }
}


/**
 * @name logoutUserController
 * @description clear token from user cookie and add the token in blacklist
 * @access public
 */
async function logoutUserController(req, res) {
    try {
        let token = req.cookies?.token

        // Support Authorization header fallback
        if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1]
        }

        if (token) {
            await tokenBlacklistModel.create({ token })
        }

        res.clearCookie("token", {
            httpOnly: true,
            secure: true,
            sameSite: "none"
        })

        return res.status(200).json({
            message: "User logged out successfully"
        })
    } catch (error) {
        console.error("Logout user error:", error)
        return res.status(500).json({ message: "Internal server error during logout." })
    }
}

/**
 * @name getMeController
 * @description get the current logged in user details.
 * @access private
 */
async function getMeController(req, res) {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized access." })
        }

        const user = await userModel.findById(req.user.id)

        if (!user) {
            return res.status(404).json({ message: "User not found." })
        }

        return res.status(200).json({
            message: "User details fetched successfully",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        })
    } catch (error) {
        console.error("Get me error:", error)
        return res.status(500).json({ message: "Internal server error while fetching user details." })
    }
}

module.exports = {
    registerUserController,
    loginUserController,
    logoutUserController,
    getMeController
}