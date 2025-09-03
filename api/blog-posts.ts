import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      // Return sample blog posts
      res.json([
        {
          id: "welcome-post",
          title: "Welcome to OfficeXpress Transportation Services",
          content: "We are excited to launch our new transportation platform serving businesses across Bangladesh...",
          slug: "welcome-to-officexpress",
          excerpt: "We are excited to launch our new transportation platform serving businesses across Bangladesh.",
          published: true,
          createdAt: new Date().toISOString(),
          category: "Company News",
          author: "OfficeXpress Team"
        }
      ]);
      return;
    }

    res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}