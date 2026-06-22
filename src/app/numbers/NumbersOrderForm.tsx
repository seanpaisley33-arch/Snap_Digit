'use client';

import { useState, useEffect } from 'react';
import { Wallet, Loader2, CheckCircle2, Copy, MessageSquare, Plus, ChevronDown, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

import { FaWhatsapp, FaTelegram, FaGoogle, FaRobot, FaFire, FaFacebook, FaMobileAlt } from 'react-icons/fa';

const COUNTRIES = [
  { id: 'us', code: 'us', name: 'United States' },
  { id: 'uk', code: 'gb', name: 'United Kingdom' },
  { id: 'ca', code: 'ca', name: 'Canada' },
  { id: 'fr', code: 'fr', name: 'France' },
  { id: 'ng', code: 'ng', name: 'Nigeria' },
  { id: 'za', code: 'za', name: 'South Africa' },
];

const SERVICES = [
  { id: 'whatsapp', name: 'WhatsApp', icon: <FaWhatsapp className="text-[#25D366] w-5 h-5" />, basePrice: 400 },
  { id: 'telegram', name: 'Telegram', icon: <FaTelegram className="text-[#0088cc] w-5 h-5" />, basePrice: 300 },
  { id: 'google_voice', name: 'Google Voice', icon: <FaGoogle className="text-[#EA4335] w-5 h-5" />, basePrice: 1500 },
  { id: 'openai', name: 'OpenAI (ChatGPT)', icon: <FaRobot className="text-[#10a37f] w-5 h-5" />, basePrice: 200 },
  { id: 'tinder', name: 'Tinder', icon: <FaFire className="text-[#fe3c72] w-5 h-5" />, basePrice: 500 },
  { id: 'facebook', name: 'Facebook', icon: <FaFacebook className="text-[#1877F2] w-5 h-5" />, basePrice: 350 },
  { id: 'textplus', name: 'TextPlus', icon: <FaMobileAlt className="text-gray-600 dark:text-gray-300 w-5 h-5" />, basePrice: 250 },
];

export default function NumbersOrderForm({ initialBalance }: { initialBalance: number }) {
  const [balance, setBalance] = useState(initialBalance);
  const [countryId, setCountryId] = useState(COUNTRIES[0].id);
  const [serviceId, setServiceId] = useState(SERVICES[0].id);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Active Order State
  const [activeNumber, setActiveNumber] = useState('');
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [smsCode, setSmsCode] = useState('');
  const [isWaitingSms, setIsWaitingSms] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  // Price multiplier logic based on country
  const getPrice = () => {
    const base = SERVICES.find(s => s.id === serviceId)?.basePrice || 0;
    const countryMultiplier = countryId === 'us' || countryId === 'uk' ? 1.5 : 1.0;
    return Math.floor(base * countryMultiplier);
  };

  const totalCharge = getPrice();
  const currentService = SERVICES.find(s => s.id === serviceId);
  const currentCountry = COUNTRIES.find(c => c.id === countryId);

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (totalCharge > balance) {
      setErrorMsg('Insufficient balance. Please fund your wallet.');
      setLoading(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    
    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          service_type: 'number',
          cost: totalCharge,
          details: {
            country: countryId,
            service: serviceId,
          }
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to purchase number');
      } else {
        setBalance(data.newBalance);
        setActiveNumber(data.order.details.phone_number);
        setActiveOrderId(data.order.id);
        setIsWaitingSms(true);
        setSmsCode('');
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Poll for SMS code
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isWaitingSms && activeOrderId) {
      interval = setInterval(async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch('/api/orders/check-sms', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({ orderId: activeOrderId })
          });
          
          const data = await res.json();
          
          if (data.status === 'completed' && data.sms_code) {
            setSmsCode(data.sms_code);
            setIsWaitingSms(false);
            clearInterval(interval);
          } else if (data.status === 'cancelled') {
            setIsWaitingSms(false);
            setActiveNumber('');
            setErrorMsg(data.message || 'Order was cancelled and refunded.');
            // Refresh balance from DB since it was refunded
            const balRes = await supabase.from('profiles').select('wallet_balance').eq('id', session?.user.id).single();
            if (balRes.data) setBalance(Number(balRes.data.wallet_balance));
            clearInterval(interval);
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 5000); // Check every 5 seconds
    }

    return () => clearInterval(interval);
  }, [isWaitingSms, activeOrderId, supabase]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Left Column: Form & SMS View */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Top Bar with Balance */}
        <div className="flex items-center justify-between mb-2 pb-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="text-indigo-500 w-6 h-6" />
            SMS Verification
          </h2>
          <button 
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-full text-sm font-bold transition-colors"
          >
            <div className="bg-white/20 rounded-full p-0.5">
              <Plus className="w-4 h-4" />
            </div>
            {balance.toLocaleString()} XAF
          </button>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl font-medium">
            {errorMsg}
          </div>
        )}

        {/* --- STATE 1: Purchase Form --- */}
        {!activeNumber && (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 space-y-6">
            
            {/* Country Grid */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Select Country</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {COUNTRIES.map(c => {
                  const isSelected = countryId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCountryId(c.id)}
                      className={`flex items-center gap-3 p-3 rounded-2xl transition-all border-2 text-left ${
                        isSelected 
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                          : 'border-transparent bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <img src={`https://flagcdn.com/w40/${c.code}.png`} alt={c.name} className="w-6 rounded-sm shadow-sm" />
                      <span className={`font-semibold text-sm ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}`}>
                        {c.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Service Custom Select */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Select Service</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SERVICES.map(srv => {
                  const isSelected = serviceId === srv.id;
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => setServiceId(srv.id)}
                      className={`flex items-center gap-3 p-3 rounded-2xl transition-all border-2 text-left ${
                        isSelected 
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                          : 'border-transparent bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex-shrink-0 bg-white dark:bg-gray-900 p-1.5 rounded-lg shadow-sm border border-gray-100 dark:border-gray-800">
                        {srv.icon}
                      </div>
                      <span className={`font-semibold text-sm truncate ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-gray-300'}`}>
                        {srv.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Price & Submit */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-6 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl">
                <span className="text-gray-600 dark:text-gray-400 font-medium">Cost</span>
                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {totalCharge.toLocaleString()} XAF
                </span>
              </div>
              
              <button 
                onClick={handlePurchase}
                disabled={loading}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Get Number'}
              </button>
            </div>
          </div>
        )}

        {/* --- STATE 2: Active Number & SMS Inbox --- */}
        {activeNumber && (
          <div className="space-y-6">
            <div className="bg-indigo-600 dark:bg-indigo-500 rounded-3xl p-6 md:p-8 shadow-xl text-white text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8"></div>
              
              <p className="font-medium text-indigo-100 mb-2 uppercase tracking-wide text-sm">
                Your {currentCountry?.name} {currentService?.name} Number
              </p>
              <div className="text-3xl md:text-5xl font-black tracking-tight mb-6 flex items-center justify-center gap-4">
                {activeNumber}
                <button 
                  onClick={() => copyToClipboard(activeNumber)}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors backdrop-blur-sm"
                  title="Copy Number"
                >
                  <Copy className="w-6 h-6" />
                </button>
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-100 border border-yellow-500/30 rounded-full text-sm font-medium">
                ⏳ Number expires in 14:59
              </div>
            </div>

            {/* Inbox */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 min-h-[250px]">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-500" />
                  SMS Inbox
                </h3>
                {isWaitingSms && <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />}
              </div>

              {isWaitingSms ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-500 dark:text-gray-400 space-y-4">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-200 dark:text-indigo-900" />
                  <p>Waiting for SMS code from {currentService?.name}...</p>
                </div>
              ) : smsCode ? (
                <div className="animate-in fade-in slide-in-from-bottom-4">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 rounded-2xl p-6 flex flex-col items-center justify-center">
                    <p className="text-green-700 dark:text-green-400 font-medium mb-2">Code Received!</p>
                    <div className="text-4xl font-black tracking-widest text-gray-900 dark:text-white mb-4">
                      {smsCode}
                    </div>
                    <button 
                      onClick={() => copyToClipboard(smsCode)}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors shadow-sm"
                    >
                      Copy Code
                    </button>
                  </div>
                  <div className="mt-6 flex justify-center">
                    <button 
                      onClick={() => setActiveNumber('')}
                      className="text-gray-500 hover:text-indigo-600 font-medium underline"
                    >
                      Buy another number
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Right Column: User Info & Description */}
      <div className="space-y-6">
        
        {/* Service Description Box */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="text-xl">ℹ️</span> How it works
          </h3>
          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            <p><strong>1. Purchase:</strong> Select a country and the service you want to register for, then click get number.</p>
            <p><strong>2. Register:</strong> Copy the provided virtual number and paste it into the app (e.g. WhatsApp, Google Voice).</p>
            <p><strong>3. Receive SMS:</strong> Wait here. The verification code will appear in your SMS inbox automatically.</p>
            
            <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl text-indigo-800 dark:text-indigo-300 text-xs font-medium">
              <strong>Auto-Refund:</strong> If the SMS code does not arrive within 15 minutes, your money is automatically refunded to your SnapDigit wallet.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
