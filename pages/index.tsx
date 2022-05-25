import '../styles/Home.module.css'
import styled from 'styled-components';

import { useState } from 'react';

import { ThemeProvider } from 'styled-components';
import { lightTheme, darkTheme, GlobalStyles, THEMES } from '../ThemeConfig';
import Link from 'next/link';


function Home() {
  const [theme, setTheme] = useState(THEMES.DARK.name);

  const toggleTheme = () => {
    theme == THEMES.LIGHT.name ? setTheme(THEMES.DARK.name) : setTheme(THEMES.LIGHT.name);
  }

  const activeTheme = theme == THEMES.LIGHT.name ? lightTheme : darkTheme

  return (
    <ThemeProvider theme={activeTheme}>
      <GlobalStyles />
      <TopBar></TopBar>
      <MainContentWrapper id='page-main-grid'>
        <MainContent>
          <Header>
            <h1 style={{ margin: '6px'}}>yearbooks</h1>
            <LightSwitch onClick={toggleTheme}>{activeTheme.icon}</LightSwitch>
          </Header>
          <div style={{ margin: '6px'}}>
            <h2>
              <Link href='/album/2021/'>
                <a>2021</a>
              </Link>
            </h2>
            <h2>
              <Link href='/album/2020/'>
                <a>2020</a>
              </Link>
            </h2>
          </div>
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
