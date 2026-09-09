ALTER TABLE "Message" ADD COLUMN "postId" TEXT;

CREATE INDEX "Message_postId_idx" ON "Message"("postId");

ALTER TABLE "Message"
  ADD CONSTRAINT "Message_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
