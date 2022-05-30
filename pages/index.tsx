import '../styles/Home.module.css'

import { useState } from 'react';

import { ThemeProvider } from 'styled-components';
import { lightTheme, darkTheme, GlobalStyles, THEMES } from '../ThemeConfig';
import Link from 'next/link';
import { Header, LightSwitch, MainContent, MainContentWrapper, TopBar } from './components/SharedComponents';

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

export default Home
