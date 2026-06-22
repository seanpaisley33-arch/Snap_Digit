import Link from 'next/link';
import { Home, Phone, Zap, User, LayoutDashboard, LogIn, CreditCard } from 'lucide-react';

const mainNavItems = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Virtual Numbers', href: '/numbers', icon: Phone },
  { name: 'Social Boost', href: '/boost', icon: Zap },
];

const dashNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
];

export default function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed top-0 left-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-40">
      <div className="flex items-center justify-center h-16 border-b border-gray-200 dark:border-gray-800 px-6">
        <Link href="/" className="flex items-center gap-2">
          <Zap className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
            SnapDigit
          </span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-4 space-y-1">
          <p className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">
            Services
          </p>
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center px-2 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-indigo-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white group transition-colors"
              >
                <Icon className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-indigo-500" />
                {item.name}
              </Link>
            );
          })}

          <p className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-8">
            Account
          </p>
          {dashNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center px-2 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-indigo-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white group transition-colors"
              >
                <Icon className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-indigo-500" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-gray-800 p-4">
        <Link href="/login" className="flex-shrink-0 w-full group block">
          <div className="flex items-center w-full">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
              <LogIn className="w-5 h-5" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900 dark:text-gray-300 dark:group-hover:text-white">
                Sign In / Register
              </p>
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );
}
