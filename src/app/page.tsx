import Link from 'next/link';
import { Phone, Zap, Users, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col gap-16 pb-12">
      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-16 md:pt-32 md:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-gray-950 -z-10" />
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-purple-50/50 to-transparent dark:from-purple-900/10 -z-10 blur-3xl" />
        
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            <span>Instant Digital Delivery</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6">
            The Ultimate <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
              Digital Services
            </span> Hub
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
            Instantly purchase virtual numbers for SMS verification, supercharge your social media presence, and grab ready-made premium accounts.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-semibold text-lg transition-all shadow-lg hover:shadow-indigo-500/25 flex items-center justify-center gap-2">
              Start Exploring <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="#services" className="px-8 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-full font-semibold text-lg transition-all">
              View Catalog
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Active Users', value: '10K+' },
            { label: 'Orders Processed', value: '1M+' },
            { label: 'Success Rate', value: '99.9%' },
            { label: 'Support Response', value: '< 5m' },
          ].map((stat) => (
            <div key={stat.label} className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm text-center">
              <div className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">{stat.value}</div>
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">Our Services</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Premium digital assets delivered instantly to your dashboard upon purchase.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Service 1 */}
            <div className="group rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 hover:shadow-xl transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
              <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6">
                <Phone className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Virtual Numbers</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Receive SMS online instantly. Perfect for WhatsApp, Telegram, OpenAI, and more.</p>
              <ul className="space-y-3 mb-8">
                {['150+ Countries Available', 'Instant OTP Reception', 'No Subscription Required'].map((feature) => (
                  <li key={feature} className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 mr-3 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/numbers" className="block w-full py-3 text-center bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-indigo-600 dark:text-indigo-400 font-semibold rounded-xl transition-colors">
                Browse Numbers
              </Link>
            </div>

            {/* Service 2 */}
            <div className="group rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 hover:shadow-xl transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 dark:bg-purple-500/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
              <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/50 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-6">
                <Zap className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Social Boost</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">High-quality followers, likes, and views to supercharge your social proof.</p>
              <ul className="space-y-3 mb-8">
                {['Real Looking Profiles', 'Non-Drop Guarantee', 'Instant Start'].map((feature) => (
                  <li key={feature} className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <CheckCircle2 className="w-5 h-5 text-purple-500 mr-3 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/boost" className="block w-full py-3 text-center bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-purple-600 dark:text-purple-400 font-semibold rounded-xl transition-colors">
                View Packages
              </Link>
            </div>

            {/* Service 3 */}
            <div className="group rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 hover:shadow-xl transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/50 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Premium Accounts</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Aged, verified, and ready-to-use accounts for various platforms.</p>
              <ul className="space-y-3 mb-8">
                {['Phone Verified', 'Aged & Warmed Up', 'Secure Delivery'].map((feature) => (
                  <li key={feature} className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-3 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="block w-full py-3 text-center bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-emerald-600 dark:text-emerald-400 font-semibold rounded-xl transition-colors">
                Explore Accounts
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
