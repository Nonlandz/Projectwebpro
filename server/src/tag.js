import express from "express";
import { prisma } from "./db.js";
import { authenticate, adminOnly, ownParam } from "./middleware/auth.js";
import { publicUser, pageArgs, deletePost } from "./shared.js";


const router = express.Router();

router.post('/requests', authenticate, async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim().replace(/\s+/g, ' ') : '';
  if (!name || name.length > 50) return res.status(400).json({ message: 'Enter a category name between 1 and 50 characters.' });
  try {
    if (await prisma.tag.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } })) {
      return res.status(409).json({ message: 'This category already exists.' });
    }
    const request = await prisma.categoryRequest.create({ data: { name, normalizedName: name.toLowerCase(), userId: req.user.id } });
    res.status(201).json(request);
  } catch (error) {
    res.status(error.code === 'P2002' ? 409 : 500).json({ message: error.code === 'P2002' ? 'This category has already been requested.' : 'Unable to submit category request.' });
  }
});

router.get('/requests', authenticate, adminOnly, async (req, res) => {
  try {
    res.json(await prisma.categoryRequest.findMany({ where: { status: 'pending' }, orderBy: { createdAt: 'asc' }, take: 100, include: { User: { select: publicUser } } }));
  } catch { res.status(500).json({ message: 'Unable to load category requests.' }); }
});

router.put('/requests/:id', authenticate, adminOnly, async (req, res) => {
  const status = req.body.status;
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid review decision.' });
  try {
    const result = await prisma.$transaction(async tx => {
      const claimed = await tx.categoryRequest.updateMany({ where: { id: req.params.id, status: 'pending' }, data: { status, reviewedAt: new Date() } });
      if (!claimed.count) return null;
      const request = await tx.categoryRequest.findUnique({ where: { id: req.params.id } });
      if (status === 'approved') {
        const existing = await tx.tag.findFirst({ where: { name: { equals: request.name, mode: 'insensitive' } } });
        if (!existing) await tx.tag.create({ data: { name: request.name } });
      }
      return request;
    });
    if (!result) return res.status(409).json({ message: 'Request has already been reviewed or no longer exists.' });
    res.json(result);
  } catch { res.status(500).json({ message: 'Unable to review category request.' }); }
});

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
