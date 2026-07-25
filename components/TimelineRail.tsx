import styled from 'styled-components'
import { MonthMarker } from '../lib/photos'

interface IOwnProps {
  markers: MonthMarker[]
  activeMonth: number | null
  onJump: (marker: MonthMarker) => void
}

// A scrubber down the right edge of an album. The bar next to each month is scaled to how
// many shots that month has, so a year's shape is legible at a glance -- the Decembers are
// always fat. Clicking a month reveals enough of the grid to reach it and scrolls there.
export default function TimelineRail({ markers, activeMonth, onJump }: IOwnProps) {
  if (markers.length === 0) return null

  const busiest = Math.max(...markers.map((m) => m.count))

  return (
    <Rail aria-label="Jump to month">
      {markers.map((marker) => (
        <MonthButton
          key={marker.month}
          type="button"
          $active={marker.month === activeMonth}
          onClick={() => onJump(marker)}
          title={`${marker.count} from ${marker.label}`}
        >
          <MonthLabel>{marker.label}</MonthLabel>
          <Bar $fill={marker.count / busiest} $active={marker.month === activeMonth} />
          <MonthCount>{marker.count}</MonthCount>
        </MonthButton>
      ))}
    </Rail>
  )
}

const Rail = styled.nav`
  position: fixed;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 5;
  padding: 8px 6px;
  border-radius: 10px;
  background-color: ${({ theme }) => theme.railBackground};
  backdrop-filter: blur(6px);

  /* Slides down to a horizontal strip under the header rather than covering the photos. */
  @media (max-width: 768px) {
    position: sticky;
    top: 0;
    right: auto;
    transform: none;
    flex-direction: row;
    gap: 0;
    overflow-x: auto;
    border-radius: 0;
    margin: 0 0 6px 0;
    padding: 6px 2px;
  }
`

const MonthButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: none;
  cursor: pointer;
  padding: 2px 4px;
  font-family: inherit;
  font-size: 11px;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.text};
  opacity: ${({ $active }) => ($active ? 1 : 0.45)};
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 1;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 2px;
  }
`

const MonthLabel = styled.span`
  width: 26px;
  text-align: right;
  text-transform: uppercase;
`

const Bar = styled.span<{ $fill: number; $active: boolean }>`
  display: block;
  height: 3px;
  border-radius: 2px;
  /* Floor keeps a one-photo month from rendering as an invisible sliver. */
  width: ${({ $fill }) => Math.max(6, Math.round($fill * 46))}px;
  background-color: ${({ $active, theme }) => ($active ? theme.accent : theme.text)};

  @media (max-width: 768px) {
    width: 26px;
  }
`

const MonthCount = styled.span`
  width: 26px;
  opacity: 0.7;
  font-variant-numeric: tabular-nums;

  @media (max-width: 768px) {
    display: none;
  }
`
