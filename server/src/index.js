import express from "express";
import dotenv from "dotenv";
import { matchRouter } from "./router/matches.js";

dotenv.config();

const app = express();

const port = process.env.PORT || 5000;

app.use(express.json())

app.get("/", (req, res) => {
  res.send("Hello from the server");
});

app.use('/api/v1/matches',matchRouter)


app.listen(port, () => {
  console.log(`Server running at port ${port}`);
});