import React, { Component } from 'react';
// import { RouteComponentProps } from 'react-router-dom';

import styled from 'styled-components';

// import { Divider } from './SharedComponents';
// import PageContainer from './PageContainer';

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
        // const { params } = this.props.match;
        // fetch('https://4ema4yco0k.execute-api.us-east-1.amazonaws.com/Prod').then(r => {
        //     return r.json();
        // }).then(r => {
            const { items } = this.props;
            this.setState({
                items,
                renderItems: items.slice(0, BATCH_SIZE),
                offset: BATCH_SIZE,
            });
            document.addEventListener('scroll', this.trackScrolling);

            const intervalId = setInterval(this.trackScrolling, 1000);
            this.setState({ intervalId: intervalId });
        // })
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

    ImageList = (images: string[]) => {
  
  
        const imageList = images.map((i: string, index: number) => {
            // console.log(i)
          return (
              //             <GridImage style={{backgroundImage: `url(${e})`}} key={e}>
    //             {/* <img src={e} alt={e}/> */}
    //             </GridImage>
    //             // <LazyImage src={e} key={e}/>
            <ItemWrapper key={index}>
              <a href={`https://yearbook-assets.s3.amazonaws.com/${i.replace('200px', '3000px')}`}>
                <FlexImage
                  src={`https://yearbook-assets.s3.amazonaws.com/${i.replace('200px', '1000px')}`}
                  loading="lazy"
                />
              </a>
            </ItemWrapper> 
          )
        });
        
        // return <ImageListWrapper>{imageList}</ImageListWrapper>;
        return imageList;
      };

    render() {
        // const { params } = this.props.match;
        const { renderItems } = this.state;
        // const imageList = this.ImageList(renderItems);
        // console.log(imageList)
        
        
        return (
        <GridOuterWrapper>
          <GridWrapper>
                {this.ImageList(renderItems)}
            </GridWrapper>
        </GridOuterWrapper>
            
            
            
            
            
            // <div>
            //     <PageContainer>
            //         <div className='sans-serif f4 center'>{ params.id }</div>
            //         <Divider>✷</Divider>
            //         { renderItems &&
            //             <ImageGrid>
            //                 { this.childElements(renderItems) }
            //             </ImageGrid>
            //         }
            //     </PageContainer>
            // </div>
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

const ImageGrid = styled.div`
    display: grid;
    grid-gap: 5px;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    /* grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); */
   
    /* grid-template-columns: repeat(4, 1fr); */
`;

const GridImage = styled.div`
    background-position: center center;
    background-repeat: no-repeat;
    background-size: cover; 
    height: 200px;
`;
