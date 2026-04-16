export function speak(text: string, enabled: boolean = true) {
  if (!enabled || !window.speechSynthesis) return;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Find a "mystical" or "professional" sounding voice if possible
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => v.name.includes('Google UK English Female') || v.name.includes('Samantha') || v.name.includes('Female'));
  
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.pitch = 0.9; // Slightly lower pitch for more authority
  utterance.rate = 1.0;
  utterance.volume = 0.5;

  window.speechSynthesis.speak(utterance);
}
