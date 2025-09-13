const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const path = require('path');
const { spawn } = require('child_process');
const db = require('./database-vercel');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

// Verify environment variables are loaded
console.log('🔍 Environment Check:');
console.log('API_BASE_URL:', process.env.API_BASE_URL);
console.log('API_MODEL:', process.env.API_MODEL);
console.log('API_KEY:', process.env.API_KEY ? 'Loaded' : 'Missing');

const app = express();
const PORT = process.env.PORT || 3000; // Use 3000 as default port

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: process.env.NODE_ENV
  });
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs (increased for development)
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
    
    console.log('🔗 Attempting to connect to AI API:', process.env.API_BASE_URL);
    
    const response = await axios.post(`${process.env.API_BASE_URL}/chat/completions`, {
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
    
    // Provide more specific error messages
    if (error.code === 'ENOTFOUND') {
      throw new Error('AI service is currently unavailable. Please check your internet connection and try again.');
    } else if (error.code === 'ECONNRESET') {
      throw new Error('Connection to AI service was reset. Please try again.');
    } else if (error.code === 'ETIMEDOUT') {
      throw new Error('AI service request timed out. Please try again.');
    } else if (error.response?.status === 401) {
      throw new Error('AI service authentication failed. Please check your API configuration.');
    } else if (error.response?.status === 429) {
      throw new Error('AI service rate limit exceeded. Please wait a moment and try again.');
    } else {
      throw new Error(`AI service error: ${error.message}`);
    }
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
    const { message, conversationId = 'default', context = [] } = req.body;
    
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

    // Get conversation context - use provided context if available, otherwise get from manager
    let conversationContext = [];
    if (context && context.length > 0) {
      // Use provided context (from session history)
      conversationContext = context.slice(-10); // Last 10 messages
      console.log('📚 Using provided conversation context:', conversationContext.length, 'messages');
    } else {
      // Fallback to conversation manager
      conversationContext = conversationManager.getConversationContext(conversationId);
      console.log('📚 Using conversation manager context:', conversationContext.length, 'messages');
    }

    // Prepare messages for AI API with conversation context
    const messages = [
      {
        role: 'system',
        content: `You are a deeply knowledgeable and supportive AI tutor who teaches high school students through interactive, Socratic-style conversations in clear, encouraging Persian (Farsi). Your role is to guide students toward deep understanding, not just give answers. You adapt your teaching style to their level, pace, and goals, and create a safe, motivating learning space.

{
  "description": "A system prompt for an adaptive, interactive tutor that engages students with guided reasoning, clear explanations, and step-by-step support for deep learning in all high school subjects.",
  "core_principles": [
    "Start by understanding the student’s current knowledge, goals, and preferred learning pace.",
    "Teach concepts in small, clear steps, using relatable and real-life examples.",
    "Use Socratic questioning to help students think critically and discover answers.",
    "Actively check understanding after every concept and revisit if needed.",
    "Never give full answers directly to problems; always guide step by step with hints and questions.",
    "Balance conceptual learning with guided practice and progressively harder exercises.",
    "Give frequent encouragement and confidence-building feedback.",
    "Offer a clear learning roadmap, from basics to advanced topics, so students see progress."
  ],
  "interaction_flow": [
    "Greet warmly and ask about their learning goals and current level.",
    "Summarize the topic or chapter roadmap and agree where to start.",
    "Introduce core ideas simply, with visual or real-world analogies where helpful.",
    "After every short explanation, ask a small, targeted question to check understanding.",
    "Guide through exercises step by step, never jumping to final answers.",
    "Periodically ask for summaries in their own words to confirm understanding.",
    "Vary the rhythm: mix explanations, questions, quick quizzes, and mini-reviews to keep it interactive.",
    "Suggest next steps, additional practice, or deeper challenges."
  ],
  "tone_and_style": {
    "language": "Use clear, simple Persian (Farsi), while sprinkling technical terms in original English where appropriate.",
    "style": "Be friendly, patient, adaptive, and motivational. Avoid sounding like a textbook.",
    "feedback": "Celebrate effort, not just correctness. Encourage retrying mistakes with hints.",
    "length": "Keep responses short and conversational; avoid long lecture-style paragraphs."
  },
  "response_guidelines": {
    "format": "Use short paragraphs and bullet points for clarity, but don’t overformat responses.",
    "math": "Write equations in LaTeX syntax using \( ... \) or \[ ... \].",
    "examples": "Always give relatable or practical examples for harder concepts.",
    "images": "Only suggest visuals when they truly help understanding.",
    "steps": "Present one question or one step at a time, then pause for the student’s response."
  }
}

}`
      },
      ...conversationContext,
      {
        role: 'user',
        content: message
      }
    ];

    console.log('📚 Sending to AI with', messages.length, 'messages (including system prompt and context)');

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
    try {
    await streamAIResponse([{
      role: 'user',
      content: analysisPrompt
      }], res, conversationId, 0, { max_tokens: 8192, temperature: 0.5 }); // Increased tokens for detailed analysis
    } catch (aiError) {
      console.error('AI streaming failed, providing fallback response:', aiError.message);
      
      // Provide a fallback response when AI is unavailable
      const fallbackAnalysis = `تحلیل سوال: ${question}

متأسفانه در حال حاضر سرویس هوش مصنوعی در دسترس نیست.

برای تحلیل دقیق‌تر این سوال، لطفاً:
• اتصال اینترنت خود را بررسی کنید
• چند لحظه صبر کنید و دوباره تلاش کنید
• یا از معلم خود کمک بگیرید

پاسخ شما: ${userAnswer}
پاسخ صحیح: ${correctAnswer}

لطفاً بعداً دوباره تلاش کنید تا تحلیل کامل را دریافت کنید.`;
      
      if (!res.headersSent) {
        res.json({
          content: fallbackAnalysis,
          error: 'AI service temporarily unavailable'
        });
      }
    }
    
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
${Array.isArray(options) ? options.map((opt, index) => `${String.fromCharCode(65 + index)}) ${opt}`).join('\n') : Object.keys(options).map((key, index) => `${['الف', 'ب', 'ج', 'د'][index]}) ${options[key]}`).join('\n')}

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

    // Create help question prompt with JSON format - focused on main question only
    const helpQuestionPrompt = `{
  "role": "system",
  "persona": {
    "identity": "Expert Iranian high school teacher and Konkoor exam specialist",
    "specialization": "Direct, focused problem-solving and clear explanations",
    "role": "Teacher who provides precise answers to specific questions"
  },
  "language": "Farsi",
  "task": "Provide direct, focused responses to the student's specific question without additional topics or side-tracking.",
  "style": {
    "tone": "Clear, direct, helpful, and focused",
    "audience": "High school students seeking specific answers",
    "constraints": "Direct answer to the question asked, max 300 words per response"
  },
  "inputs": {
    "student_question": "${question}",
    "subject": "${subject || 'general'}",
    "grade_level": "${grade || 'high school'}",
    "chapter": "${chapter || 'general'}",
    "original_analysis": "${originalAnalysis || 'No previous analysis provided'}"
  },
  "output": {
    "response_structure": [
      "1. Directly address the student's specific question",
      "2. Provide clear, focused explanation related to the question",
      "3. Give practical, actionable information",
      "4. End with a brief, relevant tip or clarification"
    ],
    "focus_requirements": [
      "Answer ONLY what the student asked",
      "Do not introduce additional topics or concepts",
      "Do not provide side-tracking information",
      "Stay focused on the core question",
      "Avoid unnecessary complexity or advanced topics",
      "Keep explanations practical and applicable"
    ],
    "formatting_requirements": [
      "Use clear Persian language",
      "Structure with direct, logical flow",
      "Use bullet points (•) for key points only when relevant",
      "Include mathematical expressions in LaTeX format: \\( ... \\) for inline, \\[ ... \\] for blocks",
      "Use simple callout boxes: 'نکته:', 'توجه:', 'مهم:' only when directly relevant",
      "Maintain clear, helpful tone"
    ]
  },
  "rules": [
    "Always respond in Farsi with clear, simple language",
    "Answer ONLY the specific question asked",
    "Do not add additional topics or side information",
    "Keep responses focused and practical",
    "Avoid unnecessary complexity",
    "Provide direct, actionable answers"
  ],
  "process": {
    "student_question": "${question}",
    "subject": "${subject || 'general'}",
    "grade_level": "${grade || 'high school'}",
    "chapter": "${chapter || 'general'}",
    "context": "This is a follow-up question requiring a direct, focused response to the specific question asked"
  }
}`;

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

// Custom question streaming endpoint - More advanced and challenging than helper questions
app.post('/api/chat/custom-question/stream', async (req, res) => {
  try {
    const { question, subject, grade, chapter, originalAnalysis, conversationId, conversationContext } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Missing question field' });
    }

    // Create enhanced custom question prompt - discovery learning focused
    const customQuestionPrompt = `{
  "role": "system",
  "persona": {
    "identity": "Experienced Iranian Konkoor professor and discovery learning specialist",
    "role": "Mentor who fosters critical thinking, deep understanding, and discovery learning",
    "specialization": "Guiding students through strategic questioning and real-world connections"
  },
  "language": "Farsi (adapt to English if requested)",
  "task": "Answer questions concisely, encouraging discovery learning and critical thinking through targeted questions and practical examples.",
  "style": {
    "tone": "Engaging, intellectually stimulating, and discovery-focused",
    "audience": "Students seeking deep understanding and critical thinking skills, adaptable to broader audiences if needed",
    "constraints": "Keep responses concise (aim for under 300 words unless complexity requires more). Use clear, relevant examples. Include discovery questions and learning tips."
  },
  "inputs": {
    "student_question": "${question}",
    "subject": "${subject || 'general'}",
    "grade_level": "${grade || 'high school'}",
    "chapter": "${chapter || 'general'}",
    "original_analysis": "${originalAnalysis && originalAnalysis.trim() !== '' ? originalAnalysis.substring(0, 2000) + '...' : 'No previous analysis provided'}",
    "conversation_context": "${conversationContext && conversationContext.length > 0 ? conversationContext.map(msg => `${msg.role}: ${msg.content.substring(0, 150)}...`).join('\\n') : 'No previous context - this is the first question in this session'}"
  },
  "output": {
     "response_structure": [
      "1. Clear, direct answer to the question",
      "2. Brief explanation with one relevant example",
      "3. Natural questions to deepen understanding (when appropriate)",
      "4. Helpful suggestions and tips woven naturally into the response"
    ],
    "discovery_learning": {
      "questions_to_ask": "Naturally weave in 1-2 thoughtful questions that encourage critical thinking or real-world application (e.g., 'What if...', 'How might...', 'Why do you think...'). Ask them conversationally, not as formal labeled sections.",
      "learning_encouragement": "Promote independent thinking, pattern recognition, and connections to broader concepts or real-world scenarios through natural conversation flow."
    },
    "strict_rules": [
      "Prioritize clarity and educational value over rigid formatting",
      "Use one clear example, adding more only if essential",
      "Encourage critical thinking with natural, conversational questions",
      "Share helpful tips and suggestions naturally throughout the conversation"
    ],
    "formatting": [
      "Use natural, conversational Persian language that feels friendly and approachable",
      "Include mathematical expressions (\\(...\\) for inline, \\[...\\] for blocks) only when relevant",
      "Use bullet points (•) for clarity when listing questions or tips",
      "Ask questions naturally without rigid labels - integrate them smoothly into the conversation",
      "Share learning tips organically as helpful suggestions, not as formal sections"
    ]
  },
  "conversation_continuity": {
    "requirements": [
      "Reference prior context when relevant to enhance understanding",
      "Connect current question to previous discussions for educational flow",
      "Encourage deeper exploration based on past interactions"
    ]
  },
  "learning_tips": {
    "always_include": [
      "One study strategy or practice recommendation",
      "One connection to real-world applications or other subjects"
    ],
    "format": "Share tips naturally as helpful suggestions throughout the response, not as a rigid final section"
  }
}
}`;

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
      console.log(`📝 Added custom question to conversation ${conversationId}: ${question.substring(0, 50)}...`);
      
      // Log conversation context if provided
      if (conversationContext && conversationContext.length > 0) {
        console.log(`📚 Using conversation context with ${conversationContext.length} previous messages`);
        console.log(`📋 Original analysis length: ${originalAnalysis ? originalAnalysis.length : 0} characters`);
      } else {
        console.log(`⚠️ No conversation context provided - this might be the first question`);
      }
    }

    // Prepare messages for AI API with conversation context
    const messages = [
      {
        role: 'system',
        content: customQuestionPrompt
      }
    ];

    // Add conversation context if provided
    if (conversationContext && conversationContext.length > 0) {
      // Add conversation context to messages (last 10 messages to avoid token limits)
      const recentContext = conversationContext.slice(-10);
      messages.push(...recentContext);
      console.log(`📚 Using conversation context with ${recentContext.length} previous messages for custom question`);
    }

    // Add the current custom question
    messages.push({
      role: 'user',
      content: question
    });

    console.log('📚 Sending custom question to AI with', messages.length, 'messages (including system prompt and context)');

    // Stream AI response for custom question
    await streamAIResponse(messages, res, conversationId || 'custom-question');

  } catch (error) {
    console.error('Custom Question Streaming Error:', error);
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
    
    const response = await axios.post(`${process.env.API_BASE_URL}/chat/completions`, {
      model: process.env.API_MODEL,
      messages: messages,
              max_tokens: optimizationOptions.max_tokens || 8192,
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
      timeout: 30000, // Increased timeout to 30 seconds for better streaming
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
    }, 30000); // 30 second timeout for better streaming

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

// REMOVED: Duplicate help-question/stream endpoint - keeping only the first one
// REMOVED: All orphaned code from duplicate route - completely removed to fix syntax errors

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

// Serve library page
app.get('/library.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/library.html'));
});

// Serve analysis results page
app.get('/analysis-results.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/analysis-results.html'));
});

// Authentication endpoints
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { phone } = req.body;
        
        if (!phone) {
            return res.status(400).json({ success: false, error: 'Phone number is required' });
        }
        
        // Check if user already exists
        const existingUser = await db.getUserByPhone(phone);
        if (existingUser) {
            return res.status(400).json({ success: false, error: 'User already exists' });
        }
        
        // Create new user
        const result = await db.createUser(phone);
        
        // In a real app, you would send the confirmation code via SMS
        // For MVP, we'll just return it in the response
        res.json({
            success: true,
            message: 'Confirmation code sent to your phone',
            confirmation_code: result.confirmation_code, // Remove this in production
            user_id: result.user_id
        });
        
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

app.post('/api/auth/verify', async (req, res) => {
    try {
        const { phone, confirmation_code } = req.body;
        
        if (!phone || !confirmation_code) {
            return res.status(400).json({ success: false, error: 'Phone number and confirmation code are required' });
        }
        
        // Verify confirmation code
        const user = await db.verifyConfirmationCode(phone, confirmation_code);
        if (!user) {
            return res.status(400).json({ success: false, error: 'Invalid confirmation code' });
        }
        
        // Mark user as verified
        await db.markUserVerified(user.id);
        await db.updateLastLogin(user.id);
        
        res.json({
            success: true,
            message: 'Phone verified successfully',
            user_id: user.id
        });
        
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { phone } = req.body;
        
        if (!phone) {
            return res.status(400).json({ success: false, error: 'Phone number is required' });
        }
        
        // Check if user exists
        const user = await db.getUserByPhone(phone);
        if (!user) {
            return res.status(400).json({ success: false, error: 'User not found' });
        }
        
        if (!user.is_verified) {
            return res.status(400).json({ success: false, error: 'Please verify your phone first' });
        }
        
        // Generate new confirmation code for login
        const confirmation_code = db.generateConfirmationCode();
        
        // Update user's confirmation code
        await db.updateConfirmationCode(user.id, confirmation_code);
        
        // In a real app, you would send the confirmation code via SMS
        // For MVP, we'll just return it in the response
        res.json({
            success: true,
            message: 'Confirmation code sent to your phone',
            confirmation_code: confirmation_code, // Remove this in production
            user_id: user.id
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Conversation Management API Endpoints (Original Chat System)

// Get conversations for a user
app.get('/api/conversations', async (req, res) => {
    try {
        const { userId, type = 'chat' } = req.query;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: 'User ID is required' 
            });
        }
        
        console.log('🔍 Getting conversations for user:', userId, 'type:', type);
        
        // Get conversations from database
        const conversations = await db.getConversations(userId, type);
        
        res.json({ 
            success: true, 
            conversations 
        });
        
    } catch (error) {
        console.error('Error getting conversations:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get conversations' 
        });
    }
});

// Save conversation session
app.post('/api/conversations/session', async (req, res) => {
    try {
        const { sessionId, userId, title, content, type = 'chat', createdAt, updatedAt, subject, grade, field, chapter, book, messages } = req.body;
        
        if (!userId || !title) {
            return res.status(400).json({ 
                success: false, 
                error: 'User ID and title are required' 
            });
        }
        
        console.log('🔍 Saving conversation session:', sessionId, 'type:', type);
        
        const result = await db.saveConversation(sessionId, userId, title, content, type, createdAt, updatedAt, subject, grade, field, chapter, book, messages);
        
        res.json({ 
            success: true, 
            conversation: {
                sessionId: result.sessionId,
                title,
                content,
                type: type,
                createdAt: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Error saving conversation:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to save conversation' 
        });
    }
});

// Thread Management API Endpoints

// Create a new thread
app.post('/api/threads', async (req, res) => {
    try {
        const { user_id, title, summary, type = 'chat', thread_id, created_at, updated_at, subject, grade, field, chapter, book, messages } = req.body;
        
        if (!user_id || !title) {
            return res.status(400).json({ 
                success: false, 
                error: 'User ID and title are required' 
            });
        }
        
        console.log('🔍 Creating thread with type:', type);
        console.log('🔍 Thread data:', { user_id, title, type, thread_id, subject, grade, field, chapter, book });
        
        const threadId = await db.createThread({ user_id, title, summary, type, thread_id, created_at, updated_at, subject, grade, field, chapter, book, messages });
        
        res.json({ 
            success: true, 
            thread: {
                id: threadId,
                thread_id: threadId,
                title,
                summary,
                type: type,
                created_at: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Error creating thread:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to create thread' 
        });
    }
});

// Get all threads for a user
app.get('/api/threads', async (req, res) => {
    try {
        const { user_id, limit = 20, offset = 0, sort_by = 'last_message_at', 
                sort_order = 'DESC', include_archived = false, search, type } = req.query;
        
        if (!user_id) {
            return res.status(400).json({ 
                success: false, 
                error: 'User ID is required' 
            });
        }
        
        const options = {
            limit: parseInt(limit),
            offset: parseInt(offset),
            sortBy: sort_by,
            sortOrder: sort_order.toUpperCase(),
            includeArchived: include_archived === 'true',
            search: search || null,
            type: type || null
        };
        
        console.log('🔍 Getting threads for user:', user_id, 'with options:', options);
        console.log('🔍 Filtering by type:', type);
        
        const threads = await db.getThreads(user_id, options);
        
        console.log('🔍 Retrieved threads:', threads.length, 'threads');
        if (threads.length > 0) {
            console.log('🔍 First thread type:', threads[0].type);
            console.log('🔍 All thread types:', threads.map(t => `${t.thread_id}: ${t.type}`).join(', '));
        }
        
        res.json({ 
            success: true, 
            threads,
            pagination: {
                limit: options.limit,
                offset: options.offset,
                hasMore: threads.length === options.limit
            }
        });
        
    } catch (error) {
        console.error('❌ Error getting threads:', error);
        console.error('❌ Error details:', error.message);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get threads: ' + error.message 
        });
    }
});

// Get a specific thread
app.get('/api/threads/:thread_id', async (req, res) => {
    try {
        const { thread_id } = req.params;
        const { user_id } = req.query;
        
        if (!user_id) {
            return res.status(400).json({ 
                success: false, 
                error: 'User ID is required' 
            });
        }
        
        const thread = await db.getThreadById(thread_id);
        
        if (!thread) {
            return res.status(404).json({ 
                success: false, 
                error: 'Thread not found' 
            });
        }
        
        res.json({ 
            success: true, 
            thread 
        });
        
    } catch (error) {
        console.error('Error getting thread:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get thread' 
        });
    }
});

// Update a thread
app.put('/api/threads/:thread_id', async (req, res) => {
    try {
        const { thread_id } = req.params;
        const { user_id, title, summary, is_archived } = req.body;
        
        if (!user_id) {
            return res.status(400).json({ 
                success: false, 
                error: 'User ID is required' 
            });
        }
        
        const updates = { title, summary, is_archived };
        const result = await db.updateThread(thread_id, user_id, updates);
        
        res.json({ 
            success: true, 
            message: 'Thread updated successfully',
            changes: result.changes
        });
        
    } catch (error) {
        console.error('Error updating thread:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update thread' 
        });
    }
});

// Delete a thread
app.delete('/api/threads/:thread_id', async (req, res) => {
    try {
        const { thread_id } = req.params;
        const { user_id } = req.query;
        
        if (!user_id) {
            return res.status(400).json({ 
                success: false, 
                error: 'User ID is required' 
            });
        }
        
        const result = await db.deleteThread(thread_id, user_id);
        
        res.json({ 
            success: true, 
            message: 'Thread deleted successfully',
            changes: result.changes
        });
        
    } catch (error) {
        console.error('Error deleting thread:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to delete thread' 
        });
    }
});

// Add a message to a thread
app.post('/api/threads/:thread_id/messages', async (req, res) => {
    try {
        const { thread_id } = req.params;
        const { sender_role, content, metadata, token_count } = req.body;
        
        if (!sender_role || !content) {
            return res.status(400).json({ 
                success: false, 
                error: 'Sender role and content are required' 
            });
        }
        
        if (!['user', 'assistant'].includes(sender_role)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid sender role' 
            });
        }
        
        const result = await db.addMessage(thread_id, sender_role, content, metadata, token_count);
        
        res.json({ 
            success: true, 
            message: {
                id: result.id,
                message_id: result.message_id,
                thread_id,
                sender_role,
                content,
                created_at: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Error adding message:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to add message' 
        });
    }
});

// Get messages for a thread
app.get('/api/threads/:thread_id/messages', async (req, res) => {
    try {
        const { thread_id } = req.params;
        const { limit = 50, offset = 0, include_deleted = false } = req.query;
        
        const options = {
            limit: parseInt(limit),
            offset: parseInt(offset),
            includeDeleted: include_deleted === 'true'
        };
        
        const messages = await db.getMessagesForThread(thread_id, options.limit);
        
        res.json({ 
            success: true, 
            messages,
            pagination: {
                limit: options.limit,
                offset: options.offset,
                hasMore: messages.length === options.limit
            }
        });
        
    } catch (error) {
        console.error('Error getting messages:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get messages' 
        });
    }
});

// Get recent messages for AI context
app.get('/api/threads/:thread_id/context', async (req, res) => {
    try {
        const { thread_id } = req.params;
        const { max_tokens = 4000 } = req.query;
        
        const messages = await db.getRecentMessages(thread_id, parseInt(max_tokens));
        
        res.json({ 
            success: true, 
            messages,
            total_tokens: messages.reduce((sum, msg) => sum + (msg.token_count || 0), 0)
        });
        
    } catch (error) {
        console.error('Error getting context:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get context' 
        });
    }
});

// Delete a message
app.delete('/api/threads/:thread_id/messages/:message_id', async (req, res) => {
    try {
        const { thread_id, message_id } = req.params;
        
        const result = await db.deleteMessage(message_id, thread_id);
        
        res.json({ 
            success: true, 
            message: 'Message deleted successfully',
            changes: result.changes
        });
        
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to delete message' 
        });
    }
});

// Get thread statistics
app.get('/api/threads/stats/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        
        const stats = await db.getThreadStats(user_id);
        
        res.json({ 
            success: true, 
            stats 
        });
        
    } catch (error) {
        console.error('Error getting thread stats:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get thread stats' 
        });
    }
});

// Serve auth.html as main.html (no redirect)
app.get('/auth.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/main.html'));
});

// Serve main.html as default page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/main.html'));
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
  
  try {
  fs.writeFileSync(path.join(__dirname, '../.port-info.json'), JSON.stringify(portInfo, null, 2));
  console.log(`💾 Port info saved to .port-info.json`);
  } catch (error) {
    console.log(`⚠️ Could not save port info: ${error.message}`);
  }
  
  // Open browser automatically
  const { exec } = require('child_process');
  const url = `http://localhost:${actualPort}`;
  
  // Detect OS and open browser accordingly
  const platform = process.platform;
  let command;
  
  if (platform === 'win32') {
    command = `start ${url}`;
  } else if (platform === 'darwin') {
    command = `open ${url}`;
  } else {
    command = `xdg-open ${url}`;
  }
  
  exec(command, (error) => {
    if (error) {
      console.log(`⚠️ Could not open browser automatically. Please open: ${url}`);
    } else {
      console.log(`🌐 Browser opened automatically: ${url}`);
    }
  });
});

module.exports = app;
