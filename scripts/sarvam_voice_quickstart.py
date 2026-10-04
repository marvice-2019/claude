"""Round trip through Sarvam's voice APIs: Bulbul v3 speaks a Tamil greeting, Saaras v4 transcribes it back.
Run: set -a; . ./.env; set +a; python3 scripts/sarvam_voice_quickstart.py"""
import base64
import os
import tempfile

from sarvamai import SarvamAI

client = SarvamAI(api_subscription_key=os.environ["SARVAM_API_KEY"])

text = "வணக்கம்! அழைத்ததற்கு நன்றி. நான் ப்ரியா. உங்களுக்கு எப்படி உதவலாம்?"

# Text-to-speech: 8 kHz matches phone audio, so nothing is resampled on the call
tts = client.text_to_speech.convert(
    text=text,
    language_code="ta-IN",
    speaker="priya",
    model="bulbul:v3",
    speech_sample_rate=8000,
)
wav_path = os.path.join(tempfile.gettempdir(), "sarvam_greeting.wav")
with open(wav_path, "wb") as f:
    f.write(base64.b64decode("".join(tts.audios)))
print(f"TTS: {len(text)} chars -> {os.path.getsize(wav_path)} bytes at {wav_path}")

# Speech-to-text: send the audio back and check it round-trips
with open(wav_path, "rb") as f:
    stt = client.speech_to_text.transcribe(file=f, model="saaras:v4", mode="transcribe")
print(f"STT ({stt.language_code}): {stt.transcript}")
