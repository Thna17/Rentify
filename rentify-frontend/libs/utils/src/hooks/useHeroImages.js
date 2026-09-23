// hooks/useHeroImages.js
import { useState } from 'react';
import { useUpdateWebsiteContentMutation } from '@rentify/apis';

export function useHeroImages(heroImageContent) {
  const [updateContent] = useUpdateWebsiteContentMutation();
  const [images, setImages] = useState(heroImageContent?.value || []);
  const contentId = heroImageContent?.id;

  const addImage = async (newImage) => {
    try {
      const newImages = [...images, newImage];
      await updateContent({
        contentId,
        body: { value: newImages }
      }).unwrap();
      setImages(newImages);
    } catch (error) {
      console.error('Failed to add image:', error);
    }
  };

  const removeImage = async (index) => {
    try {
      const newImages = images.filter((_, i) => i !== index);
      await updateContent({
        contentId,
        body: { value: newImages }
      }).unwrap();
      setImages(newImages);
    } catch (error) {
      console.error('Failed to remove image:', error);
    }
  };

  return { images, addImage, removeImage };
}