import { createClient } from '@/lib/supabase/server'
import { NoteUpload } from '@/components/note-upload'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Loader2, CheckCircle2, XCircle, Edit } from 'lucide-react'
import { formatDistance } from 'date-fns'
import Link from 'next/link'

export default async function NotesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: notes } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notes</h1>
        <p className="text-muted-foreground">
          Upload and manage your learning materials
        </p>
      </div>

      <NoteUpload />

      <div>
        <h2 className="text-xl font-semibold mb-4">Your Notes</h2>
        
        {notes && notes.length > 0 ? (
          <div className="grid gap-4">
            {notes.map((note) => (
              <Card key={note.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 mt-0.5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-base">{note.title}</CardTitle>
                        <CardDescription>
                          Uploaded{' '}
                          {formatDistance(new Date(note.created_at), new Date(), {
                            addSuffix: true,
                          })}
                        </CardDescription>
                      </div>
                    </div>
                    
                    {note.processing_status === 'pending' && (
                      <Badge variant="secondary">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Pending
                      </Badge>
                    )}
                    {note.processing_status === 'processing' && (
                      <Badge variant="secondary">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Processing
                      </Badge>
                    )}
                    {note.processing_status === 'completed' && (
                      <Badge variant="default">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completed
                      </Badge>
                    )}
                    {note.processing_status === 'failed' && (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Failed
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{note.file_type}</span>
                      <span>•</span>
                      <span>{(note.file_size / 1024).toFixed(2)} KB</span>
                    </div>
                    {note.processing_status === 'completed' && (
                      <Link href={`/dashboard/cornell?from_upload=${note.id}`}>
                        <Button variant="outline" size="sm">
                          <Edit className="mr-2 h-4 w-4" />
                          View/Edit
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No notes yet</h3>
              <p className="text-sm text-muted-foreground">
                Upload your first note to get started with ultra learning
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

