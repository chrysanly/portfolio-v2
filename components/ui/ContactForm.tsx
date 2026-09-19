'use client';

import { useId, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { contactSchema, type ContactInput } from '@/lib/schema';
import { hideVeil, showVeil } from './RouteVeil';

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

    /*
     * Sending replaces the whole form with the sent state, which is a bigger
     * change than a route swap and happened with no transition at all. The veil
     * covers it, and is closed in `finally` so a failure cannot leave it up.
     */
    showVeil();

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
    } finally {
      hideVeil();
    }
  });

  if (status === 'success') {
    return (
      <div className="sent" role="status">
        <span className="sent__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path
              d="M4 12.5 9.5 18 20 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="square"
            />
          </svg>
        </span>
        <p className="sent__title">Message sent.</p>
        <p className="sent__body">
          It goes straight to {email} and I read it myself. Expect a reply within two working
          days.
        </p>
      </div>
    );
  }

  const busy = status === 'submitting';

  const describe = (name: keyof ContactInput) =>
    errors[name] ? `${ids}-${name}-error` : undefined;

  return (
    <form onSubmit={onSubmit} noValidate className="contact-form">
      {/*
        Disabled as a set while the request is in flight. Individually disabling
        each control leaves the form half-live, and a second submit while the
        first is running is the most common way to send the same message twice.
      */}
      <fieldset disabled={busy}>
        <legend className="visually-hidden">Your message</legend>

        <div className="field" data-invalid={errors.name ? 'true' : undefined}>
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

        {/* Paired: two short fields side by side keep the form on one screen. */}
        <div className="field-pair">
          <div className="field" data-invalid={errors.email ? 'true' : undefined}>
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

          <div className="field" data-invalid={errors.company ? 'true' : undefined}>
            <label htmlFor={`${ids}-company`}>
              Company <span className="field__optional">optional</span>
            </label>
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
        </div>

        <div className="field" data-invalid={errors.message ? 'true' : undefined}>
          <label htmlFor={`${ids}-message`}>Message</label>
          <textarea
            id={`${ids}-message`}
            rows={6}
            placeholder="What are you building, and what is in the way?"
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
          <input
            id={`${ids}-website`}
            type="text"
            tabIndex={-1}
            autoComplete="off"
            {...register('website')}
          />
        </div>
      </fieldset>

      <div aria-live="polite" className="contact-form__status">
        {formError ? (
          <p className="field__error">
            {formError} You can also email <a href={`mailto:${email}`}>{email}</a> directly.
          </p>
        ) : null}
      </div>

      <button className="button button--send" type="submit" disabled={busy} data-busy={busy}>
        {/*
          Both labels stay in the DOM and one is hidden, so the button does not
          change width mid-request — a button that resizes under the cursor is
          the small thing that makes a form feel unreliable.
        */}
        <span className="button__label">{busy ? 'Sending' : 'Send message'}</span>
        {busy ? <span className="spinner" aria-hidden="true" /> : null}
      </button>
    </form>
  );
}
