import { createGlobalStyle} from 'styled-components'

export interface ThemeType {
  name: string,
  body: string,
  text: string,
  icon: string,
  // Used by the timeline rail: `accent` marks the month you are currently scrolled
  // through, `railBackground` is the translucent plate the rail floats on.
  accent: string,
  railBackground: string,
}

export const lightTheme: ThemeType = {
  name: 'light',
  body: '#e6e6e6',
  text: '#1b1b1b',
  icon: '☀️',
  accent: '#3f06dd',
  railBackground: 'rgba(230, 230, 230, 0.82)',
}

export const darkTheme: ThemeType = {
  name: 'dark',
  body: '#1b1b1b',
  text: '#e6e6e6',
  icon: '🌗',
  accent: '#8a6bff',
  railBackground: 'rgba(27, 27, 27, 0.82)',
}

export const GlobalStyles = createGlobalStyle<{theme: ThemeType}>`
  body {
    background-color: ${({ theme }) => theme.body};
    color: ${({ theme }) => theme.text};
    transition: all 0.50s linear;
  }
`
export const THEMES = {
    LIGHT: lightTheme,
    DARK: darkTheme,
}
