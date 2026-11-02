import { useColorScheme } from 'react-native';

const light = {
  dark: false,
  background: '#FFFFFF',
  surface: '#F2F3F5',
  surfaceAlt: '#E4E6EB',
  border: '#DADDE1',
  text: '#050505',
  textMuted: '#65676B',
  accent: '#0A7CFF',
  onAccent: '#FFFFFF',
  incoming: '#E9EAEE',
  onIncoming: '#050505',
  danger: '#E0245E',
  success: '#31A24C',
  warningBg: '#FFF4CE',
  warningText: '#6B4E00',
  overlay: 'rgba(0,0,0,0.35)',
};

const dark: typeof light = {
  dark: true,
  background: '#000000',
  surface: '#18191A',
  surfaceAlt: '#3A3B3C',
  border: '#2F3031',
  text: '#E4E6EB',
  textMuted: '#B0B3B8',
  accent: '#0A7CFF',
  onAccent: '#FFFFFF',
  incoming: '#303030',
  onIncoming: '#E4E6EB',
  danger: '#FF5C7A',
  success: '#45BD62',
  warningBg: '#3D3000',
  warningText: '#FFE08A',
  overlay: 'rgba(0,0,0,0.6)',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}
