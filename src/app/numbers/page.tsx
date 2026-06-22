import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import NumbersOrderForm from './NumbersOrderForm';

export const metadata = {
  title: 'Virtual Numbers | SnapDigit',
};

export default async function NumbersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch the user's current wallet balance
  const { data: profile } = await supabase
    .from('profiles')
    .select('wallet_balance')
    .eq('id', user.id)
    .single();

  return (
    <div className="p-6 max-w-4xl mx-auto pb-24 md:pb-6">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Virtual Numbers</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Purchase temporary numbers for SMS verification.
        </p>
      </div>
      
      <NumbersOrderForm initialBalance={profile?.wallet_balance || 0} />
    </div>
  );
}
