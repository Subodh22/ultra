# Ultra Learning - AI-Powered Spaced Repetition Learning Platform

A modern web application that transforms your study notes into effective learning materials using AI and spaced repetition, integrated with Google Calendar for optimal scheduling.

## Features

- **Smart Note Processing**: Upload PDFs, markdown, or text files and let AI automatically extract learning cards
- **AI-Powered Card Generation**: Automatically creates three types of cards:
  - **Facts**: Discrete information to memorize
  - **Concepts**: Ideas and theories to understand
  - **Procedures**: Step-by-step processes to practice
- **Spaced Repetition**: Uses the SM-2 algorithm for scientifically optimal review intervals
- **Google Calendar Integration**: Automatically schedules drill sessions based on your preferences
- **Progress Tracking**: Comprehensive dashboard with retention rates and learning statistics
- **Modern UI**: Beautiful, responsive interface built with shadcn/ui

## Tech Stack

- **Framework**: Next.js 14+ (App Router, TypeScript)
- **Database**: Supabase (PostgreSQL, Authentication, Storage)
- **AI**: OpenAI GPT-4o-mini for content extraction
- **Calendar**: Google Calendar API
- **UI**: shadcn/ui + Tailwind CSS
- **Spaced Repetition**: Custom SM-2 algorithm implementation

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm or yarn
- Supabase account
- OpenAI API key
- Google Cloud Console project (for Calendar API)

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd ultra
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to SQL Editor and run the schema from `supabase/schema.sql`
   - Enable Google OAuth in Authentication > Providers
   - Note your project URL and anon key

4. **Set up OpenAI**
   - Get your API key from [platform.openai.com](https://platform.openai.com)

5. **Set up Google Calendar API**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing one
   - Enable Google Calendar API
   - Create OAuth 2.0 credentials (Web application)
   - Add authorized redirect URI: `http://localhost:3000/auth/callback`
   - Note your Client ID and Client Secret

6. **Configure environment variables**

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Google Calendar OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_generate_one
```

To generate a NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

7. **Run the development server**
```bash
npm run dev
```

8. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## Usage Guide

### 1. Create an Account
- Sign up with email/password or use Google OAuth
- Your account will be automatically set up

### 2. Upload Notes
- Navigate to the Notes page
- Drag and drop or click to upload your study materials
- Supported formats: PDF, TXT, MD, images
- The AI will automatically process your notes (this may take 30-60 seconds)

### 3. Review Generated Cards
- After processing, cards will be created automatically
- You can view and edit them if needed
- Cards are categorized into Facts, Concepts, and Procedures

### 4. Practice with Drills
- Go to the Practice page
- Work through cards due for review
- Rate your recall: Again, Hard, Good, or Easy
- The SM-2 algorithm will schedule your next review

### 5. Connect Google Calendar
- Go to Settings
- Click "Connect Google Calendar"
- Authorize the app
- Set your preferred practice times
- Schedule sessions automatically

## Database Schema

The application uses the following main tables:

- **notes**: Stores uploaded note metadata and processing status
- **cards**: Individual flashcards with spaced repetition data
- **drill_sessions**: Practice session records
- **card_reviews**: Review history for analytics
- **user_settings**: User preferences and Google tokens

See `supabase/schema.sql` for the complete schema.

## Spaced Repetition Algorithm

The app uses the SM-2 (SuperMemo 2) algorithm:

- **Quality Ratings**: 0-5 scale for self-assessment
- **Ease Factor**: Adjusts based on recall difficulty (1.3 - 2.5)
- **Intervals**: Exponentially increasing review periods
- **Reset on Failure**: Cards rated < 3 return to beginning

## API Routes

- `POST /api/notes/upload`: Upload a new note
- `POST /api/notes/process`: Process note with AI
- `POST /api/cards/review`: Record a card review
- `POST /api/calendar/schedule`: Schedule drill sessions

## Cost Estimates

### OpenAI API (GPT-4o-mini)
- Average note (1000 words): ~$0.01-0.03
- Very cost-effective for typical usage

### Supabase
- Free tier: Up to 500MB database, 1GB storage
- Sufficient for most users

### Google Calendar API
- Free (no charges for normal usage)

## Development

### Project Structure

```
ultra/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Protected dashboard pages
│   ├── api/               # API routes
│   └── page.tsx           # Landing page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── *.tsx             # Custom components
├── lib/                   # Utility functions
│   ├── supabase/         # Supabase clients
│   ├── openai.ts         # OpenAI integration
│   ├── spaced-repetition.ts  # SM-2 algorithm
│   └── google-calendar.ts    # Calendar integration
├── types/                # TypeScript types
└── supabase/             # Database schema
```

### Running Tests

```bash
npm run test        # Run tests (when configured)
npm run lint        # Check for linting errors
npm run build       # Build for production
```

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Update Google OAuth Redirect
After deployment, update your Google Cloud Console OAuth redirect URI to:
```
https://your-domain.vercel.app/auth/callback
```

## Troubleshooting

### Notes not processing
- Check OpenAI API key is valid
- Ensure note has sufficient text content (>50 characters)
- Check Supabase logs for errors

### Google Calendar not connecting
- Verify OAuth credentials
- Check redirect URI matches exactly
- Ensure Calendar API is enabled in Google Cloud Console

### Cards not appearing
- Check processing status in notes page
- Verify Supabase RLS policies are correct
- Check browser console for errors

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for learning and development.

## Support

For issues or questions, please open an issue on GitHub or contact support.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Backend powered by [Supabase](https://supabase.com/)
- AI by [OpenAI](https://openai.com/)
- Spaced repetition based on the SM-2 algorithm by Piotr Woźniak
