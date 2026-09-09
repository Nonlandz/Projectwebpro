import express from "express";
import { prisma } from "./db.js";
import { authenticate, adminOnly, ownParam } from "./middleware/auth.js";
import { publicUser, pageArgs, deletePost } from "./shared.js";


const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const tags = await prisma.tag.findMany();
    res.json(tags);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", authenticate, adminOnly, async (req, res) => {
  try {
    const tag = await prisma.tag.create({
      data: {
        name: req.body.name,
      },
    });
    res.json(tag);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", authenticate, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const tag = await prisma.tag.delete({
      where: { id: parseInt(id) },
    });
    res.json(tag);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
