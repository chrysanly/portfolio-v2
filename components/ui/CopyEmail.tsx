'use client';

import { useEffect, useRef, useState } from 'react';

type CopyState = 'idle' | 'done' | 'error';

/**
 * The email address and a Copy control beside it, for the contact band's
 * Direct block.
 *
 * Copied: the icon swaps to a tick, the label reads "Copied" and turns
 * accent, then resets after two seconds. Where the clipboard is not
 * available (no permission, or not a secure context) the address is selected
 * instead and the status line says how to copy it by hand.
 */
export function CopyEmail({ email }: { email: string }) {
  const [state, setState] = useState<CopyState>('idle');
  const addressRef = useRef<HTMLSpanElement>(null);
  const resetTimer = useRef<number>(0);

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  const selectAddress = () => {
    const node = addressRef.current;
    const selection = window.getSelection();
    if (!node || !selection) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const copy = async () => {
    window.clearTimeout(resetTimer.current);
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('No clipboard');
      await navigator.clipboard.writeText(email);
      setState('done');
      resetTimer.current = window.setTimeout(() => setState('idle'), 2000);
    } catch {
      setState('error');
      selectAddress();
    }
  };

  return (
    <>
      <ul>
        <li>
          <a href={`mailto:${email}`}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <rect
                x="3"
                y="5"
                width="18"
                height="14"
                rx="2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="m3.6 6.6 8.4 6 8.4-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
            <span ref={addressRef}>{email}</span>
          </a>
        </li>
        <li aria-hidden="true">
          <span className="contact-band__divider" />
        </li>
        <li>
          <button
            type="button"
            className="copy"
            data-state={state === 'done' ? 'done' : undefined}
            aria-label={state === 'done' ? 'Email address copied' : 'Copy email address'}
            onClick={copy}
          >
            <span className="copy__icons" aria-hidden="true">
              <svg
                className="copy__icon copy__icon--copy"
                viewBox="0 0 24 24"
                focusable="false"
              >
                <rect
                  x="8"
                  y="8"
                  width="12"
                  height="12"
                  rx="2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              <svg
                className="copy__icon copy__icon--done"
                viewBox="0 0 24 24"
                focusable="false"
              >
                <path
                  d="m5 12.5 4.5 4.5L19 7.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                />
              </svg>
            </span>
            <span>{state === 'done' ? 'Copied' : 'Copy'}</span>
          </button>
        </li>
      </ul>
      <p
        className="contact-band__status"
        role="status"
        aria-live="polite"
        data-tone={state === 'error' ? 'error' : undefined}
      >
        {state === 'error' ? 'Couldn’t copy. The address is selected, press Ctrl+C.' : ''}
      </p>
    </>
  );
}
