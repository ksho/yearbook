import type { GetServerSideProps, NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import '../styles/Home.module.css'
import styled from 'styled-components';

import { LazyLoadImage, trackWindowScroll } from 'react-lazy-load-image-component';

import { SRLWrapper } from "simple-react-lightbox";

// import fs from 'fs'
// import path from 'path'

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
import aws from 'aws-sdk';

export async function getServerSideProps() {
// export const getServerSideProps: GetServerSideProps = async (context) => {
  // const res = await fetch('https://res.cloudinary.com/kshoyearbook/image/list/yearbook_2021.json')
  // const json = await res.json()
  

  // if (!json) {
  //   return {
  //     notFound: true,
  //   }
  // }

  // const data = json.resources

  // return {
  //   props: { data }, // will be passed to the page component as props
  // }

  aws.config.update({
    accessKeyId: process.env.AWS_S3_ACCESS_KEY,
    secretAccessKey: process.env.AWS_S3_SECRET,
    region: 'us-east-1',
    signatureVersion: 'v4',
  });

  const s3 = new aws.S3();

  // The id from the route (e.g. /img/abc123987)
  // let filename = query.id;

  const params = {
    Bucket: 'yearbook-assets',
    Prefix: '2021/200px',
  };

  const res = await new Promise((resolve, reject) => {
    s3.listObjectsV2(params, (err, data) => {
      if (err) reject(err);
      console.log(data);
      const keys = data.Contents?.map((c) => c.Key) || []
      keys.shift();
      // let imgData = 'data:image/jpeg;base64,' + data.Body.toString('base64');
      resolve(keys);
    });
  });
  

  return { props: { data: res } };

}
import LazyLoad from "react-lazyload";
const ImageList = (images: any) => {
  
  
  const imageList = images.map((i: string, index: number) => {
    return (
      <ImageWrapper key={index}>
        {/* <LazyLoad> */}
        <a href={`https://yearbook-assets.s3.amazonaws.com/${i.replace('200px', '3000px')}`}>
          <LazyLoadImage
            src={`https://yearbook-assets.s3.amazonaws.com/${i.replace('200px', '1000px')}`}
            width="100%"
            effect="blur"
            placeholderSrc={`https://yearbook-assets.s3.amazonaws.com/${i}`}/>
          </a>
        {/* </LazyLoad> */}
      </ImageWrapper>
      
      
    )
  });
  
  // return <ImageListWrapper>{imageList}</ImageListWrapper>;
  return imageList;
};

function Home(data: any) {

  // Uncomment for local files
  // const fetcher = (url: string) => fetch(url).then((res) => res.json());
  // const { images } = useSWR('/api/readphotos', fetcher);
  const images = data.data;
  console.log(images)


  // Uncomment for cloudinary
  // const images = data.data

  // if (error) return <div>failed to load</div>
  if (!images) return <div>loading...</div>
  console.log("images", images)


  // EXIF stuff .. make this async
  // const tags = ExifReader.load(data[0]).then(r => {
  //   const lala = 1;
  // })
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
      <h1>2021</h1>
      <SRLWrapper>
      <Masonry
        breakpointCols={breakpointColumnsObj}
        className="my-masonry-grid"
        columnClassName="my-masonry-grid_column"
      >
        {ImageList(images)}
      </Masonry>
      </SRLWrapper>
      
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
