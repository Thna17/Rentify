import { useState, useRef } from 'react';
import {
  Trash,
  Upload,
  Info,
} from 'lucide-react';
// Shadcn Components
import { Button } from '@rentify/shared/ui/button';
import { Label } from '@rentify/shared/ui/label';
import { Badge } from '@rentify/shared/ui/badge';
import { Progress } from '@rentify/shared/ui/progress';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@rentify/shared/ui/card';
export const ImageUploader = ({
  images = [],
  onImagesChange,
  maxImages = 10,
  isUploading,
  uploadProgress,
  onRemoveImage,
}) => {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleFiles = (files) => {
    const fileList = Array.from(files);
    const imageFiles = fileList
      .filter((file) => file.type.startsWith('image/'))
      .filter((file) => file.size <= 10 * 1024 * 1024);

    const remainingSlots = maxImages - images.length;
    const filesToProcess = imageFiles.slice(0, remainingSlots);

    if (filesToProcess.length > 0) {
      onImagesChange(filesToProcess);
    }
  };

  const canAddMore = images.length < maxImages;

  return (
    <div className="space-y-6">
      {/* Image Grid */}
      {images.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <Label className="text-base font-medium">
              Uploaded Images ({images.length}/{maxImages})
            </Label>
            <Badge
              variant={images.length >= maxImages ? 'destructive' : 'secondary'}
            >
              {images.length >= maxImages
                ? 'Maximum reached'
                : `${maxImages - images.length} slots left`}
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((image, index) => (
              <div
                key={index}
                className="relative group rounded-xl overflow-hidden border-2 transition-all duration-200 hover:shadow-lg"
              >
                <div className="aspect-square bg-muted/30">
                  {typeof image === 'string' || image?.url ? (
                    <img
                      src={typeof image === 'string' ? image : image.url}
                      alt={`Product preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : image instanceof File ? (
                    <img
                      src={URL.createObjectURL(image)}
                      alt={`Upload preview ${index + 1}`}
                      className={`w-full h-full object-cover ${
                        isUploading ? 'opacity-50' : ''
                      }`}
                    />
                  ) : null}
                </div>

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => onRemoveImage(index)}
                    >
                      <Trash className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Badges */}
                {index === 0 && (
                  <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs">
                    Cover
                  </Badge>
                )}

                {/* Upload Progress */}
                {isUploading && uploadProgress > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60">
                    <Progress
                      value={uploadProgress}
                      className="h-1.5 bg-white/20"
                    />
                    <p className="text-white text-xs text-center mt-1">
                      {uploadProgress}%
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Area */}
      {canAddMore && (
        <div
          className={`border-2 border-dashed rounded-xl transition-all duration-200 ${
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted hover:border-primary/50'
          }`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />

          <div
            className="p-8 text-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="max-w-md mx-auto">
              <div
                className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                  dragActive
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <Upload className="h-8 w-8" />
              </div>

              <h4 className="font-semibold text-lg mb-2">
                {dragActive ? 'Drop to upload' : 'Upload images'}
              </h4>

              <p className="text-muted-foreground mb-4">
                Drag & drop your images here or click to browse
              </p>

              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Choose Files
              </Button>

              <p className="text-xs text-muted-foreground mt-4">
                Supports JPG, PNG, GIF • Max 10MB per file •{' '}
                {maxImages - images.length} remaining
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tips */}
      <Card className="border border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-medium text-sm text-foreground">Image Tips</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Use high-quality images with at least 1024×1024 pixels</li>
                <li>• The first image will be used as the product cover</li>
                <li>• Supported formats: JPG, PNG, GIF, WebP</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};