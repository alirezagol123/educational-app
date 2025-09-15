// In-memory storage for Vercel deployment (SQLite doesn't work in serverless)
const fs = require('fs');
const path = require('path');

// Use different storage paths for local vs production
// In Vercel, we'll use pure in-memory storage to avoid file system issues
const STORAGE_FILE = process.env.VERCEL ? null : './threads.json';

let inMemoryStorage = {
    threads: new Map(),
    conversations: new Map(),
    messages: new Map(),
    users: new Map()
};

// Load storage from file
function loadStorageFromFile() {
    try {
        if (STORAGE_FILE && fs.existsSync(STORAGE_FILE)) {
            const data = fs.readFileSync(STORAGE_FILE, 'utf8');
            const parsed = JSON.parse(data);
            
            // Convert objects back to Maps
            inMemoryStorage = {
                users: new Map(Object.entries(parsed.users || {})),
                threads: new Map(Object.entries(parsed.threads || {})),
                messages: new Map(Object.entries(parsed.messages || {})),
                conversations: new Map(Object.entries(parsed.conversations || {}))
            };
            console.log('✅ Loaded existing data from file');
        } else {
            console.log('✅ No existing data file, using fresh storage');
        }
    } catch (error) {
        console.log('⚠️ Error loading storage, using fresh:', error.message);
    }
}

// Save storage to file (only for local development)
function saveStorageToFile() {
    try {
        if (!STORAGE_FILE) {
            console.log('📝 Vercel environment - skipping file save (in-memory only)');
            return;
        }
        
        // Convert Maps to objects for JSON serialization
        const dataToSave = {
            users: Object.fromEntries(inMemoryStorage.users),
            threads: Object.fromEntries(inMemoryStorage.threads),
            messages: Object.fromEntries(inMemoryStorage.messages),
            conversations: Object.fromEntries(inMemoryStorage.conversations)
        };
        
        fs.writeFileSync(STORAGE_FILE, JSON.stringify(dataToSave, null, 2));
        console.log('✅ Saved storage to file');
    } catch (error) {
        console.log('⚠️ Error saving storage:', error.message);
    }
}

// Initialize with some sample data
function initInMemoryStorage() {
    console.log('✅ Initialized in-memory storage for Vercel deployment');
    
    // Load existing data from file
    loadStorageFromFile();
    
    // Add sample user if not exists
    if (!inMemoryStorage.users.has('1')) {
        inMemoryStorage.users.set('1', {
            id: '1',
            phone: '+1234567890',
            is_verified: true,
            created_at: new Date().toISOString()
        });
        console.log('✅ Added sample user');
    }
}

// Initialize storage
initInMemoryStorage();

// Thread Management Functions
function createThread(threadData) {
    const threadId = threadData.thread_id || `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const thread = {
        id: threadId,
        user_id: threadData.user_id || '1',
        title: threadData.title || 'New Chat',
        type: threadData.type || 'chat',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        subject: threadData.subject || null,
        grade: threadData.grade || null,
        field: threadData.field || null,
        chapter: threadData.chapter || null,
        book: threadData.book || null,
        messages: threadData.messages || []
    };
    
    inMemoryStorage.threads.set(threadId, thread);
    console.log('✅ Thread created:', threadId);
    
    // Save to file
    saveStorageToFile();
    
    return threadId;
}

function getThreads(userId, options = {}) {
    let threads = Array.from(inMemoryStorage.threads.values())
        .filter(thread => thread.user_id === userId)
        .filter(thread => !options.type || thread.type === options.type);
    
    // Add search functionality
    if (options.search && options.search.trim()) {
        const searchTerm = options.search.toLowerCase().trim();
        console.log(`🔍 Searching threads with term: "${searchTerm}"`);
        
        threads = threads.filter(thread => {
            // Search in thread title
            const titleMatch = thread.title && thread.title.toLowerCase().includes(searchTerm);
            
            // Search in thread summary
            const summaryMatch = thread.summary && thread.summary.toLowerCase().includes(searchTerm);
            
            // Search in recent messages
            let messageMatch = false;
            if (inMemoryStorage.messages.has(thread.thread_id)) {
                const messages = inMemoryStorage.messages.get(thread.thread_id);
                messageMatch = messages.some(msg => 
                    msg.content && msg.content.toLowerCase().includes(searchTerm)
                );
            }
            
            return titleMatch || summaryMatch || messageMatch;
        });
        
        console.log(`🔍 Found ${threads.length} threads matching search term`);
    }
    
    // Sort and paginate
    threads = threads
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(options.offset || 0, (options.offset || 0) + (options.limit || 20));
    
    console.log(`✅ Retrieved ${threads.length} threads for user ${userId}`);
    return threads;
}

function getThreadById(threadId) {
    const thread = inMemoryStorage.threads.get(threadId);
    if (thread) {
        console.log('✅ Thread found:', threadId);
    } else {
        console.log('❌ Thread not found:', threadId);
    }
    return thread;
}

function updateThread(threadId, updates) {
    const thread = inMemoryStorage.threads.get(threadId);
    if (thread) {
        Object.assign(thread, updates, { updated_at: new Date().toISOString() });
        inMemoryStorage.threads.set(threadId, thread);
        console.log('✅ Thread updated:', threadId);
        
        // Save to file
        saveStorageToFile();
        
        return true;
    }
    console.log('❌ Thread not found for update:', threadId);
    return false;
}

function deleteThread(threadId) {
    const deleted = inMemoryStorage.threads.delete(threadId);
    if (deleted) {
        console.log('✅ Thread deleted:', threadId);
    } else {
        console.log('❌ Thread not found for deletion:', threadId);
    }
    return deleted;
}

// Message Management Functions
function saveMessagesForThread(threadId, messages) {
    const thread = inMemoryStorage.threads.get(threadId);
    if (thread) {
        thread.messages = messages;
        thread.updated_at = new Date().toISOString();
        inMemoryStorage.threads.set(threadId, thread);
        console.log(`✅ Saved ${messages.length} messages for thread ${threadId}`);
        return true;
    }
    console.log('❌ Thread not found for saving messages:', threadId);
    return false;
}

function getMessagesForThread(threadId, limit = 50) {
    const thread = inMemoryStorage.threads.get(threadId);
    if (thread && thread.messages) {
        const messages = thread.messages.slice(-limit);
        console.log(`✅ Retrieved ${messages.length} messages for thread ${threadId}`);
        return messages;
    }
    console.log('❌ Thread or messages not found:', threadId);
    return [];
}

// Conversation Management Functions
function saveConversation(conversationData) {
    const sessionId = conversationData.session_id || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const conversation = {
        session_id: sessionId,
        user_id: conversationData.user_id || '1',
        title: conversationData.title || 'New Conversation',
        content: conversationData.content || '',
        type: conversationData.type || 'chat',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        subject: conversationData.subject || null,
        grade: conversationData.grade || null,
        field: conversationData.field || null,
        chapter: conversationData.chapter || null,
        book: conversationData.book || null,
        messages: conversationData.messages || []
    };
    
    inMemoryStorage.conversations.set(sessionId, conversation);
    console.log('✅ Conversation saved:', sessionId);
    return sessionId;
}

function getConversations(userId, type = null) {
    const conversations = Array.from(inMemoryStorage.conversations.values())
        .filter(conv => conv.user_id === userId)
        .filter(conv => !type || conv.type === type)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    console.log(`✅ Retrieved ${conversations.length} conversations for user ${userId}`);
    return conversations;
}

function getConversationById(sessionId) {
    const conversation = inMemoryStorage.conversations.get(sessionId);
    if (conversation) {
        console.log('✅ Conversation found:', sessionId);
    } else {
        console.log('❌ Conversation not found:', sessionId);
    }
    return conversation;
}

// User Management Functions
function createUser(userData) {
    const userId = userData.id || `user_${Date.now()}`;
    const user = {
        id: userId,
        phone: userData.phone,
        confirmation_code: userData.confirmation_code,
        is_verified: userData.is_verified || false,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString()
    };
    
    inMemoryStorage.users.set(userId, user);
    console.log('✅ User created:', userId);
    return userId;
}

function getUserById(userId) {
    const user = inMemoryStorage.users.get(userId);
    if (user) {
        console.log('✅ User found:', userId);
    } else {
        console.log('❌ User not found:', userId);
    }
    return user;
}

function getUserByPhone(phone) {
    const users = Array.from(inMemoryStorage.users.values());
    const user = users.find(u => u.phone === phone);
    if (user) {
        console.log('✅ User found by phone:', phone);
    } else {
        console.log('❌ User not found by phone:', phone);
    }
    return user;
}

function updateUser(userId, updates) {
    const user = inMemoryStorage.users.get(userId);
    if (user) {
        Object.assign(user, updates);
        inMemoryStorage.users.set(userId, user);
        console.log('✅ User updated:', userId);
        return true;
    }
    console.log('❌ User not found for update:', userId);
    return false;
}

// Add a single message to a thread
function addMessage(threadId, senderRole, content, metadata = {}, tokenCount = 0) {
    const thread = inMemoryStorage.threads.get(threadId);
    if (!thread) {
        throw new Error('Thread not found');
    }
    
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const message = {
        id: messageId,
        message_id: messageId,
        thread_id: threadId,
        sender_role: senderRole,
        content: content,
        metadata: metadata,
        token_count: tokenCount,
        created_at: new Date().toISOString()
    };
    
    // Add message to thread
    if (!thread.messages) {
        thread.messages = [];
    }
    thread.messages.push(message);
    
    // Update thread's last_message_at
    thread.updated_at = new Date().toISOString();
    
    // Save to file
    saveStorageToFile();
    
    return message;
}

function getRecentMessages(threadId, maxTokens = 4000) {
    const thread = inMemoryStorage.threads.get(threadId);
    if (thread && thread.messages) {
        // Simple token estimation (roughly 4 characters per token)
        const maxChars = maxTokens * 4;
        let totalChars = 0;
        const recentMessages = [];
        
        // Get messages from newest to oldest
        for (let i = thread.messages.length - 1; i >= 0; i--) {
            const message = thread.messages[i];
            const messageChars = JSON.stringify(message).length;
            
            if (totalChars + messageChars > maxChars && recentMessages.length > 0) {
                break;
            }
            
            recentMessages.unshift(message);
            totalChars += messageChars;
        }
        
        console.log(`✅ Retrieved ${recentMessages.length} recent messages for thread ${threadId}`);
        return recentMessages;
    }
    
    console.log('❌ Thread or messages not found:', threadId);
    return [];
}

function getThreadStats(userId) {
    const threads = Array.from(inMemoryStorage.threads.values())
        .filter(thread => thread.user_id === userId);
    
    const stats = {
        total_threads: threads.length,
        active_threads: threads.filter(t => !t.archived).length,
        archived_threads: threads.filter(t => t.archived).length,
        total_messages: threads.reduce((sum, t) => sum + (t.messages ? t.messages.length : 0), 0),
        threads_by_type: {}
    };
    
    // Count threads by type
    threads.forEach(thread => {
        const type = thread.type || 'chat';
        stats.threads_by_type[type] = (stats.threads_by_type[type] || 0) + 1;
    });
    
    console.log(`✅ Retrieved stats for user ${userId}:`, stats);
    return stats;
}

// Export functions
module.exports = {
    // Thread functions
    createThread,
    getThreads,
    getThreadById,
    updateThread,
    deleteThread,
    addMessage,
    saveMessagesForThread,
    getMessagesForThread,
    getRecentMessages,
    getThreadStats,
    
    // Conversation functions
    saveConversation,
    getConversations,
    getConversationById,
    
    // User functions
    createUser,
    getUserById,
    getUserByPhone,
    updateUser,
    
    // Storage access (for debugging)
    getStorage: () => inMemoryStorage
};
