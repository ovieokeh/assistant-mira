import { Link } from '@remix-run/react';

export default function Navbar() {
  return (
    <nav className="flex flex-wrap items-center justify-between bg-slate-300 p-6">
      <Link to="/">Home</Link>
      <Link to="/privacy-policy">Privacy Policy</Link>
    </nav>
  );
}
