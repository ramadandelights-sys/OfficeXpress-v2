// Vercel serverless function entry point
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Simple test endpoint first
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Simple API response for testing
    const path = req.url || '';
    
    if (path.includes('blog-posts')) {
      res.status(200).json([
        {
          id: "test-1",
          title: "Welcome to OfficeXpress",
          content: "Your transportation service is now live!",
          slug: "welcome-to-officexpress",
          createdAt: new Date().toISOString()
        }
      ]);
      return;
    }

    if (path.includes('portfolio-clients')) {
      res.status(200).json([]);
      return;
    }

    // Default response
    res.status(200).json({ 
      message: "OfficeXpress API is running",
      path,
      method: req.method,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}