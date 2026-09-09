// Read-only check of saved cloud paths, API redirects, and public image delivery.
import assert from "node:assert/strict";
import express from "express";
import { prisma } from "../src/db.js";
import posts from "../src/post.js";
import users from "../src/user.js";
import { publicImageUrl } from "../src/image-storage.js";

const app = express();
app.use("/api/posts", posts);
app.use("/api/user", users);
const server = app.listen(0, "127.0.0.1");
await new Promise(resolve => server.once("listening", resolve));
try {
  const postImages = await prisma.post.findMany({ where: { imagePath: { not: null } }, select: { id: true, imagePath: true } });
  const avatars = await prisma.userInfo.findMany({ where: { profileImagePath: { not: null } }, select: { userId: true, profileImagePath: true } });
  const images = [
    ...postImages.map(row => ({ route: `/api/posts/${row.id}/image`, path: row.imagePath })),
    ...avatars.map(row => ({ route: `/api/user/${row.userId}/profile-image`, path: row.profileImagePath })),
  ];
  assert.ok(images.length, "No cloud image references found");
  for (const image of images) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${image.route}`, { redirect: "manual", signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 302, "API must redirect to the cloud image");
    assert.equal(response.headers.get("location"), publicImageUrl(image.path));
    const cloud = await fetch(response.headers.get("location"), { signal: AbortSignal.timeout(30000) });
    assert.equal(cloud.status, 200, "Cloud image must be publicly readable");
    assert.match(cloud.headers.get("content-type"), /^image\/(jpeg|png|webp)/);
    assert.ok((await cloud.arrayBuffer()).byteLength > 0, "Image must not be empty");
  }
  console.log(`Verified ${postImages.length} post images and ${avatars.length} avatars: database paths, API redirects, and public cloud downloads passed.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await prisma.$disconnect();
}
