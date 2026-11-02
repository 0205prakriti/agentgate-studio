import { expect, it } from 'vitest';
import { isLocalMutation } from './local-request';
it.each([
  ['http://127.0.0.1:3000', '127.0.0.1:3000', true],
  ['http://localhost:3000', 'localhost:3000', true],
  ['http://[::1]:3000', '[::1]:3000', true],
  [null, 'localhost:3000', false],
  ['http://localhost:3000', null, false],
  ['null', 'localhost:3000', false],
  ['https://attacker.example', 'attacker.example', false],
  ['http://localhost:3001', 'localhost:3000', false],
  ['http://localhost:3000/path', 'localhost:3000', false],
  ['http://user@localhost:3000', 'localhost:3000', false],
  [
    'http://localhost.attacker.example:3000',
    'localhost.attacker.example:3000',
    false,
  ],
])(
  'authorizes only same-origin local mutations (%s, %s)',
  (origin, host, allowed) => {
    expect(isLocalMutation(origin, host)).toBe(allowed);
  },
);
