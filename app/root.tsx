import type { LinksFunction, LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react';

import { getUser } from '~/services/session.server';

import Navbar from './components/navbar';

import tailwindStylesheetUrl from '~/styles/tailwind.css';
import rpniStyles from 'react-phone-number-input/style.css';
import variableStyles from '~/styles/variables.css';

export const links: LinksFunction = () => [
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400&family=Inter:wght@100;300;400;500&display=swap',
  },
  { rel: 'stylesheet', href: variableStyles },
  { rel: 'stylesheet', href: tailwindStylesheetUrl },
  { rel: 'stylesheet', href: rpniStyles },
];

export const loader = async ({ request }: LoaderArgs) => {
  return json({ user: await getUser(request) });
};

export default function App() {
  return (
    <html lang="en" className="h-full bg-slate-900">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full bg-slate-900">
        <Navbar />
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
