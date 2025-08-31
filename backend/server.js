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
const PORT = process.env.PORT || 0; // Use 0 to let system assign any available port

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https:"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://fonts.googleapis.com", "https:"],
      styleSrcElem: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://fonts.googleapis.com", "https:"],
      fontSrc: ["'self'", "https:", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://ai.liara.ir", "https://cdn.tailwindcss.com", "https://fonts.googleapis.com", "https://fonts.gstatic.com", "https:"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  }
}));
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
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

// AI API call function for non-streaming responses
async function callAIAPI(messages) {
  try {
    if (!process.env.API_BASE_URL) {
      throw new Error('API_BASE_URL environment variable is not set');
    }
    
    const response = await axios.post(`${process.env.API_BASE_URL}/api/v1/688a24a93d0c49e74e362a7f/chat/completions`, {
      model: process.env.API_MODEL,
      messages: messages,
      max_tokens: 2024,
      temperature: 0.5,
      top_p: 0.9,                    // Nucleus sampling - controls diversity
      frequency_penalty: 0.5,         // Reduces repetition of common words
      presence_penalty: 0.1,          // Encourages new topics and concepts
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

// Unified system prompt for all chat interactions

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
        content: `You are an AI tutor designed to conduct interactive, Socratic, and step-by-step educational dialogues in clear and supportive persian.
        {
    "description": "A comprehensive guide for conducting interactive, conceptual, and Socratic learning conversations to achieve high student engagement and effectiveness.",
    "goals": [
      "Create an interactive and active learning environment for the student",
      "Use Socratic method to encourage critical thinking and self-discovery of concepts",
      "Teach concepts step-by-step with simple language and relatable examples",
      "Adapt the teaching depth and pace according to the student's prior knowledge and needs",
      "Repeat and provide positive feedback to boost motivation and self-confidence",
      "Combine conceptual teaching with practice problems and advanced exercises",
      "Build student interest by outlining a clear roadmap from basics to advanced topics"
    ],
    "interaction_principles": [
      "Begin the conversation by asking about the student's learning goal and current level",
      "Provide an overview of the course or chapter structures",
      "Ask thought-provoking questions that prompt the student to analyze and reflect",
      "If the student responds incorrectly or says 'I don't know', guide patiently step-by-step",
      "Use real-life and relatable examples consistently to explain concepts",
      "Provide incremental practice exercises tailored to the student's level",
      "Repeat complex topics in smaller parts until fully understood",
      "Offer positive and encouraging feedback for correct responses"
    ],
    "conversation_flow": {
      "start": "Greet the student and inquire about their learning goals and topic importance",
      "structure_overview": "Present the chapters or sections and decide where to begin",
      "concept_explanation": "Explain key definitions and concepts with examples",
      "guided_questions": "Pose Socratic questions related to the topic",
      "active_practice": "Support the student through exercises and problem solving",
      "progress_check": "Ask for the student's understanding and repeat if necessary",
      "further_steps": "Suggest next topics or more practice problems"
    },
    "tone_and_style": {
      "language": "Clear, simple persian(farsi) that is respectful and encouraging",
      "style": "Friendly, patient, motivational, and supportive",
      "feedback": "Provide positive, confidence-building feedback"
    },
    "response_format": {
      "introduction": "Begin with a concise direct answer to the core question or topic.",
      "use_headers": "Organize explanations and elaborations using markdown headers with meaningful titles (avoid using ## or **). Use plain text headings without numbering.",
      "paragraphs": "Use 2-3 concise sentences per section for clarity.",
      "lists": "Use bullet points for presenting multiple related ideas or features.",
      "tables": "Use markdown tables for comparisons only, not for summaries.",
      "math": "Format all mathematical expressions with LaTeX syntax using \( ... \) for inline and \[ ... \] for block expressions.",
      "citations": "Include citations for all facts or claims in the format [source:id].",
      "images": "Include images only when they clearly enhance understanding. Cite images separately.",
      "tone": "Maintain a warm, informative, comprehensive, and accessible tone throughout the response."
    }
  }
}`
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

// Streaming question analysis endpoint - OPTIMIZED FOR SPEED
app.post('/api/chat/analysis/stream', async (req, res) => {
  try {
    const { question, options, correctAnswer, userAnswer, subject, grade, chapter, conversationId = 'default' } = req.body;
    
    if (!question || !options || !correctAnswer || !userAnswer) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

                           // Create analysis prompt with the new system prompt
                           // PERFORMANCE OPTIMIZATIONS: Reduced max_tokens, lower temperature, optimized streaming
    const analysisPrompt = `{
  "role": "system",
  "persona": {
    "identity": "Warm, encouraging Iranian high school teacher",
    "specialization": "Helping students prepare for the Konkoor exam",
    "role": "Mentor who genuinely cares about student success"
  },
  "language": "Farsi",
  "task": "Analyze multiple-choice questions AFTER the student has chosen an answer.",
  "style": {
    "tone": "Supportive, friendly, motivating, clear",
    "audience": "High school students (grades 10-12)",
    "constraints": "Concise, clear, max 200 words per response"
  },
  "inputs": {
    "query": "${question}",
    "subject": "${subject}",
    "student_answer": "${userAnswer}",
    "correct_answer": "${correctAnswer}"
  },
  "output": {
    "response_structure": [
      "1. Start by cheering the student (e.g., 'Great job giving this a shot!') and state correctness with ✅ or ❌. If wrong, kindly give the correct answer.",
      "2. Walk through the solution step-by-step, simple and clear, with real-world examples if helpful.",
      "3. Share one quick shortcut or test tip.",
      "4. Explain a common mistake or mix-up related to the problem.",
      "5. End with a fun, memorable tip to reinforce the concept."
    ],
    "related_questions": {
      "requirements": [
        "Generate exactly 4 questions",
        "Each under 15 words",
        "All in Persian (Farsi)",
        "Relevant to ${subject} and the specific topic",
        "Cover prerequisite, application, practice, and tips",
        "Avoid overly general questions"
      ],
      "format": [
        "-[Question]",
        "-[Question]",
        "-[Question]",
        "-[Question]"
      ]
    }
  },
  "rules": [
    "Always respond in Farsi",
    "Keep answers concise and educational",
    "Never give just the correct answer without explanation",
    "Always include encouragement, reasoning, and tips",
    "Maintain supportive and motivating tone"
  ],
  "process": {
    "query": "${question}",
    "subject": "${subject}",
    "student_answer": "${userAnswer}",
    "correct_answer": "${correctAnswer}"
  }
}`;

    // Use streaming response
    await streamAIResponse([{
      role: 'user',
      content: analysisPrompt
    }], res, conversationId);
    
  } catch (error) {
    console.error('Analysis API Error:', error);
    if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Result evaluation endpoint (quick evaluation)
app.post('/api/chat/result-evaluation', async (req, res) => {
  try {
    const { question, options, userAnswer, subject, grade, chapter } = req.body;
    
    if (!question || !options || !userAnswer) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

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

// Help question streaming endpoint
app.post('/api/chat/help-question/stream', async (req, res) => {
  try {
    const { question, subject, grade, chapter, originalAnalysis, conversationId, conversationContext } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Missing question field' });
    }

    // Create help question prompt
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
- Subject: ${subject || 'general'}
- Grade Level: ${grade || 'high school'}
- Chapter: ${chapter || 'general'}
- Student's Question: "${question}"
- This question is related to a previous analysis: ${originalAnalysis || 'No previous analysis provided'}
${conversationContext && conversationContext.length > 0 ? `- Previous conversation context: ${conversationContext.map(msg => `${msg.role}: ${msg.content.substring(0, 100)}...`).join('\n')}` : ''}

Please provide a helpful response that:
1. Directly answers the student's question
2. Provides practical learning advice
3. Encourages further exploration of the topic
4. Uses proper Persian educational language
5. Follows the structured format above

Remember: This is a follow-up question after detailed analysis, so be specific and actionable.`;

    // Set up streaming response
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type'
    });

    // Add user question to conversation history if conversationId is provided
    if (conversationId) {
      conversationManager.addMessage(conversationId, {
        role: 'user',
        content: question,
        timestamp: new Date().toISOString()
      });
      console.log(`📝 Added helper question to conversation ${conversationId}: ${question.substring(0, 50)}...`);
      
      // Log conversation context if provided
      if (conversationContext && conversationContext.length > 0) {
        console.log(`📚 Using conversation context with ${conversationContext.length} previous messages`);
      }
    }

    // Stream AI response for help question
    await streamAIResponse([{
      role: 'user',
      content: helpQuestionPrompt
    }], res, 'help-question');

  } catch (error) {
    console.error('Help Question Streaming Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Streaming AI response function with retry logic and better error handling
async function streamAIResponse(messages, res, conversationId, retryCount = 0, optimizationOptions = {}) {
  const MAX_RETRIES = 2;
  
  try {
    if (!process.env.API_BASE_URL) {
      throw new Error('API_BASE_URL environment variable is not set');
    }
    
    const response = await axios.post(`${process.env.API_BASE_URL}/api/v1/688a24a93d0c49e74e362a7f/chat/completions`, {
      model: process.env.API_MODEL,
      messages: messages,
      max_tokens: optimizationOptions.max_tokens || 2024,
      temperature: optimizationOptions.temperature || 0.5,
      top_p: 0.9,                    // Nucleus sampling - controls diversity
      frequency_penalty: 0.5,         // Reduces repetition of common words
      presence_penalty: 0.1,          // Encourages new topics and concepts
      stream: true
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 8000, // Reduced timeout for Vercel compatibility
      responseType: 'stream',
      maxRedirects: 5,
      validateStatus: (status) => status < 500 // Accept all status codes < 500
    });

    let fullResponse = '';
    let hasReceivedData = false;

    response.data.on('data', async (chunk) => {
      try {
        hasReceivedData = true;
        const chunkStr = chunk.toString();
        
        const lines = chunkStr.split('\n');
        
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
                
                // Stream content immediately for faster response
                res.write(`data: ${JSON.stringify({ content, type: 'chunk' })}\n\n`);
              } else if (parsed.error) {
                console.error('Liara API error:', parsed.error);
                res.write(`data: ${JSON.stringify({ error: parsed.error.message || 'Liara API error', type: 'error' })}\n\n`);
                res.end();
                return;
              }
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      } catch (chunkError) {
        console.error('❌ Error processing chunk:', chunkError);
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ error: 'Error processing response chunk', type: 'error' })}\n\n`);
          res.end();
        }
      }
    });

    response.data.on('end', () => {
      if (!res.writableEnded) {
        if (hasReceivedData && fullResponse.trim()) {
          res.write(`data: [DONE]\n\n`);
        } else {
          res.write(`data: ${JSON.stringify({ error: 'Stream ended without data', type: 'error' })}\n\n`);
        }
        res.end();
      }
    });

    response.data.on('error', (error) => {
      console.error('Stream error:', error);
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: 'Stream error occurred', type: 'error' })}\n\n`);
        res.end();
      }
    });

    // Add timeout for the entire stream
    const streamTimeout = setTimeout(() => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: 'Stream timeout', type: 'error' })}\n\n`);
        res.end();
      }
    }, 8000); // 8 second timeout for Vercel compatibility (Vercel has 10s limit)

    response.data.on('close', () => {
      clearTimeout(streamTimeout);
    });

  } catch (error) {
    console.error(`Streaming AI API Error (attempt ${retryCount + 1}):`, error.message);
    
    // Check if it's a connection error that we can retry
    if (retryCount < MAX_RETRIES && (
      error.code === 'ECONNRESET' || 
      error.code === 'ECONNREFUSED' || 
      error.code === 'ETIMEDOUT' ||
      error.message.includes('ECONNRESET') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT')
    )) {
      console.log(`Retrying due to connection error (${error.code || 'unknown'})...`);
      
      // Wait before retry (exponential backoff)
      const delay = Math.pow(2, retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Retry the request
      return streamAIResponse(messages, res, conversationId, retryCount + 1);
    }
    
    // If we can't retry or have exhausted retries, send error
    if (!res.writableEnded) {
      const errorMessage = retryCount >= MAX_RETRIES 
        ? 'Failed to get AI response after multiple attempts' 
        : 'Failed to get AI response';
      
      res.write(`data: ${JSON.stringify({ error: errorMessage, type: 'error' })}\n\n`);
      res.end();
    }
  }
}

// New endpoint for responding to help questions (Streaming)
app.post('/api/chat/help-question/stream', async (req, res) => {
  const { question, subject, grade, chapter, originalAnalysis, conversationId, conversationContext } = req.body;

  if (!question || !subject) {
    return res.status(400).json({ error: 'سوال و موضوع الزامی است' });
  }

  // Log conversation context if provided
  if (conversationId) {
    console.log(`Processing helper question for conversation ${conversationId}: ${question.substring(0, 50)}...`);
    
    if (conversationContext && conversationContext.length > 0) {
      console.log(`Using conversation context with ${conversationContext.length} previous messages`);
    }
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
  const helpQuestionPrompt = `You are an expert Iranian high school tutor specialized in Konkoor exam preparation.  
Your role is to have an interactive tutoring conversation with the student.
⚠️ STRICT RULES:
- Response must always be in Persian (Farsi)
- Keep your answer concise but comprehensive (2-3 paragraphs maximum)
1. Always answer in Farsi (unless the student explicitly asks in English).  
2. Keep answers short, clear, and adapted to the student’s level (high school, Konkoor prep).  
3. Use a friendly and supportive tone, like a private teacher encouraging the student.  
4. If the student’s question is unclear, ask a guiding question back to clarify.  
5. If the student asks about a mistake, explain it again in simpler terms, possibly with a mini-example.  
6. If the student asks "what if" variations, logically explain what would happen.  
7. Never just give the final answer — always teach step by step.  

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
${conversationContext && conversationContext.length > 0 ? `- Previous conversation context: ${conversationContext.map(msg => `${msg.role}: ${msg.content.substring(0, 100)}...`).join('\n')}` : ''}

Please provide a helpful response that:
1. Directly answers the student's question
2. Provides practical learning advice
3. Encourages further exploration of the topic
4. Uses proper Persian educational language
5. Follows the structured format above

Remember: This is a follow-up question after detailed analysis, so be specific and actionable.`;

  try {
    // Call the streaming AI API
          const response = await fetch(process.env.API_BASE_URL + '/api/v1/688a24a93d0c49e74e362a7f/chat/completions', {
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
        temperature: 0.5,
        max_tokens: 1024,
        top_p: 0.9,                    // Nucleus sampling - controls diversity
        frequency_penalty: 0.5,         // Reduces repetition of common words
        presence_penalty: 0.1,          // Encourages new topics and concepts
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
            // Add AI response to conversation history if conversationId is provided
            if (conversationId) {
              // Note: We can't capture the full response here due to streaming
              // The frontend will handle adding the complete response to conversation history
              console.log(`✅ Help question response completed for conversation: ${conversationId}`);
            }
            
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

// JSON Helper Question Parser Functions
function extractHelperQuestionsFromResponse(responseText) {
  try {
    // Look for JSON block in the response
    const jsonMatch = responseText.match(/\{[\s\S]*"helper_questions"[\s\S]*\}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      
      if (parsed.helper_questions && Array.isArray(parsed.helper_questions)) {
        console.log('✅ Successfully extracted helper questions from JSON:', parsed.helper_questions);
        return {
          questions: parsed.helper_questions,
          mainContent: responseText.replace(jsonStr, '').trim()
        };
      }
    }
    
    console.log('❌ No valid JSON helper questions found in response');
    return { questions: [], mainContent: responseText };
    
  } catch (error) {
    console.error('❌ Error parsing helper questions JSON:', error);
    return { questions: [], mainContent: responseText };
  }
}

// Legacy endpoint for backward compatibility (non-streaming)
app.post('/api/chat/help-question', async (req, res) => {
  const { question, subject, grade, chapter, originalAnalysis } = req.body;

  if (!question || !subject) {
    return res.status(400).json({ error: 'سوال و موضوع الزامی است' });
  }

  try {
    const response = await callAIAPI([{
      role: 'system',
      content: helpQuestionPrompt
    }, {
      role: 'user',
      content: `Student's Question: ${question}\n\nPlease provide a helpful response in Persian.`
    }]);

    // Parse helper questions from response
    const { questions, mainContent } = extractHelperQuestionsFromResponse(response);

    res.json({ 
      success: true, 
      answer: mainContent,
      helperQuestions: questions,
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

// Start server with dynamic port handling
const server = app.listen(PORT, () => {
  const actualPort = server.address().port;
  console.log(`🚀 Meno Backend Server running on port ${actualPort}`);
  console.log(`📱 Frontend available at: http://localhost:${actualPort}`);
  console.log(`🔗 API available at: http://localhost:${actualPort}/api`);
  console.log(`🔑 API Base URL: ${process.env.API_BASE_URL}`);
  console.log(`🤖 API Model: ${process.env.API_MODEL}`);
  console.log(`✅ API Key: ${process.env.API_KEY ? 'Loaded' : 'Missing'}`);
  
  // Save the actual port to a file for frontend to use
  const fs = require('fs');
  const portInfo = { port: actualPort, timestamp: new Date().toISOString() };
  fs.writeFileSync(path.join(__dirname, '../.port-info.json'), JSON.stringify(portInfo, null, 2));
  console.log(`💾 Port info saved to .port-info.json`);
});

module.exports = app;
