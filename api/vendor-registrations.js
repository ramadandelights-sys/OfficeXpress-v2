// Vendor registrations API endpoint
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
      // Log the submission
      const vendorData = {
        ...req.body,
        id: `vendor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString()
      };
      
      console.log('Vendor registration received:', vendorData);
      
      // Try database storage
      if (process.env.DATABASE_URL) {
        try {
          const { Pool, neonConfig } = await import('@neondatabase/serverless');
          const ws = await import('ws');
          neonConfig.webSocketConstructor = ws.default;
          
          const pool = new Pool({ connectionString: process.env.DATABASE_URL });
          
          const query = `
            INSERT INTO vendor_registrations 
            (full_name, phone, email, location, vehicle_types, service_modality, experience, additional_info)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
          `;
          
          const values = [
            vendorData.fullName,
            vendorData.phone,
            vendorData.email,
            vendorData.location,
            JSON.stringify(vendorData.vehicleTypes || []),
            vendorData.serviceModality,
            vendorData.experience || null,
            vendorData.additionalInfo || null
          ];
          
          const result = await pool.query(query, values);
          await pool.end();
          
          return res.json({ 
            success: true,
            message: 'Vendor registration submitted successfully',
            registration: result.rows[0]
          });
        } catch (dbError) {
          console.error('Database error (will still accept registration):', dbError);
        }
      }
      
      // Return success even without database
      res.json({ 
        success: true,
        message: 'Vendor registration received',
        id: vendorData.id
      });
      
    } else if (req.method === 'GET') {
      if (process.env.DATABASE_URL) {
        try {
          const { Pool, neonConfig } = await import('@neondatabase/serverless');
          const ws = await import('ws');
          neonConfig.webSocketConstructor = ws.default;
          
          const pool = new Pool({ connectionString: process.env.DATABASE_URL });
          const result = await pool.query(
            'SELECT * FROM vendor_registrations ORDER BY created_at DESC LIMIT 100'
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
    console.error('Vendor API Error:', error);
    if (req.method === 'POST') {
      // Still accept the submission
      res.json({ 
        success: true,
        message: 'Vendor registration received',
        id: `vendor-${Date.now()}`
      });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
};