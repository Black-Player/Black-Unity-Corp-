import { AppTheme } from '../types';

export interface ThemeConfig {
  id: AppTheme;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  botCharacters: Record<string, string>;
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'cosmic',
    name: 'Cosmic Default',
    description: 'The standard cosmic interface.',
    colors: {
      primary: '#D4AF37',
      secondary: '#F9E29C',
      accent: '#996515',
      background: '#050505',
    },
    botCharacters: {
      Trinity: 'Trinity (Default)',
      Neo: 'Neo (Default)',
      Morpheus: 'Morpheus (Default)',
      Oracle: 'Oracle (Default)',
      Zion: 'Zion (Default)',
      Sentinel: 'Sentinel (Default)',
      Architect: 'Architect (Default)',
    }
  },
  {
    id: 'nebula-bleach',
    name: 'African Nebula: Bleach',
    description: 'The Soul Society meets the African Nebula.',
    colors: {
      primary: '#FF6B00',
      secondary: '#000000',
      accent: '#FFFFFF',
      background: '#0A0A0A',
    },
    botCharacters: {
      Trinity: 'Rukia Kuchiki',
      Neo: 'Ichigo Kurosaki',
      Morpheus: 'Yoruichi Shihoin',
      Oracle: 'Orihime Inoue',
      Zion: 'Byakuya Kuchiki',
      Sentinel: 'Nelliel Tu Odelschwanck',
      Architect: 'Sosuke Aizen',
    }
  },
  {
    id: 'nebula-jjk',
    name: 'African Nebula: Jujutsu Kaisen',
    description: 'Cursed energy in the African Nebula.',
    colors: {
      primary: '#1A1A1A',
      secondary: '#E63946',
      accent: '#457B9D',
      background: '#050505',
    },
    botCharacters: {
      Trinity: 'Nobara Kugisaki',
      Neo: 'Yuji Itadori',
      Morpheus: 'Satoru Gojo',
      Oracle: 'Maki Zenin',
      Zion: 'Kento Nanami',
      Sentinel: 'Mei Mei',
      Architect: 'Ryomen Sukuna',
    }
  },
  {
    id: 'nebula-demonslayer',
    name: 'African Nebula: Demon Slayer',
    description: 'Breathing styles in the African Nebula.',
    colors: {
      primary: '#8338EC',
      secondary: '#3A86FF',
      accent: '#FF006E',
      background: '#020202',
    },
    botCharacters: {
      Trinity: 'Nezuko Kamado',
      Neo: 'Tanjiro Kamado',
      Morpheus: 'Shinobu Kocho',
      Oracle: 'Mitsuri Kanroji',
      Zion: 'Kyojuro Rengoku',
      Sentinel: 'Kanao Tsuyuri',
      Architect: 'Muzan Kibutsuji',
    }
  },
  {
    id: 'nebula-naruto',
    name: 'African Nebula: Naruto',
    description: 'Ninja way in the African Nebula.',
    colors: {
      primary: '#F77F00',
      secondary: '#D62828',
      accent: '#FCBF49',
      background: '#003049',
    },
    botCharacters: {
      Trinity: 'Sakura Haruno',
      Neo: 'Naruto Uzumaki',
      Morpheus: 'Tsunade',
      Oracle: 'Hinata Hyuga',
      Zion: 'Sasuke Uchiha',
      Sentinel: 'Temari',
      Architect: 'Kaguya Otsutsuki',
    }
  },
  {
    id: 'nebula-dbs',
    name: 'African Nebula: Dragon Ball Super',
    description: 'Super Saiyan power in the African Nebula.',
    colors: {
      primary: '#FFD700',
      secondary: '#0000FF',
      accent: '#FF4500',
      background: '#000000',
    },
    botCharacters: {
      Trinity: 'Bulma',
      Neo: 'Goku',
      Morpheus: 'Android 18',
      Oracle: 'Videl',
      Zion: 'Vegeta',
      Sentinel: 'Caulifla',
      Architect: 'Beerus',
    }
  },
  {
    id: 'nebula-kof',
    name: 'African Nebula: King of Fighters',
    description: 'The King of Fighters in the African Nebula.',
    colors: {
      primary: '#E63946',
      secondary: '#F1FAEE',
      accent: '#A8DADC',
      background: '#1D3557',
    },
    botCharacters: {
      Trinity: 'Mai Shiranui',
      Neo: 'Kyo Kusanagi',
      Morpheus: 'King',
      Oracle: 'Athena Asamiya',
      Zion: 'Iori Yagami',
      Sentinel: 'Leona Heidern',
      Architect: 'Chizuru Kagura',
    }
  },
  {
    id: 'nebula-sf',
    name: 'African Nebula: Street Fighter',
    description: 'Street Fighter EX Plus in the African Nebula.',
    colors: {
      primary: '#FFD700',
      secondary: '#FF0000',
      accent: '#0000FF',
      background: '#000000',
    },
    botCharacters: {
      Trinity: 'Chun-Li',
      Neo: 'Ryu',
      Morpheus: 'Cammy White',
      Oracle: 'Rose',
      Zion: 'Ken Masters',
      Sentinel: 'Juri Han',
      Architect: 'M. Bison',
    }
  },
  {
    id: 'nebula-mvc',
    name: 'African Nebula: Marvel vs Capcom',
    description: 'Marvel vs Capcom in the African Nebula.',
    colors: {
      primary: '#ED1D24',
      secondary: '#000000',
      accent: '#FFFFFF',
      background: '#1A1A1A',
    },
    botCharacters: {
      Trinity: 'Storm',
      Neo: 'Spider-Man',
      Morpheus: 'Captain Marvel',
      Oracle: 'Morrigan Aensland',
      Zion: 'Iron Man',
      Sentinel: 'Psylocke',
      Architect: 'Thanos',
    }
  },
  {
    id: 'heavenly',
    name: 'Heavenly Order',
    description: 'Divine and godly touch for the faithful trader.',
    colors: {
      primary: '#FFFFFF',
      secondary: '#FFD700',
      accent: '#87CEEB',
      background: '#F0F8FF',
    },
    botCharacters: {
      Trinity: 'Archangel Gabriel',
      Neo: 'Archangel Michael',
      Morpheus: 'Archangel Raphael',
      Oracle: 'Archangel Uriel',
      Zion: 'Archangel Selaphiel',
      Sentinel: 'Archangel Jegudiel',
      Architect: 'Archangel Barachiel',
    }
  }
];

export const MOTIVATIONAL_SCRIPTURES = [
  "I can do all things through Christ who strengthens me. - Philippians 4:13",
  "The Lord is my shepherd; I shall not want. - Psalm 23:1",
  "Commit your work to the Lord, and your plans will be established. - Proverbs 16:3",
  "For I know the plans I have for you, declares the Lord, plans for welfare and not for evil, to give you a future and a hope. - Jeremiah 29:11",
  "Whatever you do, work heartily, as for the Lord and not for men. - Colossians 3:23",
  "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go. - Joshua 1:9",
  "But they who wait for the Lord shall renew their strength; they shall mount up with wings like eagles; they shall run and not be weary; they shall walk and not faint. - Isaiah 40:31",
  "Trust in the Lord with all your heart, and do not lean on your own understanding. - Proverbs 3:5",
  "In all your ways acknowledge him, and he will make straight your paths. - Proverbs 3:6",
  "The soul of the sluggard craves and gets nothing, while the soul of the diligent is richly supplied. - Proverbs 13:4",
  "The hand of the diligent will rule, while the slothful will be put to forced labor. - Proverbs 12:24",
  "Wealth gained hastily will dwindle, but whoever gathers little by little will increase it. - Proverbs 13:11",
  "A slack hand causes poverty, but the hand of the diligent makes rich. - Proverbs 10:4",
  "The plans of the diligent lead surely to abundance, but everyone who is hasty comes only to poverty. - Proverbs 21:5",
  "Steady plodding brings prosperity; hasty speculation brings poverty. - Proverbs 21:5 (TLB)"
];
