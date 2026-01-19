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
      <div className="p-4 md:p-8 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <CheckCircle className="w-20 h-20 md:w-24 md:h-24 text-primary mx-auto mb-6" />
        <h1 className="font-display text-3xl md:text-4xl tracking-wider mb-4 uppercase">Upload Complete</h1>
        <p className="text-muted-foreground mb-8">The new book has been added to the cosmic library.</p>
        <Button onClick={() => {
          setIsComplete(false)
          setCoverFile(null)
          setBookFile(null)
        }} className="w-full sm:w-auto">
          Upload Another Book
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 text-center md:text-left">
        <h1 className="font-display text-4xl md:text-5xl tracking-wider mb-2 leading-tight">
          <span className="text-primary">ADD NEW</span> <span className="text-secondary">BOOK</span>
        </h1>
        <p className="text-base md:text-lg text-muted-foreground">Upload book files and metadata</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* File Upload Section */}
        <div className="space-y-6">
          <Card
            className="p-5 md:p-6 bg-card/50 backdrop-blur border-border"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleFileDrop(e, "cover")}
          >
            <h2 className="font-display text-xl md:text-2xl tracking-wide mb-4">BOOK COVER</h2>
            <div className="flex items-center justify-center w-full h-40 md:h-48 border-2 border-dashed border-primary/30 rounded-lg">
              {coverFile ? (
                <div className="text-center p-4">
                  <ImageIcon className="w-10 h-10 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium truncate max-w-[200px]">{coverFile.name}</p>
                </div>
              ) : (
                <div className="text-center text-muted-foreground p-4">
                  <UploadCloud className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Drag & drop image here</p>
                </div>
              )}
            </div>
          </Card>

          <Card
            className="p-5 md:p-6 bg-card/50 backdrop-blur border-border"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleFileDrop(e, "book")}
          >
            <h2 className="font-display text-xl md:text-2xl tracking-wide mb-4">BOOK PDF</h2>
            <div className="flex items-center justify-center w-full h-40 md:h-48 border-2 border-dashed border-secondary/30 rounded-lg">
              {bookFile ? (
                <div className="text-center p-4">
                  <FileText className="w-10 h-10 text-secondary mx-auto mb-2" />
                  <p className="text-sm font-medium truncate max-w-[200px]">{bookFile.name}</p>
                </div>
              ) : (
                <div className="text-center text-muted-foreground p-4">
                  <UploadCloud className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Drag & drop PDF here</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Metadata Section */}
        <Card className="p-5 md:p-8 bg-card/50 backdrop-blur h-fit">
          <h2 className="font-display text-xl md:text-2xl tracking-wide mb-6 uppercase">Metadata</h2>
          <form className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="title">
                Book Title
              </label>
              <Input id="title" placeholder="e.g., Cosmic Drift" className="h-10" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="author">
                Author
              </label>
              <Input id="author" placeholder="e.g., Jaxson Starborn" className="h-10" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="series">
                Series (Optional)
              </label>
              <Input id="series" placeholder="e.g., The Stardust Chronicles" className="h-10" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="description">
                Description
              </label>
              <Textarea id="description" placeholder="A brief summary of the book..." rows={5} />
            </div>

            <Button
              className="w-full text-lg py-6 font-display tracking-wider mt-4"
              size="lg"
              type="button"
              onClick={handleUpload}
              disabled={isUploading || !coverFile || !bookFile}
            >
              {isUploading ? (
                <Loader className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <UploadCloud className="w-5 h-5 mr-2" />
              )}
              {isUploading ? "Uploading Mission..." : "Upload Volume"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
