import { useState, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Circle,
  CircleDot,
  Image as ImageIcon,
  Plus,
  Trash2,
  Loader2,
  UploadCloud,
  Link as LinkIcon,
  X,
} from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@rentify/shared/ui/dialog';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@rentify/shared/ui/tabs';
import { useUpdateWebsiteContentMutation } from '@rentify/storefront/api';
import { useStorefrontWebsite, useAuth, API_URL } from '@rentify/storefront';

const PRESET_IMAGES = [
  { label: 'Organic Skincare Serum', url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=1600&auto=format&fit=crop&q=80' },
  { label: 'Botanical Cleansers', url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1600&auto=format&fit=crop&q=80' },
  { label: 'Minimalist Beauty', url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=1600&auto=format&fit=crop&q=80' },
  { label: 'Nature & Glow', url: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=1600&auto=format&fit=crop&q=80' },
];

export default function HeroSection({ content, isOwner: propIsOwner }) {
  const { isOwner: authIsOwner } = useAuth();
  const isOwner = propIsOwner !== undefined ? propIsOwner : authIsOwner;
  const { websiteId } = useStorefrontWebsite();

  const heroItem = content?.find((item) => item.label === 'Hero Image');
  const contentId = heroItem?.id;
  const initialImages = Array.isArray(heroItem?.value)
    ? heroItem.value.map((img) => (typeof img === 'string' ? img : img.url || img))
    : [];

  const [overrideImages, setOverrideImages] = useState(null);
  const images = overrideImages !== null ? overrideImages : initialImages;
  const [activeIndex, setActiveIndex] = useState(0);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [removeIndex, setRemoveIndex] = useState(null);

  const [updateContent, { isLoading: isUpdating }] = useUpdateWebsiteContentMutation();

  const move = (offset) => {
    if (images.length === 0) return;
    setActiveIndex((current) => (current + offset + images.length) % images.length);
  };

  const handleAddImage = async (newUrl) => {
    if (!newUrl) return;
    const updated = [...images, newUrl];
    setOverrideImages(updated);
    if (contentId) {
      try {
        await updateContent({ contentId, body: { value: updated } }).unwrap();
      } catch (err) {
        console.error('Failed to update hero images:', err);
      }
    }
    setAddModalOpen(false);
  };

  const handleRemoveImage = async () => {
    if (removeIndex === null) return;
    const updated = images.filter((_, idx) => idx !== removeIndex);
    setOverrideImages(updated);
    if (activeIndex >= updated.length && updated.length > 0) {
      setActiveIndex(updated.length - 1);
    }
    if (contentId) {
      try {
        await updateContent({ contentId, body: { value: updated } }).unwrap();
      } catch (err) {
        console.error('Failed to remove hero image:', err);
      }
    }
    setRemoveIndex(null);
  };

  return (
    <section className="relative mb-8 h-[50vh] overflow-hidden rounded-2xl bg-muted shadow-lg md:h-[60vh]">
      {/* Top right owner controls */}
      {isOwner && (
        <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setAddModalOpen(true)}
            className="bg-white/95 text-foreground shadow-md backdrop-blur hover:bg-white"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Hero Image
          </Button>
        </div>
      )}

      {images.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center p-6 text-center border-2 border-dashed border-border/80 rounded-2xl">
          <div className="rounded-full bg-primary/10 p-4 mb-3">
            <ImageIcon className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Welcome to our store</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {isOwner
              ? 'Customize your store banner. Add promotional photography or branded hero slides.'
              : 'Discover curated collections and exclusive offerings.'}
          </p>
          {isOwner && (
            <Button onClick={() => setAddModalOpen(true)} className="mt-5 gap-2">
              <Plus className="h-4 w-4" />
              Add First Hero Image
            </Button>
          )}
        </div>
      ) : (
        <>
          {images.map((image, index) => (
            <div
              key={image || index}
              className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${
                index === activeIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <img
                src={typeof image === 'string' ? image : image?.url}
                alt="Store promotion"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

              {/* Owner delete button on active slide */}
              {isOwner && index === activeIndex && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-4 left-4 z-30 h-9 w-9 shadow-lg"
                  onClick={() => setRemoveIndex(index)}
                  title="Remove this slide"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          {images.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="icon"
                aria-label="Previous slide"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 backdrop-blur hover:bg-white text-black"
                onClick={() => move(-1)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                aria-label="Next slide"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 backdrop-blur hover:bg-white text-black"
                onClick={() => move(1)}
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
              <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
                {images.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-label={`Show slide ${index + 1}`}
                    onClick={() => setActiveIndex(index)}
                  >
                    {index === activeIndex ? (
                      <CircleDot className="h-4 w-4 text-white" />
                    ) : (
                      <Circle className="h-4 w-4 text-white/70 hover:text-white" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Add Hero Image Modal */}
      <AddHeroImageModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddImage}
        websiteId={websiteId}
        isLoading={isUpdating}
      />

      {/* Remove Confirmation Dialog */}
      <Dialog open={removeIndex !== null} onOpenChange={(open) => !open && setRemoveIndex(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Banner Image</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p className="text-sm text-muted-foreground mb-3">
              Are you sure you want to remove this hero image?
            </p>
            {removeIndex !== null && images[removeIndex] && (
              <img
                src={images[removeIndex]}
                alt="To be removed"
                className="h-36 w-full rounded-lg object-cover"
              />
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRemoveIndex(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveImage} disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function AddHeroImageModal({ open, onClose, onAdd, websiteId, isLoading }) {
  const [tab, setTab] = useState('url');
  const [urlInput, setUrlInput] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const reset = () => {
    setUrlInput('');
    setFile(null);
    setPreview('');
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.type.startsWith('image/')) {
        setError('Please select an image file (PNG, JPG, WebP).');
        return;
      }
      setError('');
      setFile(selected);
      const reader = new FileReader();
      reader.onload = (event) => setPreview(event.target.result);
      reader.readAsDataURL(selected);
    }
  };

  const handleUploadFile = async () => {
    if (!file && !preview) return;
    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${API_URL}/api/websites/uploadImage/${websiteId}`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          onAdd(data.url);
          handleClose();
          return;
        }
      }
      // Fallback: If external Cloudinary upload is unconfigured, store preview data-URL
      if (preview) {
        onAdd(preview);
        handleClose();
      }
    } catch (err) {
      console.warn('Direct upload fallback:', err);
      if (preview) {
        onAdd(preview);
        handleClose();
      } else {
        setError('Failed to upload image. Please try pasting a direct image URL.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddUrl = () => {
    if (!urlInput.trim()) {
      setError('Please provide a valid image URL');
      return;
    }
    onAdd(urlInput.trim());
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-primary" />
            Add Hero Banner Image
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url" className="gap-2">
              <LinkIcon className="h-4 w-4" /> Image URL & Presets
            </TabsTrigger>
            <TabsTrigger value="file" className="gap-2">
              <UploadCloud className="h-4 w-4" /> Upload File
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="image-url">Image URL</Label>
              <Input
                id="image-url"
                placeholder="https://images.unsplash.com/..."
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setError('');
                }}
              />
            </div>

            {urlInput && (
              <div className="overflow-hidden rounded-lg border h-36 bg-muted">
                <img
                  src={urlInput}
                  alt="Preview"
                  className="h-full w-full object-cover"
                  onError={() => setError('Could not load image from this URL')}
                />
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Or select a high-res preset:</p>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_IMAGES.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => setUrlInput(preset.url)}
                    className="flex items-center gap-2 p-1.5 rounded-lg border bg-muted/40 hover:bg-muted text-left transition-colors"
                  >
                    <img src={preset.url} alt={preset.label} className="h-9 w-9 rounded object-cover shrink-0" />
                    <span className="text-xs font-medium truncate">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleAddUrl} disabled={!urlInput.trim() || isLoading}>
                Add Image
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="file" className="space-y-4 pt-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer hover:border-primary transition-colors bg-muted/20"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {preview ? (
                <div className="flex flex-col items-center">
                  <img src={preview} alt="Selected file" className="h-36 rounded-lg object-contain mb-2" />
                  <p className="text-xs text-muted-foreground">{file?.name}</p>
                </div>
              ) : (
                <>
                  <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Click or drag an image here</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP up to 5MB</p>
                </>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={handleClose} disabled={isUploading}>
                Cancel
              </Button>
              <Button onClick={handleUploadFile} disabled={!file || isUploading || isLoading}>
                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Upload & Add
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
