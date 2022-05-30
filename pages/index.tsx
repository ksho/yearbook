import '../styles/Home.module.css'

import { useState } from 'react';

import { ThemeProvider } from 'styled-components';
import { lightTheme, darkTheme, GlobalStyles, THEMES } from '../ThemeConfig';
import Link from 'next/link';
import { Header, LightSwitch, MainContent, MainContentWrapper, TopBar } from '../components/SharedComponents';

const ALBUMS = [
  {
    year: 2021,
    description: `jack is ✌🏼! celebrated remotely. a couple classroom closures. interviewing is a rollercoaster, but I had a village around me. jabbed 💉 said so long to curalate. karl's spring staycation. jack and ro are best buds now. a 4 hour adult trip to soho. karl sr retires and gets his first foul ball ⚾️ kicked off thirty madison. 3 bears park, aquariums, and scootin'. all our friends bought houses! celebrated ang's bday for 12 hrs in pittsburgh .. #monrosesarewed pt. ii. mom's surprise 60th. friday nights at frankf🥨rd hall (the "we have kids now" b-side). bleachers.. how's it our 5 yr anniversary? a few visits to pub + kitchen. hay rides, pumpkins, and bouncing out on the north fork. middle-of-nowhere new jersey for a few days. jack shark attack. someone else takes our photo! an incognito engagement. baby peter! ang hits 500 rides 🚴🏼‍♀️ karl works migraine, then works hair loss. new hope -> middleburg -> pittsburgh -> chagrin falls -> fairton -> a bunch of manhattan. jack loves wall-e, cars and trucks, christmas jazz, and skeletons.`,
  },
  {
    year: 2020,
    description: `jack is one; curalate is eight. planned and cancelled tuscany 2020. goose island one day, and locked down the next. all the time inside.. visits on the back slab. built bear trap 🐻 100 trips to the zoo. the peloton becomes the best ROI. ang cooks new and interesting foods.. karl photographs new and interesting foods. bazaarvoice acquires curalate 🎉 annapolis. #monrosesarewed. mom and dad escape to virginia. bucatini w/ pancetta is our meal of the year. los gallos. jack goes to school -- doesn't look back. biden/harris win.. see you all at four seasons total landscaping. a couple trips to new york. rode the central park loop. eagles are terrible. found a tradition in the navy yard. moonchild, phil collins, #QuestosWreckaShow, new night game bits. jack loves trucks, shot tower park, monsters inc, blueberries, and anything with a beat. flipped the circumstance, and leaned in to the three of us.`,
  }
];

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
            {ALBUMS.map((a) => {
              return (
                <div key={a.year} style={{letterSpacing: '0.03em', lineHeight: '1.5em'}}>
                  <h2>
                    <Link href={`/album/${a.year}/`}><a>{a.year}</a></Link>
                  </h2>
                  <span>
                    .. &nbsp;
                  </span>
                  <span>
                    {a.description}
                  </span>
                </div>
              )
            })}
          </div>
        </MainContent>
      </MainContentWrapper>
    </ThemeProvider>
  );
}

export default Home
