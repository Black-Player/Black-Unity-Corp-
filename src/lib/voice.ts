export const VOICE_PROFILES: Record<string, { gender: 'female' | 'male', pitch: number, rate: number }> = {
  // Cosmic Default
  'Trinity': { gender: 'female', pitch: 1.1, rate: 0.9 },
  'Neo': { gender: 'male', pitch: 0.9, rate: 1.0 },
  'Morpheus': { gender: 'male', pitch: 0.6, rate: 0.85 },
  'Oracle': { gender: 'female', pitch: 0.8, rate: 0.85 },
  'Zion': { gender: 'male', pitch: 1.0, rate: 0.95 },
  'Sentinel': { gender: 'female', pitch: 1.2, rate: 1.1 },
  'Architect': { gender: 'male', pitch: 0.5, rate: 0.8 },

  // Bleach
  'Rukia Kuchiki': { gender: 'female', pitch: 1.2, rate: 1.0 },
  'Ichigo Kurosaki': { gender: 'male', pitch: 1.1, rate: 1.05 },
  'Yoruichi Shihoin': { gender: 'female', pitch: 0.9, rate: 1.1 },
  'Orihime Inoue': { gender: 'female', pitch: 1.4, rate: 0.95 },
  'Byakuya Kuchiki': { gender: 'male', pitch: 0.8, rate: 0.85 },
  'Nelliel Tu Odelschwanck': { gender: 'female', pitch: 1.0, rate: 0.9 },
  'Sosuke Aizen': { gender: 'male', pitch: 0.6, rate: 0.8 },

  // JJK
  'Nobara Kugisaki': { gender: 'female', pitch: 1.1, rate: 1.05 },
  'Yuji Itadori': { gender: 'male', pitch: 1.2, rate: 1.1 },
  'Satoru Gojo': { gender: 'male', pitch: 1.0, rate: 1.0 },
  'Maki Zenin': { gender: 'female', pitch: 0.9, rate: 1.0 },
  'Kento Nanami': { gender: 'male', pitch: 0.7, rate: 0.9 },
  'Mei Mei': { gender: 'female', pitch: 0.8, rate: 0.85 },
  'Ryomen Sukuna': { gender: 'male', pitch: 0.5, rate: 0.9 },

  // Demon Slayer
  'Nezuko Kamado': { gender: 'female', pitch: 1.5, rate: 0.9 },
  'Tanjiro Kamado': { gender: 'male', pitch: 1.3, rate: 1.0 },
  'Shinobu Kocho': { gender: 'female', pitch: 1.2, rate: 0.95 },
  'Mitsuri Kanroji': { gender: 'female', pitch: 1.4, rate: 1.1 },
  'Kyojuro Rengoku': { gender: 'male', pitch: 1.2, rate: 1.15 },
  'Kanao Tsuyuri': { gender: 'female', pitch: 1.1, rate: 0.85 },
  'Muzan Kibutsuji': { gender: 'male', pitch: 0.6, rate: 0.85 },

  // Naruto
  'Sakura Haruno': { gender: 'female', pitch: 1.2, rate: 1.05 },
  'Naruto Uzumaki': { gender: 'male', pitch: 1.3, rate: 1.1 },
  'Tsunade': { gender: 'female', pitch: 0.9, rate: 0.95 },
  'Hinata Hyuga': { gender: 'female', pitch: 1.3, rate: 0.9 },
  'Sasuke Uchiha': { gender: 'male', pitch: 0.8, rate: 0.9 },
  'Temari': { gender: 'female', pitch: 1.0, rate: 1.0 },
  'Kaguya Otsutsuki': { gender: 'female', pitch: 0.7, rate: 0.8 },

  // Dragon Ball
  'Bulma': { gender: 'female', pitch: 1.3, rate: 1.1 },
  'Goku': { gender: 'male', pitch: 1.1, rate: 1.0 },
  'Android 18': { gender: 'female', pitch: 0.9, rate: 0.95 },
  'Videl': { gender: 'female', pitch: 1.2, rate: 1.0 },
  'Vegeta': { gender: 'male', pitch: 0.8, rate: 1.05 },
  'Caulifla': { gender: 'female', pitch: 1.1, rate: 1.1 },
  'Beerus': { gender: 'male', pitch: 0.7, rate: 0.9 },

  // King of Fighters
  'Mai Shiranui': { gender: 'female', pitch: 1.3, rate: 1.05 },
  'Kyo Kusanagi': { gender: 'male', pitch: 1.0, rate: 1.0 },
  'King': { gender: 'female', pitch: 0.9, rate: 0.95 },
  'Athena Asamiya': { gender: 'female', pitch: 1.4, rate: 1.1 },
  'Iori Yagami': { gender: 'male', pitch: 0.6, rate: 0.9 },
  'Leona Heidern': { gender: 'female', pitch: 0.8, rate: 0.9 },
  'Chizuru Kagura': { gender: 'female', pitch: 1.0, rate: 0.95 },

  // Street Fighter
  'Chun-Li': { gender: 'female', pitch: 1.2, rate: 1.05 },
  'Ryu': { gender: 'male', pitch: 0.9, rate: 0.95 },
  'Cammy White': { gender: 'female', pitch: 1.3, rate: 1.1 },
  'Rose': { gender: 'female', pitch: 0.9, rate: 0.85 },
  'Ken Masters': { gender: 'male', pitch: 1.1, rate: 1.05 },
  'Juri Han': { gender: 'female', pitch: 1.1, rate: 1.15 },
  'M. Bison': { gender: 'male', pitch: 0.5, rate: 0.85 },

  // Marvel vs Capcom
  'Storm': { gender: 'female', pitch: 0.8, rate: 0.9 },
  'Spider-Man': { gender: 'male', pitch: 1.2, rate: 1.15 },
  'Captain Marvel': { gender: 'female', pitch: 1.0, rate: 1.0 },
  'Morrigan Aensland': { gender: 'female', pitch: 1.2, rate: 0.95 },
  'Iron Man': { gender: 'male', pitch: 0.9, rate: 1.05 },
  'Psylocke': { gender: 'female', pitch: 1.0, rate: 1.0 },
  'Thanos': { gender: 'male', pitch: 0.4, rate: 0.8 },

  // Heavenly Order
  'Archangel Gabriel': { gender: 'female', pitch: 1.3, rate: 0.9 },
  'Archangel Michael': { gender: 'male', pitch: 0.8, rate: 0.95 },
  'Archangel Raphael': { gender: 'male', pitch: 1.0, rate: 0.9 },
  'Archangel Uriel': { gender: 'female', pitch: 1.1, rate: 0.85 },
  'Archangel Selaphiel': { gender: 'male', pitch: 0.7, rate: 0.8 },
  'Archangel Jegudiel': { gender: 'male', pitch: 0.9, rate: 0.95 },
  'Archangel Barachiel': { gender: 'female', pitch: 1.2, rate: 0.9 },
};

export function speak(text: string, enabled: boolean = true, characterName?: string) {
  if (!enabled || !window.speechSynthesis) return;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  const voices = window.speechSynthesis.getVoices();
  let preferredVoice;

  utterance.pitch = 0.9;
  utterance.rate = 1.0;
  utterance.volume = 0.6;

  if (characterName && VOICE_PROFILES[characterName.replace(' (Default)', '')]) {
    const profile = VOICE_PROFILES[characterName.replace(' (Default)', '')];
    
    if (profile.gender === 'female') {
      preferredVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Zira'));
    } else {
      preferredVoice = voices.find(v => v.name.includes('Male') || v.name.includes('Alex') || v.name.includes('Daniel') || v.name.includes('David'));
    }
    
    utterance.pitch = profile.pitch;
    utterance.rate = profile.rate;
  } else {
    // Default to a "mystical" or "professional" sounding female voice if possible
    preferredVoice = voices.find(v => v.name.includes('Google UK English Female') || v.name.includes('Samantha') || v.name.includes('Female'));
  }
  
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  window.speechSynthesis.speak(utterance);
}
