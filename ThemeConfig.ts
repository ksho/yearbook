import { createGlobalStyle} from 'styled-components'

interface ThemeType {
  name: string,
  body: string,
  text: string,
  icon: string,
}

export const lightTheme = {
  name: 'light',
  body: '#e6e6e6',
  text: '#1b1b1b',
  icon: '☀️',
}

export const darkTheme = {
  name: 'dark',
  body: '#1b1b1b',
  text: '#e6e6e6',
  icon: '🌗',
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