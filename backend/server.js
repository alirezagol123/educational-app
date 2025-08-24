const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const path = require('path');
const { spawn } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

// Verify environment variables are loaded
console.log('🔍 Environment Check:');
console.log('API_BASE_URL:', process.env.API_BASE_URL);
console.log('API_MODEL:', process.env.API_MODEL);
console.log('API_KEY:', process.env.API_KEY ? 'Loaded' : 'Missing');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://fonts.googleapis.com"],
      styleSrcElem: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https:", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://ai.liara.ir"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  }
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// In-memory conversation storage (sliding window)
const conversations = new Map();
const MAX_CONVERSATION_LENGTH = 10; // Keep last 10 messages

// Sliding window conversation manager
class ConversationManager {
  constructor() {
    this.conversations = new Map();
  }

  addMessage(conversationId, message) {
    if (!this.conversations.has(conversationId)) {
      this.conversations.set(conversationId, []);
    }

    const conversation = this.conversations.get(conversationId);
    conversation.push(message);

    // Implement sliding window - keep only last MAX_CONVERSATION_LENGTH messages
    if (conversation.length > MAX_CONVERSATION_LENGTH) {
      conversation.splice(0, conversation.length - MAX_CONVERSATION_LENGTH);
    }

    this.conversations.set(conversationId, conversation);
  }

  getConversation(conversationId) {
    return this.conversations.get(conversationId) || [];
  }

  clearConversation(conversationId) {
    this.conversations.delete(conversationId);
  }

  getConversationContext(conversationId) {
    const conversation = this.getConversation(conversationId);
    return conversation.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }
}

const conversationManager = new ConversationManager();

// SymPy rendering function - COMPLETELY REMOVED for deployment
// async function renderLatexWithSymPy(text) {
//     SymPy completely disabled for deployment
//     console.log('🚫 SymPy rendering completely disabled for deployment');
//     return text; // Return original text without processing
// }

// SymPy rendering endpoint - COMPLETELY REMOVED for deployment
// app.post('/api/render-latex', async (req, res) => {
//     SymPy endpoint removed for deployment
// });

// Chat API endpoint
app.post('/api/chat/message', async (req, res) => {
  try {
    const { message, conversationId = 'default' } = req.body;
    
    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Add user message to conversation history
    conversationManager.addMessage(conversationId, {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });

    // Get conversation context for AI
    const conversationContext = conversationManager.getConversationContext(conversationId);

    // Prepare messages for AI API
    const messages = [
      {
        role: 'system',
        content: `You are an expert AI tutor for high school students in Iran. Teach in Farsi. Use deep but concise Socratic teaching. Guide students step by step like an interactive Study Mode coach.

• Use the Socratic method. Ask frequent, targeted questions instead of long lectures. Lead the student to discover answers. Break problems into small, solvable steps.
• Keep each explanation short, clear, and focused (3–6 sentences). Avoid long text blocks. Alternate between mini-explanation and question.
• Engage the student. After each concept, ask a quick question or give a simple task. Adjust difficulty based on their answers.
• Give feedback. Correct answers → short encouragement like “آفرین 👏” or “درسته”. Wrong or “I don’t know” → short supportive explanation plus one guiding question.
• Always give concrete, relatable examples. Move from simple to harder, including exam-style questions.
• Tone: friendly, motivating, precise. Teach by conversation, not lecture.

Rules:
• Always respond in Farsi.
• Do not write long paragraphs. Keep interaction alive.
• Never move on until the student shows understanding.`
       },

             {
         role: 'system',
         content: `You are an expert AI tutor for high school students in Iran. Teach in Farsi. Use deep but concise Socratic teaching. Guide students step by step like an interactive Study Mode coach.

• Use the Socratic method. Ask frequent, targeted questions instead of long lectures. Lead the student to discover answers. Break problems into small, solvable steps.
• Keep each explanation short, clear, and focused (3–6 sentences). Avoid long text blocks. Alternate between mini-explanation and question.
• Engage the student. After each concept, ask a quick question or give a simple task. Adjust difficulty based on their answers.
• Give feedback. Correct answers → short encouragement like “آفرین 👏” or “درسته”. Wrong or “I don’t know” → short supportive explanation plus one guiding question.
• Always give concrete, relatable examples. Move from simple to harder, including exam-style questions.
• Tone: friendly, motivating, precise. Teach by conversation, not lecture.

Rules:
• Always respond in Farsi.
• Do not write long paragraphs. Keep interaction alive.
• Never move on until the student shows understanding.`
       },
      ...conversationContext
    ];

    // Call AI API
    const aiResponse = await callAIAPI(messages);
    
    // Add AI response to conversation history
    conversationManager.addMessage(conversationId, {
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString()
    });

    res.json({
      response: aiResponse,
      conversationId,
      messageCount: conversationManager.getConversation(conversationId).length
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// Streaming chat endpoint
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { message, conversationId = 'default' } = req.body;
    
    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Set headers for streaming
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Add user message to conversation history
    conversationManager.addMessage(conversationId, {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });

    // Get conversation context
    const conversationContext = conversationManager.getConversationContext(conversationId);

    // Prepare messages for AI API
    const messages = [
      {
        role: 'system',
                   content:`You are an expert AI tutor for high school students in Iran. Teach in Farsi. Use deep but concise Socratic teaching. Guide students step by step like an interactive Study Mode coach.

• Use the Socratic method. Ask frequent, targeted questions instead of long lectures. Lead the student to discover answers. Break problems into small, solvable steps.
• Keep each explanation short, clear, and focused (3–6 sentences). Avoid long text blocks. Alternate between mini-explanation and question.
• Engage the student. After each concept, ask a quick question or give a simple task. Adjust difficulty based on their answers.
• Give feedback. Correct answers → short encouragement like “آفرین 👏” or “درسته”. Wrong or “I don’t know” → short supportive explanation plus one guiding question.
• Always give concrete, relatable examples. Move from simple to harder, including exam-style questions.
• Tone: friendly, motivating, precise. Teach by conversation, not lecture.

Rules:
• Always respond in Farsi.
• Do not write long paragraphs. Keep interaction alive.
• Never move on until the student shows understanding.`
       },
       {
         role: 'system',
         content: `You are an expert AI tutor for high school students in Iran. Teach in Farsi. Use deep but concise Socratic teaching. Guide students step by step like an interactive Study Mode coach.

• Use the Socratic method. Ask frequent, targeted questions instead of long lectures. Lead the student to discover answers. Break problems into small, solvable steps.
• Keep each explanation short, clear, and focused (3–6 sentences). Avoid long text blocks. Alternate between mini-explanation and question.
• Engage the student. After each concept, ask a quick question or give a simple task. Adjust difficulty based on their answers.
• Give feedback. Correct answers → short encouragement like “آفرین 👏” or “درسته”. Wrong or “I don’t know” → short supportive explanation plus one guiding question.
• Always give concrete, relatable examples. Move from simple to harder, including exam-style questions.
• Tone: friendly, motivating, precise. Teach by conversation, not lecture.

Rules:
• Always respond in Farsi.
• Do not write long paragraphs. Keep interaction alive.
• Never move on until the student shows understanding.`
       },
       ...conversationContext
     ];

    // Stream AI response
    await streamAIResponse(messages, res, conversationId);

  } catch (error) {
    console.error('Streaming Chat API Error:', error);
    res.write(`data: [ERROR] ${JSON.stringify({ error: 'Failed to process chat message' })}\n\n`);
    res.end();
  }
});

// Get conversation history
app.get('/api/chat/history/:conversationId', (req, res) => {
  const { conversationId } = req.params;
  const conversation = conversationManager.getConversation(conversationId);
  
  res.json({
    conversationId,
    messages: conversation,
    messageCount: conversation.length
  });
});

// Clear conversation
app.delete('/api/chat/clear/:conversationId', (req, res) => {
  const { conversationId } = req.params;
  conversationManager.clearConversation(conversationId);
  
  res.json({
    message: 'Conversation cleared successfully',
    conversationId
  });
});

// Start new conversation
app.post('/api/chat/start', (req, res) => {
  const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  res.json({
    conversationId,
    message: 'New conversation started'
  });
});

// Question analysis endpoint
app.post('/api/chat/analysis', async (req, res) => {
  try {
    const { question, options, correctAnswer, userAnswer, subject, grade, chapter } = req.body;
    
    if (!question || !options || !correctAnswer || !userAnswer) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create analysis prompt
    const analysisPrompt = `You are acting as a professional high school exam tutor and test-prep coach for competitive exams such as Konkoor.  
Your task is to analyze each multiple-choice question after the student selects an answer.  

The response must always be written in Persian and follow this exact structured format:

1. ✅/❌ Was the student's answer correct? (State the correct option clearly)  
2. 📝 Step-by-step solution (include explanations between steps, not just formulas)  
3. ⚡ Faster method or test-taking shortcut (if available)  
4. ❗ The most common mistake or the likely reason why the student chose the wrong answer  
5. 🎯 Key takeaway or golden tip for quick recall in the future  

RESPONSE FORMAT RULES
• Use bullet points (•) for unordered information.  
• Use numbered lists (1., 2., 3.) for steps, sequences, or priorities.  
• Use nested indentation for sub-points.  
• Use bold text for key terms or headings.
• Use italic text for emphasis.
• Never provide unformatted paragraphs — always use list structures.  
• Keep responses concise and scannable.

Make sure your explanation is clear, concise, and highly practical for exam preparation.  
Do not skip any of the above sections.

Question: ${question}

Options:
${options.map((opt, index) => `${String.fromCharCode(65 + index)}. ${opt}`).join('\n')}

Correct Answer: ${correctAnswer}
Student's Answer: ${userAnswer}

Subject: ${subject}
Grade: ${grade}
Chapter: ${chapter}

Now provide your analysis following the exact format above.`;

    // Call AI API for analysis
    const analysis = await callAIAPI([{
      role: 'user',
      content: analysisPrompt
    }]);
    
    res.json({
      analysis: analysis,
      question: question,
      correctAnswer: correctAnswer,
      userAnswer: userAnswer
    });
    
  } catch (error) {
    console.error('Analysis API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Streaming question analysis endpoint
app.post('/api/chat/analysis/stream', async (req, res) => {
  try {
    const { question, options, correctAnswer, userAnswer, subject, grade, chapter } = req.body;
    
    if (!question || !options || !correctAnswer || !userAnswer) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

         // Create analysis prompt
     const analysisPrompt = `You are a professional high school exam tutor and competitive test-prep coach (e.g., Konkoor).  
Your job is to analyze each multiple-choice question AFTER the student selects an answer.  

⚠️ STRICT RULES:  
- Response must always be in Persian (Farsi).  
- Follow the structure below exactly.  
- After completing the analysis, add exactly 3 clickable questions. DO NOT include the markers [QUESTION_START] or [QUESTION_END] in your response.

---

### RESPONSE STRUCTURE:

1. ✅/❌ آیا پاسخ دانش‌آموز درست بوده؟ (گزینه صحیح را واضح بیان کن)  
2. 📝 راه‌حل گام‌به‌گام (با توضیحات بین مراحل)  
3. ⚡️ روش سریع‌تر یا تکنیک تستی (اگر وجود دارد)  
4. ❗️ رایج‌ترین اشتباه یا دلیل احتمالی انتخاب گزینه غلط  
5. 🎯 نکته طلایی یا کلید یادآوری سریع  

Question: ${question}

Options:
${options.map((opt, index) => `${String.fromCharCode(65 + index)}. ${opt}`).join('\n')}

Correct Answer: ${correctAnswer}
Student's Answer: ${userAnswer}

Subject: ${subject}
Grade: ${grade}
Chapter: ${chapter}

Now provide your analysis following the exact format above.`;

    // Set headers for streaming
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Stream AI response for analysis
    await streamAIResponse([{
      role: 'user',
      content: analysisPrompt
    }], res, 'analysis');

  } catch (error) {
    console.error('Streaming Analysis API Error:', error);
    if (!res.writableEnded) {
      res.write(`data: [ERROR] ${JSON.stringify({ error: 'Failed to process analysis request' })}\n\n`);
      res.end();
    }
  }
});

// Result evaluation endpoint
app.post('/api/chat/result-evaluation', async (req, res) => {
  try {
    const { question, options, userAnswer, subject, grade, chapter } = req.body;
    
    if (!question || !options || !userAnswer) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create evaluation prompt
    const evaluationPrompt = `You're acting as a professional high school exam tutor in Iran. Your task is to evaluate the following multiple-choice question and tell whether the student's answer is correct or not. Do not provide an explanation yet. Instead, ask the student if they want a detailed analysis.

IMPORTANT: You must respond in Persian (Farsi) language only.

Question:
${question}

Choices:
${options.map((opt, index) => `${String.fromCharCode(65 + index)}) ${opt}`).join('\n')}

Student's answer: ${userAnswer}  

Please follow this structure in your response:

1. پاسخ صحیح: [A/B/C/D]  
2. پاسخ دانش‌آموز: صحیح / غلط  
3. سوال پیگیری:  
   _"آیا می‌خواهید این سوال را مرحله به مرحله تحلیل کنیم؟"_`;

    // Call AI API for evaluation
    const evaluation = await callAIAPI([{
      role: 'user',
      content: evaluationPrompt
    }]);
    
    res.json({
      content: evaluation,
      question: question,
      userAnswer: userAnswer,
      subject: subject,
      grade: grade,
      chapter: chapter
    });
    
  } catch (error) {
    console.error('Result Evaluation API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AI API call function
async function callAIAPI(messages) {
  try {
    if (!process.env.API_BASE_URL) {
      throw new Error('API_BASE_URL environment variable is not set');
    }
    
    const response = await axios.post(`${process.env.API_BASE_URL}/chat/completions`, {
      model: process.env.API_MODEL,
      messages: messages,
      max_tokens: 2024,
      temperature: 0.3,
      stream: false
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('AI API Error:', error.response?.data || error.message);
    throw new Error('Failed to get AI response');
  }
}

// Streaming AI response function
async function streamAIResponse(messages, res, conversationId) {
  try {
    if (!process.env.API_BASE_URL) {
      throw new Error('API_BASE_URL environment variable is not set');
    }
    
    const response = await axios.post(`${process.env.API_BASE_URL}/chat/completions`, {
      model: process.env.API_MODEL,
      messages: messages,
      max_tokens: 2024,
      temperature: 0.3,
      stream: true
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000,
      responseType: 'stream'
    });

    let fullResponse = '';

    response.data.on('data', async (chunk) => {
      const lines = chunk.toString().split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            // Add complete response to conversation history
            conversationManager.addMessage(conversationId, {
              role: 'assistant',
              content: fullResponse,
              timestamp: new Date().toISOString()
            });
            
            res.write(`data: [DONE]\n\n`);
            res.end();
            return;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
              const content = parsed.choices[0].delta.content;
              fullResponse += content;
              
              // Stream each character for typewriter effect
              res.write(`data: ${JSON.stringify({ content, type: 'chunk' })}\n\n`);
            }
          } catch (e) {
            // Ignore parsing errors for incomplete chunks
          }
        }
      }
    });

    response.data.on('end', () => {
      if (!res.writableEnded) {
        res.write(`data: [DONE]\n\n`);
        res.end();
      }
    });

    response.data.on('error', (error) => {
      console.error('Stream Error:', error);
      if (!res.writableEnded) {
        res.write(`data: [ERROR] ${JSON.stringify({ error: 'Stream error occurred' })}\n\n`);
        res.end();
      }
    });

  } catch (error) {
    console.error('Streaming AI API Error:', error);
    if (!res.writableEnded) {
      res.write(`data: [ERROR] ${JSON.stringify({ error: 'Failed to get AI response' })}\n\n`);
      res.end();
    }
  }
}

// New endpoint for responding to help questions (Streaming)
app.post('/api/chat/help-question/stream', async (req, res) => {
  const { question, subject, grade, chapter, originalAnalysis } = req.body;

  if (!question || !subject) {
    return res.status(400).json({ error: 'سوال و موضوع الزامی است' });
  }

  // Set headers for Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // System prompt for help question responses
  const helpQuestionPrompt = `You are a professional high school exam tutor and competitive test-prep coach (e.g., Konkoor). 

Your task is to provide a helpful, educational response to a student's follow-up question about a topic they just studied.

⚠️ STRICT RULES:
- Response must always be in Persian (Farsi)
- Keep your answer concise but comprehensive (2-3 paragraphs maximum)
- Focus on practical learning tips and clear explanations
- Use examples when helpful
- Encourage the student's curiosity and learning
- Structure your response for optimal readability

📝 RESPONSE STRUCTURE:
1. Start with 2-3 clear explanation paragraphs
2. Use numbered lists (1. 2. 3.) for step-by-step instructions
3. Use bullet points (•) for key concepts or tips
4. Include callout boxes for important notes using keywords like:
  - "نکته:" for tips and insights
  - "توجه:" for important information
  - "هشدار:" for warnings or common mistakes
  - "مهم:" for critical points
5. Use backticks (\`) for code examples or mathematical formulas
6. Keep formatting clean and educational

CONTEXT:
- Subject: ${subject}
- Grade Level: ${grade}
- Chapter: ${chapter}
- Student's Question: ${question}

Please provide a helpful response that:
1. Directly answers the student's question
2. Provides practical learning advice
3. Encourages further exploration of the topic
4. Uses proper Persian educational language
5. Follows the structured format above

Remember: This is a follow-up question after detailed analysis, so be specific and actionable.`;

  try {
    // Call the streaming AI API
    const response = await fetch(process.env.API_BASE_URL + '/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.API_MODEL,
        messages: [{
          role: 'system',
          content: helpQuestionPrompt
        }, {
          role: 'user',
          content: `Student's Question: ${question}\n\nPlease provide a helpful response in Persian.`
        }],
        stream: true,
        temperature: 0.3,
        max_tokens: 1024, 
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          if (data === '[DONE]') {
            res.write('data: [DONE]\n\n');
            res.end();
            return;
          }
          
          try {
            const parsed = JSON.parse(data);
            if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
              const content = parsed.choices[0].delta.content;
              res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
          } catch (e) {
            // Ignore parsing errors for incomplete chunks
          }
        }
      }
    }

  } catch (error) {
    console.error('Help question streaming error:', error);
    res.write(`data: ${JSON.stringify({ error: 'خطا در پاسخ به سوال کمک' })}\n\n`);
    res.end();
  }
});

// Legacy endpoint for backward compatibility (non-streaming)
app.post('/api/chat/help-question', async (req, res) => {
  const { question, subject, grade, chapter, originalAnalysis } = req.body;

  if (!question || !subject) {
    return res.status(400).json({ error: 'سوال و موضوع الزامی است' });
  }

  // System prompt for help question responses
  const helpQuestionPrompt = `You are a professional high school exam tutor and competitive test-prep coach (e.g., Konkoor). 

Your task is to provide a helpful, educational response to a student's follow-up question about a topic they just studied.

⚠️ STRICT RULES:
- Response must always be in Persian (Farsi)
- Keep your answer concise but comprehensive (2-3 paragraphs maximum)
- Focus on practical learning tips and clear explanations
- Use examples when helpful
- Encourage the student's curiosity and learning

CONTEXT:
- Subject: ${subject}
- Grade Level: ${grade}
- Chapter: ${chapter}
- Student's Question: ${question}

Please provide a helpful response that:
1. Directly answers the student's question
2. Provides practical learning advice
3. Encourages further exploration of the topic

Remember: This is a follow-up question after detailed analysis, so be specific and actionable.`;

  try {
    const response = await callAIAPI([{
      role: 'system',
      content: helpQuestionPrompt
    }, {
      role: 'user',
      content: `Student's Question: ${question}\n\nPlease provide a helpful response in Persian.`
    }]);

    res.json({ 
      success: true, 
      answer: response,
      question: question 
    });

  } catch (error) {
    console.error('Help question error:', error);
    res.status(500).json({ 
      error: 'خطا در پاسخ به سوال کمک',
      details: error.message 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve frontend
app.get('/', (req, res) => {
  // Add mobile-friendly headers
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Serve test page
app.get('/test.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/test.html'));
});

// Serve question analysis page
app.get('/question-analysis.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/question-analysis.html'));
});

// Serve chapters page
app.get('/chapters.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/chapters.html'));
});

// Serve analysis results page
app.get('/analysis-results.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/analysis-results.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Meno Backend Server running on port ${PORT}`);
  console.log(`📱 Frontend available at: http://localhost:${PORT}`);
  console.log(`🔗 API available at: http://localhost:${PORT}/api`);
  console.log(`🔑 API Base URL: ${process.env.API_BASE_URL}`);
  console.log(`🤖 API Model: ${process.env.API_MODEL}`);
  console.log(`✅ API Key: ${process.env.API_KEY ? 'Loaded' : 'Missing'}`);
});

module.exports = app;
