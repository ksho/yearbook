import React, { Component } from 'react';

import styled from 'styled-components';
import { assetUrl } from '../AssetConfig';
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

interface IOwnProps {
  items: string[],
  year: string,
  onImageClick: (index: number) => void,
  onVisibleIndexChange?: (index: number) => void,
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
      const { onImageClick } = this.props;
      const imageList = imagePaths.map((p: string, index: number) => {
        return (
          <ItemWrapper key={index} id={photoDomId(index)} {...{ [PHOTO_INDEX_ATTR]: index }}>
            <FlexImage
              src={this.getImageUrlBySize(p, imageSizeMed)}
              loading="lazy"
              onClick={() => onImageClick(index)}
              style={{ cursor: 'pointer' }}
            />
          </ItemWrapper>
        )
      });

      return imageList;
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

const FlexImage = styled.img`
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
