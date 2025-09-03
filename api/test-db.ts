export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Ultra-simple test
  res.json({
    message: 'Basic test working',
    timestamp: new Date().toISOString(),
    method: req.method,
    hasDatabase: !!process.env.DATABASE_URL
  });
}