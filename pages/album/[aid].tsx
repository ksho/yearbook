import '../../styles/Home.module.css'

import ExifReader from 'exifreader';

import { S3Client, paginateListObjectsV2 } from '@aws-sdk/client-s3';
import AlbumContent from '../../components/AlbumContent';
import { useState } from 'react';

import { ThemeProvider } from "styled-components";
import { lightTheme, darkTheme, GlobalStyles, THEMES } from '../../ThemeConfig';
import { assetUrl } from '../../AssetConfig';
import Link from 'next/link';
import { TopBar, MainContentWrapper, MainContent, Header, LightSwitch } from '../../components/SharedComponents';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

const SUPPORTED_FILES = ['jpg', 'gif', 'webp'];
const BUCKET = 'yearbook-assets';

const s3 = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY as string,
    secretAccessKey: process.env.AWS_S3_SECRET as string,
  },
});

// Paginates past the 1000-key cap that a bare ListObjectsV2 silently truncates at.
// Only includes keys ending in SUPPORTED_FILES -- filters out directories and any
// weird files like .DS_Store.
async function listKeys(prefix: string): Promise<string[]> {
  const keys: string[] = [];

  for await (const page of paginateListObjectsV2({ client: s3 }, { Bucket: BUCKET, Prefix: prefix })) {
    for (const { Key } of page.Contents ?? []) {
      const lower = Key?.toLowerCase();
      if (Key && lower && SUPPORTED_FILES.some((ext) => lower.endsWith(ext))) {
        keys.push(Key);
      }
    }
  }

  return keys;
}

export async function getServerSideProps(context: any) {
  const aid = context.query.aid

  const [photoResult, videoResult] = await Promise.all([
    listKeys(`${aid}/200px`),
    listKeys(`${aid}/video/webp`),
  ]);

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
              src: assetUrl(path.replace('200px', '3000px'))
            }))}
          />
        </MainContent>
      </MainContentWrapper>
    </ThemeProvider>
  );
}

export default Album