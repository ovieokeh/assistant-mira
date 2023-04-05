import type { V2_MetaFunction } from '@remix-run/node';
import { Link } from '@remix-run/react';

import { useOptionalUser } from '~/utils';

export const meta: V2_MetaFunction = () => [
  { title: 'Mira AI | The digital assistant of the future' },
];

export default function Index() {
  const user = useOptionalUser();

  return (
    <main className="relative min-h-screen sm:flex sm:items-center sm:justify-center">
      <div className=" relative bg-slate-200 shadow-xl sm:overflow-hidden sm:rounded-2xl">
        <div className="relative px-4 pb-8 pt-16 sm:px-6 sm:pb-14 sm:pt-24 lg:px-8 lg:pb-20 lg:pt-32">
          <h1 className="text-center text-xl font-extrabold tracking-tight sm:text-8xl lg:text-2xl">
            <span className="block uppercase text-slate-900">
              Welcome to the future of digital assistants
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-lg text-center text-xl sm:max-w-3xl">
            Mira AI is a revolutionary digital assistant that can actually
            manage your life for you.
          </p>
          <div className="mx-auto mt-10 max-w-sm sm:flex sm:max-w-none sm:justify-center">
            {user ? (
              <Link
                to="/dashboard"
                className="flex items-center justify-center rounded-md border border-transparent px-4 py-3 text-base font-medium text-slate-700 shadow-sm hover:bg-slate-300 sm:px-8"
              >
                Go to dashboard
              </Link>
            ) : (
              <div className="space-y-4 sm:mx-auto sm:inline-grid sm:grid-cols-2 sm:gap-5 sm:space-y-0">
                <Link
                  to="/join"
                  className="flex items-center justify-center rounded-md border border-transparent bg-slate-100 px-4 py-3 text-base font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:px-8"
                >
                  Sign up
                </Link>
                <Link
                  to="/login"
                  className="flex items-center justify-center rounded-md bg-slate-500 px-4 py-3 font-medium text-slate-50 hover:bg-slate-600"
                >
                  Log In
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
