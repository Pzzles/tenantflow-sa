import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, X, Film, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MediaUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  className?: string;
}

export function MediaUpload({ 
  onFilesSelected, 
  maxFiles = 5, 
  maxSizeMB = 50,
  className 
}: MediaUploadProps) {
  const [previews, setPreviews] = useState<{ url: string; type: string; name: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    if (previews.length + files.length > maxFiles) {
      toast.error(`You can only upload up to ${maxFiles} files.`);
      return;
    }

    const validFiles: File[] = [];
    const newPreviews: { url: string; type: string; name: string }[] = [];

    files.forEach((file: File) => {
      const sizeMB = file.size / (1024 * 1024);
      if (sizeMB > maxSizeMB) {
        toast.error(`File "${file.name}" exceeds the ${maxSizeMB}MB limit.`);
        return;
      }

      validFiles.push(file);
      newPreviews.push({
        url: URL.createObjectURL(file),
        type: file.type,
        name: file.name
      });
    });

    setPreviews(prev => [...prev, ...newPreviews]);
    onFilesSelected(validFiles);
  };

  const removeFile = (index: number) => {
    setPreviews(prev => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[index].url);
      newPreviews.splice(index, 1);
      return newPreviews;
    });
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap gap-4">
        {previews.map((preview, index) => (
          <div key={index} className="relative group w-24 h-24 rounded-lg overflow-hidden border bg-muted">
            {preview.type.startsWith('video/') ? (
              <div className="w-full h-full flex items-center justify-center bg-black">
                <Film className="h-8 w-8 text-white/50" />
              </div>
            ) : (
              <img 
                src={preview.url} 
                alt={preview.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            )}
            <button
              type="button"
              onClick={() => removeFile(index)}
              className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        
        {previews.length < maxFiles && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-24 h-24 flex-col gap-2 border-dashed"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
              <span className="text-[10px] uppercase font-semibold text-muted-foreground">Gallery</span>
            </Button>
            
            <Button
              type="button"
              variant="outline"
              className="w-24 h-24 flex-col gap-2 border-dashed"
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="h-6 w-6 text-muted-foreground" />
              <span className="text-[10px] uppercase font-semibold text-muted-foreground">Camera</span>
            </Button>
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*,video/*"
        multiple
        onChange={handleFileChange}
      />
      
      <input
        type="file"
        ref={cameraInputRef}
        className="hidden"
        accept="image/*,video/*"
        capture="environment"
        onChange={handleFileChange}
      />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <AlertCircle className="h-3 w-3" />
        <span>Max {maxFiles} files. Max {maxSizeMB}MB per file.</span>
      </div>
    </div>
  );
}
