# Ultra Learning - Detailed Setup Guide

This guide will walk you through setting up the Ultra Learning application step by step.

## 1. Supabase Setup (15 minutes)

### Create Project
1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - **Name**: ultra-learning
   - **Database Password**: (generate a strong password)
   - **Region**: Choose closest to you
4. Wait for project to be created (~2 minutes)

### Configure Database
1. Go to **SQL Editor** in the left sidebar
2. Click "New Query"
3. Copy the entire contents of `supabase/schema.sql`
4. Paste into the editor
5. Click "Run" - you should see "Success. No rows returned"

### Set Up Storage
The schema already created the 'notes' bucket with RLS policies. Verify:
1. Go to **Storage** in the left sidebar
2. You should see a bucket called "notes"
3. If not, create it manually (the SQL should have done this)

### Enable Google OAuth
1. Go to **Authentication** > **Providers**
2. Find **Google** and click to expand
3. Toggle "Enable Sign in with Google"
4. Leave Client ID and Secret blank for now (we'll add them later)
5. Copy the "Callback URL" - you'll need this

### Get API Keys
1. Go to **Settings** > **API**
2. Copy these values for your `.env.local`:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

## 2. OpenAI Setup (5 minutes)

### Get API Key
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign in or create account
3. Click your profile icon → "API keys"
4. Click "Create new secret key"
5. Name it "Ultra Learning"
6. Copy the key immediately (you won't see it again!)
7. Add to `.env.local` as `OPENAI_API_KEY`

### Add Payment Method
1. Go to "Settings" > "Billing"
2. Add a payment method
3. Set up usage limits if desired
4. Note: GPT-4o-mini is very cheap (~$0.01 per note)

## 3. Google Calendar API Setup (10 minutes)

### Create Google Cloud Project
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click project dropdown → "New Project"
3. Name it "Ultra Learning"
4. Click "Create"

### Enable Calendar API
1. Go to "APIs & Services" > "Library"
2. Search for "Google Calendar API"
3. Click on it and press "Enable"

### Create OAuth Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. If prompted, configure OAuth consent screen:
   - **User Type**: External
   - **App name**: Ultra Learning
   - **User support email**: Your email
   - **Developer contact**: Your email
   - Click "Save and Continue"
   - **Scopes**: Add `https://www.googleapis.com/auth/calendar.events`
   - Click "Save and Continue"
   - **Test users**: Add your email
   - Click "Save and Continue"

4. Back to Credentials > Create OAuth client ID:
   - **Application type**: Web application
   - **Name**: Ultra Learning Web
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000`
   - **Authorized redirect URIs**: 
     - `http://localhost:3000/auth/callback`
     - (also add your Supabase callback URL from earlier)
   - Click "Create"

5. Copy the Client ID and Client Secret to `.env.local`

## 4. Environment Variables

Create `.env.local` in your project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Google OAuth
GOOGLE_CLIENT_ID=123456789-xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here
```

Generate NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

## 5. Update Supabase Google OAuth

Now that you have Google credentials:
1. Go back to Supabase dashboard
2. **Authentication** > **Providers** > **Google**
3. Paste your **Google Client ID**
4. Paste your **Google Client Secret**
5. Save

## 6. Install and Run

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 7. Test the Application

### Test Authentication
1. Click "Sign Up"
2. Create account with email/password
3. You should be redirected to dashboard

### Test Note Upload
1. Go to "Notes" page
2. Upload a test PDF or text file
3. Wait for processing (check console logs)
4. Refresh page - status should be "Completed"

### Test Drill Session
1. After notes are processed, go to "Practice"
2. You should see cards generated from your notes
3. Practice reviewing them

### Test Google Calendar
1. Go to "Settings"
2. Click "Connect Google Calendar"
3. Authorize the app
4. Schedule sessions

## Troubleshooting

### "Failed to fetch" errors
- Check all environment variables are set
- Ensure no extra spaces in `.env.local`
- Restart dev server after changing env vars

### Supabase connection errors
- Verify project URL is correct
- Check anon key is the public key (not service role)
- Ensure RLS policies are enabled

### OpenAI errors
- Verify API key is valid
- Check you have billing set up
- Ensure you have credits available

### Google OAuth not working
- Verify redirect URIs match exactly
- Check OAuth consent screen is configured
- Ensure Calendar API is enabled
- Try in incognito mode (clear cookies)

## Production Deployment

### Update Environment Variables
After deploying to Vercel/production:

1. **Supabase**: No changes needed
2. **Google Cloud Console**:
   - Add production URL to authorized origins
   - Add `https://yourdomain.com/auth/callback` to redirect URIs
3. **Update `.env` on Vercel** with production URLs

### Security Checklist
- [ ] Never commit `.env.local` to git
- [ ] Keep service role key secret
- [ ] Use different OpenAI API keys for dev/prod
- [ ] Enable RLS on all Supabase tables
- [ ] Set up Supabase backups
- [ ] Monitor API usage and costs

## Support

If you encounter issues:
1. Check browser console for errors
2. Check Supabase logs (Dashboard > Logs)
3. Verify all API keys are valid
4. Ensure all environment variables are set

## Next Steps

Once everything is working:
- Customize the UI colors in `app/globals.css`
- Add more card types if needed
- Implement image OCR for uploaded images
- Add export/import functionality
- Create mobile app version

Happy learning! 🚀

