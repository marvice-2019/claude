// Connect OpenWA to Chatwoot (inbox.marvice.tech) in one run.
// Run INSIDE the openwa container (Coolify → openwa → Terminal), so no key ever leaves the server:
//
//   CW_TOKEN=<Chatwoot access token> CW_SECRET=<Chatwoot webhook secret> \
//   CW_ACCOUNT=<account id> CW_INBOX=<inbox id> node /tmp/chatwoot-connect.mjs
//
// Admin key: read from /app/data/.api-key, or set OPENWA_KEY if you rotated it.
// Idempotent: re-running reuses the installed plugin and re-creates the "main" instance.
import { readFileSync } from 'node:fs';

const PLUGIN = 'chatwoot-adapter';
const ZIP = 'https://github.com/rmyndharis/OpenWA-plugins/releases/download/chatwoot-adapter-v0.9.10/chatwoot-adapter.zip';
const OPENWA = `http://127.0.0.1:${process.env.PORT || 2785}/api`;
const CHATWOOT = process.env.CW_BASE || 'https://inbox.marvice.tech';

const need = name => {
  const v = (process.env[name] || '').trim();
  if (!v) throw new Error(`${name} is not set`);
  return v;
};
const token = need('CW_TOKEN');
const secret = need('CW_SECRET');
const accountId = Number(need('CW_ACCOUNT'));
const inboxId = Number(need('CW_INBOX'));
if (!Number.isInteger(accountId) || !Number.isInteger(inboxId)) throw new Error('CW_ACCOUNT and CW_INBOX must be numbers');
if (secret.length < 16) throw new Error('CW_SECRET looks too short: copy the webhook secret, not its name');
const key = (process.env.OPENWA_KEY || readFileSync('/app/data/.api-key', 'utf8')).trim();

async function call(method, path, body) {
  const res = await fetch(OPENWA + path, {
    method,
    headers: { 'X-API-Key': key, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}
const fail = (step, r) => {
  throw new Error(`${step} failed (${r.status}): ${JSON.stringify(r.json).slice(0, 300)}`);
};

// 0. Chatwoot token works and the inbox exists
const probe = await fetch(`${CHATWOOT}/api/v1/accounts/${accountId}/inboxes/${inboxId}`, {
  headers: { api_access_token: token },
});
if (!probe.ok) throw new Error(`Chatwoot rejected the token / account ${accountId} / inbox ${inboxId} (${probe.status})`);
console.log('✓ Chatwoot token, account and inbox OK');

// 1. Session to bridge
const sessions = await call('GET', '/sessions');
if (sessions.status !== 200) fail('Listing sessions (is the admin key right?)', sessions);
const list = Array.isArray(sessions.json) ? sessions.json : (sessions.json.items ?? sessions.json.data ?? []);
const session = list.find(s => s.id === process.env.SESSION_ID) ?? list.find(s => s.status === 'ready') ?? list[0];
if (!session) throw new Error('No OpenWA session found');
console.log(`✓ Session: ${session.name ?? session.id} (${session.status})`);

// 2. Plugin installed + enabled
let plugin = await call('GET', `/plugins/${PLUGIN}`);
if (plugin.status === 404) {
  plugin = await call('POST', '/plugins/install-url', { url: ZIP });
  if (plugin.status >= 300) fail('Installing the plugin', plugin);
  console.log('✓ Plugin installed');
} else if (plugin.status !== 200) fail('Reading the plugin', plugin);
const enabled = await call('POST', `/plugins/${PLUGIN}/enable`);
if (enabled.status >= 300 && enabled.status !== 409) fail('Enabling the plugin', enabled);
console.log('✓ Plugin enabled');

// 3. Instance (re-created so the secret always matches the current Chatwoot webhook)
await call('DELETE', `/integration/plugins/${PLUGIN}/instances/main`);
const inst = await call('POST', `/integration/plugins/${PLUGIN}/instances`, {
  instanceId: 'main',
  sessionScope: session.id,
  secret,
  config: { baseUrl: CHATWOOT, apiToken: token, accountId, inboxId, relayGroups: false, backfillLimit: 20 },
});
if (inst.status >= 300) fail('Creating the instance', inst);
console.log('✓ Instance "main" created');

console.log('\nLast step, in Chatwoot → Settings → Integrations → Webhooks → edit your webhook → URL:');
console.log(`  https://whatsapp.marvice.tech/api/ingress/${PLUGIN}/main/chatwoot`);
