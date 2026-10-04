"""One Sarvam chat completion. Run: set -a; . ./.env; set +a; python3 scripts/sarvam_hello.py"""
import os

from sarvamai import SarvamAI

client = SarvamAI(api_subscription_key=os.environ["SARVAM_API_KEY"])

response = client.chat.completions(
    model="sarvam-105b-conversations",
    messages=[{"role": "user", "content": "Say hello in one short sentence, in English and Tamil."}],
)

print(response.choices[0].message.content)
