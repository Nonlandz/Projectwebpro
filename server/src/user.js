import express from "express";
import { prisma } from "./db.js";
import { authenticate, adminOnly, ownParam, optionalAuthenticate } from "./middleware/auth.js";
import { publicUser, pageArgs, deletePost } from "./shared.js";

const router = express.Router();
import bcypt from "bcryptjs";
import { issueReset, consumeReset, deliverReset, resetRateLimit, resetEmailConfigured } from "./password-reset.js";
import jwt from "jsonwebtoken";  //token
import { object, string, number, date } from "yup";
import { uploadImage as uploadProfileImage, storeImage, publicImageUrl, legacyImage, cleanupImage } from "./image-storage.js";


const findEmail = async (email) => {
  return await prisma.user.findUnique({
    where: {
      email: email,
    },
    include: {
      UserInfo: true,
    },
  });
};

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    // validating ใช้yup
    let userSchema = object({
      email: string().email().required(),
      password: string().required(),
    });

    await userSchema.validate(req.body);

    // check email in database
    const checkEmail = await findEmail(email);

    if (checkEmail) {
      throw new Error("this email already exits");
    }

    const hash = await bcypt.hash(password, 10);

    const createUser = await prisma.user.create({    //สร้างuser
      data: {   
        email: email,
        password: hash,
      },
    });

    await prisma.userInfo.create({      //สร้าง userinfo
      data: {
        userId: createUser.id,
      },
    });

    delete createUser.password;

    const accessToken = jwt.sign({ id: createUser.id, sessionVersion: createUser.sessionVersion }, process.env.TOKEN, {
      expiresIn: "2h", //สร้างtoken
    });

    res.json({ accessToken: accessToken, user: createUser });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // validating
    let userSchema = object({
      email: string().email().required(),
      password: string().required(),
    });

    await userSchema.validate(req.body);

    const checkEmail = await findEmail(email);

    if (!checkEmail) {
      throw new Error("this email not have in database");
    }

    const checkPassword = await bcypt.compare(password, checkEmail.password);

    if (!checkPassword) {
      throw new Error("password is not match");
    }

    delete checkEmail.password;

    const accessToken = jwt.sign({ id: checkEmail.id, sessionVersion: checkEmail.sessionVersion }, process.env.TOKEN, {
      expiresIn: "2h",
    });

    res.json({ accessToken: accessToken, user: checkEmail });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

//get post
router.get("/posts/:id", authenticate, ownParam("id"), async (req, res) => {
  try {
    const posts = await prisma.user.findMany({
      where: {
        id: req.params.id,
      },
      select: { id: true, Post: { orderBy: { createdAt: "desc" }, ...pageArgs(req.query) } },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error });
  }
});

//ลบโพส
router.delete("/posts/:postId", authenticate, async (req, res) => {
  try { await deletePost(prisma, req.params.postId, req.user); res.sendStatus(204); }
  catch (error) { res.status(error.status || 500).json({ message: error.status ? error.message : "Failed to delete post" }); }
});

//get fav
router.get("/fav/:id", authenticate, ownParam("id"), async (req, res) => {
  try {
    const post = await prisma.postFav.findMany({
      where: {
        userId: req.params.id,
        Post: { status: "approve" },
      },
      include: {
        Post: {
          include: {
            Tag: true,
            UserFav: true,
            Comment: true,
            User: {
              select: {
                UserInfo: publicUser.UserInfo,
              },
            },
          },
        },
      },
    });
    res.json(post);
  } catch (error) {
    console.log(error);
  }
});


//update userinfo
router.put("/userinfo", authenticate, async (req, res) => {
  try {
    const { username, firstName, lastName, phone, address } = req.body;
    const userId = req.user.id;

    let userInfoSchema = object({
      userId: string().required(),
      username: string().required(),
      firstName: string(),
      lastName: string(),
      phone: string(),   //use yup validate
      address: string(),
    });

    await userInfoSchema.validate(req.body);

    const updateUserInfo = await prisma.userInfo.update({
      where: {
        userId: userId,
      },
      data: {
        username: username,
        firstName: firstName,
        lastName: lastName,
        phone: phone,
        address: address,
        updatedAt: new Date(),
      },
    });

    res.json(updateUserInfo);
  } catch (error) {
    if (error.code === "P2002") {    //check เบอร์ กับ username
      let field = error.meta.target.includes("phone") ? "phone" : "username";
      res.status(409).json({ message: `${field} already exists` }); // Sending the error to frontend
    } else {
      // Handle other types of errors
      res.status(500).json({ message: "An unexpected error occurred" });
    }
  }
});

router.post("/:userId/profile-image", authenticate, ownParam("userId"), uploadProfileImage.single("image"), async (req, res) => {
  try {
    const { userId } = req.params;

    if (!req.file) {
      return res.status(400).json({ message: "An image file is required" });
    }

    // The client provides its current user id as with the existing post image endpoint.
    if (req.body.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized to upload this profile image" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const profileImageUrl = `/api/user/${userId}/profile-image`;
    const profileImagePath = await storeImage("users", userId, req.file);
    let previous;
    try {
      previous = await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM "UserInfo" WHERE "userId" = ${userId} FOR UPDATE`;
        const current = await tx.userInfo.findUnique({ where: { userId } });
        await tx.userInfo.update({ where: { userId }, data: { profileImageUrl, profileImagePath } });
        return current.profileImagePath;
      });
    } catch (error) { await cleanupImage(profileImagePath); throw error; }
    await cleanupImage(previous);
    res.status(201).json({ profileImageUrl });
  } catch (error) {
    console.log(error);
    res.status(error.status || 500).json({ message: error.status ? error.message : "Failed to upload profile image" });
  }
});

router.get("/:userId/profile-image", async (req, res) => {
  try {
    const info = await prisma.userInfo.findUnique({ where: { userId: req.params.userId } });
    if (!info) return res.status(404).end();
    res.set("Cache-Control", "no-store");
    if (info.profileImagePath) return res.redirect(302, publicImageUrl(info.profileImagePath));
    const filename = await legacyImage("users", req.params.userId);
    if (!filename) return res.status(404).end();
    res.sendFile(filename);
  } catch (error) {
    res.status(404).end();
  }
});

//ลืมรหัสผ่าน
router.post("/forgotpassword", resetRateLimit, async (req, res) => {
  if (!resetEmailConfigured()) return res.status(503).json({ message: "Password reset email is not configured. Contact the administrator." });
  try {
    const email = await string().email().required().validate(req.body.email);
    await issueReset(prisma, email, deliverReset);
  } catch { /* Do not reveal whether an account exists or expose reset tokens. */ }
  res.json({ message: "If an account exists, a password reset link will be emailed to you." });
});
router.post("/resetpassword", resetRateLimit, async (req, res) => {
  try { await consumeReset(prisma, req.body.token, req.body.password); res.json({ message: "Password updated. Please sign in again." }); }
  catch (error) { res.status(400).json({ message: error.message }); }
});

router.get("/profile/:userId", optionalAuthenticate, async (req, res) => {
  
  try {
    
    const { userId } = req.params;

    const canViewAllDetails = req.user?.role === "admin";
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        ...publicUser,
        ...(canViewAllDetails ? { email: true, role: true, createdAt: true } : {}),
        UserInfo: { select: {
          ...publicUser.UserInfo.select,
          phone: true,
          ...(canViewAllDetails ? { username: true, address: true, createdAt: true, updatedAt: true } : {}),
        } },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.set("Cache-Control", "private, no-store");
    res.json({ ...user, canViewAllDetails });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});




export default router;
