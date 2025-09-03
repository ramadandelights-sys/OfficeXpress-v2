import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImageUploaderProps {
  onImageUpload: (imageUrl: string) => void;
  currentImage?: string;
  className?: string;
  buttonText?: string;
}

export default function ImageUploader({ 
  onImageUpload, 
  currentImage, 
  className,
  buttonText = "Upload Image" 
}: ImageUploaderProps) {
  const [preview, setPreview] = useState<string>(currentImage || "");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPG, GIF, etc.)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      
      // For now, we'll use the data URL directly since object storage setup failed
      // In production, this would upload to cloud storage and return a URL
      onImageUpload(dataUrl);
      setUploading(false);
      
      toast({
        title: "Image uploaded successfully",
        description: "Your image has been added to the blog post"
      });
    };
    
    reader.onerror = () => {
      setUploading(false);
      toast({
        title: "Upload failed",
        description: "There was an error processing your image",
        variant: "destructive"
      });
    };
    
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setPreview("");
    onImageUpload("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {uploading ? "Uploading..." : buttonText}
        </Button>
        
        {preview && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={removeImage}
            className="flex items-center gap-1 text-red-600 hover:text-red-700"
          >
            <X className="h-3 w-3" />
            Remove
          </Button>
        )}
      </div>

      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {preview && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-center gap-2 mb-2">
            <ImageIcon className="h-4 w-4 text-gray-600" />
            <span className="text-sm text-gray-600">Image Preview</span>
          </div>
          <img
            src={preview}
            alt="Preview"
            className="max-w-full h-32 object-cover rounded border"
          />
        </div>
      )}
    </div>
  );
}