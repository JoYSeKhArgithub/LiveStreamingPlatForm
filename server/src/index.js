import express from "express";
import dotenv from "dotenv";
import { matchRouter } from "./router/matches.js";
import http from 'http'
import { attachedWebsocketServer } from "./ws/server.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const port = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(express.json())

app.get("/", (req, res) => {
  res.send("Hello from the server");
});

app.use('/api/v1/matches',matchRouter);

const {broadCastMatchCreated} = attachedWebsocketServer(server);
app.locals.broadCastMatchCreated = broadCastMatchCreated;

server.listen(port,HOST,()=>{
  const baseUrl = HOST === '0.0.0.0'?`http://localhost:${port}`:`http://${HOST}:${port}`;
  console.log(`Server is running on ${baseUrl}`);
  console.log(`Websocket Server is running on ${baseUrl.replace('http','ws')}/ws`);
})