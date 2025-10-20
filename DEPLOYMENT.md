# Vercel Deployment Guide

## Prerequisites

1. Vercel account (https://vercel.com)
2. GitHub repository connected to Vercel
3. PostgreSQL database (e.g., Vercel Postgres, Supabase, or Railway)

## Deployment Steps

### 1. Install Vercel CLI (Optional)

```bash
npm install -g vercel
```

### 2. Configure Environment Variables

In your Vercel project dashboard, add the following environment variables:

```
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_api_secret
BINANCE_TESTNET=true  # or false for production
DEEPSEEK_API_KEY=your_deepseek_api_key
DATABASE_URL=postgresql://user:password@host:port/database
```

### 3. Deploy via GitHub (Recommended)

1. Go to https://vercel.com/new
2. Import your GitHub repository (https://github.com/yordyi/AItradeQ)
3. Configure project settings:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`
4. Add environment variables from step 2
5. Click "Deploy"

### 4. Deploy via CLI (Alternative)

```bash
# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Set environment variables
vercel env add BINANCE_API_KEY
vercel env add BINANCE_API_SECRET
vercel env add BINANCE_TESTNET
vercel env add DEEPSEEK_API_KEY
vercel env add DATABASE_URL
```

### 5. Database Setup

After deployment, run Prisma migrations:

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Or using Vercel CLI
vercel env pull .env.local
npm run db:migrate
```

## Post-Deployment

### 1. Configure Domain (Optional)

- Go to your Vercel project settings
- Add custom domain under "Domains"
- Update DNS records as instructed

### 2. Enable Automatic Deployments

- Automatic deployments are enabled by default for main branch
- Push to GitHub main branch to trigger new deployment

### 3. Monitor Deployment

- Check deployment logs in Vercel dashboard
- Monitor function executions and errors
- Set up error tracking (e.g., Sentry)

## Vercel Configuration

The project includes `vercel.json` with the following configuration:

- **Region**: Singapore (sin1) - Closest to Binance servers
- **Framework**: Next.js
- **Environment Variables**: Automatically loaded from project settings

## API Routes

All API routes are serverless functions deployed automatically:

- `/api/account` - Account information
- `/api/positions` - Current positions
- `/api/trades` - Trade history
- `/api/pnl-history` - PnL data over time

## Performance Optimization

1. **Edge Functions**: Consider using Edge Runtime for faster response times
2. **Caching**: Implement caching for frequently accessed data
3. **Database**: Use connection pooling for PostgreSQL (e.g., PgBouncer)

## Troubleshooting

### Build Errors

```bash
# Clear cache and rebuild
vercel build --debug
```

### Database Connection Issues

- Ensure DATABASE_URL is correctly formatted
- Check PostgreSQL connection limits
- Use connection pooling for better performance

### API Timeout

- Vercel serverless functions have 10s timeout on Hobby plan
- Upgrade to Pro for 60s timeout if needed
- Consider moving long-running tasks to background jobs

## Cost Estimation

**Hobby Plan (Free)**:
- 100GB bandwidth/month
- Unlimited deployments
- Serverless function execution (100GB-hours/month)

**Pro Plan ($20/month)**:
- 1TB bandwidth/month
- Longer function timeouts
- Advanced analytics
- Team collaboration

## Security

1. Never commit `.env` or `.env.local` files
2. Use Vercel's encrypted environment variables
3. Enable HTTPS (automatic on Vercel)
4. Implement rate limiting for API routes
5. Use Binance testnet for development

## Useful Commands

```bash
# Check deployment status
vercel ls

# View deployment logs
vercel logs

# Rollback to previous deployment
vercel rollback

# Remove deployment
vercel remove [deployment-id]
```

## Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
