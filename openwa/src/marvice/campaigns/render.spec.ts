import { placeholdersOf, recipientVars, renderForRecipient } from './render';

describe('campaign rendering', () => {
  const vars = recipientVars({
    name: 'Asha Mehta',
    phone: '919820011111',
    variables: JSON.stringify({ requirement: 'Table for 4', city: 'Mumbai' }),
  });

  it('exposes name, first_name, phone and imported columns', () => {
    expect(vars).toMatchObject({ name: 'Asha Mehta', first_name: 'Asha', phone: '+919820011111', city: 'Mumbai' });
  });

  it('fills placeholders per contact', () => {
    expect(renderForRecipient('Hi {{first_name}}, your {{ requirement }} is confirmed!', vars)).toBe(
      'Hi Asha, your Table for 4 is confirmed!',
    );
  });

  it('never sends a raw placeholder and tidies the gap it leaves', () => {
    const bare = recipientVars({ name: null, phone: '91', variables: null });
    expect(renderForRecipient('Hi {{name}}, {{budget}} offer inside', bare)).toBe('Hi, offer inside');
  });

  it('survives malformed stored variables', () => {
    expect(recipientVars({ name: 'R', phone: '1', variables: '{oops' })).toMatchObject({ name: 'R' });
  });

  it('lists placeholders once', () => {
    expect(placeholdersOf('{{a}} {{ b }} {{a}}')).toEqual(['a', 'b']);
  });
});
