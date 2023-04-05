import type { V2_MetaFunction } from '@remix-run/react';

export const meta: V2_MetaFunction = () => [
  {
    title: 'Privacy Policy | Mira AI',
  },
  {
    name: 'description',
    content: 'The digital assistant of the future',
  },
];

export default function PrivacyPolicy() {
  return (
    <main className="relative min-h-screen p-8 text-slate-50 sm:flex sm:flex-col sm:justify-center sm:gap-4">
      <h2 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-4xl">
        Privacy Policy for Mira AI
      </h2>

      <p>
        At Mira AI, we are committed to protecting your privacy. This privacy
        policy explains how we collect, use, and disclose your personal
        information when you use our service.
      </p>

      <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">
        Information we collect:
      </h3>
      <p>
        When you use our service, we may collect personal information from you
        such as your name, phone number, and any voice messages you send to our
        service.
      </p>
      <p>
        We also collect information about your device such as your device type,
        operating system, and browser type. We may collect usage data such as
        the time and date of your usage, the duration of your usage, and any
        error logs.
      </p>

      <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">
        How we use your information:
      </h3>
      <p>
        We use your personal information to provide you with our service,
        including transcribing any voice messages you send to our service. We
        may use your usage data to analyze and improve our service, as well as
        to comply with legal obligations.
      </p>

      <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">
        How we share your information:
      </h3>
      <p>
        We may share your personal information with third-party service
        providers who help us operate our service, such as our transcription
        service provider. We may share your personal information if required by
        law or if we believe it is necessary to protect our rights or the safety
        of others. We may share your personal information if we are involved in
        a merger, acquisition, or sale of our assets.
      </p>

      <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">
        Security:
      </h3>
      <p>
        We take appropriate technical and organizational measures to protect
        your personal information from unauthorized access, use, disclosure,
        alteration, or destruction. We use industry-standard encryption to
        protect your personal information during transmission.
      </p>

      <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">
        Retention:
      </h3>
      <p>
        We retain your personal information for as long as necessary to provide
        our service to you and to comply with legal obligations.
      </p>

      <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">
        Your Rights:
      </h3>
      <p>
        You have the right to access, correct, update, or delete your personal
        information at any time. You have the right to object to the processing
        of your personal information, and to restrict or limit the processing of
        your personal information. You have the right to data portability, which
        means you can request a copy of your personal information in a
        machine-readable format.
      </p>

      <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">
        Changes to this Policy:
      </h3>
      <p>
        We may update this privacy policy from time to time. We will notify you
        of any changes by posting the new privacy policy on our website or by
        sending you an email.
      </p>

      <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">
        Contact Us:
      </h3>
      <p>
        If you have any questions about our privacy policy or service, you can
        contact us at nerdylonglegs@gmail.com.
      </p>
    </main>
  );
}
