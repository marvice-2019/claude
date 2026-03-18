/**
 * Azure TTS Fallback — Regional Language Support
 *
 * Use when ElevenLabs doesn't support the detected language well,
 * particularly for pure Tamil, Telugu, Kannada, or Malayalam responses.
 *
 * Azure Neural voices for Indian languages are high quality and
 * serve as a reliable fallback.
 */

const sdk = require('microsoft-cognitiveservices-speech-sdk');

// Voice mapping per language
const VOICE_MAP = {
  'ta': 'ta-IN-PallaviNeural',   // Tamil - Female
  'te': 'te-IN-ShrutiNeural',    // Telugu - Female
  'kn': 'kn-IN-SapnaNeural',     // Kannada - Female
  'ml': 'ml-IN-SobhanaNeural',   // Malayalam - Female
  'en': 'en-IN-NeerjaNeural',    // English (India) - Female
  'hi': 'hi-IN-SwaraNeural'      // Hindi - Female (bonus)
};

// Emotion-to-style mapping (Azure supports speaking styles)
const STYLE_MAP = {
  'angry': 'empathetic',
  'frustrated': 'empathetic',
  'happy': 'cheerful',
  'urgent': 'customerservice',
  'confused': 'gentle',
  'neutral': 'customerservice'
};

/**
 * Convert text to speech using Azure Cognitive Services
 *
 * @param {string} text - The text to convert
 * @param {string} language - Language code (ta, te, kn, ml, en)
 * @param {string} emotion - Detected emotion for style adaptation
 * @param {number} rate - Speaking rate (0.8 = slow, 1.0 = normal, 1.2 = fast)
 * @returns {Buffer} Audio data (WAV format)
 */
async function synthesizeSpeech(text, language = 'en', emotion = 'neutral', rate = 1.0) {
  const speechConfig = sdk.SpeechConfig.fromSubscription(
    process.env.AZURE_TTS_KEY,
    process.env.AZURE_TTS_REGION
  );

  speechConfig.speechSynthesisOutputFormat =
    sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

  const voiceName = VOICE_MAP[language] || VOICE_MAP['en'];
  const style = STYLE_MAP[emotion] || 'customerservice';

  // Build SSML for fine-grained control
  const ssml = `
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
       xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${language}-IN">
  <voice name="${voiceName}">
    <mstts:express-as style="${style}" styledegree="1.2">
      <prosody rate="${rate}" pitch="+0%">
        ${text}
      </prosody>
    </mstts:express-as>
  </voice>
</speak>`.trim();

  return new Promise((resolve, reject) => {
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);

    synthesizer.speakSsmlAsync(
      ssml,
      (result) => {
        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          resolve(Buffer.from(result.audioData));
        } else {
          reject(new Error(`TTS failed: ${result.errorDetails}`));
        }
        synthesizer.close();
      },
      (error) => {
        reject(error);
        synthesizer.close();
      }
    );
  });
}

/**
 * Determine whether to use Azure or ElevenLabs
 * Logic: Use Azure for pure regional language, ElevenLabs for English/mixed
 */
function shouldUseAzure(text, language) {
  // Always use Azure for pure regional languages
  if (['ta', 'te', 'kn', 'ml'].includes(language)) {
    // Check if text is mostly non-English (heuristic: <30% ASCII)
    const asciiChars = text.replace(/[^a-zA-Z]/g, '').length;
    const totalChars = text.replace(/\s/g, '').length;
    const asciiRatio = totalChars > 0 ? asciiChars / totalChars : 0;

    // If mostly regional script, use Azure (better quality)
    if (asciiRatio < 0.3) return true;
  }

  // Default: use ElevenLabs (better for English and mixed)
  return false;
}

module.exports = { synthesizeSpeech, shouldUseAzure, VOICE_MAP };
