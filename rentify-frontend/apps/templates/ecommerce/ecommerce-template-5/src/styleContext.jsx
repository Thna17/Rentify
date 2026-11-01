import { createContext, useContext } from 'react';
import { EDITORIAL_STYLES } from '@rentify/storefront/editorialStyles';
export const EditorialStyleContext = createContext(EDITORIAL_STYLES[5]);
export const useEditorialStyle = () => useContext(EditorialStyleContext);
