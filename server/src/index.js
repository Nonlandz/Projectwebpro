import bodyPaser from "body-parser";
import express from "express";
import cors from "cors";

import user from "./user.js";
import comment from "./comment.js";
import post from "./post.js";
import tags from "./tag.js";

const app = express();
const router = express.Router();
const PORT = 8080;

app.use(cors({ origin: "*" }));
app.use(bodyPaser.json());
app.use(bodyPaser.urlencoded({ extended: true }));



//กำหนด api
app.use(
  "/api",
  router.use("/user", user),
  router.use("/comment", comment),
  router.use("/posts", post),
  router.use("/tags", tags)
  
);

app.listen(PORT, () => {
  console.log(`server is runing on port http://localhost:${PORT}`);
});
