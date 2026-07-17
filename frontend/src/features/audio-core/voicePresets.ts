/** Built-in browser speech presets. */
export const SANTA_VOICE_ID = '__santa__';
export const SANTA_VOICE_PITCH = 0.65;
export const SANTA_VOICE_RATE = 0.88;

/** Prefer commonly exposed deeper male English voices, then fall back safely. */
export function pickSantaVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'));
  const maleVoice = englishVoices.find((voice) =>
    /david|mark|guy|george|daniel|alex|james|ralph|male/i.test(voice.name)
  );

  return maleVoice || englishVoices[0] || voices.find((voice) => voice.default) || null;
}
