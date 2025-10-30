"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function TopNav() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setLoggedIn(!!data.session);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });

    return () => {
      sub.subscription.unsubscribe();
      mounted = false;
    };
  }, []);

  const onLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <div className="w-full border-b bg-white">
      <div className="max-w-6xl mx-auto flex items-center justify-between p-3">
        <div className="font-semibold">Farming Manager</div>
        <nav className="flex gap-2">
          <Link className="px-3 py-2 bg-black text-white rounded" href="/">Guide</Link>
          <Link className="px-3 py-2 bg-black text-white rounded" href="/admin/wallet-groups">Wallet Groups</Link>
          <Link className="px-3 py-2 bg-black text-white rounded" href="/admin/wallets">Wallets</Link>
          <Link className="px-3 py-2 bg-black text-white rounded" href="/admin/rpc">RPC</Link>
          <Link className="px-3 py-2 bg-black text-white rounded" href="/admin">Admin</Link>
          {loggedIn === null ? null : loggedIn ? (
            <button className="px-3 py-2 bg-gray-200 rounded" onClick={onLogout}>Logout</button>
          ) : (
            <Link className="px-3 py-2 bg-gray-200 rounded" href="/login">Login</Link>
          )}
        </nav>
      </div>
    </div>
  );
}
