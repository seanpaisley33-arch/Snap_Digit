'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Phone, Zap, LayoutDashboard, LogIn } from 'lucide-react';
import { motion, Variants } from 'framer-motion';

const mainNavItems = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Virtual Numbers', href: '/numbers', icon: Phone },
  { name: 'Social Boost', href: '/boost', icon: Zap },
];

const dashNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
];

const sidebarVariants: Variants = {
  hidden: { x: -80, opacity: 0 },
  show: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 120, damping: 18, staggerChildren: 0.07, delayChildren: 0.15 }
  }
};

const itemVariants: Variants = {
  hidden: { x: -20, opacity: 0 },
  show: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 200, damping: 20 } }
};

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <motion.aside
      variants={sidebarVariants}
      initial="hidden"
      animate="show"
      className="hidden md:flex flex-col w-64 h-screen fixed top-0 left-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-40"
    >
      {/* Logo */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-center h-16 border-b border-gray-200 dark:border-gray-800 px-6"
      >
        <Link href="/" className="flex items-center gap-2 group">
          <motion.div
            whileHover={{ rotate: 20, scale: 1.2 }}
            transition={{ type: 'spring', stiffness: 300, damping: 12 }}
          >
            <Zap className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </motion.div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
            SnapDigit
          </span>
        </Link>
      </motion.div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-4 space-y-1">
          <motion.p variants={itemVariants} className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">
            Services
          </motion.p>
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <motion.div key={item.name} variants={itemVariants}>
                <Link href={item.href}>
                  <motion.div
                    whileHover={{ x: 4, backgroundColor: isActive ? undefined : 'rgba(99,102,241,0.07)' }}
                    whileTap={{ scale: 0.97 }}
                    className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-white'
                    }`}
                  >
                    <Icon className={`mr-3 flex-shrink-0 h-5 w-5 ${isActive ? 'text-indigo-500' : 'text-gray-400'}`} />
                    {item.name}
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500"
                      />
                    )}
                  </motion.div>
                </Link>
              </motion.div>
            );
          })}

          <motion.p variants={itemVariants} className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-8">
            Account
          </motion.p>
          {dashNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <motion.div key={item.name} variants={itemVariants}>
                <Link href={item.href}>
                  <motion.div
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.97 }}
                    className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-white'
                    }`}
                  >
                    <Icon className={`mr-3 flex-shrink-0 h-5 w-5 ${isActive ? 'text-indigo-500' : 'text-gray-400'}`} />
                    {item.name}
                  </motion.div>
                </Link>
              </motion.div>
            );
          })}
        </nav>
      </div>

      {/* Bottom Sign In */}
      <motion.div variants={itemVariants} className="flex-shrink-0 flex border-t border-gray-200 dark:border-gray-800 p-4">
        <Link href="/login" className="flex-shrink-0 w-full group block">
          <motion.div
            whileHover={{ x: 3, backgroundColor: 'rgba(99,102,241,0.05)' }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center w-full rounded-xl px-2 py-1.5 transition-colors"
          >
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
              <LogIn className="w-5 h-5" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-white">
                Sign In / Register
              </p>
            </div>
          </motion.div>
        </Link>
      </motion.div>
    </motion.aside>
  );
}
