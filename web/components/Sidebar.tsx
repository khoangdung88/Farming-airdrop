import Link from 'next/link';

export default function Sidebar() {
  return (
    <aside className="w-60 border-r bg-white p-4 space-y-2">
      <div className="font-semibold mb-2">Farming Manager</div>
      <nav className="space-y-1">
        <Link className="block px-3 py-2 rounded hover:bg-gray-100" href="/">Dashboard</Link>
        <Link className="block px-3 py-2 rounded hover:bg-gray-100" href="/projects">Projects</Link>
        <Link className="block px-3 py-2 rounded hover:bg-gray-100" href="/tasks">Tasks</Link>
        <Link className="block px-3 py-2 rounded hover:bg-gray-100" href="/wallets">Wallets</Link>
      </nav>
    </aside>
  );
}
