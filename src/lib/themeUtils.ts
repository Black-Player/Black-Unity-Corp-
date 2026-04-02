import { AppTheme } from '../types';
import { THEMES, ThemeConfig } from '../constants/themes';

export function getBotCharacter(botName: string, theme: AppTheme = 'cosmic'): string {
  const themeConfig = THEMES.find(t => t.id === theme) || THEMES[0];
  return themeConfig.botCharacters[botName] || botName;
}
