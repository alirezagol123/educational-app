// Simple test endpoint for Vercel serverless function
export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    res.status(200).json({ 
      message: 'Serverless function is working!',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url
    });
  } catch (error) {
    console.error('❌ Error in test function:', error);
    res.status(500).json({
      success: false,
      error: 'Test function failed',
      details: error.message
    });
  }
}
