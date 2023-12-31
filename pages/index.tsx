import '../styles/Home.module.css'

import { useState } from 'react';

import { ThemeProvider } from 'styled-components';
import { lightTheme, darkTheme, GlobalStyles, THEMES } from '../ThemeConfig';
import Link from 'next/link';
import { Header, LightSwitch, MainContent, MainContentWrapper, TopBar } from '../components/SharedComponents';

const ALBUMS = [
  {
    year: 2023,
    description: `
      '23 was a full year! we celebrated birthdays, took some little trips, achieved victories, and grew together. /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /

      donuts remain a core component of winter sundays .. covid finally found us .. ang and karl hit the lottery with pool weather in february on their trip to virginia .. jack is 4! and we celebrated the morning of super bowl-loss tears. /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /

      it was humbling to watch angela step back into her work .. karl spent april with henry -- which was a big ol' foot-tour of coffee and pizza. it was the beginning of the standing night out .. jack starts loving ghostbusters .. we had a race street lemon drop / m83 / obama bomb birthday for karl. /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /
      
      karl never thought he'd coach soccer .. lots of phillies games with friends and classmates .. sprucing the roof .. bon anniversaire chesley nyc trip 🥂, and possibly world's greatest eggs benny .. canadian smoke .. 15 years on from nova. /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /

      time away in upstate NY .. shobro summer pool club .. karl lands a promo, and ang does a race! .. so many parks 🌳 /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /

      flying kites .. riding atvs .. sleeping outside .. henry's first day of school! /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /

      recording songs with friends .. a 40th anniversary on the water .. alpen rose 🌹 .. hank is one! .. family photos .. our biggest halloween yet .. a quick sprint to AC for to see friends run .. shobros love their pumpkins .. karl tries to make italian coffee beverages. /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /

      ang has some presentations in front of big crowds .. this is the year of fancy holiday events and tinsel .. best christmas tree ever 🎄 -- go to rocky yo mo's under I-95 .. karl's team works a gauntlet, and ships .. jack LOVES the nutcracker.

      m83, dmb, jm, lizzy mcalpine, death cab, queen, andrew mcmahon.
    `,
  },
  {
    year: 2022,
    description: `it was a year! we got through with a lot of help from our friends + family, and will remember '22 as special because of that. /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /
    
    we spend a lot of time in parks, and jack has a name for each one. In particular, "our park" was the center of so much joy- from going to the ice cream truck, the halloween parade, and nighttime snow diving. /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /

    we froze in NYC for Tom’s bday, and made it out of that karaoke room covid-free .. all the basketball games at yards .. jack is 3! .. sunday donuts .. baby sho 2.0, coming halloween .. final four once more .. the shoulers take a last minute trip to mission beach, and karl explains the relationship between lawn chairs and snow to his san diego barista .. jack finally sees "dumbo" IRL .. we need those bikes, the saltwater, and the warm. districts at union transfer. /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /
    
    mom + dad escape to skytop and nyc for the music man .. jack’s temp queen bed .. we ate so many donuts .. ang’s teen life bday with third eye blind + taking back sunday .. jack saw dashboard + andrew mcmahon for his first show at the mann. /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /
    
    chesapeake house .. a bunch of burrata .. grocery shopping at the museum .. jack’s a bluebird now! .. all the rides at dorney .. red october .. henry’s here! 🎽 , and ang is an even stronger superhero .. m+m get hitched .. "scraper sky" .. jack loves each holiday more than the last. /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /
    
    five seconds flat, being funny in a foreign language, midnights.
    `,
  },
  {
    year: 2021,
    description: `jack is ✌🏼! celebrated remotely. a couple classroom closures. interviewing is a rollercoaster, but I had a village around me. jabbed 💉 said so long to curalate. karl's spring staycation. jack and ro are best buds now. a 4 hour adult trip to soho. karl sr retires and gets his first foul ball ⚾️ kicked off thirty madison. 3 bears park, aquariums, and scootin'. all our friends bought houses! celebrated ang's bday for 12 hrs in pittsburgh .. #monrosesarewed pt. ii. mom's surprise 60th. friday nights at frankf🥨rd hall (the "we have kids now" b-side). bleachers.. how's it our 5 yr anniversary? a few visits to pub + kitchen. hay rides, pumpkins, and bouncing out on the north fork. middle-of-nowhere new jersey for a few days. jack shark attack. someone else takes our photo! an incognito engagement. baby peter! ang hits 500 rides 🚴🏼‍♀️ karl works migraine, then works hair loss. new hope -> middleburg -> pittsburgh -> chagrin falls -> fairton -> a bunch of manhattan. jack loves wall-e, cars and trucks, christmas jazz, and skeletons.`,
  },
  {
    year: 2020,
    description: `jack is one; curalate is eight. planned and cancelled tuscany 2020. goose island one day, and locked down the next. all the time inside.. visits on the back slab. built bear trap 🐻 100 trips to the zoo. the peloton becomes the best ROI. ang cooks new and interesting foods.. karl photographs new and interesting foods. bazaarvoice acquires curalate 🎉 annapolis. #monrosesarewed. mom and dad escape to virginia. bucatini w/ pancetta is our meal of the year. los gallos. jack goes to school -- doesn't look back. biden/harris win.. see you all at four seasons total landscaping. a couple trips to new york. rode the central park loop. eagles are terrible. found a tradition in the navy yard. moonchild, phil collins, #QuestosWreckaShow, new night game bits. jack loves trucks, shot tower park, monsters inc, blueberries, and anything with a beat. flipped the circumstance, and leaned in to the three of us.`,
  },
  {
    year: 2019,
    description: `prepared the way for baby sho. ate lobster ravioli one day; met Jack the next. it's totally fine for a newborn to watch game of thrones. espresso tonics at Herman's. jack goes where we go. 5 weeks home felt like 5 days. SOUR beer. fuji xt3 sees better. meet at separatist after work? four guys go to a baseball game. jack rides the bus, and makes friends with ed + sheri. sell/donate all the shit. vernick coffee. jacques does paris. delta rae, john mayer, shawn mendes, augustana, tyler hilton. so much Burrata. once a lady bird, now a walter. the great flood of 2019. murder settlers on the cape. tom brady takes our pride. wassail. jack loves butter toast. golden hour.. i,i.. for now, forever.`,
  },
  {
    year: 2018,
    description: `eagles win.. no one likes us, we don't care. nova.. 3 yrs, 2x champs. the dolphin in the dark. falcon heavy double landing. moved into pacific beach for a week. karl's bathroom becomes a jungle. paris 2018. HHS partyboy sees its first and last voyage. 10 years since nova. more bok. more sensational tweets about philly infrastructure. saw a jazz show on a roof in barcelona. stared out into the sea in nice. discovered pistachio macaroons and negronis. met b, met ror.. hung with gin and mia. settlers. ang rings in 30 on the chesapeake. #soapandsmiles. hikes are great on sundays. beers with thommm in chicago. i'm a lady bird now. cura-move up higher. subway everyday. american nights. a brief inquiry into online relationships. a john legendary christmas. ang modifies the commute home for travelers on rte 15. hello world. baby sho on the way.`,
  },
  {
    year: 2017,
    description: `settled into south philly. basketball.. so much basketball. v-neck birthday. street-legal on the motorbike. children.. everywhere. a single. espresso, aperol spritz, la croix. FLIGHTS. miami -> chicago -> venice -> florence -> siena -> seattle -> columbus -> back to chicago.. and a few jaunts to nyc and the shore in between. #iodoreyou #tohaveandtofromhold #winninghamwedding #resist #ittybittyitterly #meetvirginia #sopho365`,
  },
  {
    year: 2016,
    description: `shoveled the sidewalk, planted the doorstep, shot all the fireball, cakes for everyone, partied like it was 1985, learned to clutch and go, flirty thirty, weddings in beautiful places, put equinunk on the map, big girls love late 90's pop-punk, #dustyourshouleroff.`,
  },
  {
    year: 2015,
    description: `from Ireland to Vermont to Guatemala, tough ends and new starts, electing to go under the knife, engaged and wandering for 365 shots, showing the public a hidden park, #popeinphilly, #mrandmrsjeanniemaccune, flying south in the winter. `,
  },
  {
    year: 2014,
    description: `blizzards, jet to la la land, we have the best friends because they painted our whole apartment, built a table, preso in chitown, rocked for a 30, fancy new monetate space, made attempts at arcade high scores, so.many.shows, OBX, ladies picking apples, last minute escape from the noise, kicked off a photo project, ran that half, a year that began and ended on a 3rd floor on 8th st.`,
  },
  {
    year: 2013,
    description: `umphrey's is a tradition now, marg towers, #chasepup, mexicooo, matt duke in our apartment, charlottesville, phall gulps, the "back patiroof" party, DC with the birthday girls, strangeloves, JT/JayZ, spruce street pop-up, ang does yoga, a*bar, lori+steve belizzi, beth+aaron avalos, x100s changes everything.`,
  },
  {
    year: 2012,
    description: `this girl I'm dating now convinced me to run broad st and a half. raise my rent? see ya. piano cupcakes. pizza in the pool. sold a car, got a guitar. SIPS. m83 in central park. shot a gun like pete campbell. amanda+anthony verrastro. discovered the magic of 50mm.`,
  },
  {
    year: 2011,
    description: `so long to conshy, move to the high castle in philly, parted with spotkles, train lyfe 4 ever, "adult" for the nova habitat-ers, irene puts philly under water, first christmas concert, #phreedomcrawl, made a record, a + k.`,
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
