'use client';

import { useState, useEffect, useMemo } from 'react';
import { Wallet, Loader2, CheckCircle2, ChevronDown, Plus, X, XCircle, Clock, Link as LinkIcon } from 'lucide-react';
import { FaTiktok, FaInstagram, FaYoutube, FaTelegram, FaFacebook } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const CATEGORIES = [
  { id: 'instagram', name: 'Instagram', icon: <FaInstagram className="w-5 h-5 text-pink-500" /> },
  { id: 'facebook', name: 'Facebook', icon: <FaFacebook className="w-5 h-5 text-blue-600" /> },
  { id: 'tiktok', name: 'TikTok', icon: <FaTiktok className="w-5 h-5 text-black dark:text-white" /> },
  { id: 'telegram', name: 'Telegram', icon: <FaTelegram className="w-5 h-5 text-blue-400" /> },
  { id: 'youtube', name: 'YouTube', icon: <FaYoutube className="w-5 h-5 text-red-600" /> },
];

const SERVICES = {
  tiktok: [
    { id: 'tk_views', name: 'Video/Reel Views', ratePer1000: 5, min: 100, max: 100000 },
    { id: 'tk_likes', name: 'Post Likes', ratePer1000: 150, min: 50, max: 20000 },
    { id: 'tk_followers', name: 'Profile Followers', ratePer1000: 800, min: 100, max: 50000 },
  ],
  instagram: [
    { id: 'ig_likes', name: 'Post Likes', ratePer1000: 40, min: 50, max: 50000 },
    { id: 'ig_followers', name: 'Profile Followers', ratePer1000: 600, min: 100, max: 100000 },
  ],
  youtube: [
    { id: 'yt_views', name: 'Video/Reel Views', ratePer1000: 900, min: 1000, max: 1000000 },
    { id: 'yt_subs', name: 'Channel Subscribers', ratePer1000: 2500, min: 50, max: 5000 },
  ],
  facebook: [
    { id: 'fb_page_followers', name: 'Page Followers', ratePer1000: 500, min: 100, max: 50000 },
    { id: 'fb_profile_followers', name: 'Profile Followers', ratePer1000: 450, min: 100, max: 20000 },
    { id: 'fb_likes', name: 'Post Likes', ratePer1000: 200, min: 50, max: 50000 },
    { id: 'fb_emoji', name: 'Emoji post reactions', ratePer1000: 300, min: 50, max: 10000 },
    { id: 'fb_shares', name: 'Post Shares', ratePer1000: 400, min: 50, max: 10000 },
    { id: 'fb_groups', name: 'Group Members', ratePer1000: 800, min: 100, max: 20000 },
    { id: 'fb_views', name: 'Video/Reel Views', ratePer1000: 150, min: 100, max: 100000 },
    { id: 'fb_comments', name: 'Custom Comments', ratePer1000: 1500, min: 10, max: 1000 },
    { id: 'fb_reviews', name: 'Page Reviews', ratePer1000: 2000, min: 10, max: 500 },
  ],
  telegram: [
    { id: 'tg_members', name: 'Group/Channel Members', ratePer1000: 400, min: 100, max: 50000 },
    { id: 'tg_views', name: 'Post Views', ratePer1000: 10, min: 100, max: 100000 },
  ]
};

interface BoostOrder {
  id: string;
  status: string;
  cost: number;
  created_at: string;
  details: {
    platform: string;
    service: string;
    link: string;
    quantity: number;
  };
  isCancelling?: boolean;
}

export default function BoostOrderForm({ initialBalance }: { initialBalance: number }) {
  const [balance, setBalance] = useState(initialBalance);
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [serviceId, setServiceId] = useState(SERVICES['instagram'][0].id);
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const [activeOrders, setActiveOrders] = useState<BoostOrder[]>([]);

  // Modals state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const currentCategoryObj = CATEGORIES.find(c => c.id === category);
  const currentServices = SERVICES[category as keyof typeof SERVICES] || [];
  const selectedService = currentServices.find(s => s.id === serviceId) || currentServices[0];

  const totalCharge = useMemo(() => {
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) return 0;
    return (qty / 1000) * (selectedService?.ratePer1000 || 0);
  }, [quantity, selectedService]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchActiveOrders = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('service_type', 'boost')
        .order('created_at', { ascending: false })
        .limit(10); // Fetch recent 10 orders

      if (data && data.length > 0) {
        setActiveOrders(data as BoostOrder[]);
      }
    };
    fetchActiveOrders();
  }, [supabase]);

  const handleCategorySelect = (newCat: string) => {
    setCategory(newCat);
    setServiceId(SERVICES[newCat as keyof typeof SERVICES][0].id);
    setIsCategoryModalOpen(false);
  };

  const handleServiceSelect = (newSrv: string) => {
    setServiceId(newSrv);
    setIsServiceModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const qty = parseInt(quantity);
    if (qty < selectedService.min || qty > selectedService.max) {
      showToast(`Quantity must be between ${selectedService.min} and ${selectedService.max}`, 'error');
      setLoading(false);
      return;
    }

    if (totalCharge > balance) {
      showToast('Insufficient balance. Please fund your wallet.', 'error');
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
          service_type: 'boost',
          cost: totalCharge,
          details: {
            platform: category,
            service: selectedService.name,
            link: link,
            quantity: qty
          }
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Failed to place order', 'error');
      } else {
        showToast(`Order placed successfully! ID: ${data.order.id.split('-')[0]}`, 'success');
        setBalance(data.newBalance);
        setLink('');
        setQuantity('');
        
        // Add to active orders at the top
        setActiveOrders(prev => [data.order as BoostOrder, ...prev]);
      }
    } catch (err) {
      showToast('An unexpected error occurred.', 'error');
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
        showToast('Order cancelled and refunded successfully.', 'success');
        // Update local state to cancelled
        setActiveOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled', isCancelling: false } : o));
        
        const balRes = await supabase.from('profiles').select('wallet_balance').eq('id', session?.user.id).single();
        if (balRes.data) setBalance(Number(balRes.data.wallet_balance));
      } else {
        showToast(data.error || 'Failed to cancel order.', 'error');
        setActiveOrders(prev => prev.map(o => o.id === orderId ? { ...o, isCancelling: false } : o));
      }
    } catch (e) {
      showToast('An error occurred while cancelling.', 'error');
      setActiveOrders(prev => prev.map(o => o.id === orderId ? { ...o, isCancelling: false } : o));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative">
      
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

      {/* Top Bar with Balance */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-purple-600">
          SnapDigit Booster
        </h2>
        <button 
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-full text-sm font-bold transition-colors"
        >
          <div className="bg-white/20 rounded-full p-0.5">
            <Plus className="w-4 h-4" />
          </div>
          {balance.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 3})} XAF
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Left Column: The Form */}
        <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-5 md:p-8 shadow-xl border border-gray-100 dark:border-gray-800">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Category Input */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 ml-1">Category</label>
              <div 
                onClick={() => setIsCategoryModalOpen(true)}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#3A3A3C] rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-[#3A3A3C] transition-colors"
              >
                <div className="flex items-center gap-3 text-gray-900 dark:text-white font-medium">
                  {currentCategoryObj?.icon}
                  {currentCategoryObj?.name}
                </div>
                <ChevronDown className="w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* Service Input */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 ml-1">Service</label>
              <div 
                onClick={() => setIsServiceModalOpen(true)}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#3A3A3C] rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-[#3A3A3C] transition-colors"
              >
                <div className="text-gray-900 dark:text-white font-medium truncate pr-4 text-sm">
                  {selectedService?.name}
                </div>
                <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
            </div>

            {/* Description Box */}
            <div className="bg-[#F8F9FA] dark:bg-[#2C2C2E] p-4 rounded-2xl border border-gray-200 dark:border-[#3A3A3C] text-sm text-gray-600 dark:text-gray-300">
              <p className="font-bold text-gray-800 dark:text-white mb-2">Note:</p>
              <ul className="list-decimal list-inside space-y-1 text-xs">
                <li>Please ensure your account is public.</li>
                <li>Enter the correct link format.</li>
                <li>Rate: <strong className="text-gray-900 dark:text-white">{selectedService?.ratePer1000} XAF</strong> per 1000.</li>
              </ul>
            </div>

            {/* Link */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 ml-1">Link</label>
              <input 
                type="url"
                required
                placeholder="https://..."
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#3A3A3C] rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 dark:text-white transition-all outline-none"
              />
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 ml-1">Quantity</label>
              <input 
                type="number"
                required
                min={selectedService?.min}
                max={selectedService?.max}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-4 py-3.5 bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-[#3A3A3C] rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 dark:text-white transition-all outline-none"
              />
              <p className="text-[11px] text-gray-500 ml-1">
                Min: {selectedService?.min.toLocaleString()} - Max: {selectedService?.max.toLocaleString()}
              </p>
            </div>

            {/* Charge */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 ml-1">Charge</label>
              <div className="w-full px-4 py-3.5 bg-gray-100 dark:bg-[#1C1C1E] border border-gray-200 dark:border-[#3A3A3C] rounded-2xl text-gray-500 cursor-not-allowed font-semibold">
                {totalCharge > 0 ? totalCharge.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2}) : '0'} XAF
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#1C1C1E] dark:bg-white text-white dark:text-black rounded-full font-bold transition-all hover:opacity-90 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Place Order'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Active Orders */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white px-2">Order History</h3>
          
          {activeOrders.length === 0 ? (
            <div className="bg-white dark:bg-[#1C1C1E] rounded-3xl p-8 text-center border border-gray-100 dark:border-gray-800 shadow-sm text-gray-500">
              No recent orders found.
            </div>
          ) : (
            <div className="space-y-3">
              {activeOrders.map(order => {
                const catObj = CATEGORIES.find(c => c.id === order.details.platform);
                return (
                  <div key={order.id} className="bg-white dark:bg-[#1C1C1E] rounded-2xl p-4 md:p-5 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    
                    {/* Status Banner */}
                    <div className={`absolute left-0 top-0 w-1.5 h-full ${
                      order.status === 'processing' ? 'bg-yellow-400' :
                      order.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                    }`} />

                    <div className="pl-3 flex flex-col space-y-3">
                      
                      {/* Top Row: Service & Status */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2">
                          {catObj?.icon}
                          <span className="font-bold text-gray-900 dark:text-white text-sm">
                            {order.details.service}
                          </span>
                        </div>
                        
                        <div className={`text-[11px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${
                          order.status === 'processing' ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500' :
                          order.status === 'completed' ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-500' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-500'
                        }`}>
                          {order.status === 'processing' ? 'In Progress' : 
                           order.status === 'completed' ? 'Completed' : 'Cancelled'}
                        </div>
                      </div>

                      {/* Middle Row: Link */}
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg break-all">
                        <LinkIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="line-clamp-1">{order.details.link}</span>
                      </div>

                      {/* Bottom Row: Quantity, Cost, Actions */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-gray-900 dark:text-white">
                            {order.details.quantity.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Quantity</span>
                        </div>
                        
                        <div className="flex flex-col text-right">
                          <span className="text-sm font-black text-pink-600 dark:text-pink-400">
                            {order.cost} XAF
                          </span>
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Cost</span>
                        </div>
                      </div>

                      {/* Cancel Action if Processing */}
                      {order.status === 'processing' && (
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
                          <button 
                            onClick={() => handleCancelOrder(order.id)}
                            disabled={order.isCancelling}
                            className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                          >
                            {order.isCancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                            {order.isCancelling ? 'Cancelling...' : 'Cancel & Refund'}
                          </button>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* --- MODALS --- */}
      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsCategoryModalOpen(false)}>
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white dark:bg-[#1C1C1E] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Select a social media</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-1">
              {CATEGORIES.map(cat => (
                <div 
                  key={cat.id} 
                  onClick={() => handleCategorySelect(cat.id)}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-[#2C2C2E] rounded-2xl cursor-pointer transition-colors border border-transparent dark:border-[#2C2C2E]"
                >
                  <div className="flex items-center gap-4">
                    {cat.icon}
                    <span className="font-semibold text-gray-900 dark:text-white">{cat.name}</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${category === cat.id ? 'border-pink-500' : 'border-gray-300 dark:border-gray-600'}`}>
                    {category === cat.id && <div className="w-2.5 h-2.5 bg-pink-500 rounded-full" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Service Modal */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsServiceModalOpen(false)}>
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white dark:bg-[#1C1C1E] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Select a service</h3>
              <button onClick={() => setIsServiceModalOpen(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-1">
              {currentServices.map(srv => (
                <div 
                  key={srv.id} 
                  onClick={() => handleServiceSelect(srv.id)}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-[#2C2C2E] rounded-2xl cursor-pointer transition-colors border border-transparent dark:border-[#2C2C2E]"
                >
                  <span className="font-medium text-[15px] text-gray-900 dark:text-white pr-4">{srv.name}</span>
                  <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${serviceId === srv.id ? 'border-pink-500' : 'border-gray-300 dark:border-gray-600'}`}>
                    {serviceId === srv.id && <div className="w-2.5 h-2.5 bg-pink-500 rounded-full" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
