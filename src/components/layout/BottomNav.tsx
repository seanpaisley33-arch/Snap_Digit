'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Phone, Zap, User } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Numbers', href: '/numbers', icon: Phone },
  { name: 'Boost', href: '/boost', icon: Zap },
  { name: 'Dashboard', href: '/dashboard', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.2 }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 pb-safe"
    >
      <div className="flex justify-around items-center h-16">
        {navItems.map((item, i) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link key={item.name} href={item.href} className="flex-1">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05, type: 'spring', stiffness: 200, damping: 18 }}
                whileTap={{ scale: 0.85 }}
                className="flex flex-col items-center justify-center w-full h-16 relative"
              >
                {/* Active indicator pill */}
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-active"
                    className="absolute top-1 w-8 h-1 rounded-full bg-indigo-500"
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  />
                )}

                <motion.div
                  animate={isActive ? { scale: 1.15, y: -2 } : { scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <Icon
                    className={`w-6 h-6 mb-1 transition-colors ${
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  />
                </motion.div>
                <motion.span
                  animate={isActive ? { color: '#4f46e5' } : { color: '#9ca3af' }}
                  className="text-[10px] font-semibold"
                >
                  {item.name}
                </motion.span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}
