// Simple test endpoint to verify Vercel functions are working
module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  res.json({
    success: true,
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    method: req.method,
    hasDatabase: !!process.env.DATABASE_URL,
    nodeVersion: process.version
  });
};