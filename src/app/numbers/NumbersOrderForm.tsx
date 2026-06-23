'use client';

import { useState, useEffect } from 'react';
import { Wallet, Loader2, CheckCircle2, Copy, MessageSquare, Plus, ChevronDown, RefreshCw, XCircle } from 'lucide-react';
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

export default function NumbersOrderForm({ initialBalance }: { initialBalance: number }) {
  const [balance, setBalance] = useState(initialBalance);
  const [countryId, setCountryId] = useState(COUNTRIES[0].id);
  const [serviceId, setServiceId] = useState(SERVICES[0].id);
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);

  const router = useRouter();
  const supabase = createClient();

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

  // Price multiplier logic
  const getPrice = () => {
    const base = SERVICES.find(s => s.id === serviceId)?.basePrice || 0;
    const countryMultiplier = countryId === 'us' || countryId === 'uk' ? 1.5 : 1.0;
    return Math.floor(base * countryMultiplier);
  };

  const totalCharge = getPrice();

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
        // Add to active orders
        setActiveOrders(prev => [...prev, {
          id: data.order.id,
          phone_number: data.order.details.phone_number,
          country: countryId,
          service: serviceId,
          expires: data.order.details.expires || new Date(Date.now() + 15 * 60000).toISOString(),
        }]);
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
    // Just removes it from view (for completed orders)
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
            if (order.isCancelling) continue; // skip polling if currently cancelling

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
      }, 5000); // Poll every 5 seconds
    }

    return () => clearInterval(interval);
  }, [activeOrders, supabase]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
      
      {/* Toast Notification Card */}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300 flex items-center gap-3 px-6 py-3.5 rounded-2xl shadow-2xl border ${
          toast.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/90 border-green-200 dark:border-green-700 text-green-800 dark:text-green-100' 
            : 'bg-red-50 dark:bg-red-900/90 border-red-200 dark:border-red-700 text-red-800 dark:text-red-100'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span className="font-bold">{toast.message}</span>
        </div>
      )}

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
            {balance.toLocaleString()} XAF
          </button>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl font-medium">
            {errorMsg}
          </div>
        )}

        {/* --- Purchase Form (Always Visible) --- */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 space-y-6">
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
                      isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-transparent bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
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
                      isSelected ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-transparent bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
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

        {/* --- Active Orders List --- */}
        {activeOrders.length > 0 && (
          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white px-2">Your Active Numbers</h3>
            
            {activeOrders.map(order => {
              const country = COUNTRIES.find(c => c.id === order.country);
              const service = SERVICES.find(s => s.id === order.service);

              return (
                <div key={order.id} className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 relative overflow-hidden group transition-all">
                  
                  {/* Status Indicator Banner */}
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${order.sms_code ? 'bg-green-500' : 'bg-indigo-500'}`} />

                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pl-4">
                    
                    {/* Left Info */}
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2">
                        {country && <img src={`https://flagcdn.com/w40/${country.code}.png`} alt={country.name} className="w-5 rounded-sm shadow-sm" />}
                        <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                          {service?.icon}
                          {service?.name} ({country?.name})
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
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Column: Info */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-800 sticky top-6">
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
        </div>
      </div>
    </div>
  );
}
