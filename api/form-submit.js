// Ultra-simple form handler without any dependencies
module.exports = async (req, res) => {
  // Basic CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Log the submission (Vercel automatically logs this)
    console.log('Form submission received:', {
      timestamp: new Date().toISOString(),
      body: req.body,
      path: req.url
    });
    
    // Return success immediately
    res.status(200).json({
      success: true,
      message: 'Form submitted successfully',
      id: `submission-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Form submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Submission failed',
      message: error.message
    });
  }
};