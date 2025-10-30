import Link from 'next/link';

export function Nav() {
  return (
    <nav className="flex gap-2">
      <Link className="px-3 py-2 bg-black text-white rounded" href="/">Dashboard</Link>
      <Link className="px-3 py-2 bg-black text-white rounded" href="/projects">Projects</Link>
      <Link className="px-3 py-2 bg-black text-white rounded" href="/tasks">Tasks</Link>
      <Link className="px-3 py-2 bg-black text-white rounded" href="/wallets">Wallets</Link>
    </nav>
  );
}
