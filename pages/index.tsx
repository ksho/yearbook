import type { GetServerSideProps, NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import '../styles/Home.module.css'
import styled from 'styled-components';

import Masonry from 'react-masonry-css'

import { Cloudinary } from '@cloudinary/url-gen';
import {
  AdvancedImage,
  accessibility,
  responsive,
  lazyload,
  placeholder
 } from '@cloudinary/react';
import { fill } from "@cloudinary/url-gen/actions/resize";

import ExifReader from 'exifreader';

import useSWR from 'swr'


const cld = new Cloudinary({
  cloud: {
    cloudName: 'kshoyearbook'
  }
});

// export async function getStaticProps() {
// export const getServerSideProps: GetServerSideProps = async (context) => {
//   const res = await fetch('https://res.cloudinary.com/kshoyearbook/image/list/yearbook_2021.json')
//   const data = await res.json()

//   if (!data) {
//     return {
//       notFound: true,
//     }
//   }

//   return {
//     props: { data }, // will be passed to the page component as props
//   }
// }

const ImageList = (images) => {
  
  const imageList = images.map((i, index) => {
    return (
      <ImageWrapper key={index}>
        <img src={i} width="100%" />
      </ImageWrapper>
      
      
    )
  });
  
  // return <ImageListWrapper>{imageList}</ImageListWrapper>;
  return imageList;
};

function Home() {

  const fetcher = (url) => fetch(url).then((res) => res.json());
  const { data, error } = useSWR('/api/readphotos', fetcher);
  console.log(data)

  if (error) return <div>failed to load</div>
  if (!data) return <div>loading...</div>



  // EXIF stuff .. make this async
  const tags = ExifReader.load(data[0]).then(r => {
    const lala = 1;
  })
  // const imageDate = tags['DateTimeOriginal'].description;
  // const unprocessedTagValue = tags['DateTimeOriginal'].value;

  const breakpointColumnsObj = {
    default: 3,
    1100: 3,
    700: 2,
    500: 1
  };
  
  //...
  return (
    <div width="100vw">
    <Masonry
      breakpointCols={breakpointColumnsObj}
      className="my-masonry-grid"
      columnClassName="my-masonry-grid_column"
    >
      {ImageList(data)}
    </Masonry>
    </div>

  );
  

  // return (
  //   <div>
  //     <h1>2021!</h1>
  //     { ImageList(data) }
  //       {/* { data.map(i => {
  //           return (
  //             <div style={{ margin: '10px', position: 'relative' }}>
  //               <Image
  //                 src={i}
  //                 layout='fill'
  //               />
  //             </div>
  //           )
  //         }) }  */}
  //         {/* { ids.map(i => {
  //           return (
  //             <div style={{ margin: '10px', width: '600px' }}>
  //               <AdvancedImage
  //                 cldImg={cld.image(i).addFlag("keep_iptc") }
  //                 plugins={[lazyload(), responsive(100), placeholder()]}
  //               />
  //             </div>
  //           )
  //         }) } */}
  //   </div>
  // )
}

export default Home

const ImageListWrapper = styled.div`
  display: grid;
  grid-template-columns: 33% 33% 33%;
  gap: 0.25rem;
  padding: 0.25rem;
  align-items: center;
  grid-area: content;
`;

const ImageWrapper = styled.div`
    /* width: 250px; */
    /* height: 100%; */
    background: #dbdedf;
    margin: 12px;
    width: 100%;
    /* height: 600px; */
    /* height: 100%; */
    position: relative;
`;
