import Document, { DocumentContext, DocumentInitialProps } from 'next/document'
import { Children } from 'react'
import { ServerStyleSheet } from 'styled-components'

// Without this, styled-components only injects its CSS once the bundle has hydrated, so the
// server-rendered HTML arrives with no styling at all. On a fast connection that flashes by;
// on a slow one the home page spends several seconds as a wall of full-size <img> tags,
// because a preview thumbnail is only 34px wide by virtue of CSS that hasn't arrived yet.
//
// Collecting the stylesheet during SSR ships those rules in the document itself, so the
// first paint is already laid out. `compiler.styledComponents` in next.config.js is what
// keeps the generated class names identical on both sides.
export default class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext): Promise<DocumentInitialProps> {
    const sheet = new ServerStyleSheet()
    const originalRenderPage = ctx.renderPage

    try {
      ctx.renderPage = () =>
        originalRenderPage({
          enhanceApp: (App) => (props) => sheet.collectStyles(<App {...props} />),
        })

      const initialProps = await Document.getInitialProps(ctx)

      return {
        ...initialProps,
        styles: [...Children.toArray(initialProps.styles), sheet.getStyleElement()],
      }
    } finally {
      sheet.seal()
    }
  }
}
