import { Link } from '@remix-run/react';

export default function Navbar() {
  return (
    <nav>
      <Link to="/">Home</Link>
      <Link to="/privacy-policy">Privacy Policy</Link>
    </nav>
  );
}
