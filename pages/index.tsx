import '../styles/Home.module.css'
import styled from 'styled-components';

import { SRLWrapper } from 'simple-react-lightbox';
import ExifReader from 'exifreader';

import aws from 'aws-sdk';
import Album from './components/Album';
import { useState } from 'react';

import { ThemeProvider } from "styled-components";
import { lightTheme, darkTheme, GlobalStyles, THEMES } from '../ThemeConfig';

// TODO: move to config file
const lightboxOptions = {
  settings: {
    lightboxTransitionSpeed: 0.1,
    lightboxTransitionTimingFunction: 'easeOut',
  },
  buttons: {
    showAutoplayButton: false,
    showCloseButton: true,
    showDownloadButton: false,
    showFullscreenButton: false,
    showNextButton: true,
    showPrevButton: true,
    showThumbnailsButton: false,
  },
  caption: {
    captionColor: "#a6cfa5",
    captionTextTransform: "uppercase",
    showCaption: true,
  },
  thumbnails: {
    showThumbnails: false,
  }
};


export async function getServerSideProps() {
  aws.config.update({
    accessKeyId: process.env.AWS_S3_ACCESS_KEY,
    secretAccessKey: process.env.AWS_S3_SECRET,
    region: 'us-east-1',
    signatureVersion: 'v4',
  });

  const s3 = new aws.S3();

  const params = {
    Bucket: 'yearbook-assets',
    Prefix: '2021/200px',
  };

  const res = await new Promise((resolve, reject) => {
    s3.listObjectsV2(params, (err, data) => {
      if (err) reject(err);
      
      // Only include keys ending in .jpg -- filters out directories and any weird files like .DS_Store
      const keys = data.Contents?.map((c) => c.Key).filter(k => k?.includes('.jpg')) || []
      resolve(keys);
    });
  });

  return { props: { data: res } };

}

function Home(data: any) {

  const images = data.data;

  const [theme, setTheme] = useState(THEMES.DARK.name);

  const toggleTheme = () => {
    theme == THEMES.LIGHT.name ? setTheme(THEMES.DARK.name) : setTheme(THEMES.LIGHT.name);
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
            <h1 style={{ margin: '6px'}}>2021</h1>
            <LightSwitch onClick={toggleTheme}>{activeTheme.icon}</LightSwitch>
          </Header>
          <SRLWrapper options={lightboxOptions}>
            <Album items={images}/>
          </SRLWrapper>
        </MainContent>
      </MainContentWrapper>
    </ThemeProvider>
  );
}

const TopBar = styled.div`
  background-color: #3f06dd;
  height: 6px;
  width: 104vw;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
`;

const LightSwitch = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-size: 30px;
  margin: 6px;
  cursor: pointer;
`;

const MainContentWrapper = styled.div`
  display: flex;
  /* flex-direction: column; */
  justify-content: center;
  margin: 6px;
  width: 100vw;

`;

const MainContent = styled.div`
  width: 85%;
  margin: 6px;

  @media (max-width: 768px) {
    flex-direction: column;
    width: 100vw;
  }

`;

export default Home
