# 🚀 Deployment Guide - مِنو (Meno) Educational App

## Quick Deployment Options

### 1. Vercel (Recommended) ⚡

**One-Click Deploy:**
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/alirezapro11/highschool)

**Manual Deployment:**
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
```

**Environment Variables for Vercel:**
- `API_KEY`: Your Liara AI API key
- `API_BASE_URL`: https://ai.liara.ir/api/v1/your_endpoint
- `API_MODEL`: openai/gpt-4.1
- `NODE_ENV`: production

### 2. Railway 🚂

```bash
# Connect GitHub repository
# Railway will auto-detect Node.js
# Set environment variables in Railway dashboard
```

**Railway Environment Variables:**
- `API_KEY`: Your Liara AI API key
- `API_BASE_URL`: https://ai.liara.ir/api/v1/your_endpoint
- `API_MODEL`: openai/gpt-4.1
- `PORT`: 3000

### 3. Render 🌐

```bash
# Connect GitHub repository
# Set build command: npm install
# Set start command: npm start
# Set environment variables
```

**Render Configuration:**
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment**: Node.js
- **Auto-Deploy**: Yes

### 4. Heroku 🟣

```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create app
heroku create meno-educational-app

# Set environment variables
heroku config:set API_KEY=your_api_key
heroku config:set API_BASE_URL=your_endpoint_url
heroku config:set API_MODEL=openai/gpt-4.1
heroku config:set NODE_ENV=production

# Deploy
git push heroku main
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `API_KEY` | Liara AI API key | `sk-1234567890abcdef` |
| `API_BASE_URL` | Liara AI endpoint URL | `https://ai.liara.ir/api/v1/chat` |
| `API_MODEL` | AI model identifier | `openai/gpt-4.1` |
| `NODE_ENV` | Environment mode | `production` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | Database connection | In-memory storage |

## Pre-Deployment Checklist

### ✅ Code Quality
- [ ] All features tested locally
- [ ] No console errors in browser
- [ ] Mobile responsiveness verified
- [ ] Persian language support working
- [ ] MathJax rendering correctly
- [ ] Search functionality working

### ✅ Performance
- [ ] Page load times optimized
- [ ] Images optimized
- [ ] CSS/JS minified
- [ ] Caching headers set
- [ ] Mobile performance tested

### ✅ Security
- [ ] Environment variables secured
- [ ] API keys not exposed
- [ ] CORS configured properly
- [ ] Input validation implemented
- [ ] Rate limiting enabled

### ✅ Configuration
- [ ] `package.json` updated
- [ ] `vercel.json` configured
- [ ] Environment variables documented
- [ ] Deployment scripts ready
- [ ] README updated

## Post-Deployment Testing

### 1. Basic Functionality
- [ ] Home page loads correctly
- [ ] Chat interface works
- [ ] AI responses stream properly
- [ ] Search functionality works
- [ ] Mobile experience is smooth

### 2. API Testing
- [ ] Chat API responds correctly
- [ ] Analysis API works
- [ ] Thread management works
- [ ] Search API returns results
- [ ] Error handling works

### 3. Performance Testing
- [ ] Page load times < 3 seconds
- [ ] Mobile performance good
- [ ] Streaming responses smooth
- [ ] No memory leaks
- [ ] CDN caching working

## Troubleshooting

### Common Issues

**1. Environment Variables Not Set**
```bash
# Check if variables are set
vercel env ls
# Add missing variables
vercel env add API_KEY
```

**2. API Connection Issues**
```bash
# Test API endpoint
curl -X POST https://your-app.vercel.app/api/chat/stream
```

**3. Build Failures**
```bash
# Check build logs
vercel logs
# Fix dependency issues
npm install
```

**4. CORS Issues**
```bash
# Check CORS configuration in server.js
# Ensure proper headers are set
```

### Performance Issues

**1. Slow Loading**
- Optimize images
- Enable CDN caching
- Minify CSS/JS
- Use compression

**2. Memory Issues**
- Check for memory leaks
- Optimize database queries
- Implement proper caching

**3. API Rate Limits**
- Implement proper rate limiting
- Add retry logic
- Monitor API usage

## Monitoring & Maintenance

### 1. Performance Monitoring
- Set up Vercel Analytics
- Monitor Core Web Vitals
- Track API response times
- Monitor error rates

### 2. User Analytics
- Track user engagement
- Monitor feature usage
- Analyze performance metrics
- Collect user feedback

### 3. Regular Maintenance
- Update dependencies monthly
- Monitor security vulnerabilities
- Backup data regularly
- Test new features thoroughly

## Support & Resources

### Documentation
- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [Render Documentation](https://render.com/docs)
- [Heroku Documentation](https://devcenter.heroku.com)

### Community
- [GitHub Issues](https://github.com/your-username/meno-educational-app/issues)
- [Discussions](https://github.com/your-username/meno-educational-app/discussions)
- [Discord Community](https://discord.gg/your-discord)

### Professional Support
- Email: support@meno-educational.com
- Documentation: https://docs.meno-educational.com
- Status Page: https://status.meno-educational.com

---

**Ready to deploy? Choose your platform and follow the steps above! 🚀**