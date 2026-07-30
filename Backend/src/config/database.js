const mongoose = require("mongoose")

async function connectToDB(retries = 5, delay = 2000) {
    for (let i = 1; i <= retries; i++) {
        try {
            await mongoose.connect(process.env.MONGO_URI)
            console.log("Connected to Database successfully")
            return
        }
        catch (err) {
            console.error(`Database connection attempt ${i} failed:`, err.message)
            if (i === retries) {
                console.error("Max retries reached. Database connection failed.")
                process.exit(1)
            }
            console.log(`Retrying in ${delay / 1000}s...`)
            await new Promise(res => setTimeout(res, delay))
            delay *= 2
        }
    }
}

module.exports = connectToDB