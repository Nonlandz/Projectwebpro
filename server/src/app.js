import bodyParser from "body-parser";
import cors from "cors";
import express from "express";

import user from "./user.js";
import comment from "./comment.js";
import post from "./post.js";
import tags from "./tag.js";
import chat from "./chat.js";

const app = express();
const router = express.Router();

app.use(cors({ origin: "*" }));
app.use((req, res, next) => { res.set("X-Content-Type-Options", "nosniff"); next(); });
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  "/api",
  router.use("/user", user),
  router.use("/comment", comment),
  router.use("/posts", post),
  router.use("/tags", tags),
  router.use("/chat", chat)
);

app.use((error, req, res, next) => {
  if (error.code === "LIMIT_FILE_SIZE") return res.status(413).json({ message: "Images must be 5 MB or smaller" });
  if (error.name === "MulterError") return res.status(400).json({ message: "Invalid image upload" });
  console.error("Request failed:", error.message);
  res.status(500).json({ message: "An unexpected error occurred" });
});

export default app;
