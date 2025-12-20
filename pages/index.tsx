import '../styles/Home.module.css'

import { useState } from 'react';
import styled from 'styled-components';

import { ThemeProvider } from 'styled-components';
import { lightTheme, darkTheme, GlobalStyles, THEMES } from '../ThemeConfig';
import Link from 'next/link';
import { Header, LightSwitch, MainContent, MainContentWrapper, TopBar } from '../components/SharedComponents';

const ALBUMS = [
  {
    year: 2025,
    description: [
      `2025 was a full one -- there were tee-ball games, ER visits, date nights, work successes, weekend mornings at the Navy Yard, and roof hangs. We've found the routine, and at the same time do our best to break out of it and look around.`,

      `Henry is a classic rowhome kid who runs loops from front to back almost daily -- often with a wand and cape. Second up is probably a fondness for playing his guitars -- and while he has some work to do on putting out anything recognizeable, there's a real passion to his performance. Credit is due to Hank for usually being the one that reminds us to pray before dinner -- though somehow he's always the first one trying to leave the table. We love witnessing him emulate Jack, and all of the charming threenager moments in-between.`,

      `Karl threw more football passes this year than all of his prior 39 years combined -- we definitely didn't have that on the bingo card. Taking Jack to see, eh hem, Jack's Mannequin, was a top memory, as was going to see the Phillies hit 8 homeruns in one game. He loves the slow weekend mornings making coffee and listening to records with the fam. An unexpected devotion to the treadmill hit him the last few months, and he ended the year having ridden 96 subways, 148 ubers, and 266 buses.`,

      `Angela likes to use the phrase beautiful chaos, which is often a perfect synopsis of two boys jumping off the highest spots they can find. We're pretty sure she broke a reading record this year, which doesn't even include the out-loud Harry Potter for the boys. Ang had an unfortunate run-in with the sidewalk that broke her ankle, but she's since fully recovered and back in the saddle. Her favorite moments included Henry's 3rd birthday party in the park -- bubble machine, stick wands, and all -- and post-mass dinners with friends.`,

      `For Jack, this year was an explosion of interests. Baseball, football, chess, puzzles, mazes, going to concerts -- he's been going deep on so much, and loves to go to a *ball game. He conquered riding a two-wheeler in time for the neighborhood ride-to-school days, and called out swimming in Grandma and Grandpas pool, and going to see Jack's Mannequin with Mom and Dad as his favorites. His piano skills have gotten to reading music and playing with two hands. Jack also worked really hard (as did Mom) getting through OIT for tree nuts this year, and is now eating them every night!`,

      `We were pretty local in our travel this year and made our way to NYC 🗽, Middlesburg 🍇, the Hudson Valley 🌳 🏊, and Hershey 🍫. Best dinners were at Tulip Pasta Bar, Liberty Kitchen, Little Walters, Tesiny, and Buratta.`,
    ]
  },
  {
    year: 2024,
    description: [
      `The four of us enjoyed a memorable year, where looking back has us full of gratitude for what we got to see and who we shared it with.`,
      
      `Our guy Jack turned 5, finished his days as a Rainbow, and started Kindergarten. Him and Angela have all but made it through the first 4 Harry Potters. His favorite songs this year, far and away, were Waffle House, Beautiful Things, Dynamite, AOK, and Sunroof. Jack joined his first baseball team, learned to swim, and started some piano. Add us to the list of all the parents that say it’s going too fast!`,
      
      `Henry brings second-kid vibes all the way through, and has become such a colorful counterpoint to the household energy. Hank has no interest in animated movies, preferring anything with actual people or football. His favorite thing in the house has got to be this 2ft tall stuffed fox, which was the first thing we got for the nursery before Jack was born (though Jack never took to it). The tenacity he brings to charging at his big brother is a spectacle, and it won’t be long before Jack isn’t just going easy on him. He would follow Jack into war with no questions.`,
      
      `Angela rebooted her running career and landed her first marathon (and ran hundreds of miles across training, many in the company of friends). She read a lot .. mostly about fairies and dragons 🐉  She found our favorite new restaurant, Little Walter’s, with all the pierogies and kielbasa you could ask for.`,
      
      `Karl’s top memory from the year was his trip with Jack to the finger lakes to see the eclipse.. diner food, cameras, cards, a big waterfall, cool space stuff -- you just can’t beat it. He finished his time at Thirty Madison this summer, took a sabbatical, and joined Perpay in Phila. He apparently listened to 182 hours of podcasts -- is this average or out of control? He's making passable espresso drinks, but still a C- at latte art.`,

      `We spent time in NYC 🗽, Naples ☀️🌊, Geneva (NY!) 🌘🌑🌒, New Canaan 💙👰🏻‍♀️, Harrisburg/Hershey 🏃🏼‍♀️🍫, Nantucket 🦞⛵️, and Waco 🌾🏨.`,
    ]
  },
  {
    year: 2023,
    description: [`
      '23 was a full year! we celebrated birthdays, took some little trips, achieved victories, and grew together. /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /

      donuts remain a core component of winter sundays .. covid finally found us .. ang and karl hit the lottery with pool weather in february on their trip to virginia .. jack is 4! and we celebrated the morning of super bowl-loss tears. /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /

      it was humbling to watch angela step back into her work .. karl spent april with henry -- which was a big ol' foot-tour of coffee and pizza. it was the beginning of the standing night out .. jack starts loving ghostbusters .. we had a race street lemon drop / m83 / obama bomb birthday for karl. /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /
      
      karl never thought he'd coach soccer .. lots of phillies games with friends and classmates .. sprucing the roof .. bon anniversaire chesley nyc trip 🥂, and possibly world's greatest eggs benny .. canadian smoke .. 15 years on from nova. /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /

      time away in upstate NY .. shobro summer pool club .. karl lands a promo, and ang does a race! .. so many parks 🌳 /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /

      flying kites .. riding atvs .. sleeping outside .. henry's first day of school! /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /

      recording songs with friends .. a 40th anniversary on the water .. alpen rose 🌹 .. hank is one! .. family photos .. our biggest halloween yet .. a quick sprint to AC for to see friends run .. shobros love their pumpkins .. karl tries to make italian coffee beverages. /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /

      ang has some presentations in front of big crowds .. this is the year of fancy holiday events and tinsel .. best christmas tree ever 🎄 -- go to rocky yo mo's under I-95 .. karl's team works a gauntlet, and ships .. jack LOVES the nutcracker.

      m83, dmb, jm, lizzy mcalpine, death cab, queen, andrew mcmahon.
    `],
  },
  {
    year: 2022,
    description: [`it was a year! we got through with a lot of help from our friends + family, and will remember '22 as special because of that. /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /
    
    we spend a lot of time in parks, and jack has a name for each one. In particular, "our park" was the center of so much joy- from going to the ice cream truck, the halloween parade, and nighttime snow diving. /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /

    we froze in NYC for Tom’s bday, and made it out of that karaoke room covid-free .. all the basketball games at yards .. jack is 3! .. sunday donuts .. baby sho 2.0, coming halloween .. final four once more .. the shoulers take a last minute trip to mission beach, and karl explains the relationship between lawn chairs and snow to his san diego barista .. jack finally sees "dumbo" IRL .. we need those bikes, the saltwater, and the warm. districts at union transfer. /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /
    
    mom + dad escape to skytop and nyc for the music man .. jack’s temp queen bed .. we ate so many donuts .. ang’s teen life bday with third eye blind + taking back sunday .. jack saw dashboard + andrew mcmahon for his first show at the mann. /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /
    
    chesapeake house .. a bunch of burrata .. grocery shopping at the museum .. jack’s a bluebird now! .. all the rides at dorney .. red october .. henry’s here! 🎽 , and ang is an even stronger superhero .. m+m get hitched .. "scraper sky" .. jack loves each holiday more than the last. /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /  /
    
    five seconds flat, being funny in a foreign language, midnights.
    `],
  },
  {
    year: 2021,
    description: [`jack is ✌🏼! celebrated remotely. a couple classroom closures. interviewing is a rollercoaster, but I had a village around me. jabbed 💉 said so long to curalate. karl's spring staycation. jack and ro are best buds now. a 4 hour adult trip to soho. karl sr retires and gets his first foul ball ⚾️ kicked off thirty madison. 3 bears park, aquariums, and scootin'. all our friends bought houses! celebrated ang's bday for 12 hrs in pittsburgh .. #monrosesarewed pt. ii. mom's surprise 60th. friday nights at frankf🥨rd hall (the "we have kids now" b-side). bleachers.. how's it our 5 yr anniversary? a few visits to pub + kitchen. hay rides, pumpkins, and bouncing out on the north fork. middle-of-nowhere new jersey for a few days. jack shark attack. someone else takes our photo! an incognito engagement. baby peter! ang hits 500 rides 🚴🏼‍♀️ karl works migraine, then works hair loss. new hope -> middleburg -> pittsburgh -> chagrin falls -> fairton -> a bunch of manhattan. jack loves wall-e, cars and trucks, christmas jazz, and skeletons.`],
  },
  {
    year: 2020,
    description: [`jack is one; curalate is eight. planned and cancelled tuscany 2020. goose island one day, and locked down the next. all the time inside.. visits on the back slab. built bear trap 🐻 100 trips to the zoo. the peloton becomes the best ROI. ang cooks new and interesting foods.. karl photographs new and interesting foods. bazaarvoice acquires curalate 🎉 annapolis. #monrosesarewed. mom and dad escape to virginia. bucatini w/ pancetta is our meal of the year. los gallos. jack goes to school -- doesn't look back. biden/harris win.. see you all at four seasons total landscaping. a couple trips to new york. rode the central park loop. eagles are terrible. found a tradition in the navy yard. moonchild, phil collins, #QuestosWreckaShow, new night game bits. jack loves trucks, shot tower park, monsters inc, blueberries, and anything with a beat. flipped the circumstance, and leaned in to the three of us.`],
  },
  {
    year: 2019,
    description: [`prepared the way for baby sho. ate lobster ravioli one day; met Jack the next. it's totally fine for a newborn to watch game of thrones. espresso tonics at Herman's. jack goes where we go. 5 weeks home felt like 5 days. SOUR beer. fuji xt3 sees better. meet at separatist after work? four guys go to a baseball game. jack rides the bus, and makes friends with ed + sheri. sell/donate all the shit. vernick coffee. jacques does paris. delta rae, john mayer, shawn mendes, augustana, tyler hilton. so much Burrata. once a lady bird, now a walter. the great flood of 2019. murder settlers on the cape. tom brady takes our pride. wassail. jack loves butter toast. golden hour.. i,i.. for now, forever.`],
  },
  {
    year: 2018,
    description: [`eagles win.. no one likes us, we don't care. nova.. 3 yrs, 2x champs. the dolphin in the dark. falcon heavy double landing. moved into pacific beach for a week. karl's bathroom becomes a jungle. paris 2018. HHS partyboy sees its first and last voyage. 10 years since nova. more bok. more sensational tweets about philly infrastructure. saw a jazz show on a roof in barcelona. stared out into the sea in nice. discovered pistachio macaroons and negronis. met b, met ror.. hung with gin and mia. settlers. ang rings in 30 on the chesapeake. #soapandsmiles. hikes are great on sundays. beers with thommm in chicago. i'm a lady bird now. cura-move up higher. subway everyday. american nights. a brief inquiry into online relationships. a john legendary christmas. ang modifies the commute home for travelers on rte 15. hello world. baby sho on the way.`],
  },
  {
    year: 2017,
    description: [`settled into south philly. basketball.. so much basketball. v-neck birthday. street-legal on the motorbike. children.. everywhere. a single. espresso, aperol spritz, la croix. FLIGHTS. miami -> chicago -> venice -> florence -> siena -> seattle -> columbus -> back to chicago.. and a few jaunts to nyc and the shore in between. #iodoreyou #tohaveandtofromhold #winninghamwedding #resist #ittybittyitterly #meetvirginia #sopho365`],
  },
  {
    year: 2016,
    description: [`shoveled the sidewalk, planted the doorstep, shot all the fireball, cakes for everyone, partied like it was 1985, learned to clutch and go, flirty thirty, weddings in beautiful places, put equinunk on the map, big girls love late 90's pop-punk, #dustyourshouleroff.`],
  },
  {
    year: 2015,
    description: [`from Ireland to Vermont to Guatemala, tough ends and new starts, electing to go under the knife, engaged and wandering for 365 shots, showing the public a hidden park, #popeinphilly, #mrandmrsjeanniemaccune, flying south in the winter. `],
  },
  {
    year: 2014,
    description: [`blizzards, jet to la la land, we have the best friends because they painted our whole apartment, built a table, preso in chitown, rocked for a 30, fancy new monetate space, made attempts at arcade high scores, so.many.shows, OBX, ladies picking apples, last minute escape from the noise, kicked off a photo project, ran that half, a year that began and ended on a 3rd floor on 8th st.`],
  },
  {
    year: 2013,
    description: [`umphrey's is a tradition now, marg towers, #chasepup, mexicooo, matt duke in our apartment, charlottesville, phall gulps, the "back patiroof" party, DC with the birthday girls, strangeloves, JT/JayZ, spruce street pop-up, ang does yoga, a*bar, lori+steve belizzi, beth+aaron avalos, x100s changes everything.`],
  },
  {
    year: 2012,
    description: [`this girl I'm dating now convinced me to run broad st and a half. raise my rent? see ya. piano cupcakes. pizza in the pool. sold a car, got a guitar. SIPS. m83 in central park. shot a gun like pete campbell. amanda+anthony verrastro. discovered the magic of 50mm.`],
  },
  {
    year: 2011,
    description: [`so long to conshy, move to the high castle in philly, parted with spotkles, train lyfe 4 ever, "adult" for the nova habitat-ers, irene puts philly under water, first christmas concert, #phreedomcrawl, made a record, a + k.`],
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
                  <YearHeader>
                    <Link href={`/album/${a.year}/`}><a>{a.year}</a></Link>
                  </YearHeader>
                  <div style={{ paddingLeft: '12px'}}>
                    {a.description.map((para) =>
                      <div>
                        {para}
                        <br/><br/>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </MainContent>
      </MainContentWrapper>
    </ThemeProvider>
  );
}

const YearHeader = styled.h2`
    text-decoration: none;
    /* text-shadow: 3px -3px #3058c5, 5px -5px #d5b6c5; */
    text-shadow: 3px -3px #3058c5;
    font-weight: 900;
    letter-spacing: 4px;
    padding-left: 2px;
`;

export default Home
