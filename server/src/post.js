import express from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const router = express.Router();

router.get("/", async (req, res) => {  //ดึงโพสต์มาแสดงหน้าMain
  try {
    const posts = await prisma.post.findMany({
      include: {
        User: {
          select: {
            id: true,
            UserInfo: true,
          },
        },
        Tag: true,
        Comment: {
          include:{
            author: {
              select: {
                id: true,
                UserInfo: true,
              },
            },
          }
        },
        UserFav: true,

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

router.post("/", async (req, res) => {   //เก็บค่าตอนโพสต์
  try {
    const post = await prisma.post.create({
      data: {
        title: req.body.title,
        detail: req.body.detail,
        userId: req.body.userId,
        tagId: req.body.tagId,
      },
    });
    res.json(post);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error });
  }
});

router.get("/fav", async (req, res) => {  //ดึงค่าfav
  try {
    const fav = await prisma.postFav.findMany({
      where: {
        AND:[
          {userId: req.body.userId},
          {postId: req.body.postId}
        ]
      },
      include: {
        Post: {
          include: {
            User: {
              select: {
                id: true,
                UserInfo: true,
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


router.get("/fav/user/:userId", async (req, res) => {   //ดึงค่าfav แต่ละ user
  try {
    const userId = req.params.userId;

    const favPosts = await prisma.postFav.findMany({
      where: {
        userId: userId,
      },
      include: {
        Post: {
          include: {
            User: {
              select: {
                id: true,
                UserInfo: true,
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




router.post("/fav", async (req, res) => { //เวลากดlike จะไปเพิ่มตารางfav
  try {
    const fav = await prisma.postFav.create({
      data: {
        userId: req.body.userId,
        postId: req.body.postId,
      },
    });
    res.json(fav);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error });
  }
});

router.delete("/fav/:id", async (req, res) => { //ลบค่าfav
  try {
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



router.delete("/:id/:userId", async (req, res) => { //ลบโพสต์
  try {
    const postId = req.params.id;
    const userId = req.params.userId;

    // Check if the user is authorized to delete the post
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
        .json({ error: "Unauthorized to delete this post" });
    }

    // Delete all comments associated with the post
    await prisma.comment.deleteMany({
      where: {
        postId: postId,
      },
    });

    // Delete the post
    await prisma.post.delete({
      where: {
        id: postId,
      },
    });

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to delete post" });
  }
});



router.put("/:id", async (req, res) => {  //admin update post
  try {
    const postId = req.params.id;
    const status = req.body.status;

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







router.put("/end-exchange/:id/:userId", async (req, res) => { //เปลี่ยนสถานะโพสต์ว่าแลกเปลี่ยนแล้ว
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