import type { DetailedHTMLProps, HTMLAttributes } from 'react'

/**
 * `img-comparison-slider` ist ein Web Component und deshalb in JSX nicht
 * bekannt. Die Deklaration meldet das Element inklusive der Attribute an, die
 * wir verwenden.
 */
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'img-comparison-slider': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        /** Startposition des Reglers in Prozent (Standard 50). */
        value?: number | string
        /** `"true"` = folgt der Maus ohne Klick. */
        hover?: string
        direction?: 'horizontal' | 'vertical'
        /** `"disabled"` schaltet die Pfeiltastensteuerung ab. */
        keyboard?: 'enabled' | 'disabled'
        handle?: string
      }
    }
  }
}
