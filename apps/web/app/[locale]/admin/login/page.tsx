'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { post } from '@/lib/api';
import { getMessages, type Locale } from '@/lib/i18n';

export default function LoginPage({ params }: { params: { locale: Locale } }) {
  const t = getMessages(params.locale);
  const router = useRouter();
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(false);
    try {
      await post('/auth/login', { email: form.get('email'), password: form.get('password') });
      router.replace(`/${params.locale}/admin`);
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card mx-auto max-w-sm space-y-4">
      <h1 className="text-xl font-bold">{t.admin.login}</h1>
      <div>
        <label htmlFor="email" className="label">{t.admin.email}</label>
        <input id="email" name="email" type="email" required autoComplete="username" className="input ltr-nums text-start" />
      </div>
      <div>
        <label htmlFor="password" className="label">{t.admin.password}</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
      </div>
      {error && <p className="text-sm text-red-600">{t.admin.wrongCreds}</p>}
      <button className="btn-primary w-full" disabled={busy}>{t.admin.signIn}</button>
    </form>
  );
}
