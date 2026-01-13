import '../../styles/Home.module.css'

import ExifReader from 'exifreader';

import aws from 'aws-sdk';
import AlbumContent from '../../components/AlbumContent';
import { useState } from 'react';

import { ThemeProvider } from "styled-components";
import { lightTheme, darkTheme, GlobalStyles, THEMES } from '../../ThemeConfig';
import Link from 'next/link';
import { TopBar, MainContentWrapper, MainContent, Header, LightSwitch } from '../../components/SharedComponents';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

const SUPPORTED_FILES = ['jpg', 'gif', 'webp'];

export async function getServerSideProps(context: any) {
  aws.config.update({
    accessKeyId: process.env.AWS_S3_ACCESS_KEY,
    secretAccessKey: process.env.AWS_S3_SECRET,
    region: 'us-east-1',
    signatureVersion: 'v4',
  });

  const s3 = new aws.S3();
  const aid = context.query.aid

  const photoParams = {
    Bucket: 'yearbook-assets',
    Prefix: `${aid}/200px`,
  };

  const videoParams = {
    Bucket: 'yearbook-assets',
    Prefix: `${aid}/video/webp`,
  };

  // Get photos
  const photoResult: (string | undefined)[] = await new Promise((resolve, reject) => {
    s3.listObjectsV2(photoParams, (err, data) => {
      if (err) reject(err);
      
      // Only include keys ending in SUPPORTED_FILES -- filters out directories and any weird files like .DS_Store
      const keys = data.Contents?.
        map((c) => c.Key).
        // change includes to endswith?
        filter(k => SUPPORTED_FILES.some((ext) => k?.toLowerCase().includes(ext))) || []

      resolve(keys);
    });
  });

  // Get videos
  const videoResult: (string | undefined)[] = await new Promise((resolve, reject) => {
    s3.listObjectsV2(videoParams, (err, data) => {
      if (err) reject(err);

      // Only include keys ending in SUPPORTED_FILES -- filters out directories and any weird files like .DS_Store
      const keys = data.Contents?.
        map((c) => c.Key).
        // change includes to endswith?
        filter(k => SUPPORTED_FILES.some((ext) => k?.toLowerCase().includes(ext))) || []

      resolve(keys);
    });
  });

  // Concat the photos and videos and custom sort
  // TODO: faster to do a smarter merge
  const res = videoResult.concat(photoResult).sort((a, b) =>{
    const aParts = a?.split('/');
    const bParts = b?.split('/');

    let aTime = '';
    let bTime = '';

    if (aParts && bParts) {
      aTime = aParts[aParts.length - 1];
      bTime = bParts[bParts.length - 1];     
    }

    if (!aTime || aTime < bTime) {
      return -1;
    } else if (!bTime || aTime > bTime) {
      return 1;
    }
    return 0;
  });

  return { props: { data: res, year: aid } };
}

const Album = (data: any) => {
  console.log(data.year)

  const images = data.data;
  const year = data.year;

  const [theme, setTheme] = useState(THEMES.DARK.name);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const toggleTheme = () => {
    theme == THEMES.LIGHT.name ? setTheme(THEMES.DARK.name) : setTheme(THEMES.LIGHT.name);
  }

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }

  // if (error) return <div>failed to load</div>
  if (!images) return <div>loading...</div>

  // EXIF stuff .. make this async
  // const tags = ExifReader.load(data[0]).then(r => {
  //   const lala = 1;
  // })
  // const imageDate = tags['DateTimeOriginal'].description;
  // const unprocessedTagValue = tags['DateTimeOriginal'].value;

  const activeTheme = theme == THEMES.LIGHT.name ? lightTheme : darkTheme

  return (
    <ThemeProvider theme={activeTheme}>
      <GlobalStyles />
      <TopBar></TopBar>
      <MainContentWrapper id='page-main-grid'>
        <MainContent>
          <Header>
            <h1 style={{ margin: '6px'}}><Link href='/'>←</Link> { year }</h1>
            <LightSwitch onClick={toggleTheme}>{activeTheme.icon}</LightSwitch>
          </Header>
          <AlbumContent items={images} year={year} onImageClick={openLightbox}/>
          <Lightbox
            open={lightboxOpen}
            close={() => setLightboxOpen(false)}
            index={lightboxIndex}
            slides={images.map((path: string) => ({
              src: `https://yearbook-assets.s3.amazonaws.com/${path.replace('200px', '3000px')}`
            }))}
          />
        </MainContent>
      </MainContentWrapper>
    </ThemeProvider>
  );
}

export default Album