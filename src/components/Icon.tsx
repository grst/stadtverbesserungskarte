/**
 * Kleine Icon-Registry. Die Icons sind rein dekorativ (`aria-hidden`) – die
 * Bedeutung steht immer im begleitenden Text bzw. im `aria-label` des Buttons.
 *
 * Neue Ebene mit eigenem Icon: hier einen Eintrag ergänzen und den Schlüssel in
 * data/layers.json unter `icon` verwenden.
 */
const paths: Record<string, string> = {
  bike: 'M5.5 17.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm13 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-13-3h6l3.5-7m0 0h3.5m-3.5 0-1.5-3m1.5 3 3.5 7m-9.5 0 4-7',
  leaf: 'M4 20c0-8 5-13 16-14 1 11-4 16-12 16H4Zm2-2c2-5 5-8 10-10',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  map: 'M9 3 3 5.5v15L9 18l6 3 6-2.5v-15L15 6 9 3Zm0 0v15m6-12v15',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  back: 'M19 12H5m0 0 6-6m-6 6 6 6',
  external: 'M14 5h5v5m0-5L11 13M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13.2h.01M10.8 11.6H12V16h1.2',
  pin: 'M12 21s7-7.2 7-12a7 7 0 1 0-14 0c0 4.8 7 12 7 12Zm0-9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
}

export interface IconProps {
  name: string
  /** Kantenlänge in px. */
  size?: number
  className?: string
}

export function Icon({ name, size = 20, className }: IconProps) {
  const path = paths[name] ?? paths.pin
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={path} />
    </svg>
  )
}
