// Vercel serverless function entry point
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
    const path = req.url || '';
    const method = req.method || 'GET';

    // Simple test for form submissions
    if (path === '/api/corporate-bookings' && method === 'POST') {
      res.json({ 
        success: true, 
        message: "Corporate booking received",
        data: req.body,
        id: `corp-${Date.now()}`
      });
      return;
    }

    if (path === '/api/rental-bookings' && method === 'POST') {
      res.json({ 
        success: true, 
        message: "Rental booking received",
        data: req.body,
        id: `rental-${Date.now()}`
      });
      return;
    }

    if (path === '/api/vendor-registrations' && method === 'POST') {
      res.json({ 
        success: true, 
        message: "Vendor registration received",
        data: req.body,
        id: `vendor-${Date.now()}`
      });
      return;
    }

    if (path === '/api/contact-messages' && method === 'POST') {
      res.json({ 
        success: true, 
        message: "Contact message received",
        data: req.body,
        id: `contact-${Date.now()}`
      });
      return;
    }

    // Simple GET responses
    if (path === '/api/blog-posts') {
      res.json([
        {
          id: "test-post",
          title: "Welcome to OfficeXpress",
          content: "Your transportation service is now live!",
          slug: "welcome-to-officexpress",
          published: true,
          createdAt: new Date().toISOString()
        }
      ]);
      return;
    }

    if (path === '/api/portfolio-clients') {
      res.json([]);
      return;
    }

    // Admin routes return empty arrays for now
    if (path.startsWith('/api/admin/')) {
      res.json([]);
      return;
    }

    // Default response
    res.status(200).json({ 
      message: "OfficeXpress API is working",
      path,
      method,
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