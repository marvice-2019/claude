# Chatwoot shared inbox ↔ OpenWA (inbox.marvice.tech)

**Deployed:** Coolify service `chatwoot` (uuid `xfghqjhnnvog39ssnftokx6h`): Chatwoot **v4.18.0** (`chatwoot/chatwoot:latest`) + Sidekiq + Postgres (pgvector) + Redis, server `localhost`, same `coolify` proxy as OpenWA/n8n. Public sign-up is off. Uploads are stored on the `rails-data` volume.

Bridge: OpenWA's official **chatwoot-adapter** plugin (v0.9.10): WhatsApp → Chatwoot API inbox, agent replies → WhatsApp, and assigning an agent silences OpenWA bots on that chat.

## 1. DNS (you)
hPanel → marvice.tech → DNS → **A `inbox` → 91.108.110.216**, TTL 300. Coolify/Traefik issues the Let's Encrypt cert on the first request after it resolves.

## 2. Claim the instance immediately (you)
Open https://inbox.marvice.tech as soon as DNS resolves. A fresh Chatwoot shows **one-time super-admin setup**; whoever completes it first owns the install, so do it right away.
- Name, company `Marvice Media`, your email and a strong password.
- Profile (avatar) → **Access Token** → copy it (used in steps 3–4).
- Note the **account id**: it's the number in the URL, `/app/accounts/<id>/...`.

## 3. Chatwoot inbox + webhook
Settings → Inboxes → Add → **API** channel → name `WhatsApp (OpenWA)`; leave the webhook URL empty. Note the **inbox id** (URL `/inboxes/<id>`). Add agents to it.

Settings → Integrations → **Webhooks** → Add (account level, *not* the inbox webhook): URL `https://example.com` (placeholder, replaced in step 5), events **message_created** + **conversation_updated**. Open the webhook's edit form and copy its **secret**.

## 4. OpenWA: install the adapter + mint the instance (admin key)
```bash
OPENWA=https://whatsapp.marvice.tech
ADMIN_KEY=...            # OpenWA admin key (Coolify → openwa → SERVICE_PASSWORD_64_MASTERKEY)
SESSION_ID=...           # OpenWA dashboard → Sessions
# install from the official release zip
curl -L -o chatwoot-adapter.zip \
  "https://github.com/rmyndharis/OpenWA-plugins/releases/download/chatwoot-adapter-v0.9.10/chatwoot-adapter.zip"
curl -X POST "$OPENWA/api/plugins/install" -H "Authorization: Bearer $ADMIN_KEY" -F "file=@chatwoot-adapter.zip"
curl -X POST "$OPENWA/api/plugins/chatwoot-adapter/enable" -H "Authorization: Bearer $ADMIN_KEY"

# mint the instance via the API: the dashboard form can't take Chatwoot's secret
curl -X POST "$OPENWA/api/integration/plugins/chatwoot-adapter/instances" \
  -H "X-API-Key: $ADMIN_KEY" -H "Content-Type: application/json" -d '{
    "instanceId": "main",
    "sessionScope": "'"$SESSION_ID"'",
    "secret": "<Chatwoot webhook secret from step 3>",
    "config": {
      "baseUrl": "https://inbox.marvice.tech",
      "apiToken": "<Chatwoot access token from step 2>",
      "accountId": <account id>,
      "inboxId": <inbox id>,
      "relayGroups": false,
      "backfillLimit": 20
    }
  }'
```
The response shows the ingress URL once: `https://whatsapp.marvice.tech/api/ingress/chatwoot-adapter/main/chatwoot`.
(Releases are tagged per plugin, `chatwoot-adapter-v<version>`; `releases/latest` points at whichever plugin shipped last, so don't use it. Uploading the same zip in OpenWA dashboard → Plugins → Install also works; only the instance mint must use the API.)

## 5. Point the Chatwoot webhook at OpenWA
Edit the webhook from step 3 and set its URL to the ingress URL. Keep the same webhook: re-creating it changes the secret and breaks the HMAC check (401).

## 6. Test
From another phone, WhatsApp the business number → a conversation appears in Chatwoot → reply from Chatwoot → it arrives on WhatsApp. Assign the conversation to yourself → OpenWA plugins stay quiet on that chat; unassign → they resume.

## Coexisting with the n8n AI bot
The adapter's handover silences **OpenWA plugins** only. The n8n bot is kept in step by `n8n/wa-chatwoot-assignment-sync.json`:

| In Chatwoot | n8n AI bot in that WhatsApp chat |
|---|---|
| Conversation assigned to an agent (manually or by auto-assignment) | Paused (30 days, or until released) |
| Unassigned, or resolved | Resumes |
| Labels, notes, priority, new messages | No change (a bot-initiated 12 h handoff pause is never cancelled by routine updates) |

Setup is in that workflow's sticky note and `n8n/README.md` section 4. It needs a **second** account-level webhook in Chatwoot (keep the OpenWA one untouched). `#bot off` / `#bot on` from the business phone still work as a manual override.

## Troubleshooting
| Symptom | Fix |
|---|---|
| Agent replies don't reach WhatsApp; Chatwoot logs `401` | Instance secret ≠ webhook secret: delete the instance and re-mint with the current secret |
| `404` on webhook | Wrong ingress URL or instanceId |
| Inbound not appearing | Plugin enabled? `sessionScope` = the right session? Chatwoot `apiToken` valid? |
