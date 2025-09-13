# مِنو (Meno) - AI-Powered Educational Platform

<div align="center">
  <img src="https://img.shields.io/badge/Version-1.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/Node.js-16+-green.svg" alt="Node.js">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License">
  <img src="https://img.shields.io/badge/Deployment-Vercel-black.svg" alt="Deployment">
</div>

## 🎓 Overview

**مِنو (Meno)** is an intelligent educational platform designed for high school students, featuring AI-powered conversations, comprehensive test analysis, and interactive learning experiences. Built with Node.js backend and modern HTML/Tailwind CSS frontend, the app provides a complete educational ecosystem similar to Iran's Konkour exam system.

### 🌟 Key Features

- **🤖 AI-Powered Chat**: GPT-4.1 powered educational conversations
- **📚 Comprehensive Testing**: Grade-specific question banks (10th, 11th, 12th)
- **🔍 Smart Analysis**: AI-powered question analysis and explanations
- **📱 Mobile-First Design**: Responsive design optimized for all devices
- **🇮🇷 Persian Language**: Full Farsi language support with RTL layout
- **⚡ Real-time Streaming**: Live response streaming for enhanced UX
- **🎯 Interactive Learning**: Socratic method with follow-up questions

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm 8+
- Modern web browser
- Liara AI API key

### Installation

```bash
# Clone the repository
git clone https://github.com/alirezagol123/educational-app.git
cd educational-app

# Install dependencies
npm install

# Set up environment variables
cp config.env.example config.env
# Edit config.env with your API credentials

# Start development server
npm run dev
```

### Environment Setup

Create a `config.env` file in the root directory:

```env
# Liara AI Configuration
API_KEY=your_liara_ai_api_key_here
API_BASE_URL=https://ai.liara.ir/api/v1/your_endpoint
API_MODEL=openai/gpt-4.1

# Server Configuration
PORT=3000
NODE_ENV=production

# Optional: Database Configuration
DATABASE_URL=your_database_url_here
```

## 🏗️ Architecture

### Backend (Node.js + Express)
- **Framework**: Express.js with comprehensive middleware
- **AI Integration**: Liara AI API with GPT-4.1 model
- **Memory Management**: Sliding window algorithm for conversation history
- **Streaming**: Server-Sent Events (SSE) for real-time responses
- **Security**: CORS, Helmet, Rate limiting, Input validation
- **Database**: In-memory storage with Vercel-compatible persistence

### Frontend (HTML + Tailwind CSS)
- **Responsive Design**: Mobile-first approach with professional UI
- **Modern UI/UX**: Clean, intuitive interface with Persian RTL support
- **Real-time Updates**: Streaming responses with typewriter effect
- **Progressive Web App**: App-like experience with smooth animations
- **MathJax Integration**: Comprehensive mathematical formula rendering

## 📁 Project Structure

```
meno-educational-app/
├── backend/
│   ├── server.js              # Main Express server
│   ├── database-vercel.js     # Database layer
│   └── config.env             # Environment variables
├── frontend/
│   ├── index.html             # Main chat interface
│   ├── library.html           # Conversation library
│   ├── test.html              # Test selection page
│   ├── chapters.html          # Chapter navigation
│   ├── question-analysis.html # Question display
│   ├── analysis-results.html  # Results and analysis
│   └── assets/                # Images and resources
├── package.json               # Dependencies and scripts
├── vercel.json                # Vercel deployment config
└── README.md                  # This file
```

## 🌐 API Endpoints

### Chat System
- `POST /api/chat/stream` - Streaming chat responses
- `POST /api/chat/analysis/stream` - Streaming question analysis
- `POST /api/chat/result-evaluation` - Question result evaluation
- `POST /api/chat/help-question/stream` - Streaming help questions
- `POST /api/chat/custom-question/stream` - Custom question responses

### Thread Management
- `GET /api/threads` - Get user threads with search
- `POST /api/threads` - Create new thread
- `PUT /api/threads/:id` - Update thread
- `DELETE /api/threads/:id` - Delete thread
- `GET /api/threads/:id/messages` - Get thread messages

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/verify` - Phone verification
- `POST /api/auth/login` - User login

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel --prod
   ```

3. **Set Environment Variables** in Vercel Dashboard:
   - `API_KEY`: Your Liara AI API key
   - `API_BASE_URL`: Liara AI endpoint URL
   - `API_MODEL`: `openai/gpt-4.1`
   - `NODE_ENV`: `production`

### Alternative Platforms

#### Railway
```bash
# Connect GitHub repository
# Set environment variables
# Deploy automatically
```

#### Render
```bash
# Connect GitHub repository
# Set build command: npm install
# Set start command: npm start
# Set environment variables
```

#### Heroku
```bash
# Install Heroku CLI
heroku create meno-educational-app
heroku config:set API_KEY=your_api_key
heroku config:set API_BASE_URL=your_endpoint_url
git push heroku main
```

### Environment Variables for Production

| Variable | Description | Example |
|----------|-------------|---------|
| `API_KEY` | Liara AI API key | `sk-...` |
| `API_BASE_URL` | Liara AI endpoint | `https://ai.liara.ir/api/v1/...` |
| `API_MODEL` | AI model name | `openai/gpt-4.1` |
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `3000` |

## 🧪 Testing

### Manual Testing Checklist

- [ ] **Chat Functionality**: Test streaming responses
- [ ] **Search Feature**: Test library search functionality
- [ ] **Test Navigation**: Verify all page transitions
- [ ] **Question Analysis**: Test AI-powered analysis
- [ ] **Mobile Experience**: Test on various devices
- [ ] **Cross-Browser**: Test in Chrome, Firefox, Safari
- [ ] **MathJax Rendering**: Test mathematical formulas
- [ ] **Persian Language**: Test RTL layout and Persian text

### Performance Testing

- [ ] **Loading Speed**: Test initial page load
- [ ] **Streaming Performance**: Test response streaming
- [ ] **Mobile Performance**: Test on mobile devices
- [ ] **Memory Usage**: Monitor memory consumption
- [ ] **API Response Time**: Test API endpoint performance

## 🔧 Development

### Available Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm run dev:clean  # Clean restart (Windows)
npm run frontend   # Start frontend development server
npm run build      # Build for production
npm run deploy     # Deploy to Vercel
npm run preview    # Preview Vercel deployment
```

### Development Workflow

1. **Local Development**:
   ```bash
   npm run dev
   # Server runs on http://localhost:3000
   ```

2. **Frontend Development**:
   ```bash
   npm run frontend
   # Live server for frontend development
   ```

3. **Testing Changes**:
   ```bash
   # Test locally
   npm run dev:simple
   
   # Test production build
   npm start
   ```

## 📱 Mobile Features

### Responsive Design
- **Mobile-First**: Optimized for mobile devices
- **Touch-Friendly**: Large touch targets and smooth interactions
- **Performance**: Optimized loading and smooth animations
- **App-Like**: Native app feel with modern web technologies

### Progressive Web App Features
- **Offline Ready**: Static pages work without internet
- **App Manifest**: Installable on mobile devices
- **Service Worker**: Caching for better performance
- **Responsive Images**: Optimized for different screen sizes

## 🔒 Security Features

- **Input Validation**: XSS and injection protection
- **CORS Configuration**: Proper cross-origin handling
- **Rate Limiting**: API abuse prevention
- **Environment Security**: Secure configuration management
- **HTTPS Ready**: Secure deployment configuration
- **Helmet.js**: Security headers and protection

## 🌍 Internationalization

### Persian (Farsi) Support
- **RTL Layout**: Right-to-left text direction
- **Persian Typography**: Proper font rendering
- **Localized Content**: Persian language throughout
- **Cultural Adaptation**: Iran-specific educational content

### Language Features
- **Bidirectional Text**: Proper RTL/LTR handling
- **Persian Numbers**: Localized number formatting
- **Cultural Context**: Iran-specific educational content
- **Font Optimization**: Persian-friendly font loading

## 📊 Performance Optimization

### Frontend Optimizations
- **Lazy Loading**: Images and components loaded on demand
- **Code Splitting**: Modular JavaScript loading
- **CSS Optimization**: Tailwind CSS with purging
- **Image Optimization**: WebP format with fallbacks
- **Caching Strategy**: Browser and CDN caching

### Backend Optimizations
- **Memory Management**: Sliding window conversation history
- **Streaming Responses**: Real-time response delivery
- **Database Optimization**: Efficient query patterns
- **Caching Headers**: Mobile-friendly caching strategies
- **Compression**: Gzip compression for responses

## 🔮 Future Roadmap

### Planned Features
- [ ] **User Authentication**: Complete login/registration system
- [ ] **Progress Tracking**: Learning analytics dashboard
- [ ] **Advanced Analytics**: Detailed performance metrics
- [ ] **Offline Support**: Offline question bank
- [ ] **Social Features**: Study groups and collaboration
- [ ] **Gamification**: Points, badges, and achievements
- [ ] **Multi-language**: English language support
- [ ] **Advanced Search**: Semantic search capabilities

### Technical Improvements
- [ ] **Database Integration**: PostgreSQL/MongoDB integration
- [ ] **User Profiles**: Comprehensive user management
- [ ] **Advanced Caching**: Redis caching layer
- [ ] **Performance Monitoring**: Real-time performance tracking
- [ ] **A/B Testing**: Feature flag system
- [ ] **CI/CD Pipeline**: Automated testing and deployment
- [ ] **API Documentation**: OpenAPI/Swagger documentation
- [ ] **Error Tracking**: Comprehensive error monitoring

## 🤝 Contributing

### Development Process
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Standards
- **JavaScript**: ES6+ with modern syntax
- **CSS**: Tailwind CSS with custom classes
- **HTML**: Semantic markup with accessibility
- **Performance**: Optimized loading and rendering
- **Documentation**: Comprehensive code comments

### Pull Request Guidelines
- Clear description of changes
- Include tests for new features
- Update documentation as needed
- Follow existing code style
- Ensure mobile compatibility

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- **Code Comments**: Comprehensive inline documentation
- **API Documentation**: Backend endpoint documentation
- **Deployment Guide**: Step-by-step deployment instructions

### Getting Help
- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Community discussions and Q&A
- **Email Support**: Direct support for critical issues

### Community
- **GitHub Discussions**: Community support and ideas
- **Contributors**: List of project contributors
- **Changelog**: Version history and updates

## 🎯 Current Status

### ✅ Production Ready Features
- **Main Chat Interface**: Full AI-powered conversations
- **Library System**: Thread management and search
- **Test System**: Complete question analysis
- **Mobile Experience**: Responsive design for all devices
- **Persian Language**: Full RTL and language support
- **MathJax Integration**: Comprehensive math rendering
- **Search Functionality**: Thread search and filtering
- **Streaming Responses**: Real-time AI responses

### 🚧 In Development
- **User Authentication**: Complete login system
- **Progress Tracking**: Learning analytics
- **Advanced Features**: More interactive elements
- **Performance Monitoring**: Real-time metrics

---

<div align="center">
  <h3>مِنو - Where Learning Begins 🎓</h3>
  <p>Empowering students with AI-driven education</p>
  
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/alirezagol123/educational-app)
[![Deploy with Railway](https://railway.app/button.svg)](https://railway.app/template/your-template-id)
</div>

---

**Built with ❤️ for Iranian students and educators worldwide**