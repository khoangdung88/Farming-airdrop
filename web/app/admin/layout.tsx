"use client";
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const NAV = [
    { href: '/admin', label: 'Tổng quan' },
    { href: '/admin/projects', label: 'Projects' },
    { href: '/admin/task-templates', label: 'Task Templates' },
    { href: '/admin/tasks', label: 'Tasks' },
    { href: '/admin/task-runs', label: 'Task Runs' },
    { href: '/admin/wallet-groups', label: 'Wallet Groups' },
    { href: '/admin/wallets', label: 'Wallets' },
    { href: '/admin/group-balances', label: 'Group Balances' },
    { href: '/admin/rpc', label: 'RPC' },
    { href: '/admin/users', label: 'Users' },
  ];
  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-56 shrink-0 border-r bg-white p-4 space-y-2 sticky top-0 h-screen">
        <div className="font-semibold mb-2">Admin</div>
        <nav className="flex flex-col gap-1">
          {NAV.map(i => (
            <Link key={i.href} href={i.href} className="px-2 py-1 rounded hover:bg-gray-100">
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="pt-4 text-sm">
          <Link className="underline" href="/">← Về trang chủ</Link>
        </div>
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  );
}
