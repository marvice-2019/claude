/**
 * Twilio Webhook Handler — Express.js Server
 *
 * This is an OPTIONAL companion server if you need more control
 * than n8n webhooks provide. In most cases, n8n webhooks are sufficient.
 *
 * Use this for:
 * - Real-time audio streaming (Media Streams)
 * - WebSocket-based STT with Deepgram
 * - Sub-second response latency requirements
 */

const express = require('express');
const WebSocket = require('ws');
const { createClient } = require('@deepgram/sdk');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const N8N_WEBHOOK_URL = process.env.N8N_BASE_URL;

// ── Incoming Call Handler ──
// Returns TwiML that starts a media stream for real-time audio
app.post('/voice/incoming', (req, res) => {
  const callSid = req.body.CallSid;
  const from = req.body.From;
  const to = req.body.To;

  console.log(`[INCOMING] CallSid: ${callSid}, From: ${from}`);

  // Forward to n8n for session initialization
  fetch(`${N8N_WEBHOOK_URL}/webhook/voice-agent/incoming`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ CallSid: callSid, From: from, To: to })
  }).catch(err => console.error('n8n webhook error:', err));

  // Return TwiML with media stream for real-time processing
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${req.headers.host}/media-stream/${callSid}" />
  </Connect>
</Response>`;

  res.type('text/xml').send(twiml);
});

// ── WebSocket Media Stream Handler ──
// Receives real-time audio from Twilio and pipes to Deepgram
const wss = new WebSocket.Server({ noServer: true });

const activeSessions = new Map();

wss.on('connection', (ws, req) => {
  const callSid = req.url.split('/').pop();
  console.log(`[STREAM] Connected: ${callSid}`);

  // Initialize Deepgram live transcription
  const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
  const dgConnection = deepgram.listen.live({
    model: 'nova-2',
    language: 'multi',
    detect_language: true,
    smart_format: true,
    interim_results: true,
    endpointing: 300, // 300ms silence = end of utterance
    utterance_end_ms: 1000
  });

  let audioBuffer = Buffer.alloc(0);
  let isProcessing = false;

  dgConnection.on('open', () => {
    console.log(`[DEEPGRAM] Connected for ${callSid}`);
  });

  // When Deepgram detects a complete utterance
  dgConnection.on('Results', async (data) => {
    const transcript = data.channel?.alternatives?.[0]?.transcript;
    if (!transcript || transcript.trim() === '') return;

    // Only process final results (not interim)
    if (!data.is_final) return;

    console.log(`[TRANSCRIPT] ${callSid}: "${transcript}"`);

    if (isProcessing) return;
    isProcessing = true;

    try {
      // Send transcript to n8n for AI processing
      const response = await fetch(
        `${N8N_WEBHOOK_URL}/webhook/voice-agent/process-utterance`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            CallSid: callSid,
            transcript: transcript,
            detected_language: data.channel?.detected_language,
            confidence: data.channel?.alternatives?.[0]?.confidence
          })
        }
      );

      const result = await response.json();

      // If n8n returns audio URL, play it back via Twilio
      if (result.audio_url) {
        // Use Twilio REST API to play audio on the active call
        await playAudioOnCall(callSid, result.audio_url);
      }
    } catch (err) {
      console.error(`[ERROR] Processing failed for ${callSid}:`, err);
    } finally {
      isProcessing = false;
    }
  });

  dgConnection.on('error', (err) => {
    console.error(`[DEEPGRAM ERROR] ${callSid}:`, err);
  });

  // Receive audio from Twilio media stream
  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);

      switch (msg.event) {
        case 'connected':
          console.log(`[MEDIA] Stream connected: ${callSid}`);
          break;

        case 'start':
          console.log(`[MEDIA] Stream started: ${callSid}`);
          activeSessions.set(callSid, {
            streamSid: msg.start.streamSid,
            ws: ws,
            dgConnection: dgConnection
          });
          break;

        case 'media':
          // Forward audio payload to Deepgram
          const audio = Buffer.from(msg.media.payload, 'base64');
          if (dgConnection.getReadyState() === 1) {
            dgConnection.send(audio);
          }
          break;

        case 'stop':
          console.log(`[MEDIA] Stream stopped: ${callSid}`);
          dgConnection.finish();
          activeSessions.delete(callSid);
          break;
      }
    } catch (err) {
      console.error(`[MEDIA ERROR] ${callSid}:`, err);
    }
  });

  ws.on('close', () => {
    console.log(`[STREAM] Disconnected: ${callSid}`);
    dgConnection.finish();
    activeSessions.delete(callSid);
  });
});

// ── Play Audio on Active Call ──
async function playAudioOnCall(callSid, audioUrl) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  const twiml = `<Response><Play>${audioUrl}</Play></Response>`;

  await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${callSid}.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ Twiml: twiml })
    }
  );
}

// ── Upgrade HTTP server for WebSocket ──
const server = app.listen(PORT, () => {
  console.log(`Voice Agent server running on port ${PORT}`);
});

server.on('upgrade', (request, socket, head) => {
  if (request.url.startsWith('/media-stream/')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});
