// Blog posts API endpoint
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    if (process.env.DATABASE_URL) {
      try {
        const { Pool, neonConfig } = await import('@neondatabase/serverless');
        const ws = await import('ws');
        neonConfig.webSocketConstructor = ws.default;
        
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const result = await pool.query(
          'SELECT * FROM blog_posts WHERE published = true ORDER BY created_at DESC LIMIT 20'
        );
        await pool.end();
        
        return res.json(result.rows);
      } catch (dbError) {
        console.error('Database query error:', dbError);
      }
    }
    
    // Return sample blog post if no database
    res.json([
      {
        id: 'welcome-post',
        title: 'Welcome to OfficeXpress',
        slug: 'welcome-to-officexpress',
        excerpt: 'Your trusted transportation partner in Bangladesh',
        content: 'We provide comprehensive corporate transportation services...',
        published: true,
        createdAt: new Date().toISOString()
      }
    ]);
    
  } catch (error) {
    console.error('Blog API Error:', error);
    res.json([]);
  }
};