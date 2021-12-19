import React, { Component } from 'react';

import styled from 'styled-components';
// import LazyImage from './LazyImage';

type TParams =  { id: string };
const BATCH_SIZE = 15;

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
    const { intervalId } = this.state;

    // use intervalId from the state to clear the interval
    if (intervalId) {
      clearInterval(intervalId);
    }
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

  childElements = (imagePaths: string[]) => {
      const imageList = imagePaths.map((p: string, index: number) => {
        return (
          <ItemWrapper key={index}>
            <a href={`https://yearbook-assets.s3.amazonaws.com/${p.replace('200px', '3000px')}`}>
              <FlexImage
                src={`https://yearbook-assets.s3.amazonaws.com/${p.replace('200px', '1000px')}`}
                loading="lazy"
              />
              {/* <LazyImage src={`https://yearbook-assets.s3.amazonaws.com/${p.replace('200px', '1000px')}`} placeholder={`https://yearbook-assets.s3.amazonaws.com/${p}`} key={p}/> */}
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
          <span></span>
        </GridWrapper>
      </GridOuterWrapper>
    )
  }
}

const GridOuterWrapper = styled.div`
  display: flex;
  justify-content: center;
  /* width: 100%; */

`;

const GridWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  width: 80vw;
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