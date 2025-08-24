# مِنو (Meno) - High School Educational App with LLM Integration

## Overview
مِنو is an intelligent educational platform designed for high school students, featuring AI-powered conversations, comprehensive test analysis, and interactive learning experiences. Built with Node.js backend and modern HTML/Tailwind CSS frontend, the app provides a complete educational ecosystem similar to Iran's Konkour exam system.

## ✨ Features

### 1. 🏠 Main Page
- **Professional Design**: Scientific formulas and mathematical notation background
- **"Where Learning Begins"**: Centered welcome message in English
- **Responsive Layout**: Mobile-friendly design with pale gradient backgrounds
- **Navigation**: Seamless access to chat and test features

### 2. 💬 Smart Chat System
- **LLM-Powered Conversations**: Intelligent responses using Liara AI API (GPT-4.1)
- **Socratic Learning Tutor**: AI persona designed for educational guidance
- **Persian Language Support**: Full Farsi language integration
- **Sliding Window Memory**: Efficient conversation history management (10 messages)
- **Streaming Responses**: Real-time typewriter effect for enhanced user experience
- **Smart Context Management**: Maintains conversation relevance while optimizing response speed

### 3. 📝 Test Analysis & Assessment
- **Grade Selection**: 10th, 11th, 12th grade support (دهم، یازدهم، دوازدهم)
- **Field Selection**: Experimental and Mathematics fields
- **Subject Coverage**: Biology, Mathematics, Physics, Chemistry, Literature, History
- **Chapter Navigation**: Organized chapter-based learning structure
- **Question Bank**: Comprehensive Konkour-style questions with detailed analysis

### 4. 🔍 Question Analysis System
- **Interactive Questions**: Multiple-choice questions with real-time feedback
- **AI-Powered Evaluation**: Instant correctness assessment
- **Detailed Analysis**: Step-by-step problem-solving explanations
- **Performance Tracking**: Visual representation of learning progress
- **Help Questions**: AI-generated follow-up questions for deeper learning

### 5. 🎯 Educational Content
- **Subject-Specific Testing**: Tailored content for each academic field
- **Adaptive Learning**: Personalized content based on student performance
- **Interactive Explanations**: Comprehensive problem-solving guidance
- **Practice Exercises**: Unlimited practice with instant AI feedback

## 🏗️ Technical Architecture

### Backend (Node.js)
- **Framework**: Express.js with comprehensive middleware
- **LLM Integration**: Liara AI API with GPT-4.1 model
- **Memory Management**: Sliding window algorithm for conversation history
- **Streaming**: Server-Sent Events (SSE) for real-time responses
- **Security**: CORS, Helmet, Rate limiting, Input validation
- **Performance**: Optimized for mobile with cache headers

### Frontend (HTML + Tailwind CSS)
- **Responsive Design**: Mobile-first approach with professional UI
- **Modern UI/UX**: Clean, intuitive interface with Persian RTL support
- **Real-time Updates**: Streaming responses with typewriter effect
- **Progressive Web App**: App-like experience with smooth animations
- **Accessibility**: WCAG compliant design with proper contrast

### Key Technologies
- **Backend**: Node.js, Express.js, Axios, CORS, Helmet
- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript (ES6+)
- **AI/ML**: Liara AI API, GPT-4.1, Streaming responses
- **Real-time**: Server-Sent Events (SSE), Fetch API
- **Styling**: Tailwind CSS, Custom CSS animations
- **Deployment**: Vercel-ready with environment configuration

## 📁 Project Structure
```
meno-educational-app/
├── backend/
│   ├── server.js              # Main Express server
│   ├── config.env             # Environment variables
│   └── package.json           # Dependencies
├── frontend/
│   ├── index.html             # Main page
│   ├── chat.html              # Chat interface
│   ├── test.html              # Test selection page
│   ├── chapters.html          # Chapter navigation
│   ├── question-analysis.html # Question display
│   ├── analysis-results.html  # Results and analysis
│   └── assets/                # Images and resources
├── vercel.json                # Deployment configuration
└── README.md                  # This file
```

## 🚀 Core Components

### 1. Chat Engine
- **Conversation Manager**: Handles chat flow and context
- **Memory Buffer**: Sliding window implementation (10 messages)
- **Response Generator**: Liara AI integration with streaming
- **Context Analyzer**: Maintains conversation relevance
- **Persian Support**: Full Farsi language integration

### 2. Test Engine
- **Grade Selection**: Interactive grade selection with bottom sheet
- **Field Selection**: Experimental vs Mathematics field choice
- **Subject Navigation**: Chapter-based learning structure
- **Question Display**: Interactive question interface
- **Performance Analytics**: Detailed student insights

### 3. Analysis System
- **AI Evaluation**: Instant correctness assessment
- **Detailed Analysis**: Comprehensive problem explanations
- **Help Questions**: AI-generated follow-up questions
- **Interactive Responses**: Clickable help questions with streaming answers
- **Progress Tracking**: Visual learning indicators

## ⚙️ Installation & Setup

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Modern web browser
- Liara AI API key

### Backend Setup
```bash
cd backend
npm install
# Create config.env file with your API credentials
npm start
```

### Frontend Setup
```bash
cd frontend
# Open index.html in browser or use live server
# All pages are self-contained and ready to use
```

## 🔐 Environment Variables
```env
# Backend Configuration
API_KEY=your_liara_ai_api_key
API_BASE_URL=https://ai.liara.ir/api/v1/your_endpoint
API_MODEL=openai/gpt-4.1
PORT=3000
NODE_ENV=development
```

## 🌐 API Endpoints

### Chat System
- `POST /api/chat/stream` - Streaming chat responses
- `POST /api/chat/analysis/stream` - Streaming question analysis
- `POST /api/chat/result-evaluation` - Question result evaluation
- `POST /api/chat/help-question/stream` - Streaming help question responses

### Test System
- **Static Pages**: All test functionality is frontend-based
- **Question Bank**: Built-in question database
- **Analysis Engine**: AI-powered question analysis
- **Progress Tracking**: Visual learning indicators

## 🎨 UI/UX Features

### Design System
- **Color Scheme**: Professional pale gradients with blue accents
- **Typography**: Inter font family with Persian RTL support
- **Layout**: Mobile-first responsive design
- **Animations**: Smooth transitions and hover effects
- **Icons**: Custom SVG icons with consistent styling

### Navigation
- **Bottom Navigation**: Three mobile-friendly icons (Chat, Test, Profile)
- **Header Design**: Clean headers with back buttons
- **Page Transitions**: Smooth navigation between sections
- **Responsive Layout**: Optimized for all screen sizes

## 📱 Mobile Experience

### Responsive Design
- **Mobile-First**: Optimized for mobile devices
- **Touch-Friendly**: Large touch targets and smooth interactions
- **Performance**: Optimized loading and smooth animations
- **Offline Ready**: Static pages work without internet
- **App-Like**: Native app feel with modern web technologies

### Performance Features
- **Fast Loading**: Optimized assets and minimal dependencies
- **Smooth Scrolling**: Native-like scrolling experience
- **Efficient Rendering**: Optimized DOM manipulation
- **Cache Headers**: Mobile-friendly caching strategies

## 🔒 Security Features
- **Input Validation**: XSS and injection protection
- **CORS Configuration**: Proper cross-origin handling
- **Rate Limiting**: API abuse prevention
- **Environment Security**: Secure configuration management
- **HTTPS Ready**: Secure deployment configuration

## 🚀 Deployment

### Vercel Deployment (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project root
vercel

# Set environment variables in Vercel dashboard
```

### Alternative Platforms
- **Railway**: Easy Node.js deployment
- **Render**: Free tier available
- **Heroku**: Traditional deployment option

### Environment Setup
1. Set `API_KEY` in deployment platform
2. Set `API_BASE_URL` for Liara AI
3. Set `API_MODEL` to `openai/gpt-4.1`
4. Deploy and test functionality

## 🧪 Testing

### Manual Testing
- **Chat Functionality**: Test streaming responses
- **Test Navigation**: Verify all page transitions
- **Question Analysis**: Test AI-powered analysis
- **Mobile Experience**: Test on various devices
- **Cross-Browser**: Test in different browsers

### Quality Assurance
- **Responsive Design**: All screen sizes
- **Performance**: Loading speed and animations
- **Accessibility**: Keyboard navigation and screen readers
- **Cross-Platform**: iOS, Android, Desktop

## 📈 Performance Features

### Sliding Window Memory
- **Efficient Storage**: Only keeps recent conversation context
- **Speed Optimization**: Faster response generation
- **Memory Management**: Automatic cleanup of old conversations
- **Context Preservation**: Maintains conversation flow

### Streaming Responses
- **Real-time Display**: Typewriter effect for responses
- **User Engagement**: Progressive information reveal
- **Performance**: Reduced perceived loading time
- **Interactive Experience**: Users see responses being generated

## 🌍 Language Support

### Persian (Farsi) Integration
- **Full RTL Support**: Right-to-left text direction
- **Persian Typography**: Proper font rendering
- **Localized Content**: Persian language throughout
- **Cultural Adaptation**: Iran-specific educational content

### English Elements
- **"Where Learning Begins"**: Main page welcome message
- **Technical Terms**: Some UI elements in English
- **Code Comments**: Development documentation

## 🔮 Future Enhancements

### Planned Features
- [ ] User authentication system
- [ ] Progress tracking dashboard
- [ ] More subject coverage
- [ ] Advanced analytics
- [ ] Offline question bank
- [ ] Social learning features

### Technical Improvements
- [ ] Database integration
- [ ] User profiles and history
- [ ] Advanced caching
- [ ] Performance monitoring
- [ ] A/B testing framework

## 🤝 Contributing

### Development Process
1. Fork the repository
2. Create feature branch
3. Implement changes with testing
4. Submit pull request
5. Code review and approval

### Code Standards
- **JavaScript**: ES6+ with modern syntax
- **CSS**: Tailwind CSS with custom classes
- **HTML**: Semantic markup with accessibility
- **Performance**: Optimized loading and rendering

## 📄 License
MIT License - see LICENSE file for details

## 🆘 Support

### Documentation
- **Code Comments**: Comprehensive inline documentation
- **README**: This comprehensive guide
- **API Documentation**: Backend endpoint documentation

### Getting Help
- **GitHub Issues**: Bug reports and feature requests
- **Code Review**: Pull request feedback
- **Community**: Educational app development discussions

## 🎯 Current Status

### ✅ Implemented Features
- **Main Page**: Professional design with scientific background
- **Chat System**: Full LLM integration with streaming
- **Test Navigation**: Complete grade and field selection
- **Chapter System**: Subject-based chapter navigation
- **Question Analysis**: AI-powered question evaluation
- **Results Display**: Comprehensive analysis with help questions
- **Mobile Experience**: Responsive design for all devices
- **Persian Support**: Full RTL and language integration

### 🚧 In Development
- **User Authentication**: Login and registration system
- **Progress Tracking**: Learning analytics dashboard
- **Advanced Features**: More interactive elements

---

**مِنو - Where Learning Begins** 🎓

This educational app provides a complete learning experience for high school students, combining modern web technologies with AI-powered education. The app is production-ready and can be deployed immediately to provide value to students and educators.
