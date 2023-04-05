import type { Message, User } from '@prisma/client';
import type { LoaderArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Form, Link, Outlet, useLoaderData } from '@remix-run/react';

import { getUserMessages } from '~/models/memory/user.server';
import { requireUser } from '~/services/session.server';

export const loader = async ({ request }: LoaderArgs) => {
  const user = await requireUser(request);
  const messages = await getUserMessages({ userId: user.id });
  return json({ user, messages });
};

export default function Messages() {
  const data = useLoaderData<{ user: User; messages: Message[] }>();

  let messages = data.messages as unknown as Message[];

  return (
    <div className="flex h-full min-h-screen flex-col">
      <header className="flex items-center justify-between bg-slate-400 p-4 text-white">
        <h1 className="text-xl font-bold">
          <Link to=".">Your messages</Link>
        </h1>
        <p>{data.user.email}</p>
        <Form action="/logout" method="post">
          <button
            type="submit"
            className="rounded bg-slate-600 px-4 py-2 text-blue-100 hover:bg-blue-500 active:bg-blue-600"
          >
            Logout
          </button>
        </Form>
      </header>

      <main className="flex h-full bg-white">
        <div className="h-full w-80 border-r bg-gray-50">
          {data.messages.length === 0 ? (
            <p className="p-4">No messages yet</p>
          ) : (
            <ol>
              {messages.map((message) => (
                <li key={message.id}>
                  <p className={`block border-b p-4 text-xl`}>
                    📝 {message.content}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="flex-1 p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
