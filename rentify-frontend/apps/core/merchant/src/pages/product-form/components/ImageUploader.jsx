import { useEffect, useState, useRef } from 'react';
import { Image as ImageIcon, X, Upload } from 'lucide-react';
// Shadcn Components
import { Button } from '@rentify/shared/ui/button';
import { Badge } from '@rentify/shared/ui/badge';
import { Progress } from '@rentify/shared/ui/progress';
import { selectProductImages } from '../../../services/productImages';

const ImagePreview = ({ image, alt, className }) => {
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (!(image instanceof File)) return undefined;
    const url = URL.createObjectURL(image);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const src = typeof image === 'string' ? image : image?.url || previewUrl;
  return src ? <img src={src} alt={alt} className={className} /> : null;
};

export const ImageUploader = ({
  images = [],
  onImagesChange,
  maxImages = 10,
  isUploading,
  uploadProgress,
  onRemoveImage,
  onValidationError,
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
    const { accepted, rejected } = selectProductImages(files, images.length);
    onValidationError?.(rejected);
    if (accepted.length > 0) onImagesChange(accepted);
  };

  const canAddMore = images.length < maxImages;

  return (
    <div className="mt-6">
      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
          {images.map((image, index) => (
            <div
              key={index}
              className="relative rounded-lg overflow-hidden aspect-square border"
            >
              <ImagePreview
                image={image}
                alt={`Product preview ${index + 1}`}
                className={`w-full h-full object-cover ${isUploading ? 'opacity-60' : ''}`}
              />

              {index === 0 && (
                <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs">
                  Cover
                </Badge>
              )}

              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 w-6 h-6"
                type="button"
                aria-label={`Remove product image ${index + 1}`}
                disabled={isUploading}
                onClick={() => onRemoveImage(index)}
              >
                <X className="h-3 w-3" />
              </Button>

              {isUploading && uploadProgress > 0 && (
                <Progress
                  value={uploadProgress}
                  className="absolute bottom-0 left-0 w-full h-1"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      {canAddMore && (
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
            ${dragActive ? 'border-primary bg-primary/10' : 'border-border'}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
          />

          <div className="flex flex-col items-center">
            <Upload className="h-10 w-10 text-muted-foreground mb-3" />
            <h4 className="font-medium text-lg mb-1">
              Drop images here or click to upload
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              Upload up to {maxImages - images.length} more images (JPG, PNG,
              WebP, or GIF up to 5 MB each)
            </p>
            <Button type="button" variant="outline" disabled={isUploading}>
              <Upload className="h-4 w-4 mr-2" />
              Choose Files
            </Button>
          </div>
        </div>
      )}

      {/* Info Text */}
      <div className="flex items-start mt-4 text-muted-foreground">
        <ImageIcon className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm">
            {images.length} of {maxImages} images uploaded.
            {images.length > 0 &&
              ' The first image will be used as the product cover.'}
          </p>
          <p className="text-sm mt-1">
            Recommended: Use high-quality images with at least 1024x1024 pixels
            for best results.
          </p>
        </div>
      </div>
    </div>
  );
};
