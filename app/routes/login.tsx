import type { ActionArgs, LoaderArgs, V2_MetaFunction } from '@remix-run/node';
import { json, redirect } from '@remix-run/node';
import { Form, Link, useActionData, useSearchParams } from '@remix-run/react';
import { useEffect, useRef, useState } from 'react';
import PhoneInput from 'react-phone-number-input';

import { verifyLogin } from '~/models/memory/user.server';
import {
  createUserSession,
  getUserIdFromSession,
} from '~/services/session.server';

import { safeRedirect, validatePhone } from '~/utils';

export const loader = async ({ request }: LoaderArgs) => {
  const userId = await getUserIdFromSession(request);
  if (userId) return redirect('/dashboard');
  return json({});
};

type FormValidationErrors = {
  phone?: string;
  password?: string;
};

export const action = async ({ request }: ActionArgs) => {
  const formData = await request.formData();
  let phone = formData.get('phone') as string;
  // remove all spaces and + from phone number
  phone = phone.replace(/[^0-9]/g, '');

  const password = formData.get('password') as string;
  const redirectTo = safeRedirect(
    formData.get('redirectTo'),
    request.headers.get('Referer') || '/dashboard'
  );
  const remember = formData.get('remember');

  const errors: FormValidationErrors = {};

  if (!validatePhone(phone) || !phone) {
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

  console.log('phone', phone, 'password', password);

  const user = await verifyLogin({ phone, password });

  if (!user) {
    return json(
      { errors: { phone: 'Invalid login details' } },
      { status: 400 }
    );
  }

  return createUserSession({
    redirectTo,
    remember: remember === 'on' ? true : false,
    request,
    userId: user.id,
  });
};

export const meta: V2_MetaFunction = () => [{ title: 'Login' }];

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const actionData = useActionData<{ errors: FormValidationErrors }>();
  const phoneRef = useRef<any>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [phoneNumber, setPhoneNumber] = useState();

  useEffect(() => {
    if (actionData?.errors?.phone) {
      phoneRef.current?.focus();
    }

    if (actionData?.errors?.password) {
      passwordRef.current?.focus();
    }
  }, [actionData]);

  return (
    <div className="flex  min-h-full flex-col justify-center">
      <div className="mx-auto w-full max-w-md rounded bg-slate-50 p-8">
        <h1 className="mb-4 text-center text-2xl font-bold">
          Log in to your account
        </h1>
        <Form method="post" className="space-y-6">
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700"
            >
              Phone
            </label>
            <div className="mt-1">
              <PhoneInput
                ref={phoneRef}
                id="phone"
                required
                autoFocus={true}
                value={phoneNumber}
                onChange={setPhoneNumber as any}
                name="phone"
                type="phone"
                autoComplete="phone"
                placeholder="Enter phone number"
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
                autoComplete="password"
                placeholder="Enter password"
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
            Log in
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember"
                name="remember"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="remember"
                className="ml-2 block text-sm text-gray-900"
              >
                Remember me
              </label>
            </div>
            <div className="text-center text-sm text-gray-500">
              Don't have an account?{' '}
              <Link
                className="text-blue-500 underline"
                to={{
                  pathname: '/join',
                  search: searchParams.toString(),
                }}
              >
                Sign up
              </Link>
            </div>
          </div>
        </Form>
      </div>
    </div>
  );
}
