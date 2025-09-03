module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  res.json({
    message: 'Hello from Vercel!',
    timestamp: new Date().toISOString(),
    working: true,
    nodeVersion: process.version,
    hasDatabase: !!process.env.DATABASE_URL
  });
}