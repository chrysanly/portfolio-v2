import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEVICE_SIZES, mediaKind, projectImageSchema } from '../lib/schema';
import { cleanLine, cleanList, cleanText } from '../lib/text';

describe('media', () => {
  it('trusts the kind the API sends, even without a file extension', () => {
    const image = projectImageSchema.parse({
      src: 'https://res.cloudinary.com/x/video/upload/v1/clip',
      alt: 'A walkthrough',
      kind: 'video',
    });

    assert.equal(mediaKind(image), 'video');
  });

  it('defaults to an image when kind is omitted', () => {
    const image = projectImageSchema.parse({ src: '/a.mp4', alt: 'A file' });

    assert.equal(mediaKind(image), 'image');
  });

  it('defaults nda to false and requires alt text', () => {
    assert.equal(projectImageSchema.parse({ src: '/a.png', alt: 'Shot' }).nda, false);
    assert.throws(() => projectImageSchema.parse({ src: '/a.png', alt: '' }));
  });

  it('sizes the tablet frame portrait, to match the shell', () => {
    assert.deepEqual(DEVICE_SIZES.tablet, { width: 768, height: 1024 });
  });
});

describe('text cleaning', () => {
  it('unwraps emphasis that wraps a whole value', () => {
    assert.equal(cleanText('**Laravel**'), 'Laravel');
  });

  it('keeps bracketed placeholders untouched', () => {
    assert.equal(cleanLine('[METRIC]'), '[METRIC]');
  });

  it('turns line breaks into spaces for one-line values', () => {
    assert.equal(cleanLine('CRM Systems\r\nIntegration'), 'CRM Systems Integration');
  });

  it('drops blanks and duplicates from lists', () => {
    assert.deepEqual(cleanList(['Laravel', '', null, 'Laravel', ' MySQL ']), [
      'Laravel',
      'MySQL',
    ]);
  });
});
