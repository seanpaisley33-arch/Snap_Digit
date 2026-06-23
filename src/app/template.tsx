'use client';

import { motion } from 'framer-motion';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ 
        type: 'spring', 
        stiffness: 100, 
        damping: 15, 
        mass: 1,
        duration: 0.6 
      }}
      className="h-full w-full"
    >
      {children}
    </motion.div>
  );
}
