const { handler: verifyPin }   = require('../verifyPin');
const { handler: unlockInbox } = require('../unlockInboxWithPin');

const makeEvent = (body) => ({ body: JSON.stringify(body), headers: { 'x-forwarded-for': '1.2.3.4' } });

test('verifyPin returns 400 on missing password',   async () => {
  const res = await verifyPin(makeEvent({}), {});
  expect(res.statusCode).toBe(400);
});

test('verifyPin returns 400 on short password', async () => {
  const res = await verifyPin(makeEvent({ pin: '123', inboxId: 'abc' }), {});
  expect(res.statusCode).toBe(400);
});

test('verifyPin returns 400 on non-numeric password', async () => {
  const res = await verifyPin(makeEvent({ pin: 'abcdef', inboxId: 'abc' }), {});
  expect(res.statusCode).toBe(400);
});

test('verifyPin empty body does not crash (was returning 500)', async () => {
  const res = await verifyPin({ body: null, headers: {} }, {});
  expect(res.statusCode).not.toBe(500);
});

test('unlockInbox returns 400 on missing password', async () => {
  const res = await unlockInbox(makeEvent({ inboxId: 'abc' }), {});
  expect(res.statusCode).toBe(400);
});