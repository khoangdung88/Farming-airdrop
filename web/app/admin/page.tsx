"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AdminHome() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setLoggedIn(!!data.session);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setLoggedIn(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loggedIn === null) return null;
  if (!loggedIn) {
    return (
      <main className="p-6 max-w-6xl mx-auto space-y-4">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p>Bạn cần đăng nhập để truy cập khu vực quản trị.</p>
        <Link className="px-3 py-2 bg-black text-white rounded" href="/login">Tới trang đăng nhập</Link>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-6xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Link className="rounded border bg-white p-4 hover:bg-gray-50" href="/admin/projects">Quản lý Projects</Link>
        <Link className="rounded border bg-white p-4 hover:bg-gray-50" href="/admin/users">Quản lý Users</Link>
        <Link className="rounded border bg-white p-4 hover:bg-gray-50" href="/admin/tasks">Quản lý Tasks</Link>
        <Link className="rounded border bg-white p-4 hover:bg-gray-50" href="/admin/wallets">Quản lý Wallets</Link>
        <Link className="rounded border bg-white p-4 hover:bg-gray-50" href="/admin/wallet-groups">Quản lý Wallet Groups</Link>
        <Link className="rounded border bg-white p-4 hover:bg-gray-50" href="/admin/group-balances">Số dư theo Nhóm</Link>
        <Link className="rounded border bg-white p-4 hover:bg-gray-50" href="/admin/referrals">Quản lý Referrals</Link>
        <Link className="rounded border bg-white p-4 hover:bg-gray-50" href="/admin/notifications">Quản lý Notifications</Link>
      </div>
    </main>
  );
}
