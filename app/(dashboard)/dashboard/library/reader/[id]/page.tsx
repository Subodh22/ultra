'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, BookOpen, FileText, Download, BookMarked, Eye } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import dynamic from 'next/dynamic'

// Dynamically import PDFReader to prevent SSR issues with DOMMatrix
const PDFReader = dynamic(
  () => import('@/components/pdf-reader').then((mod) => ({ default: mod.PDFReader })),
  {
    ssr: false,
    loading: () => <div className="flex items-center justify-center p-8">Loading PDF reader...</div>,
  }
)

interface ReadingMaterial {
  id: string
  title: string
  file_name: string
  file_path: string
  file_type: string
  file_size: number
  content: string | null
  tags: string[]
  is_read: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export default function ReaderPage() {
  const params = useParams()
  const router = useRouter()
  const materialId = params.id as string
  const [material, setMaterial] = useState<ReadingMaterial | null>(null)
  const [loading, setLoading] = useState(true)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [isPdf, setIsPdf] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (materialId) {
      loadMaterial()
    }
  }, [materialId])

  async function loadMaterial() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/dashboard/library')
        return
      }

      // Load material from database
      const { data, error } = await supabase
        .from('reading_materials')
        .select('*')
        .eq('id', materialId)
        .eq('user_id', user.id)
        .single()

      if (error || !data) {
        throw new Error('Material not found')
      }

      setMaterial(data)

      // Check if it's a PDF
      if (data.file_name.toLowerCase().endsWith('.pdf')) {
        setIsPdf(true)
        // Get signed URL for PDF (works even if bucket is private)
        const { data: urlData, error: urlError } = await supabase.storage
          .from('notes')
          .createSignedUrl(data.file_path, 3600) // 1 hour expiry
        
        if (urlError) {
          console.error('Error creating signed URL:', urlError)
          if (urlError.message?.includes('Bucket not found') || urlError.message?.includes('bucket')) {
            throw new Error('Storage bucket "notes" not found. Please create it in Supabase Storage.')
          }
          // Fallback to public URL
          const { data: publicUrlData } = supabase.storage
            .from('notes')
            .getPublicUrl(data.file_path)
          setPdfUrl(publicUrlData.publicUrl)
        } else {
          setPdfUrl(urlData.signedUrl)
        }
        setLoading(false)
        return
      }

      // If content is already stored, use it
      if (data.content) {
        setFileContent(data.content)
        setLoading(false)
        return
      }

      // Otherwise, fetch from storage
      const { data: fileData, error: fileError } = await supabase.storage
        .from('notes')
        .download(data.file_path)

      if (fileError) {
        console.error('Storage error:', fileError)
        // If bucket doesn't exist, show helpful message
        if (fileError.message?.includes('Bucket not found') || fileError.message?.includes('bucket')) {
          throw new Error('Storage bucket not found. Please create a "notes" bucket in Supabase Storage.')
        }
        throw fileError
      }

      // Read file content
      if (data.file_name.toLowerCase().endsWith('.md') || data.file_name.toLowerCase().endsWith('.markdown')) {
        const text = await fileData.text()
        setFileContent(text)
      } else if (data.file_name.toLowerCase().endsWith('.txt')) {
        const text = await fileData.text()
        setFileContent(text)
      }
    } catch (error: any) {
      console.error('Error loading material:', error)
      setError(error.message || 'Failed to load material')
      setLoading(false)
    }
  }

  async function toggleRead() {
    if (!material) return

    try {
      const { error } = await supabase
        .from('reading_materials')
        .update({ is_read: !material.is_read })
        .eq('id', material.id)

      if (error) throw error

      setMaterial({ ...material, is_read: !material.is_read })
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  async function downloadFile() {
    if (!material) return

    try {
      const { data, error } = await supabase.storage
        .from('notes')
        .download(material.file_path)

      if (error) throw error

      // Create download link
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = material.file_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error: any) {
      alert(`Error downloading file: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p>Loading...</p>
      </div>
    )
  }

  if (error || !material) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/library')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Library
        </Button>
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-lg font-medium mb-2 text-destructive">Error Loading Material</p>
            <p className="text-muted-foreground mb-4">{error || 'Material not found'}</p>
            {error?.includes('Bucket not found') && (
              <div className="mt-4 p-4 bg-muted rounded-lg text-left">
                <p className="font-medium mb-2">To fix this issue:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Go to your Supabase Dashboard</li>
                  <li>Navigate to Storage</li>
                  <li>Create a new bucket named "notes"</li>
                  <li>Make it public or set up proper RLS policies</li>
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/library')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{material.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(material.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {material.is_read && (
            <Badge variant="secondary">
              <Eye className="h-3 w-3 mr-1" />
              Read
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={toggleRead}>
            {material.is_read ? (
              <>
                <BookOpen className="h-4 w-4 mr-2" />
                Mark Unread
              </>
            ) : (
              <>
                <BookMarked className="h-4 w-4 mr-2" />
                Mark Read
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={downloadFile}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        {isPdf ? (
          <div className="h-full">
            {!pdfUrl ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2 text-destructive">Unable to Load PDF</p>
                <p className="text-sm text-muted-foreground mb-4">
                  The PDF file could not be accessed. This might be due to storage configuration issues.
                </p>
                <Button onClick={downloadFile}>
                  <Download className="h-4 w-4 mr-2" />
                  Try Downloading Instead
                </Button>
              </div>
            ) : (
              <PDFReader
                pdfUrl={pdfUrl}
                materialId={material.id}
                materialTitle={material.title}
              />
            )}
          </div>
        ) : material.file_name.toLowerCase().endsWith('.md') || material.file_name.toLowerCase().endsWith('.markdown') ? (
          <div className="prose prose-slate dark:prose-invert max-w-none p-8 prose-headings:font-bold prose-p:leading-relaxed prose-a:text-primary prose-strong:font-semibold prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
            <ReactMarkdown>{fileContent || 'No content available'}</ReactMarkdown>
          </div>
        ) : (
          <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed p-8">
            {fileContent || 'No content available'}
          </div>
        )}
      </div>
    </div>
  )
}

