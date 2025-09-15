// Vercel serverless function for /api/threads
export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method === 'POST') {
    try {
      console.log('🔍 POST /api/threads - Request received');
      console.log('🔍 Request body:', JSON.stringify(req.body, null, 2));
      
      const { user_id, title, summary, type = 'chat', thread_id, created_at, updated_at, subject, grade, field, chapter, book, messages } = req.body;
      
      if (!user_id || !title) {
        console.log('❌ Missing required fields: user_id or title');
        return res.status(400).json({ 
          success: false, 
          error: 'User ID and title are required' 
        });
      }
      
      console.log('🔍 Creating thread with type:', type);
      console.log('🔍 Thread data:', { user_id, title, type, thread_id, subject, grade, field, chapter, book });
      
      // Generate a simple thread ID
      const threadId = `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      res.status(200).json({ 
        success: true, 
        thread: {
          id: threadId,
          user_id: user_id,
          title: title,
          summary: summary || '',
          type: type,
          created_at: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('❌ Error creating thread:', error);
      console.error('❌ Error stack:', error.stack);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create thread',
        details: error.message
      });
    }
  } else if (req.method === 'GET') {
    try {
      console.log('🔍 GET /api/threads - Request received');
      
      // Return empty array for now
      res.status(200).json({
        success: true,
        threads: []
      });
      
    } catch (error) {
      console.error('❌ Error getting threads:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get threads',
        details: error.message
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
