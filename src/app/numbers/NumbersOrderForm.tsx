'use client';

import { useState, useEffect } from 'react';
import { Wallet, Loader2, CheckCircle2, Copy, MessageSquare, Plus, ChevronDown, RefreshCw, XCircle, X, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { FaWhatsapp, FaTelegram, FaGoogle, FaRobot, FaFire, FaFacebook, FaMobileAlt } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

interface ActiveOrder {
  id: string;
  phone_number: string;
  country: string;
  service: string;
  expires: string;
  sms_code?: string;
  isCancelling?: boolean;
}

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calcTime = () => {
      const now = new Date().getTime();
      const exp = new Date(expiresAt).getTime();
      const diff = exp - now;
      if (diff <= 0) return '00:00';
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };
    setTimeLeft(calcTime());
    const int = setInterval(() => setTimeLeft(calcTime()), 1000);
    return () => clearInterval(int);
  }, [expiresAt]);

  return <span>⏳ Expires in {timeLeft}</span>;
}

const getCalculatedPrice = (basePrice: number, countryId: string, serviceId: string) => {
  // Canada Facebook exception
  if (countryId === 'canada' && serviceId === 'facebook') {
    return basePrice * 5;
  }
  
  // Google / Google Voice exceptions
  if (serviceId === 'google' || serviceId === 'googlevoice') {
    if (basePrice >= 0.3) {
      return basePrice * 10;
    } else {
      return basePrice * 15;
    }
  }
  
  // Standard tiered logic
  if (basePrice >= 0.4) return basePrice * 2;
  if (basePrice >= 0.1) return basePrice * 3;
  if (basePrice >= 0.01) return basePrice * 10;
  return basePrice * 100;
};

const getServiceIcon = (serviceId: string) => {
  const s = serviceId.toLowerCase();
  if (s.includes('whatsapp')) return <FaWhatsapp className="w-5 h-5 text-[#25D366]" />;
  if (s.includes('telegram')) return <FaTelegram className="w-5 h-5 text-[#0088cc]" />;
  if (s.includes('google')) return <FaGoogle className="w-5 h-5 text-[#EA4335]" />;
  if (s.includes('openai')) return <FaRobot className="w-5 h-5 text-[#10a37f]" />;
  if (s.includes('tinder')) return <FaFire className="w-5 h-5 text-[#fe3c72]" />;
  if (s.includes('facebook')) return <FaFacebook className="w-5 h-5 text-[#1877F2]" />;
  return <FaMobileAlt className="w-5 h-5 text-gray-500" />;
}

export default function NumbersOrderForm({ initialBalance }: { initialBalance: number }) {
  const [balance, setBalance] = useState(initialBalance);
  
  const [countries, setCountries] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [exchangeRate, setExchangeRate] = useState(600); // Default fallback
  
  const [countryId, setCountryId] = useState('usa'); // Default to USA
  const [serviceId, setServiceId] = useState('whatsapp'); // Default to Whatsapp
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);

  // Modals state
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const router = useRouter();
  const supabase = createClient();

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch initial data
  useEffect(() => {
    const initData = async () => {
      // Fetch Exchange Rate
      try {
        const erRes = await fetch('/api/exchange-rate');
        const erData = await erRes.json();
        if (erData?.rates?.XAF) {
          setExchangeRate(erData.rates.XAF);
        }
      } catch (e) {
        console.error("Exchange rate fetch failed, using default 600");
      }

      // Fetch Countries
      try {
        const cRes = await fetch('/api/5sim/countries');
        const cData = await cRes.json();
        const cArr = Object.keys(cData).map(key => {
          const isoObj = cData[key].iso || {};
          const isoCode = Object.keys(isoObj)[0] || 'us';
          
          let displayName = cData[key].text_en;
          if (key === 'england') displayName = 'United Kingdom (UK)';
          if (key === 'usa') displayName = 'United States (USA)';
          
          return {
            id: key,
            name: displayName,
            code: isoCode.toLowerCase()
          };
        }).sort((a, b) => a.name.localeCompare(b.name));
        
        setCountries(cArr);
      } catch (e) {
        console.error("Countries fetch failed");
      }
    };
    initData();
  }, []);

  // Fetch Services when Country changes
  useEffect(() => {
    const fetchServices = async () => {
      if (!countryId) return;
      try {
        const sRes = await fetch(`/api/5sim/products?country=${countryId}`);
        const sData = await sRes.json();
        const sArr = Object.keys(sData).map(key => {
          return {
            id: key,
            name: key.charAt(0).toUpperCase() + key.slice(1),
            price: sData[key].Price,
            qty: sData[key].Qty
          };
        }).sort((a, b) => a.name.localeCompare(b.name));
        
        setServices(sArr);
        
        // Auto-select first available service if current serviceId is not in the new list
        if (!sArr.find(s => s.id === serviceId) && sArr.length > 0) {
          setServiceId(sArr[0].id);
        }
      } catch (e) {
        console.error("Services fetch failed");
        setServices([]);
      }
    };
    fetchServices();
  }, [countryId]);

  // Load existing orders on mount
  useEffect(() => {
    const fetchActiveOrders = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'processing')
        .eq('service_type', 'number');

      if (data && data.length > 0) {
        const mapped = data.map(o => ({
          id: o.id,
          phone_number: o.details?.phone_number || '',
          country: o.details?.country || '',
          service: o.details?.service || '',
          expires: o.details?.expires || new Date(Date.now() + 15 * 60000).toISOString(),
          sms_code: o.details?.sms_code || '',
        }));
        setActiveOrders(mapped);
      }
    };
    fetchActiveOrders();
  }, [supabase]);

  // Pricing calculations
  const selectedCountryObj = countries.find(c => c.id === countryId);
  const selectedServiceObj = services.find(s => s.id === serviceId);

  const priceUSD = selectedServiceObj ? getCalculatedPrice(selectedServiceObj.price, countryId, serviceId) : 0;
  const priceXAF = Math.round(priceUSD * exchangeRate);

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (priceXAF > balance) {
      setErrorMsg('Insufficient balance. Please fund your wallet.');
      setLoading(false);
      return;
    }

    if (!selectedCountryObj || !selectedServiceObj) {
      setErrorMsg('Please wait for services to load.');
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
          cost: priceXAF,
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
        setActiveOrders(prev => [{
          id: data.order.id,
          phone_number: data.order.details.phone_number,
          country: countryId,
          service: serviceId,
          expires: data.order.details.expires || new Date(Date.now() + 15 * 60000).toISOString(),
        }, ...prev]);
        showToast('Number generated successfully!', 'success');
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    setActiveOrders(prev => prev.map(o => o.id === orderId ? { ...o, isCancelling: true } : o));
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ orderId })
      });
      const data = await res.json();
      
      if (res.ok && data.status === 'cancelled') {
        setActiveOrders(prev => prev.filter(o => o.id !== orderId));
        // Refresh balance
        const balRes = await supabase.from('profiles').select('wallet_balance').eq('id', session?.user.id).single();
        if (balRes.data) setBalance(Number(balRes.data.wallet_balance));
        showToast('Order cancelled successfully', 'success');
      } else {
        showToast(data.error || 'Failed to cancel order.', 'error');
        setActiveOrders(prev => prev.map(o => o.id === orderId ? { ...o, isCancelling: false } : o));
      }
    } catch (e) {
      showToast('An error occurred while cancelling.', 'error');
      setActiveOrders(prev => prev.map(o => o.id === orderId ? { ...o, isCancelling: false } : o));
    }
  };

  const handleDismissOrder = (orderId: string) => {
    setActiveOrders(prev => prev.filter(o => o.id !== orderId));
  };

  // Poll for SMS codes for pending orders
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const pendingOrders = activeOrders.filter(o => !o.sms_code);

    if (pendingOrders.length > 0) {
      interval = setInterval(async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          for (const order of pendingOrders) {
            if (order.isCancelling) continue;

            const res = await fetch('/api/orders/check-sms', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({ orderId: order.id })
            });
            
            const data = await res.json();
            
            if (data.status === 'completed' && data.sms_code) {
              setActiveOrders(prev => prev.map(o => o.id === order.id ? { ...o, sms_code: data.sms_code } : o));
            } else if (data.status === 'cancelled') {
              setActiveOrders(prev => prev.filter(o => o.id !== order.id));
              const balRes = await supabase.from('profiles').select('wallet_balance').eq('id', session.user.id).single();
              if (balRes.data) setBalance(Number(balRes.data.wallet_balance));
            }
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 5000);
    }

    return () => clearInterval(interval);
  }, [activeOrders, supabase]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success');
  };

  // Modal filters
  const filteredCountries = countries.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredServices = services.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
      
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className={`fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-6 py-3.5 rounded-2xl shadow-2xl border ${
              toast.type === 'success' 
                ? 'bg-green-50 dark:bg-green-900/90 border-green-200 dark:border-green-700 text-green-800 dark:text-green-100' 
                : 'bg-red-50 dark:bg-red-900/90 border-red-200 dark:border-red-700 text-red-800 dark:text-red-100'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <span className="font-bold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Column: Form & Active Orders */}
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
            {balance.toLocaleString(undefined, {minimumFractionDigits:0, maximumFractionDigits:2})} XAF
          </button>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl font-medium">
            {errorMsg}
          </div>
        )}

        {/* --- Purchase Form (Always Visible) --- */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 120, damping: 15 }}
          className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 space-y-6"
        >
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Country Selector */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Select Country</label>
              <div 
                onClick={() => { setSearchQuery(''); setIsCountryModalOpen(true); }}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#3A3A3C] rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-[#3A3A3C] transition-colors"
              >
                <div className="flex items-center gap-3 text-gray-900 dark:text-white font-medium">
                  {selectedCountryObj ? (
                    <>
                      <img src={`https://flagcdn.com/w40/${selectedCountryObj.code}.png`} alt="flag" className="w-6 rounded-sm" />
                      {selectedCountryObj.name}
                    </>
                  ) : (
                    <span className="text-gray-400">Loading countries...</span>
                  )}
                </div>
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* Service Selector */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1">Select Service</label>
              <div 
                onClick={() => { setSearchQuery(''); setIsServiceModalOpen(true); }}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#3A3A3C] rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-[#3A3A3C] transition-colors"
              >
                <div className="flex items-center gap-3 text-gray-900 dark:text-white font-medium">
                  {selectedServiceObj ? (
                    <>
                      {getServiceIcon(selectedServiceObj.id)}
                      {selectedServiceObj.name}
                    </>
                  ) : (
                    <span className="text-gray-400">Loading services...</span>
                  )}
                </div>
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-6 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Cost</span>
              <div className="flex flex-col items-end">
                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  ${priceUSD.toFixed(2)}
                </span>
                <span className="text-sm font-semibold text-gray-500">
                  ({priceXAF.toLocaleString()} XAF)
                </span>
              </div>
            </div>
            
            <motion.button 
              whileHover={{ scale: 1.02, boxShadow: '0 10px 40px rgba(99, 102, 241, 0.3)' }}
              whileTap={{ scale: 0.97 }}
              onClick={handlePurchase}
              disabled={loading || !selectedServiceObj || !selectedCountryObj}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Get Number'}
            </motion.button>
          </div>
        </motion.div>

        {/* --- Active Orders List --- */}
        {activeOrders.length > 0 && (
          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white px-2">Your Active Numbers</h3>
            
            {activeOrders.map((order, i) => {
              // Try to find full name, fallback to ID if not loaded
              const country = countries.find(c => c.id === order.country);
              const countryName = country?.name || order.country;
              const countryCode = country?.code || 'us'; // Fallback flag
              const serviceName = order.service.charAt(0).toUpperCase() + order.service.slice(1);

              return (
                <motion.div 
                  key={order.id} 
                  initial={{ opacity: 0, x: -25 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, type: 'spring', stiffness: 150, damping: 18 }}
                  className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 relative overflow-hidden group transition-all"
                >
                  
                  {/* Status Indicator Banner */}
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${order.sms_code ? 'bg-green-500' : 'bg-indigo-500'}`} />

                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pl-4">
                    
                    {/* Left Info */}
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2">
                        <img src={`https://flagcdn.com/w40/${countryCode}.png`} alt={countryName} className="w-5 rounded-sm shadow-sm" />
                        <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                          {getServiceIcon(order.service)}
                          {serviceName} ({countryName})
                        </span>
                        {!order.sms_code && (
                          <div className="ml-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-500 rounded-full text-xs font-bold">
                            <CountdownTimer expiresAt={order.expires} />
                          </div>
                        )}
                      </div>

                      <div className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                        {order.phone_number}
                        <button onClick={() => copyToClipboard(order.phone_number)} className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors text-gray-500 dark:text-gray-400">
                          <Copy className="w-5 h-5" />
                        </button>
                      </div>

                      {!order.sms_code && (
                        <button 
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={order.isCancelling}
                          className="text-sm font-semibold text-red-500 hover:text-red-700 flex items-center gap-1.5 transition-colors"
                        >
                          {order.isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                          {order.isCancelling ? 'Cancelling...' : 'Number rejected? Cancel & Refund'}
                        </button>
                      )}
                    </div>

                    {/* Right Info (SMS View) */}
                    <div className="w-full md:w-64 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center min-h-[120px]">
                      {order.sms_code ? (
                        <div className="text-center animate-in fade-in zoom-in duration-300">
                          <p className="text-xs font-bold uppercase tracking-wider text-green-600 dark:text-green-500 mb-1">Code Received</p>
                          <div className="text-3xl font-black tracking-widest text-gray-900 dark:text-white mb-3">
                            {order.sms_code}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => copyToClipboard(order.sms_code!)} className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold shadow-sm transition-colors">
                              Copy
                            </button>
                            <button onClick={() => handleDismissOrder(order.id)} className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold transition-colors">
                              Dismiss
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center flex flex-col items-center">
                          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 dark:text-indigo-500 mb-2" />
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Waiting for SMS...</p>
                        </div>
                      )}
                    </div>

                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Column: Info */}
      <div className="space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 120, damping: 15 }}
          className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 sticky top-6"
        >
          <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="text-xl">ℹ️</span> How it works
          </h3>
          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            <p><strong>1. Purchase:</strong> Select a country and service, then click get number.</p>
            <p><strong>2. Register:</strong> Copy the virtual number and paste it into the app (e.g. WhatsApp, Facebook).</p>
            <p><strong>3. Receive SMS:</strong> The code will appear in the order card automatically.</p>
            
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/10 rounded-xl text-red-800 dark:text-red-300 text-xs font-medium">
              <strong>Number Rejected?</strong> If Facebook says "Carrier not supported", just click "Cancel & Refund" on the order card to get your money back instantly and try another country!
            </div>

            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl text-indigo-800 dark:text-indigo-300 text-xs font-medium">
              <strong>Auto-Refund:</strong> If the code does not arrive within 15 minutes, your money is automatically refunded.
            </div>
          </div>
        </motion.div>
      </div>

      {/* --- MODALS --- */}
      
      {/* Country Modal */}
      <AnimatePresence>
        {isCountryModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm" 
            onClick={() => setIsCountryModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 shadow-2xl max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Select Country</h3>
                <button onClick={() => setIsCountryModalOpen(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-4 relative">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search country..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#3A3A3C] rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none dark:text-white transition-all"
                  autoFocus
                />
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-1">
                {filteredCountries.map(cat => (
                  <div 
                    key={cat.id} 
                    onClick={() => { setCountryId(cat.id); setIsCountryModalOpen(false); }}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-[#2C2C2E] rounded-2xl cursor-pointer transition-colors border border-transparent dark:border-[#2C2C2E]"
                  >
                    <div className="flex items-center gap-4">
                      <img src={`https://flagcdn.com/w40/${cat.code}.png`} alt="flag" className="w-6 rounded-sm" />
                      <span className="font-semibold text-gray-900 dark:text-white">{cat.name}</span>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${countryId === cat.id ? 'border-indigo-500' : 'border-gray-300 dark:border-gray-600'}`}>
                      {countryId === cat.id && <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />}
                    </div>
                  </div>
                ))}
                {filteredCountries.length === 0 && (
                  <div className="p-4 text-center text-gray-500">No countries found.</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Service Modal */}
      <AnimatePresence>
        {isServiceModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm" 
            onClick={() => setIsServiceModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 shadow-2xl max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Select Service</h3>
                <button onClick={() => setIsServiceModalOpen(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mb-4 relative">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search service (e.g. WhatsApp)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#3A3A3C] rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none dark:text-white transition-all"
                  autoFocus
                />
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-1">
                {filteredServices.map(srv => (
                  <div 
                    key={srv.id} 
                    onClick={() => { setServiceId(srv.id); setIsServiceModalOpen(false); }}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-[#2C2C2E] rounded-2xl cursor-pointer transition-colors border border-transparent dark:border-[#2C2C2E]"
                  >
                    <div className="flex items-center gap-3">
                      {getServiceIcon(srv.id)}
                      <span className="font-semibold text-gray-900 dark:text-white">{srv.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-xs font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md">
                        ${getCalculatedPrice(srv.price, countryId, srv.id).toFixed(2)}
                      </div>
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${serviceId === srv.id ? 'border-indigo-500' : 'border-gray-300 dark:border-gray-600'}`}>
                        {serviceId === srv.id && <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredServices.length === 0 && (
                  <div className="p-4 text-center text-gray-500">No services found.</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
