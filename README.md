# Chat Conversation Storage System

A complete chat application with conversation saving functionality, built with Express.js, SQLite, and a modern dark-themed UI.

## Features

- **Real-time Chat**: Send messages and receive AI responses
- **Conversation Storage**: All conversations are automatically saved to the database
- **Library View**: Browse and access saved conversations with a dark-themed UI
- **Thread Management**: Create, view, and manage conversation threads
- **Mobile Responsive**: Optimized for mobile devices

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

### 3. Access the Application

- **Chat Page**: `http://localhost:3000` (index.html)
- **Library**: `http://localhost:3000/library.html`
- **Test Page**: `http://localhost:3000/test.html`

## API Endpoints

### Threads
- `POST /api/threads` - Create a new thread
- `GET /api/threads` - List all threads
- `PUT /api/threads/:id` - Update thread title
- `DELETE /api/threads/:id` - Soft delete thread

### Messages
- `GET /api/threads/:id/messages` - Get messages in a thread
- `POST /api/threads/:id/messages` - Add message to thread

## Database Schema

### threads
- `id` (TEXT, PRIMARY KEY) - UUID
- `title` (TEXT) - Thread title
- `created_at` (DATETIME) - Creation timestamp
- `updated_at` (DATETIME) - Last update timestamp
- `deleted` (BOOLEAN) - Soft delete flag

### messages
- `id` (TEXT, PRIMARY KEY) - UUID
- `thread_id` (TEXT, FOREIGN KEY) - References threads.id
- `role` (TEXT) - 'user' | 'assistant' | 'system'
- `content` (TEXT) - Message content
- `timestamp` (DATETIME) - Message timestamp

## How It Works

1. **Starting a Conversation**: When you send your first message, a new thread is automatically created
2. **Saving Messages**: Both user and AI messages are saved to the database
3. **Library Access**: View all saved conversations in the library with a dark-themed interface
4. **Thread Loading**: Click on any conversation in the library to load it in the chat

## File Structure

```
├── server.js              # Express server with API endpoints
├── package.json           # Dependencies and scripts
├── conversations.db       # SQLite database (created automatically)
└── frontend/
    ├── index.html         # Main chat interface
    ├── library.html       # Library/conversations view
    └── test.html          # Test page
```

## Development

For development with auto-restart:

```bash
npm run dev
```

## Features Implemented

✅ **Backend Server**: Express.js with SQLite database  
✅ **API Endpoints**: Complete CRUD operations for threads and messages  
✅ **Dark UI Library**: Matches the provided design with conversation cards  
✅ **Auto-save**: Conversations are automatically saved as you chat  
✅ **Thread Management**: Create, view, and manage conversation threads  
✅ **Mobile Responsive**: Optimized for mobile devices  
✅ **Real-time Chat**: Seamless chat experience with AI responses  

The system is now ready to use! Start chatting and your conversations will be automatically saved to the library.