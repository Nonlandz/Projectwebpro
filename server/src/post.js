import express from "express";
import { prisma } from "./db.js";
import { authenticate, adminOnly, ownParam } from "./middleware/auth.js";
import { publicUser, pageArgs, deletePost } from "./shared.js";
import { uploadImage, uploadPostImages, storeImage, publicImageUrl, legacyImage, cleanupImage } from "./image-storage.js";

const router = express.Router();

router.get("/", (req, res, next) => req.query.scope === "admin" || req.query.userId ? authenticate(req, res, next) : next(), async (req, res) => {
  try {
    if (req.query.scope === "admin" && req.user?.role !== "admin") return res.status(403).json({ message: "Administrator access required" });
    if (req.query.userId && req.query.userId !== req.user.id) return res.status(403).json({ message: "Access denied" });
    const where = req.query.scope === "admin" ? {} : req.query.userId ? { userId: req.user.id } : { status: "approve" };
    if (req.query.tagId) where.tagId = Number(req.query.tagId);
    if (req.query.search) {
      const contains = { contains: String(req.query.search).slice(0, 200), mode: "insensitive" };
      where.OR = [{ title: contains }, { detail: contains }, { Tag: { name: contains } }, { User: { UserInfo: { OR: [{ username: contains }, { firstName: contains }, { lastName: contains }] } } }];
    }
    const posts = await prisma.post.findMany({
      where, ...pageArgs(req.query),
      include: {
        User: {
          select: {
            id: true,
            UserInfo: publicUser.UserInfo,
          },
        },
        Tag: true,
        Comment: {
          include:{
            author: {
              select: {
                id: true,
                UserInfo: publicUser.UserInfo,
              },
            },
          }
        },
        UserFav: {
          include: {
            User: { select: publicUser },
          },
        },
        Images: { select: { id: true }, orderBy: { createdAt: "asc" } },

      },
      orderBy: {
        createdAt: "desc",
      },
    });
    res.json(posts);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error });
  }
});

router.post("/", authenticate, async (req, res) => {
  try {
    if (typeof req.body.title !== "string" || !req.body.title.trim() || req.body.title.length > 200 || typeof req.body.detail !== "string" || !req.body.detail.trim() || req.body.detail.length > 10000) return res.status(400).json({ message: "A title (up to 200 characters) and description (up to 10000) are required" });
    const post = await prisma.post.create({
      data: {
        title: req.body.title,
        detail: req.body.detail,
        userId: req.user.id,
        tagId: req.body.tagId,
      },
    });
    res.json(post);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error });
  }
});

async function verifyPostOwner(req, res, next) {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post || post.userId !== req.user.id) return res.status(403).json({ message: "Access denied" });
    next();
  } catch { res.status(500).json({ message: "Unable to verify post owner" }); }
}

router.post("/:id/images", authenticate, verifyPostOwner, uploadPostImages.array("images", 3), async (req, res) => {
  try {
    if (!req.files?.length || req.files.length > 3) return res.status(400).json({ message: "Upload between 1 and 3 images" });
    const post = await prisma.post.findUnique({ where: { id: req.params.id }, select: { id: true, userId: true, Images: { select: { id: true } } } });
    if (!post || post.userId !== req.user.id) return res.status(403).json({ message: "Access denied" });
    if (post.Images.length + req.files.length > 3) return res.status(400).json({ message: "A post can have a maximum of 3 images" });

    const imagePaths = [];
    try {
      for (const file of req.files) imagePaths.push(await storeImage("posts", post.id, file));
      const images = await prisma.$transaction(async tx => Promise.all(imagePaths.map(imagePath => tx.postImage.create({ data: { postId: post.id, imagePath }, select: { id: true } }))));
      res.status(201).json({ images: images.map(image => ({ id: image.id, imageUrl: `/api/posts/${post.id}/images/${image.id}` })) });
    } catch (error) {
      await Promise.all(imagePaths.map(cleanupImage));
      throw error;
    }
  } catch (error) {
    console.log(error);
    res.status(error.status || 500).json({ message: error.status ? error.message : "Failed to upload images" });
  }
});

router.post("/:id/image", authenticate, verifyPostOwner, uploadImage.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "An image file is required" });
    }

    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      select: { id: true, userId: true },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (req.user.id !== post.userId) {
      return res.status(403).json({ message: "Unauthorized to upload an image for this post" });
    }

    const imagePath = await storeImage("posts", post.id, req.file);
    let previous;
    try {
      previous = await prisma.$transaction(async tx => {
        // Serialize replacements so concurrent uploads cannot orphan the winning image.
        await tx.$queryRaw`SELECT id FROM "Post" WHERE id = ${post.id} FOR UPDATE`;
        const current = await tx.post.findUnique({ where: { id: post.id } });
        await tx.post.update({ where: { id: post.id }, data: { imagePath } });
        return current.imagePath;
      });
    } catch (error) { await cleanupImage(imagePath); throw error; }
    await cleanupImage(previous);
    res.status(201).json({ imageUrl: `/api/posts/${post.id}/image` });
  } catch (error) {
    console.log(error);
    res.status(error.status || 500).json({ message: error.status ? error.message : "Failed to upload image" });
  }
});

router.get("/:id/context", authenticate, async (req, res) => {
  try {
    const post = await prisma.post.findFirst({
      where: { id: req.params.id, status: "approve" },
      select: { id: true, title: true, detail: true, userId: true, imagePath: true, Images: { select: { id: true }, orderBy: { createdAt: "asc" } } },
    });
    if (!post || post.userId === req.user.id) return res.status(404).json({ message: "Post not available for chat" });
    const { imagePath, ...postContext } = post;
    res.json({ ...postContext, hasLegacyImage: Boolean(imagePath) });
  } catch { res.status(500).json({ message: "Unable to load post context" }); }
});

router.get("/:id/view", authenticate, async (req, res) => {
  try {
    const post = await prisma.post.findFirst({
      where: { id: req.params.id, status: "approve" },
      select: { id: true, title: true, detail: true, userId: true, approvedAt: true, imagePath: true, Images: { select: { id: true }, orderBy: { createdAt: "asc" } }, Tag: { select: { name: true } }, User: { select: publicUser } },
    });
    if (!post) return res.status(404).json({ message: "Post not found" });
    const { imagePath, ...publicPost } = post;
    res.json({ ...publicPost, hasLegacyImage: Boolean(imagePath) });
  } catch { res.status(500).json({ message: "Unable to load post" }); }
});

router.get("/:id/images/:imageId", async (req, res) => {
  try {
    const image = await prisma.postImage.findFirst({ where: { id: req.params.imageId, postId: req.params.id } });
    if (!image) return res.status(404).end();
    res.set("Cache-Control", "no-store");
    return res.redirect(302, publicImageUrl(image.imagePath));
  } catch { res.status(404).end(); }
});

router.get("/:id/image", async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.status(404).end();
    res.set("Cache-Control", "no-store");
    if (post.imagePath) return res.redirect(302, publicImageUrl(post.imagePath));
    const filename = await legacyImage("posts", post.id);
    if (!filename) return res.status(404).end();
    res.sendFile(filename);
  } catch (error) {
    res.status(404).end();
  }
});

router.get("/fav", authenticate, async (req, res) => {
  try {
    const fav = await prisma.postFav.findMany({
      where: {
        AND:[
          {userId: req.user.id},
          {postId: req.query.postId},
          {Post: { status: "approve" }}
        ]
      },
      include: {
        Post: {
          include: {
            User: {
              select: {
                id: true,
                UserInfo: publicUser.UserInfo,
              },
            },
            Tag: true,
            Comment: true,
            UserFav: true,
          },
        },
      },
    });
    res.json(fav);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error });
  }
});


router.get("/fav/user/:userId", authenticate, ownParam("userId"), async (req, res) => {
  try {
    const userId = req.params.userId;

    const favPosts = await prisma.postFav.findMany({
      where: {
        userId: userId,
        Post: { status: "approve" },
      },
      include: {
        Post: {
          include: {
            User: {
              select: {
                id: true,
                UserInfo: publicUser.UserInfo,
              },
            },
            Tag: true,
            Comment: true,
            UserFav: true,
          },
        },
      },
    });

    res.json(favPosts);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error });
  }
});




router.post("/fav", authenticate, async (req, res) => {
  try {
    const post = await prisma.post.findFirst({ where: { id: req.body.postId, status: "approve" } });
    if (!post) return res.status(404).json({ message: "Post not found" });
    const fav = await prisma.postFav.create({
      data: {
        userId: req.user.id,
        postId: req.body.postId,
      },
      include: {
        User: { select: publicUser },
      },
    });
    res.json(fav);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error });
  }
});

router.delete("/fav/:id", authenticate, async (req, res) => {
  try {
    const owned = await prisma.postFav.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!owned) return res.status(404).json({ message: "Favorite not found" });
    const fav = await prisma.postFav.delete({
      where: {
        id: req.params.id,
      },
    });
    res.json(fav);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error });
  }
});



router.delete("/:id/:userId", authenticate, ownParam("userId"), async (req, res) => {
  try { await deletePost(prisma, req.params.id, req.user); res.sendStatus(204); }
  catch (error) { res.status(error.status || 500).json({ message: error.status ? error.message : "Failed to delete post" }); }
});

router.put("/:id", authenticate, adminOnly, async (req, res) => {
  try {
    const postId = req.params.id;
    const status = req.body.status;
    if (!["approve", "noneApprove", "pending"].includes(status)) return res.status(400).json({ message: "Invalid status" });

    // Record the first approval; subsequent moderation keeps its original time.
    if (status === "approve") {
      await prisma.post.updateMany({
        where: { id: postId, approvedAt: null },
        data: { status, approvedAt: new Date() },
      });
    }

    await prisma.post.update({
      where: {
        id: postId,
      },
      data: {
        status: status,
      },
    });

    res.status(200).json({ message: "Post status updated successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to update post status" });
  }
});







router.put("/end-exchange/:id/:userId", authenticate, ownParam("userId"), async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.params.userId;

    // Check if the user is authorized to end the exchange
    const post = await prisma.post.findUnique({
      where: {
        id: postId,
      },
      select: {
        userId: true,
      },
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (post.userId !== userId) {
      return res
        .status(403)
        .json({ error: "Unauthorized to end the exchange for this post" });
    }

    await prisma.post.update({
      where: {
        id: postId,
      },
      data: {
        exchangeEnded: true,
      },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to end the exchange" });
  }
});



export default router;
