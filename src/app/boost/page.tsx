import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import BoostOrderForm from './BoostOrderForm';
import BoostPageHeader from './BoostPageHeader';

export const metadata = {
  title: 'Social Boost | SnapDigit',
};

export default async function BoostPage() {
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
      <BoostPageHeader />
      
      <BoostOrderForm initialBalance={profile?.wallet_balance || 0} />
    </div>
  );
}
