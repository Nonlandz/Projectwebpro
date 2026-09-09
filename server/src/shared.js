export const publicUser = { id: true, UserInfo: { select: { firstName: true, lastName: true, profileImageUrl: true } } };
export const pageArgs = (query) => ({ take: Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20)), skip: Math.max(0, Number.parseInt(query.offset, 10) || 0) });
export async function deletePost(db, id, user) {
  const imagePaths = await db.$transaction(async (tx) => {
    const post = await tx.post.findUnique({ where: { id } });
    if (!post) throw Object.assign(new Error("Post not found"), { status: 404 });
    if (post.userId !== user.id && user.role !== "admin") throw Object.assign(new Error("Access denied"), { status: 403 });
    await tx.postFav.deleteMany({ where: { postId: id } });
    await tx.comment.deleteMany({ where: { postId: id } });
    const images = tx.postImage ? await tx.postImage.findMany({ where: { postId: id }, select: { imagePath: true } }) : [];
    if (tx.postImage) await tx.postImage.deleteMany({ where: { postId: id } });
    await tx.post.delete({ where: { id } });
    return [post.imagePath, ...images.map(image => image.imagePath)].filter(Boolean);
  });
  if (imagePaths.length) {
    const { cleanupImage } = await import("./image-storage.js");
    await Promise.all(imagePaths.map(cleanupImage));
  }
}
