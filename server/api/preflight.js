// Vercel can stop OPTIONS requests before the Express catch-all function.
// This small function answers browser CORS preflight requests at the route level.
export default function preflight(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.status(204).end();
}
