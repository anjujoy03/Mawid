import { describe, expect, it } from 'vitest';
import { isValidWebhookToken } from './moyasar';

describe('isValidWebhookToken', () => {
  it('accepts the matching secret', () => {
    expect(isValidWebhookToken('s3cret', 's3cret')).toBe(true);
  });

  it.each([
    ['wrong', 's3cret'],
    ['s3cret-but-longer', 's3cret'],
    [undefined, 's3cret'],
    [12345, 's3cret'],
    ['s3cret', undefined], // misconfigured server must not accept everything
  ])('rejects %j against %j', (received, expected) => {
    expect(isValidWebhookToken(received, expected)).toBe(false);
  });
});
