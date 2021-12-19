import React, { Component } from 'react';

import styled from 'styled-components';

type TParams =  { id: string };
const BATCH_SIZE = 40;

interface IOwnProps {
  items: string[],
}


interface IOwnState {
  items: any,
  renderItems: string[],
  offset: number,
  intervalId?: NodeJS.Timer,
}

export default class Album extends Component<IOwnProps, IOwnState> {
  constructor (props: any) {
    super(props);
    this.state = {
      items: null,
      renderItems: [],
      offset: 0,
      intervalId: undefined,
    }
  }

  componentDidMount() {
    const { items } = this.props;
    this.setState({
        items,
        renderItems: items.slice(0, BATCH_SIZE),
        offset: BATCH_SIZE,
    });
    document.addEventListener('scroll', this.trackScrolling);

    const intervalId = setInterval(this.trackScrolling, 1000);
    this.setState({ intervalId: intervalId });
  }

  componentWillUnmount() {
    // use intervalId from the state to clear the interval
    clearInterval(this.state.intervalId);
  }

  isBottom(el: HTMLElement) {
    return el.getBoundingClientRect().bottom <= window.innerHeight;
  }
    
  trackScrolling = () => {
    const { items, offset } = this.state;

    const wrappedElement = document.getElementById('page-main-grid');
    if (wrappedElement && this.isBottom(wrappedElement) && (items.length > offset + BATCH_SIZE + BATCH_SIZE)) {
      console.log('header bottom reached');

      // Rudimentary lazy loading.
      const newOffset = offset + BATCH_SIZE;
      const newRenderItems = items.slice(0, newOffset);
      this.setState({
        items,
        renderItems: newRenderItems,
        offset: newOffset,
      });
      document.removeEventListener('scroll', this.trackScrolling);
    }
  };

  // childElements(album: string[]) {
  //     return album.map(e => {
  //         return (
  //             <GridImage style={{backgroundImage: `url(${e})`}} key={e}>
  //             {/* <img src={e} alt={e}/> */}
  //             </GridImage>
  //             // <LazyImage src={e} key={e}/>
  //         );
  //     });
  // }

  childElements = (imagePaths: string[]) => {
      const imageList = imagePaths.map((p: string, index: number) => {
        return (
          <ItemWrapper key={index}>
            <a href={`https://yearbook-assets.s3.amazonaws.com/${p.replace('200px', '3000px')}`}>
              <FlexImage
                src={`https://yearbook-assets.s3.amazonaws.com/${p.replace('200px', '1000px')}`}
                loading="lazy"
              />
            </a>
          </ItemWrapper> 
        )
      });
      
      return imageList;
    };

  render() {
    const { renderItems } = this.state;
    
    return (
      <GridOuterWrapper>
        <GridWrapper>
          {this.childElements(renderItems)}
        </GridWrapper>
      </GridOuterWrapper>
    )
  }
}

const GridOuterWrapper = styled.div`
  display: flex;
  justify-content: center;
`;

const GridWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  width: 80vw;
  /* &:last-child {
    flex-grow: 10;
  } */
`;

const ItemWrapper = styled.span`
  height: 35vh;
  flex-grow: 1;
  margin: 8px;
`;

const FlexImage = styled.img`
  max-height: 100%;
  min-width: 100%;
  object-fit: cover;
  vertical-align: bottom;
`;
