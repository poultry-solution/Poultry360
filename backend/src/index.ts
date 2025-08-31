import express from "express"
import dotenv from "dotenv"
dotenv.config()

const PORT = process.env.PORT || 8081
const app = express()

app.get("/", (req, res) => {
    res.send("Hello World!")
})

app.get("/health", (req, res) => {
    res.send("OK")
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})
