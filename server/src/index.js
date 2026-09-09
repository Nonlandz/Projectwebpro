import app from "./app.js";

// Vercel detects this default export and serves the whole Express application
// as one function. The local listener is kept for `pnpm dev`.
export default app;

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 8081;
  app.listen(PORT, () => {
    console.log(`server is runing on port http://localhost:${PORT}`);
  });
}
