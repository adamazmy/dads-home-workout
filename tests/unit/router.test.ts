import { expect, it } from 'vitest';
import { parse } from '../../src/lib/router';

it.each(['#/exercise/%', '#/exercise/%C0%AF', '#/exercise/%E0%A4%A'])('handles malformed URI %s', hash => {
  expect(parse(hash)).toEqual({ name: 'home' });
});
it('retains valid deep links', () => expect(parse('#/exercise/birdDog')).toEqual({ name: 'exercise', id: 'birdDog' }));
