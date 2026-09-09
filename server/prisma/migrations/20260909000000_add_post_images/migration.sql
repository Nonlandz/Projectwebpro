CREATE TABLE "PostImage" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "imagePath" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PostImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PostImage_postId_createdAt_idx" ON "PostImage"("postId", "createdAt");

ALTER TABLE "PostImage"
  ADD CONSTRAINT "PostImage_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
