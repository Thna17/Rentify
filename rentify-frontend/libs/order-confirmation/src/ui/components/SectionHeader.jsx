import { CardTitle } from '@rentify/shared/ui/card';
import { motion } from 'framer-motion';

export const SectionHeader = ({ icon, title }) => (
  <div className="flex items-center gap-3 mb-5">
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 text-blue-600"
    >
      {icon}
    </motion.div>
    <div>
      <CardTitle className="text-lg font-semibold text-gray-900">{title}</CardTitle>
    </div>
  </div>
);

