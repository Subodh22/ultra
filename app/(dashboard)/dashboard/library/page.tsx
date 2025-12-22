'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { BookOpen, Upload, FileText, Trash2, Eye, BookMarked, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'

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

export default function LibraryPage() {
  const [materials, setMaterials] = useState<ReadingMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [selectedMaterial, setSelectedMaterial] = useState<ReadingMaterial | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadMaterials()
  }, [])

  async function loadMaterials() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from('reading_materials')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setMaterials(data || [])
    } catch (error) {
      console.error('Error loading materials:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      if (!uploadTitle) {
        setUploadTitle(file.name.replace(/\.[^/.]+$/, ''))
      }
    }
  }

  async function handleUpload() {
    if (!selectedFile || !uploadTitle) {
      alert('Please select a file and enter a title')
      return
    }

    setUploading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      // Upload file to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('notes')
        .upload(fileName, selectedFile)

      if (uploadError) throw uploadError

      // Extract text content (simplified - only for txt and md files)
      let content = null
      if (selectedFile.type === 'text/plain' || selectedFile.name.endsWith('.md')) {
        content = await selectedFile.text()
      }

      // Save metadata to database
      const { error: dbError } = await supabase.from('reading_materials').insert({
        user_id: user.id,
        title: uploadTitle,
        file_name: selectedFile.name,
        file_path: fileName,
        file_type: selectedFile.type || 'application/octet-stream',
        file_size: selectedFile.size,
        content: content,
      })

      if (dbError) throw dbError

      alert('Reading material uploaded successfully!')
      setSelectedFile(null)
      setUploadTitle('')
      loadMaterials()
    } catch (error: any) {
      console.error('Upload error:', error)
      alert(`Error: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(material: ReadingMaterial) {
    if (!confirm(`Delete "${material.title}"?`)) return

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('notes')
        .remove([material.file_path])

      if (storageError) console.error('Storage delete error:', storageError)

      // Delete from database
      const { error: dbError } = await supabase
        .from('reading_materials')
        .delete()
        .eq('id', material.id)

      if (dbError) throw dbError

      loadMaterials()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  async function toggleRead(material: ReadingMaterial) {
    try {
      const { error } = await supabase
        .from('reading_materials')
        .update({ is_read: !material.is_read })
        .eq('id', material.id)

      if (error) throw error

      loadMaterials()
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  async function handleConvertToNotes(material: ReadingMaterial) {
    if (!confirm(`Convert "${material.title}" to a Cornell note?`)) return

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // Create a Cornell note from the reading material
      const { error } = await supabase.from('cornell_notes').insert({
        user_id: user.id,
        title: material.title,
        notes_area: material.content || '',
        cue_column: '',
        summary: '',
        tags: material.tags,
        is_draft: false,
      })

      if (error) throw error

      alert('Converted to Cornell notes successfully!')
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reading Library</h1>
        <p className="text-muted-foreground">
          Upload and manage your reading materials
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Reading Material
          </CardTitle>
          <CardDescription>
            Upload PDFs, documents, or text files to your library
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="Enter title..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileSelect}
              accept=".txt,.md,.markdown,.pdf"
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            )}
          </div>
          <Button onClick={handleUpload} disabled={uploading || !selectedFile}>
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </CardContent>
      </Card>

      {/* Materials List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Reading Materials</h2>
        
        {loading ? (
          <p>Loading...</p>
        ) : materials.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No reading materials yet</p>
              <p className="text-sm text-muted-foreground">Upload your first document to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {materials.map((material) => (
              <Card 
                key={material.id} 
                className="relative cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push(`/dashboard/library/reader/${material.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{material.title}</CardTitle>
                      <CardDescription className="text-xs">
                        {new Date(material.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    {material.is_read && (
                      <Badge variant="secondary" className="shrink-0">
                        <Eye className="h-3 w-3 mr-1" />
                        Read
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span className="truncate">{material.file_name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatFileSize(material.file_size)}
                  </div>
                  
                  <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      onClick={() => router.push(`/dashboard/library/reader/${material.id}`)}
                      className="flex-1"
                    >
                      <BookOpen className="h-3 w-3 mr-1" />
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleRead(material)}
                    >
                      {material.is_read ? (
                        <>
                          <Eye className="h-3 w-3 mr-1" />
                          Unread
                        </>
                      ) : (
                        <>
                          <BookMarked className="h-3 w-3 mr-1" />
                          Mark Read
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleConvertToNotes(material)}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      To Notes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(material)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

