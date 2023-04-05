import type { ActionArgs, LoaderArgs, V2_MetaFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form, Link, useActionData, useSearchParams } from '@remix-run/react';
import { useEffect, useRef } from 'react';
import { createUser, getUserProfile } from '~/models/memory/user.server';
import { createUserSession, getUserId } from '~/services/session.server';

import { safeRedirect, validatePhone } from '~/utils';

export const loader = async ({ request }: LoaderArgs) => {
  const userId = await getUserId(request);
  if (userId) return redirect('/');
  return json({});
};

type FormValidationErrors = {
  name?: string;
  bio?: string;
  phone?: string;
  password?: string;
};

export const action = async ({ request }: ActionArgs) => {
  const formData = await request.formData();
  const name = formData.get('name') as string;
  const bio = formData.get('bio') as string;
  const phone = formData.get('phone') as string;
  const password = formData.get('password') as string;
  const redirectTo = safeRedirect(formData.get('redirectTo'), '/dashboard');

  const errors: FormValidationErrors = {};

  if (typeof name !== 'string' || name.length === 0) {
    errors.name = 'Name is required';
  }

  if (typeof bio === 'string' && bio.length > 0 && bio.length < 140) {
    errors.bio = 'A longer bio is required';
  }

  if (!validatePhone(phone)) {
    errors.phone = 'Phone is invalid';
  }

  if (typeof password !== 'string' || password.length === 0) {
    errors.password = 'Password is required';
  }

  if (password.length < 8) {
    errors.password = 'Password is too short';
  }

  if (Object.keys(errors).length > 0) {
    return json({ errors }, { status: 400 });
  }

  const existingUser = await getUserProfile({ phone });
  if (existingUser) {
    return json(
      {
        errors: {
          phone: 'A user already exists with this phone number',
          password: null,
        },
      },
      { status: 400 }
    );
  }

  const user = await createUser({
    name,
    profile: bio,
    phone,
    password,
  });

  return createUserSession({
    redirectTo,
    remember: false,
    request,
    userId: user.id,
    userPhone: phone,
  });
};

export const meta: V2_MetaFunction = () => [{ title: 'Sign Up' }];

export default function Join() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') ?? undefined;
  const actionData = useActionData<{ errors: FormValidationErrors }>();
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const bioRef = useRef<HTMLTextAreaElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (actionData?.errors?.phone) {
      phoneRef.current?.focus();
    } else if (actionData?.errors?.password) {
      passwordRef.current?.focus();
    } else if (actionData?.errors?.name) {
      nameRef.current?.focus();
    } else if (actionData?.errors?.bio) {
      bioRef.current?.focus();
    }
  }, [actionData]);

  return (
    <div className="flex min-h-full flex-col justify-center">
      <div className="mx-auto w-full max-w-md px-8">
        <Form method="post" className="space-y-6">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Your name
            </label>
            <div className="mt-1">
              <input
                ref={nameRef}
                id="name"
                required
                autoFocus={true}
                name="name"
                type="text"
                autoComplete="name"
                aria-invalid={actionData?.errors?.name ? true : undefined}
                aria-describedby="name-error"
                className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
              />
              {actionData?.errors?.name && (
                <div className="pt-1 text-red-700" id="phone-error">
                  {actionData.errors.name}
                </div>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700"
            >
              Phone
            </label>
            <div className="mt-1">
              <input
                ref={phoneRef}
                id="phone"
                required
                name="phone"
                type="phone"
                autoComplete="phone"
                aria-invalid={actionData?.errors?.phone ? true : undefined}
                aria-describedby="phone-error"
                className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
              />
              {actionData?.errors?.phone && (
                <div className="pt-1 text-red-700" id="phone-error">
                  {actionData.errors.phone}
                </div>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="bio"
              className="block text-sm font-medium text-gray-700"
            >
              A short description of the things you'd like Mira to know about
              you
            </label>
            <div className="mt-1">
              <textarea
                ref={bioRef}
                id="bio"
                name="bio"
                autoComplete="bio"
                aria-invalid={actionData?.errors?.bio ? true : undefined}
                aria-describedby="bio-error"
                className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
              />
              {actionData?.errors?.bio && (
                <div className="pt-1 text-red-700" id="bio-error">
                  {actionData.errors.bio}
                </div>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <div className="mt-1">
              <input
                id="password"
                ref={passwordRef}
                name="password"
                type="password"
                autoComplete="new-password"
                aria-invalid={actionData?.errors?.password ? true : undefined}
                aria-describedby="password-error"
                className="w-full rounded border border-gray-500 px-2 py-1 text-lg"
              />
              {actionData?.errors?.password && (
                <div className="pt-1 text-red-700" id="password-error">
                  {actionData.errors.password}
                </div>
              )}
            </div>
          </div>

          <input type="hidden" name="redirectTo" value={redirectTo} />
          <button
            type="submit"
            className="w-full rounded bg-blue-500  px-4 py-2 text-white hover:bg-blue-600 focus:bg-blue-400"
          >
            Create Account
          </button>
          <div className="flex items-center justify-center">
            <div className="text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link
                className="text-blue-500 underline"
                to={{
                  pathname: '/login',
                  search: searchParams.toString(),
                }}
              >
                Log in
              </Link>
            </div>
          </div>
        </Form>
      </div>
    </div>
  );
}
