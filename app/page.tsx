import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Brain, Calendar, Zap, BookOpen } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="flex justify-center">
            <Brain className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight">
            Master Any Subject with
            <span className="text-primary"> Ultra Learning</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Upload your notes, let AI extract key concepts, and practice with
            spaced repetition. Integrated with Google Calendar for optimal learning.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="text-lg px-8">
                Get Started Free
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20 bg-muted/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything you need to learn effectively
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 rounded-full bg-primary/10">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold">Smart Note Processing</h3>
              <p className="text-muted-foreground">
                Upload PDFs, markdown, or text files. Our AI automatically extracts
                facts, concepts, and procedures.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 rounded-full bg-primary/10">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold">Spaced Repetition</h3>
              <p className="text-muted-foreground">
                Review cards at scientifically optimal intervals for maximum
                retention and minimal study time.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 rounded-full bg-primary/10">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold">Calendar Integration</h3>
              <p className="text-muted-foreground">
                Automatically schedule drill sessions in your Google Calendar
                based on your preferences.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto space-y-12">
          <h2 className="text-3xl font-bold text-center">How It Works</h2>
          
          <div className="space-y-8">
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Upload Your Notes</h3>
                <p className="text-muted-foreground">
                  Simply drag and drop your study materials. We support PDFs,
                  markdown files, text documents, and images.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">AI Creates Flashcards</h3>
                <p className="text-muted-foreground">
                  Our AI analyzes your notes and automatically generates three types
                  of cards: facts to memorize, concepts to understand, and procedures
                  to practice.
                </p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Practice & Master</h3>
                <p className="text-muted-foreground">
                  Review cards using spaced repetition. Sessions are automatically
                  scheduled in your Google Calendar at times that work for you.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 bg-primary text-primary-foreground">
        <div className="text-center space-y-6 max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold">
            Ready to supercharge your learning?
          </h2>
          <p className="text-lg opacity-90">
            Join thousands of learners who are mastering new skills faster with
            Ultra Learning.
          </p>
          <Link href="/signup">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Start Learning Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t">
        <div className="text-center text-sm text-muted-foreground">
          <p>&copy; 2025 Ultra Learning. Built with Next.js, Supabase, and OpenAI.</p>
        </div>
      </footer>
    </div>
  )
}
