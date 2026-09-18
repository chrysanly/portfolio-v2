'use client';

import { useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { contactSchema, type ContactInput } from '@/lib/schema';

type Status = 'idle' | 'submitting' | 'success' | 'error';

/**
 * `email` is passed in rather than imported from content/site so that no client
 * bundle carries the site object — which holds the phone number.
 * docs/07-SOURCE-CONTENT.md §1: the phone belongs to /contact alone.
 */
export function ContactForm({ email }: { email: string }) {
  const ids = useId();
  const startedAt = useRef(Date.now());
  const [status, setStatus] = useState<Status>('idle');
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    mode: 'onBlur',
    defaultValues: { name: '', email: '', company: '', message: '', website: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setStatus('submitting');
    setFormError(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, startedAt: startedAt.current }),
      });

      if (response.ok) {
        setStatus('success');
        return;
      }

      const data: { errors?: Record<string, string>; message?: string } = await response
        .json()
        .catch(() => ({}));

      if (response.status === 422 && data.errors) {
        for (const [field, message] of Object.entries(data.errors)) {
          setError(field as keyof ContactInput, { type: 'server', message });
        }
        setStatus('idle');
        return;
      }

      setFormError(data.message ?? 'Message could not be sent.');
      setStatus('error');
    } catch {
      setFormError('Message could not be sent.');
      setStatus('error');
    }
  });

  if (status === 'success') {
    return (
      <div className="prose-body" role="status">
        <p style={{ color: 'var(--color-ink)' }}>Message sent.</p>
        <p>
          It goes straight to {email} and I read it myself. Expect a reply within two
          working days.
        </p>
      </div>
    );
  }

  const field = (name: keyof ContactInput) => ({
    'data-invalid': errors[name] ? 'true' : undefined,
  });

  const describe = (name: keyof ContactInput) =>
    errors[name] ? `${ids}-${name}-error` : undefined;

  return (
    <form onSubmit={onSubmit} noValidate style={{ maxWidth: '620px' }}>
      <div className="field" {...field('name')}>
        <label htmlFor={`${ids}-name`}>Name</label>
        <input
          id={`${ids}-name`}
          type="text"
          autoComplete="name"
          aria-invalid={errors.name ? 'true' : undefined}
          aria-describedby={describe('name')}
          {...register('name')}
        />
        {errors.name ? (
          <span className="field__error" id={`${ids}-name-error`}>
            {errors.name.message}
          </span>
        ) : null}
      </div>

      <div className="field" {...field('email')}>
        <label htmlFor={`${ids}-email`}>Email</label>
        <input
          id={`${ids}-email`}
          type="email"
          autoComplete="email"
          aria-invalid={errors.email ? 'true' : undefined}
          aria-describedby={describe('email')}
          {...register('email')}
        />
        {errors.email ? (
          <span className="field__error" id={`${ids}-email-error`}>
            {errors.email.message}
          </span>
        ) : null}
      </div>

      <div className="field" {...field('company')}>
        <label htmlFor={`${ids}-company`}>Company (optional)</label>
        <input
          id={`${ids}-company`}
          type="text"
          autoComplete="organization"
          aria-invalid={errors.company ? 'true' : undefined}
          aria-describedby={describe('company')}
          {...register('company')}
        />
        {errors.company ? (
          <span className="field__error" id={`${ids}-company-error`}>
            {errors.company.message}
          </span>
        ) : null}
      </div>

      <div className="field" {...field('message')}>
        <label htmlFor={`${ids}-message`}>Message</label>
        <textarea
          id={`${ids}-message`}
          rows={7}
          aria-invalid={errors.message ? 'true' : undefined}
          aria-describedby={describe('message')}
          {...register('message')}
        />
        {errors.message ? (
          <span className="field__error" id={`${ids}-message-error`}>
            {errors.message.message}
          </span>
        ) : null}
      </div>

      {/* Honeypot. Hidden from sight and from assistive technology alike. */}
      <div className="visually-hidden" aria-hidden="true">
        <label htmlFor={`${ids}-website`}>Website</label>
        <input id={`${ids}-website`} type="text" tabIndex={-1} autoComplete="off" {...register('website')} />
      </div>

      <div aria-live="polite" style={{ marginTop: '22px' }}>
        {formError ? (
          <p className="field__error">
            {formError} You can also email{' '}
            <a href={`mailto:${email}`}>{email}</a> directly.
          </p>
        ) : null}
      </div>

      <button className="button" type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Sending' : 'Send message'}
      </button>
    </form>
  );
}
