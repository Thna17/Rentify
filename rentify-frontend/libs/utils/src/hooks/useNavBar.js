// src/hooks/useNavBar.js
import { useState } from 'react';

export const useNavBar = () => {
  const [moreOpen, setMoreOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const maxCategoriesToShow = 2;

  return {
    moreOpen,
    shopOpen,
    setMoreOpen,
    setShopOpen,
    maxCategoriesToShow
  };
};