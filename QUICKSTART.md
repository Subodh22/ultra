# Quick Start Guide

Get Ultra Learning running in 5 minutes!

## Prerequisites Check

```bash
node --version  # Should be v20.x or higher
npm --version   # Should be v10.x or higher
```

## Setup Steps

### 1. Install Dependencies (2 min)
```bash
npm install
```

### 2. Set Up Services (Required - see SETUP_GUIDE.md for details)

You'll need accounts and API keys for:
- **Supabase** (Database + Auth + Storage) - [supabase.com](https://supabase.com)
- **OpenAI** (AI Processing) - [platform.openai.com](https://platform.openai.com)
- **Google Cloud** (Calendar API) - [console.cloud.google.com](https://console.cloud.google.com)

### 3. Configure Environment
Create `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=your_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_key_here
OPENAI_API_KEY=your_openai_key_here
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_secret_here
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
```

### 4. Set Up Database
1. Go to your Supabase project
2. SQL Editor → New Query
3. Copy/paste contents of `supabase/schema.sql`
4. Run the query

### 5. Run the App
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## First Steps in the App

1. **Create Account**: Sign up with email or Google
2. **Upload a Note**: Go to Notes → Upload a PDF or text file
3. **Wait for Processing**: AI will extract flashcards (~30-60 seconds)
4. **Start Practicing**: Go to Practice → Review your cards
5. **Connect Calendar**: Settings → Connect Google Calendar

## Troubleshooting

### Build Errors
```bash
# Clear cache and reinstall
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

### Connection Errors
- Verify all environment variables are set
- Check Supabase project is active
- Ensure OpenAI API has billing enabled

### Processing Not Working
- Check browser console for errors
- Verify OpenAI API key is valid
- Check Supabase logs in dashboard

## Estimated Costs

- **Supabase Free Tier**: Sufficient for development (500MB DB, 1GB storage)
- **OpenAI (GPT-4o-mini)**: ~$0.01-0.03 per note
- **Google Calendar API**: Free

### Monthly Estimate for Active Use:
- Process 100 notes: ~$2-3
- Total: **< $5/month** for moderate use

## Development Commands

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run start    # Run production build
npm run lint     # Check code quality
```

## File Structure

```
ultra/
├── app/
│   ├── (auth)/              # Login/Signup pages
│   ├── (dashboard)/         # Main app pages
│   ├── api/                 # API endpoints
│   └── page.tsx             # Landing page
├── components/
│   ├── ui/                  # shadcn components
│   └── *.tsx                # App components
├── lib/
│   ├── supabase/            # DB client
│   ├── openai.ts            # AI integration
│   ├── spaced-repetition.ts # SM-2 algorithm
│   └── google-calendar.ts   # Calendar API
└── supabase/
    └── schema.sql           # Database schema
```

## Need More Help?

- **Detailed Setup**: See `SETUP_GUIDE.md`
- **Full Documentation**: See `README.md`
- **Issues**: Check browser console and Supabase logs

## What's Next?

After setup:
1. Upload your first study notes
2. Review the generated flashcards
3. Practice with spaced repetition
4. Schedule sessions in Google Calendar
5. Track your progress on the dashboard

Happy learning! 🚀

