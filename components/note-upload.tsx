'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface NoteUploadProps {
  onUploadComplete?: () => void
}

export function NoteUpload({ onUploadComplete }: NoteUploadProps = {}) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const router = useRouter()

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    setUploading(true)
    setError('')
    setProgress(0)

    const file = acceptedFiles[0]
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/notes/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to upload note')
      }

      const data = await response.json()
      setProgress(100)

      // Call callback or redirect
      setTimeout(() => {
        if (onUploadComplete) {
          onUploadComplete()
        } else {
          router.push('/dashboard/notes')
          router.refresh()
        }
      }, 500)
    } catch (err: any) {
      setError(err.message || 'Failed to upload note')
    } finally {
      setUploading(false)
    }
  }, [router])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    maxFiles: 1,
    disabled: uploading,
  })

  return (
    <Card>
      <CardContent className="pt-6">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
        >
          <input {...getInputProps()} />
          
          {uploading ? (
            <div className="space-y-4">
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Uploading and processing your note...
              </p>
              {progress > 0 && <Progress value={progress} className="w-full" />}
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">
                  {isDragActive
                    ? 'Drop your note here'
                    : 'Drag & drop your note here'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to browse
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Supports TXT and MD files (PDF coming soon)</span>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

