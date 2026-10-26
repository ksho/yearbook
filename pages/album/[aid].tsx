import '../../styles/Home.module.css'

import { GetServerSidePropsContext } from 'next';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import AlbumContent, { photoDomId } from '../../components/AlbumContent';
import TimelineRail from '../../components/TimelineRail';

import styled, { ThemeProvider } from "styled-components";
import { lightTheme, darkTheme, GlobalStyles, THEMES } from '../../ThemeConfig';
import { assetUrl } from '../../AssetConfig';
import { formatKeyDate, keyDate, listAlbum, loadManifest, monthMarkers, MonthMarker } from '../../lib/photos';
import { indexPhotos, largestTier, PhotoIndex, photoSlug, tierUrl } from '../../lib/responsive';
import Link from 'next/link';
import { TopBar, MainContentWrapper, MainContent, Header, LightSwitch } from '../../components/SharedComponents';

import Lightbox from "yet-another-react-lightbox";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/counter.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";

interface IAlbumProps {
  data: string[],
  year: string,
  // Empty for any year that has not been through scripts/derive-sizes.mjs yet.
  photos: PhotoIndex,
  avifMinWidth: number | null,
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const aid = String(context.query.aid)

  // The listing and the manifest are independent reads, and the manifest is allowed to be
  // absent -- loadManifest resolves to null rather than throwing for an unprocessed year.
  const [data, manifest] = await Promise.all([listAlbum(aid), loadManifest(aid)])

  return {
    props: {
      data,
      year: aid,
      photos: indexPhotos(manifest),
      avifMinWidth: manifest?.avifMinWidth ?? null,
    },
  };
}

// Leaves a jumped-to photo clear of the header rather than tucked under it.
const HEADER_OFFSET = 80;

// How long a jump keeps correcting for images loading in above it: it stops once nothing
// new has arrived for QUIET_MS, and never holds on past MAX_PIN_MS.
const QUIET_MS = 2500;
const MAX_PIN_MS = 30000;

const readPhotoHash = () => {
  const match = /#photo=([^&]+)/.exec(window.location.hash);
  return match ? decodeURIComponent(match[1]) : null;
};

const Album = ({ data: images, year, photos, avifMinWidth }: IAlbumProps) => {
  const [theme, setTheme] = useState(THEMES.DARK.name);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(false);
  const [activeMonth, setActiveMonth] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const albumRef = useRef<AlbumContent>(null);
  // Bumped on every jump so an in-flight settle loop knows it has been superseded.
  const jumpToken = useRef(0);

  const markers = useMemo(() => monthMarkers(images ?? []), [images]);
  const slugs = useMemo(() => (images ?? []).map(photoSlug), [images]);

  // The lightbox gets the same ladder the grid does, so a phone opening a photo pulls a
  // 1200px file rather than the full 3000px one. WebP only: the lightbox renders a plain
  // <img srcset>, with no <picture> to fall back from, so it cannot serve AVIF without
  // breaking the browsers that lack it.
  const slides = useMemo(
    () =>
      (images ?? []).map((path: string) => {
        const meta = photos?.[photoSlug(path)];
        const title = formatKeyDate(path) ?? undefined;

        if (!meta) {
          return {
            src: assetUrl(path.replace('200px', '3000px')),
            thumbnail: assetUrl(path),
            title,
          };
        }

        return {
          src: largestTier(year, meta),
          thumbnail: assetUrl(path),
          title,
          width: meta.width,
          height: meta.height,
          srcSet: meta.tiers.map((tier, i) => ({
            src: tierUrl(year, tier, meta.name, 'webp'),
            width: meta.widths[i],
            height: Math.round((meta.widths[i] * meta.height) / meta.width),
          })),
        };
      }),
    [images, photos, year]
  );

  const toggleTheme = () => {
    theme == THEMES.LIGHT.name ? setTheme(THEMES.DARK.name) : setTheme(THEMES.LIGHT.name);
  }

  // Reveals enough of the grid to reach `index` and parks that photo under the header.
  //
  // Jumping to December means rendering hundreds of tiles at once, and a tile whose image
  // hasn't loaded has no intrinsic width -- so the justified rows re-wrap and everything
  // below shifts by thousands of pixels as the images arrive. One scroll lands nowhere near
  // the target, and a fixed-duration retry loop gives up while photos are still arriving.
  // So we re-pin the target every time an image finishes loading, until the album goes quiet
  // -- and bail out the moment the reader takes over.
  const scrollToPhoto = useCallback((index: number) => {
    const token = ++jumpToken.current;

    albumRef.current?.revealThrough(index, () => {
      const grid = document.getElementById('page-main-grid');
      if (!grid) return;

      const started = Date.now();
      let cancelled = false;
      let quietTimer: ReturnType<typeof setTimeout>;
      let pinQueued = false;

      const cancel = () => { cancelled = true; stop(); };

      const stop = () => {
        clearTimeout(quietTimer);
        window.removeEventListener('wheel', cancel);
        window.removeEventListener('touchstart', cancel);
        window.removeEventListener('keydown', cancel);
        // `load` doesn't bubble, so this listener has to capture.
        grid.removeEventListener('load', onImageLoad, true);
      };

      const pin = () => {
        if (cancelled || token !== jumpToken.current) return stop();

        const target = document.getElementById(photoDomId(index));
        if (!target) return stop();

        const drift = target.getBoundingClientRect().top - HEADER_OFFSET;
        if (Math.abs(drift) >= 2) {
          window.scrollBy({ top: drift, behavior: 'auto' });
        }
      };

      // Coalesce the burst of loads that fire together into one correction per frame.
      const queuePin = () => {
        if (pinQueued) return;
        pinQueued = true;
        window.requestAnimationFrame(() => {
          pinQueued = false;
          pin();
        });
      };

      const onImageLoad = () => {
        queuePin();
        // Each arriving photo extends the window; when they stop, so do we. The gap is
        // generous because these are 2000px files off the CDN -- a second between two
        // arrivals is normal, and giving up early leaves the target halfway up the page.
        clearTimeout(quietTimer);
        if (Date.now() - started < MAX_PIN_MS) {
          quietTimer = setTimeout(stop, QUIET_MS);
        }
      };

      window.addEventListener('wheel', cancel, { passive: true });
      window.addEventListener('touchstart', cancel, { passive: true });
      window.addEventListener('keydown', cancel);
      grid.addEventListener('load', onImageLoad, true);

      pin();
      quietTimer = setTimeout(stop, QUIET_MS);
    });
  }, []);

  const openLightbox = useCallback((index: number) => {
    setAutoplay(false);
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const jumpToMonth = useCallback((marker: MonthMarker) => {
    setActiveMonth(marker.month);
    scrollToPhoto(marker.index);
  }, [scrollToPhoto]);

  const onVisibleIndexChange = useCallback((index: number) => {
    const parsed = keyDate(images?.[index] ?? '');
    if (parsed) setActiveMonth(parsed.month);
  }, [images]);

  const playTheYear = useCallback(() => {
    setAutoplay(true);
    setLightboxIndex(0);
    setLightboxOpen(true);
  }, []);

  const copyPhotoLink = useCallback(() => {
    const slug = slugs[lightboxIndex];
    if (!slug) return;

    const url = `${window.location.origin}${window.location.pathname}#photo=${encodeURIComponent(slug)}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  }, [slugs, lightboxIndex]);

  // Opening a shared link: find the photo named in the fragment, page the grid out to it,
  // and open it straight into the lightbox.
  useEffect(() => {
    const slug = readPhotoHash();
    if (!slug) return;

    const index = slugs.indexOf(slug);
    if (index < 0) return;

    scrollToPhoto(index);
    setLightboxIndex(index);
    setLightboxOpen(true);
    // Only on first paint -- later hash writes come from the lightbox itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!images) return <div>loading...</div>

  const activeTheme = theme == THEMES.LIGHT.name ? lightTheme : darkTheme

  return (
    <ThemeProvider theme={activeTheme}>
      <GlobalStyles />
      <TopBar></TopBar>
      <MainContentWrapper id='page-main-grid'>
        <MainContent>
          <Header>
            <h1 style={{ margin: '6px'}}><Link href='/'>←</Link> { year }</h1>
            <HeaderActions>
              <PlayButton type="button" onClick={playTheYear} title={`Play all ${images.length} in order`}>
                ▶ play the year
              </PlayButton>
              <LightSwitch onClick={toggleTheme}>{activeTheme.icon}</LightSwitch>
            </HeaderActions>
          </Header>
          <TimelineRail markers={markers} activeMonth={activeMonth} onJump={jumpToMonth} />
          <AlbumContent
            ref={albumRef}
            items={images}
            year={year}
            photos={photos}
            avifMinWidth={avifMinWidth}
            onImageClick={openLightbox}
            onVisibleIndexChange={onVisibleIndexChange}
          />
          <Lightbox
            open={lightboxOpen}
            close={() => {
              setLightboxOpen(false);
              setAutoplay(false);
              // Drop the fragment so a refresh doesn't reopen the photo, and leave the
              // grid parked on whatever you were just looking at.
              history.replaceState(null, '', window.location.pathname);
              scrollToPhoto(lightboxIndex);
            }}
            index={lightboxIndex}
            slides={slides}
            plugins={[Captions, Counter, Fullscreen, Slideshow, Thumbnails, Zoom]}
            on={{
              view: ({ index }) => {
                setLightboxIndex(index);
                const slug = slugs[index];
                if (slug) history.replaceState(null, '', `#photo=${encodeURIComponent(slug)}`);
              },
            }}
            slideshow={{ autoplay, delay: 3000 }}
            // showToggle is what actually renders the 'thumbnails' toolbar button below --
            // without it the plugin ignores the entry and the toolbar prints the bare word.
            thumbnails={{ width: 100, height: 70, borderRadius: 4, vignette: false, showToggle: true }}
            counter={{ container: { style: { top: 'unset', bottom: 0 } } }}
            carousel={{ finite: true }}
            toolbar={{
              buttons: [
                <button
                  key="copy-link"
                  type="button"
                  className="yarl__button"
                  onClick={copyPhotoLink}
                  title="Copy a link to this photo"
                >
                  {copied ? '✓ copied' : '🔗 link'}
                </button>,
                'slideshow',
                'thumbnails',
                'fullscreen',
                'zoom',
                'close',
              ],
            }}
          />
        </MainContent>
      </MainContentWrapper>
    </ThemeProvider>
  );
}

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const PlayButton = styled.button`
  background: none;
  border: 1px solid ${({ theme }) => theme.text};
  border-radius: 999px;
  color: ${({ theme }) => theme.text};
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  letter-spacing: 0.06em;
  opacity: 0.65;
  padding: 6px 12px;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 1;
  }
`;

export default Album
