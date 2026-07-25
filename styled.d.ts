import 'styled-components'
import { ThemeType } from './ThemeConfig'

// Teaches styled-components what `props.theme` holds, so components can read
// theme.accent / theme.railBackground without casting.
declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface DefaultTheme extends ThemeType {}
}
