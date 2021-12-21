import '../styles/globals.css'
import type { AppProps } from 'next/app'

import { ThemeProvider } from "styled-components"
import SimpleReactLightbox from 'simple-react-lightbox'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SimpleReactLightbox>
      <Component {...pageProps} />
    </SimpleReactLightbox>
  )
}

export default MyApp
