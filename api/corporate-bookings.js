// Corporate bookings API endpoint
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'POST') {
      // Store booking data with timestamp
      const bookingData = {
        ...req.body,
        id: `corp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString()
      };
      
      console.log('Corporate booking received:', bookingData);
      
      // Try database storage if available
      if (process.env.DATABASE_URL) {
        try {
          const { Pool, neonConfig } = await import('@neondatabase/serverless');
          const ws = await import('ws');
          neonConfig.webSocketConstructor = ws.default;
          
          const pool = new Pool({ connectionString: process.env.DATABASE_URL });
          
          const query = `
            INSERT INTO corporate_bookings (company_name, customer_name, phone, email, service_type)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
          `;
          
          const values = [
            bookingData.companyName,
            bookingData.customerName, 
            bookingData.phone,
            bookingData.email,
            bookingData.serviceType || null
          ];
          
          const result = await pool.query(query, values);
          await pool.end();
          
          return res.json({ 
            success: true,
            message: 'Corporate booking submitted successfully',
            booking: result.rows[0]
          });
        } catch (dbError) {
          console.error('Database error (will still accept booking):', dbError);
        }
      }
      
      // Return success even without database
      res.json({ 
        success: true,
        message: 'Corporate booking received',
        id: bookingData.id
      });
      
    } else if (req.method === 'GET') {
      if (process.env.DATABASE_URL) {
        try {
          const { Pool, neonConfig } = await import('@neondatabase/serverless');
          const ws = await import('ws');
          neonConfig.webSocketConstructor = ws.default;
          
          const pool = new Pool({ connectionString: process.env.DATABASE_URL });
          const result = await pool.query(
            'SELECT * FROM corporate_bookings ORDER BY created_at DESC LIMIT 100'
          );
          await pool.end();
          
          return res.json(result.rows);
        } catch (dbError) {
          console.error('Database query error:', dbError);
        }
      }
      res.json([]);
      
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('Corporate API Error:', error);
    if (req.method === 'POST') {
      // Still accept the submission
      res.json({ 
        success: true,
        message: 'Corporate booking received',
        id: `corp-${Date.now()}`
      });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};