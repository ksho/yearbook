import React, { Component } from 'react';

import styled from 'styled-components';
import { assetUrl } from '../AssetConfig';
import { fallbackSrc, PhotoIndex, photoSlug, sizesFor, srcSetFor } from '../lib/responsive';
// import LazyImage from './LazyImage';

const BATCH_SIZE = 15;

const IMAGE_SIZES = {
  SMALL: '200px',
  MEDIUM_OLD: '1000px',
  MEDIUM: '2000px',
  LARGE: '3000px',
}

// Every rendered tile carries its absolute index in the album so the timeline rail can
// scroll to one and so we can work out which photo is currently under the header.
export const PHOTO_INDEX_ATTR = 'data-photo-index';
export const photoDomId = (index: number) => `photo-${index}`;

// The first row is above the fold on any viewport. Marking it lazy costs the largest
// contentful paint a layout pass before the fetch even starts, so those tiles load eagerly
// and at high priority; everything past them stays lazy.
const EAGER_COUNT = 4;

interface IOwnProps {
  items: string[],
  year: string,
  onImageClick: (index: number) => void,
  onVisibleIndexChange?: (index: number) => void,
  // Manifest entries keyed by filename-without-extension. Present only for years that have
  // been regenerated; anything missing falls back to the single-size <img> below.
  photos?: PhotoIndex,
  avifMinWidth?: number | null,
}

interface IOwnState {
  items: string[],
  imageSizeMed: string,
  imageSizeLarge: string,
  renderItems: string[],
  offset: number,
  intervalId?: ReturnType<typeof setInterval>,
}

export default class AlbumContent extends Component<IOwnProps, IOwnState> {
  private visibleIndex = -1;
  private scanQueued = false;

  constructor (props: IOwnProps) {
    super(props);
    const { year, items } = props;
    // Seed the first batch here rather than in componentDidMount so it is present in the
    // server-rendered HTML -- otherwise the markup ships with no <img> tags at all and the
    // browser's preload scanner can't start fetching until the bundle has hydrated.
    this.state = {
      items,
      imageSizeMed: ['2025', '2024', '2023', '2013', '2012', '2011'].includes(year) ? IMAGE_SIZES.MEDIUM : IMAGE_SIZES.MEDIUM_OLD,
      imageSizeLarge: IMAGE_SIZES.LARGE,
      renderItems: items.slice(0, BATCH_SIZE),
      offset: BATCH_SIZE,
      intervalId: undefined,
    }
  }

  componentDidMount() {
    document.addEventListener('scroll', this.onScroll, { passive: true });

    const intervalId = setInterval(this.trackScrolling, 500);
    this.setState({ intervalId: intervalId });

    // Highlight the month you land on, before any scrolling happens.
    this.scanVisible();
  }

  componentWillUnmount() {
    const { intervalId } = this.state;

    document.removeEventListener('scroll', this.onScroll);

    // Use intervalId from the state to clear the interval
    if (intervalId) {
      clearInterval(intervalId);
    }
  }

  getImageUrlBySize(path: string, size: string) {
    // Experimenting with future full video support
    // if (size === '3000px' && path.indexOf('.gif') > 0) {
    //   return assetUrl(path.replace('.gif', '.mov'));
    // } else {
    //   return assetUrl(path.replace('200px', size));
    // }

    return assetUrl(path.replace(IMAGE_SIZES.SMALL, size));
  }

  isBottom(el: HTMLElement) {
    // 1000px from the bottom
    return el.getBoundingClientRect().bottom <= window.innerHeight + 1500;
  }

  // Renders every batch up to and including `index`, then runs `done` once those tiles are
  // actually in the DOM. The timeline rail uses this to reach a month far down the album
  // that lazy loading hasn't gotten to yet.
  revealThrough = (index: number, done?: () => void) => {
    const { items, offset } = this.state;

    if (index < offset) {
      done?.();
      return;
    }

    // Round up to a whole batch past the target so the jump lands mid-run rather than
    // right at the loading edge.
    const newOffset = Math.min(items.length, (Math.floor(index / BATCH_SIZE) + 2) * BATCH_SIZE);

    this.setState({ renderItems: items.slice(0, newOffset), offset: newOffset }, done);
  };

  onScroll = () => {
    this.trackScrolling();
    this.scanVisible();
  };

  // Reports the topmost photo still on screen so the rail can highlight the month you are
  // actually looking at. rAF-throttled because it touches layout for every rendered tile.
  scanVisible = () => {
    const { onVisibleIndexChange } = this.props;
    if (!onVisibleIndexChange || this.scanQueued) return;

    this.scanQueued = true;
    window.requestAnimationFrame(() => {
      this.scanQueued = false;

      const tiles = document.querySelectorAll<HTMLElement>(`[${PHOTO_INDEX_ATTR}]`);
      for (const tile of Array.from(tiles)) {
        // First tile whose bottom edge is still below the top of the viewport.
        if (tile.getBoundingClientRect().bottom > 80) {
          const index = Number(tile.getAttribute(PHOTO_INDEX_ATTR));
          if (!Number.isNaN(index) && index !== this.visibleIndex) {
            this.visibleIndex = index;
            onVisibleIndexChange(index);
          }
          return;
        }
      }
    });
  };

  trackScrolling = () => {
    const { items, offset } = this.state;

    const wrappedElement = document.getElementById('page-main-grid');
    if (wrappedElement && this.isBottom(wrappedElement) && (items.length > offset)) {
      // Rudimentary lazy loading.
      const newOffset = offset + BATCH_SIZE;

      this.setState({
        items,
        renderItems: items.slice(0, newOffset),
        offset: newOffset,
      });
    }
  };

  childElements = (imagePaths: string[]) => {
      const { imageSizeMed } = this.state;
      const { onImageClick, year, photos, avifMinWidth } = this.props;

      return imagePaths.map((p: string, index: number) => {
        const meta = photos?.[photoSlug(p)];
        const eager = index < EAGER_COUNT;

        const shared = {
          onClick: () => onImageClick(index),
          style: { cursor: 'pointer' },
          loading: (eager ? 'eager' : 'lazy') as 'eager' | 'lazy',
          fetchPriority: (eager ? 'high' : 'auto') as 'high' | 'auto',
        };

        // No manifest entry: an album year that predates the size ladder, or one of the
        // clips, which still live under {year}/video/webp and never entered the tiers.
        // Render exactly what this component always rendered.
        if (!meta) {
          return (
            <ItemWrapper key={index} id={photoDomId(index)} {...{ [PHOTO_INDEX_ATTR]: index }}>
              <FlexImage src={this.getImageUrlBySize(p, imageSizeMed)} {...shared} />
            </ItemWrapper>
          );
        }

        const sizes = sizesFor(meta);
        const avif = srcSetFor(year, meta, 'avif', avifMinWidth ?? null);
        const webp = srcSetFor(year, meta, 'webp', avifMinWidth ?? null);

        return (
          <ItemWrapper key={index} id={photoDomId(index)} {...{ [PHOTO_INDEX_ATTR]: index }}>
            <Picture>
              {avif && <source type="image/avif" srcSet={avif} sizes={sizes} />}
              <FlexImage
                src={fallbackSrc(year, meta)}
                srcSet={webp ?? undefined}
                sizes={sizes}
                // Gives the tile an aspect ratio before the photo arrives, so the justified
                // rows stop re-wrapping as images land.
                width={meta.width}
                height={meta.height}
                {...shared}
              />
            </Picture>
          </ItemWrapper>
        );
      });
    };

  render() {
    const { renderItems } = this.state;

    return (
      <GridWrapper>
        {this.childElements(renderItems)}
        <span></span>
      </GridWrapper>
    )
  }
}



const GridWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  flex-direction: row;

  @media (max-width: 768px) {
      flex-direction: column;
      width: 100vw;
  }
  /* &:last-child {
    flex-grow: 1;
  } */
`;

const ItemWrapper = styled.span`
  height: 50vh;
  flex-grow: 1;
  margin: 6px;
  /* Offsets the jump target so a scrolled-to photo doesn't sit under the sticky header. */
  scroll-margin-top: 80px;
  /* A tile whose photo hasn't loaded has no intrinsic width, so without a floor the
     timeline rail's jump lands hundreds of collapsed tiles in one row -- they end up with
     no area, the browser never lazy-loads them, and they never gain a width. Reserving a
     minimum breaks that deadlock. Loaded photos are wider than this at 50vh, so it has no
     effect on the justified layout. */
  min-width: 200px;

  @media (max-width: 768px) {
    width: 100%;
    height: auto;
    margin: 2px;
  }
`;

// display:contents keeps <picture> out of the layout entirely, so the <img> inside it still
// sizes against ItemWrapper. Without it the picture box becomes the img's containing block,
// min-width:100% resolves against a shrink-to-fit inline box, and the justified grid
// collapses.
const Picture = styled.picture`
  display: contents;
`;

const FlexImage = styled.img`
  /* The width/height attributes are presentational hints: without these two lines the
     browser lays the tile out at the photo's full intrinsic width (5788px for a 24MP
     original) and one photo fills the row. Overriding them back to auto keeps max-height
     as the constraint, while the attributes still supply the aspect ratio -- which is what
     reserves the tile's space before the image has loaded. */
  width: auto;
  height: auto;
  max-height: 100%;
  min-width: 100%;
  object-fit: cover;
  vertical-align: bottom;

  @media (max-width: 768px) {
    width: 100%;
    height: auto;
  }
`;

// const ImageGrid = styled.div`
//     display: grid;
//     grid-gap: 5px;
//     grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
//     /* grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); */

//     /* grid-template-columns: repeat(4, 1fr); */
// `;

// const GridImage = styled.div`
//     background-position: center center;
//     background-repeat: no-repeat;
//     background-size: cover;
//     height: 200px;
// `;
