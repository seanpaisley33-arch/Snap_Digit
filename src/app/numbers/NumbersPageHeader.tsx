'use client';

import { motion } from 'framer-motion';

export default function NumbersPageHeader() {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 15 }}
      className="mb-8"
    >
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 120, damping: 14 }}
        className="text-3xl font-extrabold text-gray-900 dark:text-white"
      >
        Virtual Numbers
      </motion.h1>
      <motion.p 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, type: 'spring', stiffness: 120, damping: 14 }}
        className="text-gray-500 dark:text-gray-400 mt-2"
      >
        Purchase temporary numbers for SMS verification.
      </motion.p>
    </motion.div>
  );
}
