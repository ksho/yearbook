import '../styles/Home.module.css'

import { FormEvent, useEffect, useRef, useState } from 'react'
import type { GetServerSidePropsContext } from 'next'
import Head from 'next/head'
import styled, { ThemeProvider, css, keyframes } from 'styled-components'

import { darkTheme, GlobalStyles } from '../ThemeConfig'
import { TopBar } from '../components/SharedComponents'
import { safeNextPath } from '../lib/gate'

interface IEnterProps {
  nextPath: string
}

// Resolved on the server rather than read from router.query, so the destination is settled
// before the first paint -- this page has no other data to fetch, and an un-hydrated
// router.query would be empty on the first render.
export async function getServerSideProps(context: GetServerSidePropsContext) {
  return { props: { nextPath: safeNextPath(context.query.next) } }
}

// Purely a courtesy to whoever is fumbling the phrase from memory -- it slows the typing, not
// an attacker, who would skip the page entirely. The real limit is the 600ms floor in
// pages/api/gate.ts.
const COOLDOWN_AFTER_FAILURES = 5
const COOLDOWN_MS = 30000

const Enter = ({ nextPath }: IEnterProps) => {
  const [value, setValue] = useState('')
  const [checking, setChecking] = useState(false)
  const [failed, setFailed] = useState(false)
  const [shake, setShake] = useState(false)
  const [lockedUntil, setLockedUntil] = useState(0)
  const [now, setNow] = useState(0)

  const failures = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Only ticks while a cooldown is running, and clears itself the moment one expires -- both
  // pieces of state go back to 0, which unlocks the field and stops the interval. `now` starts
  // at 0 so the first render matches the server's; reading the clock during render would be a
  // hydration mismatch.
  useEffect(() => {
    if (!lockedUntil) return

    const timer = setInterval(() => {
      const current = Date.now()

      if (current >= lockedUntil) {
        setLockedUntil(0)
        setNow(0)
      } else {
        setNow(current)
      }
    }, 500)

    return () => clearInterval(timer)
  }, [lockedUntil])

  const lockSecondsLeft = lockedUntil > now ? Math.ceil((lockedUntil - now) / 1000) : 0
  const locked = lockSecondsLeft > 0

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (checking || locked || !value) return

    setChecking(true)
    setFailed(false)

    let accepted = false
    try {
      const response = await fetch('/api/gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passphrase: value }),
      })
      accepted = response.ok
    } catch {
      accepted = false
    }

    if (accepted) {
      // A full navigation, not router.push: the proxy has to see the new cookie, and it only
      // gets a say on a real request.
      window.location.assign(nextPath)
      return
    }

    failures.current += 1
    if (failures.current >= COOLDOWN_AFTER_FAILURES) {
      failures.current = 0
      // Both set together so the countdown has a sane `now` to subtract from on the very
      // first render after locking, rather than a placeholder reading "try again in 1800925000s".
      setLockedUntil(Date.now() + COOLDOWN_MS)
      setNow(Date.now())
    }

    setChecking(false)
    setValue('')
    setFailed(true)
    setShake(true)
    inputRef.current?.focus()
  }

  return (
    <ThemeProvider theme={darkTheme}>
      <GlobalStyles />
      <Head>
        <title>yearbooks</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Page>
        <TopBar />
        <Screen>
          <Wordmark>yearbooks</Wordmark>

          <Form onSubmit={submit}>
            <Field $shake={shake} onAnimationEnd={() => setShake(false)}>
              <Input
                ref={inputRef}
                type="password"
                name="passphrase"
                // Lets a browser or password manager offer to remember it, which is what makes
                // a six-month session plus the occasional re-entry painless.
                autoComplete="current-password"
                autoFocus
                spellCheck={false}
                disabled={checking || locked}
                placeholder={locked ? `try again in ${lockSecondsLeft}s` : 'passphrase'}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                aria-label="Passphrase"
              />
              {/* A real submit button, not decoration. A form whose only control is a text
                  field is at the mercy of the browser's implicit-submission rules; this makes
                  Enter unambiguous, and gives a thumb something to hit on a phone. */}
              <Go type="submit" disabled={checking || locked} aria-label="Continue">
                {checking ? '…' : '↵'}
              </Go>
            </Field>

            <Note role="status">{failed ? "that's not it" : ''}</Note>
          </Form>
        </Screen>
      </Page>
    </ThemeProvider>
  )
}

const Page = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  /* TopBar is deliberately 104vw wide; without this it would put a scrollbar on a page that
     otherwise has nothing to scroll. */
  overflow-x: hidden;
`

const Screen = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 34px;
  padding: 0 24px 12vh;
`

const Wordmark = styled.h1`
  margin: 0;
  font-size: clamp(40px, 9vw, 78px);
  font-weight: 600;
  letter-spacing: -0.035em;
  color: ${({ theme }) => theme.text};
`

const Form = styled.form`
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
`

const nudge = keyframes`
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-7px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(2px); }
`

const Field = styled.div<{ $shake: boolean }>`
  position: relative;
  width: 100%;

  ${({ $shake }) =>
    $shake &&
    css`
      animation: ${nudge} 0.36s ease;
    `}
`

const Input = styled.input`
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 2px solid rgba(230, 230, 230, 0.22);
  border-radius: 0;
  color: ${({ theme }) => theme.text};
  font-family: inherit;
  font-size: 17px;
  text-align: center;
  padding: 10px 26px;
  outline: none;
  caret-color: ${({ theme }) => theme.accent};
  transition: border-color 0.2s ease;

  &:focus {
    border-bottom-color: ${({ theme }) => theme.accent};
  }

  &::placeholder {
    color: ${({ theme }) => theme.text};
    opacity: 0.3;
  }

  &:disabled {
    opacity: 0.6;
  }
`

const Go = styled.button`
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  padding: 4px 6px;
  color: ${({ theme }) => theme.text};
  font-family: inherit;
  font-size: 14px;
  line-height: 1;
  opacity: 0.35;
  cursor: pointer;
  transition: opacity 0.2s ease;

  &:hover:not(:disabled),
  &:focus-visible {
    opacity: 0.8;
  }

  &:disabled {
    cursor: default;
  }
`

/* Holds its line whether or not there is a message, so the field doesn't jump. */
const Note = styled.div`
  min-height: 18px;
  font-size: 13px;
  opacity: 0.55;
`

export default Enter
