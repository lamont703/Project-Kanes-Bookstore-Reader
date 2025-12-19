"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { UploadCloud, FileText, ImageIcon, Loader, CheckCircle } from "lucide-react"

export default function UploadPage() {
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [bookFile, setBookFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const handleUpload = () => {
    setIsUploading(true)
    setIsComplete(false)
    // Simulate upload process
    setTimeout(() => {
      setIsUploading(false)
      setIsComplete(true)
    }, 3000)
  }

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>, fileType: "cover" | "book") => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      if (fileType === "cover") setCoverFile(file)
      if (fileType === "book") setBookFile(file)
    }
  }

  if (isComplete) {
    return (
      <div className="p-8 text-center">
        <CheckCircle className="w-24 h-24 text-primary mx-auto mb-6" />
        <h1 className="font-display text-4xl tracking-wider mb-4">UPLOAD COMPLETE</h1>
        <p className="text-muted-foreground mb-6">The new book has been added to the cosmic library.</p>
        <Button onClick={() => {
          setIsComplete(false)
          setCoverFile(null)
          setBookFile(null)
        }}>
          Upload Another Book
        </Button>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display text-5xl tracking-wider mb-2">
          <span className="text-primary">ADD NEW</span> <span className="text-secondary">BOOK</span>
        </h1>
        <p className="text-lg text-muted-foreground">Upload book files and metadata</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* File Upload Section */}
        <div className="space-y-6">
          <Card
            className="p-6 bg-card/50 backdrop-blur border-border"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleFileDrop(e, "cover")}
          >
            <h2 className="font-display text-2xl tracking-wide mb-4">BOOK COVER</h2>
            <div className="flex items-center justify-center w-full h-48 border-2 border-dashed border-primary/30 rounded-lg">
              {coverFile ? (
                <div className="text-center">
                  <ImageIcon className="w-12 h-12 text-primary mx-auto mb-2" />
                  <p className="font-medium">{coverFile.name}</p>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <UploadCloud className="w-12 h-12 mx-auto mb-2" />
                  <p>Drag & drop image here, or click to select</p>
                </div>
              )}
            </div>
          </Card>

          <Card
            className="p-6 bg-card/50 backdrop-blur border-border"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleFileDrop(e, "book")}
          >
            <h2 className="font-display text-2xl tracking-wide mb-4">BOOK PDF</h2>
            <div className="flex items-center justify-center w-full h-48 border-2 border-dashed border-secondary/30 rounded-lg">
              {bookFile ? (
                <div className="text-center">
                  <FileText className="w-12 h-12 text-secondary mx-auto mb-2" />
                  <p className="font-medium">{bookFile.name}</p>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <UploadCloud className="w-12 h-12 mx-auto mb-2" />
                  <p>Drag & drop PDF here, or click to select</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Metadata Section */}
        <Card className="p-8 bg-card/50 backdrop-blur">
          <h2 className="font-display text-2xl tracking-wide mb-6">METADATA</h2>
          <form className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="title">
                Book Title
              </label>
              <Input id="title" placeholder="e.g., Cosmic Drift" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="author">
                Author
              </label>
              <Input id="author" placeholder="e.g., Jaxson Starborn" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="series">
                Series (Optional)
              </label>
              <Input id="series" placeholder="e.g., The Stardust Chronicles" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="description">
                Description
              </label>
              <Textarea id="description" placeholder="A brief summary of the book..." rows={5} />
            </div>

            <Button
              className="w-full text-lg py-6 font-display tracking-wider"
              size="lg"
              type="button"
              onClick={handleUpload}
              disabled={isUploading || !coverFile || !bookFile}
            >
              {isUploading ? (
                <Loader className="w-6 h-6 animate-spin mr-2" />
              ) : (
                <UploadCloud className="w-6 h-6 mr-2" />
              )}
              {isUploading ? "Uploading..." : "Upload Book"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
