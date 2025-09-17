const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('frontend'));

// Database setup
const db = new sqlite3.Database('conversations.db');

// Create tables
db.serialize(() => {
    // Threads table
    db.run(`
        CREATE TABLE IF NOT EXISTS threads (
            id TEXT PRIMARY KEY,
            title TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            deleted BOOLEAN DEFAULT 0
        )
    `);

    // Messages table
    db.run(`
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            thread_id TEXT,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (thread_id) REFERENCES threads (id)
        )
    `);
});

// API Routes

// Create a new thread
app.post('/api/threads', (req, res) => {
    const threadId = uuidv4();
    const { title } = req.body;
    
    db.run(
        'INSERT INTO threads (id, title) VALUES (?, ?)',
        [threadId, title || null],
        function(err) {
            if (err) {
                console.error('Error creating thread:', err);
                return res.status(500).json({ error: 'Failed to create thread' });
            }
            
            res.json({ 
                success: true, 
                thread_id: threadId,
                message: 'Thread created successfully'
            });
        }
    );
});

// Get all threads (excluding deleted)
app.get('/api/threads', (req, res) => {
    db.all(
        'SELECT * FROM threads WHERE deleted = 0 ORDER BY updated_at DESC',
        [],
        (err, rows) => {
            if (err) {
                console.error('Error fetching threads:', err);
                return res.status(500).json({ error: 'Failed to fetch threads' });
            }
            
            res.json({ 
                success: true, 
                threads: rows 
            });
        }
    );
});

// Get messages for a specific thread
app.get('/api/threads/:id/messages', (req, res) => {
    const threadId = req.params.id;
    
    db.all(
        'SELECT * FROM messages WHERE thread_id = ? ORDER BY timestamp ASC',
        [threadId],
        (err, rows) => {
            if (err) {
                console.error('Error fetching messages:', err);
                return res.status(500).json({ error: 'Failed to fetch messages' });
            }
            
            res.json({ 
                success: true, 
                messages: rows 
            });
        }
    );
});

// Add a new message to a thread
app.post('/api/threads/:id/messages', (req, res) => {
    const threadId = req.params.id;
    const { role, content } = req.body;
    
    if (!role || !content) {
        return res.status(400).json({ error: 'Role and content are required' });
    }
    
    const messageId = uuidv4();
    
    db.run(
        'INSERT INTO messages (id, thread_id, role, content) VALUES (?, ?, ?, ?)',
        [messageId, threadId, role, content],
        function(err) {
            if (err) {
                console.error('Error adding message:', err);
                return res.status(500).json({ error: 'Failed to add message' });
            }
            
            // Update thread's updated_at timestamp
            db.run(
                'UPDATE threads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [threadId],
                (err) => {
                    if (err) {
                        console.error('Error updating thread timestamp:', err);
                    }
                }
            );
            
            res.json({ 
                success: true, 
                message_id: messageId,
                message: 'Message added successfully'
            });
        }
    );
});

// Soft delete a thread
app.delete('/api/threads/:id', (req, res) => {
    const threadId = req.params.id;
    
    db.run(
        'UPDATE threads SET deleted = 1 WHERE id = ?',
        [threadId],
        function(err) {
            if (err) {
                console.error('Error deleting thread:', err);
                return res.status(500).json({ error: 'Failed to delete thread' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Thread not found' });
            }
            
            res.json({ 
                success: true, 
                message: 'Thread deleted successfully' 
            });
        }
    );
});

// Update thread title
app.put('/api/threads/:id', (req, res) => {
    const threadId = req.params.id;
    const { title } = req.body;
    
    db.run(
        'UPDATE threads SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [title, threadId],
        function(err) {
            if (err) {
                console.error('Error updating thread:', err);
                return res.status(500).json({ error: 'Failed to update thread' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Thread not found' });
            }
            
            res.json({ 
                success: true, 
                message: 'Thread updated successfully' 
            });
        }
    );
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Database initialized with tables: threads, messages');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});
