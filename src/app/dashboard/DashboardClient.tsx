'use client';

import { useState } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function DashboardClient({ profile, transactions }: { profile: any, transactions: any[] }) {
  const [isFunding, setIsFunding] = useState(false);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleFundWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount) }),
      });
      const data = await res.json();
      
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        alert(data.error || 'Payment initiation failed');
      }
    } catch (err) {
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <button onClick={handleLogout} className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline">
          Sign Out
        </button>
      </div>

      {/* Wallet Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-indigo-100 mb-2">
            <Wallet className="w-5 h-5" />
            <span className="font-medium uppercase tracking-wider text-sm">Available Balance</span>
          </div>
          <div className="text-5xl font-extrabold mb-8">
            <span className="text-3xl mr-1">XAF</span>{Number(profile?.wallet_balance || 0).toLocaleString()}
          </div>
          <button 
            onClick={() => setIsFunding(!isFunding)}
            className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-lg"
          >
            Fund Wallet
          </button>
        </div>
      </div>

      {/* Fund Wallet Inline Form */}
      {isFunding && (
        <form onSubmit={handleFundWallet} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-bold mb-4 dark:text-white">Add Funds via MoMo / OM</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">XAF</span>
              <input
                type="number"
                min="100"
                required
                placeholder="Enter amount (e.g. 5000)"
                className="w-full pl-14 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center min-w-[140px]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Proceed to Pay'}
            </button>
          </div>
        </form>
      )}

      {/* Transactions List */}
      <div>
        <h2 className="text-xl font-bold mb-4 dark:text-white">Recent Transactions</h2>
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">No transactions yet.</div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {transactions.map((t) => (
                <li key={t.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${t.type === 'deposit' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                      {t.type === 'deposit' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white capitalize">{t.type}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(t.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${t.type === 'deposit' ? 'text-green-600' : 'text-orange-600'}`}>
                      {t.type === 'deposit' ? '+' : '-'} {Number(t.amount).toLocaleString()} XAF
                    </p>
                    <div className="flex items-center justify-end gap-1 text-xs mt-1 font-medium capitalize text-gray-500">
                      {t.status === 'success' && <CheckCircle className="w-3 h-3 text-green-500" />}
                      {t.status === 'pending' && <Clock className="w-3 h-3 text-yellow-500" />}
                      {t.status === 'failed' && <XCircle className="w-3 h-3 text-red-500" />}
                      {t.status}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
