import React, { useCallback, useEffect, useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

/**
 * Shared "Install the CIYA app" guide screen.
 * A phone mock-up plays the install steps on a loop with a tapping finger,
 * next to a tappable step list. iPhone and Android variants. Used as the
 * final registration screen (free students) and on the payment-success
 * screen (paid students).
 */

const DUR = 3400;
const LOGO = '/pwa-192x192.png';

type GuideKey = 'android' | 'ios';
type Layer = 'web' | 'home' | 'app';

interface Step {
  t: string;
  d: string;
  layer: Layer;
  f?: [number, number];
  pulse?: 'pbtn' | 'share';
  dlg?: boolean;
  shr?: boolean;
  add?: boolean;
  hl?: boolean;
  pop?: boolean;
  late?: boolean;
}

const GUIDES: Record<GuideKey, { note: React.ReactNode; steps: Step[] }> = {
  android: {
    note: (
      <>
        <b className="text-amber-400">No Install button?</b> In Chrome, tap the menu (three dots), then tap Install app or Add to Home Screen.
      </>
    ),
    steps: [
      { t: 'Open the page in Chrome', d: 'Open your CIYA link in Chrome. You will see the Install app button.', layer: 'web', pulse: 'pbtn' },
      { t: 'Tap Install app', d: 'Tap the amber Install app button.', layer: 'web', f: [50, 62] },
      { t: 'Tap Install', d: 'Your phone asks to confirm. Tap Install.', layer: 'web', dlg: true, f: [80, 61] },
      { t: 'Tap the CIYA icon', d: 'CIYA is now on your home screen. Tap its icon to open the app.', layer: 'home', pop: true, f: [61, 33], late: true },
      { t: 'Sign in', d: 'Sign in with the login details we sent to your email.', layer: 'app' }
    ]
  },
  ios: {
    note: (
      <>
        <b className="text-amber-400">Use Safari.</b> The Add to Home Screen option works best there. If you opened the link in another app, copy it and paste it into Safari.
      </>
    ),
    steps: [
      { t: 'Open the page in Safari', d: 'Open your CIYA link in Safari. The Share button is at the bottom.', layer: 'web', pulse: 'share' },
      { t: 'Tap the Share button', d: 'Tap the square with the arrow pointing up.', layer: 'web', f: [50, 94], shr: true, late: true },
      { t: 'Tap Add to Home Screen', d: 'Find Add to Home Screen in the list and tap it.', layer: 'web', shr: true, hl: true, f: [84, 85] },
      { t: 'Tap Add', d: 'Tap Add at the top right.', layer: 'web', add: true, f: [88, 13] },
      { t: 'Tap the CIYA icon', d: 'CIYA is now on your home screen. Tap its icon to open the app.', layer: 'home', pop: true, f: [61, 33], late: true },
      { t: 'Sign in', d: 'Sign in with the login details we sent to your email.', layer: 'app' }
    ]
  }
};

const HOME_ICONS = ['#38bdf8', '#a78bfa', '#34d399', '#f472b6', '#facc15', '#fb7185', 'CIYA', '#60a5fa', '#4ade80', '#fdba74', '#c4b5fd', '#67e8f9'];

const CSS = `
.ig{color-scheme:dark}
@keyframes ig-ring{from{transform:scale(.9);opacity:.9}to{transform:scale(1.25);opacity:0}}
@keyframes ig-glow{50%{box-shadow:0 0 0 7px rgba(251,191,36,.22)}}
@keyframes ig-pop{from{transform:scale(.2);opacity:0}to{transform:none;opacity:1}}
@keyframes ig-tap{0%{transform:scale(1)}30%{transform:scale(.78)}60%{transform:scale(1)}}
@keyframes ig-rip{0%{opacity:.8;transform:scale(.6)}100%{opacity:0;transform:scale(1.5)}}
@keyframes ig-fill{to{width:100%}}
@keyframes ig-open{from{transform:scale(.15);border-radius:30px}to{transform:none}}
.ig-ring::after{content:"";position:absolute;inset:-4px;border-radius:999px;border:2px solid #fbbf24;animation:ig-ring 1.4s ease-out infinite}
.ig-shareglow{animation:ig-glow 1.4s ease-in-out infinite}
.ig-pop-ico{animation:ig-pop .7s cubic-bezier(.2,1.4,.4,1) both}
.ig-pop-ico::after{content:"";position:absolute;inset:-6px;border-radius:16px;border:2px solid #fbbf24;animation:ig-ring 1.4s .5s ease-out infinite}
.ig-fingertap{animation:ig-tap .9s .55s ease-out 1 both}
.ig-fingertap::after{content:"";position:absolute;inset:-6px;border-radius:50%;border:2px solid #fff;animation:ig-rip .9s .7s ease-out 1 both}
.ig-openapp{animation:ig-open .55s cubic-bezier(.2,.8,.2,1) both}
.ig-bar{animation:ig-fill var(--ig-dur) linear forwards}
.ig-paused .ig-bar{animation-play-state:paused}
@media (prefers-reduced-motion:reduce){.ig *,.ig *::after,.ig *::before{animation:none!important;transition:none!important}}
`;

function SheetRow({ label, icon, hl }: { label: string; icon: React.ReactNode; hl?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-3 py-2.5 text-xs font-semibold border-b border-teal-800/70 last:border-0 ${hl ? 'bg-amber-400 text-teal-950 [&_svg]:stroke-teal-950' : ''}`}>
      <span>{label}</span>
      <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-teal-200 fill-none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
    </div>
  );
}

export default function InstallGuide() {
  const { isInstallable, isInstalled, isIOS, installApp } = usePWAInstall();
  const [guide, setGuide] = useState<GuideKey>(() =>
    typeof window !== 'undefined' && /iPhone|iPad|iPod/i.test(window.navigator.userAgent || '') ? 'ios' : 'android'
  );
  const [idx, setIdx] = useState(0);
  const [epoch, setEpoch] = useState(0);
  const [sheetLate, setSheetLate] = useState(false);
  const [reduce] = useState(() => typeof window !== 'undefined' && !!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [playing, setPlaying] = useState(!reduce);
  const [installing, setInstalling] = useState(false);

  const steps = GUIDES[guide].steps;
  const step = steps[idx];

  const show = useCallback((i: number) => {
    setIdx(i);
    setEpoch((e) => e + 1);
    setSheetLate(false);
  }, []);

  // Late overlays: the share sheet / home pop lands a beat after the step starts.
  useEffect(() => {
    if (!step.late) return;
    const t = setTimeout(() => setSheetLate(true), 1300);
    return () => clearTimeout(t);
  }, [idx, guide, step.late, epoch]);

  // Loop timer.
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => show((idx + 1) % GUIDES[guide].steps.length), DUR);
    return () => clearTimeout(t);
  }, [idx, playing, guide, show]);

  const switchGuide = (g: GuideKey) => {
    setGuide(g);
    setIdx(0);
    setEpoch((e) => e + 1);
    setSheetLate(false);
  };

  const handleRealInstall = async () => {
    setInstalling(true);
    try {
      const ok = await installApp();
      if (ok) show(3); // jump to "Tap the CIYA icon / sign in"
    } finally {
      setInstalling(false);
    }
  };

  // Already running as the installed app: normal sign-in instead of the guide.
  if (isInstalled) {
    return (
      <section className="ig w-full text-center space-y-5 py-10">
        <style>{CSS}</style>
        <img src={LOGO} alt="CIYA app icon" className="w-20 h-20 mx-auto rounded-2xl border-2 border-amber-400 shadow-lg" />
        <h2 className="text-2xl font-black text-teal-50">You already have the app</h2>
        <p className="text-teal-200 text-sm font-semibold">Open the CIYA app and sign in with the login details we emailed you.</p>
        <a
          href="/?login=true"
          className="inline-block px-10 py-3.5 bg-teal-900/60 hover:bg-teal-800 border border-teal-700 text-teal-50 font-black rounded-2xl transition-all active:scale-95"
        >
          Log in to the App
        </a>
      </section>
    );
  }

  const shrVisible = !!step.shr && (!step.late || sheetLate);
  const dim = !!(step.dlg || shrVisible || step.add);
  const webPageText = guide === 'android'
    ? 'Sign in from the app with the login details sent to your email.'
    : 'Add this page to your Home Screen, then sign in from the app.';

  return (
    <section className={`ig w-full ${playing ? '' : 'ig-paused'}`}>
      <style>{CSS}</style>

      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-black leading-[1.05] tracking-tight text-teal-50 mb-3 text-balance">
          Install the <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">CIYA app</span>
        </h1>
        <p className="text-teal-200 text-base md:text-lg max-w-[56ch] mb-7">
          You sign in through the app, not the website. Add it to your phone in a few taps, then use the login details we emailed you.
        </p>

        {guide === 'android' && isInstallable && (
          <div className="mb-6">
            <button
              type="button"
              onClick={handleRealInstall}
              disabled={installing}
              className="px-8 py-3.5 rounded-full bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-teal-950 font-black text-base shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              {installing ? 'Installing…' : 'Install app'}
            </button>
          </div>
        )}

        <div className="flex gap-1.5 p-1.5 rounded-full bg-teal-900/60 border border-teal-800 mb-8 w-fit" role="tablist" aria-label="Phone type">
          <button type="button" role="tab" aria-selected={guide === 'ios'} onClick={() => switchGuide('ios')}
            className={`px-5 md:px-6 py-2.5 rounded-full font-extrabold text-sm md:text-[15px] transition-all cursor-pointer border-0 ${guide === 'ios' ? 'bg-amber-400 text-teal-950' : 'bg-transparent text-teal-200'}`}>
            iPhone
          </button>
          <button type="button" role="tab" aria-selected={guide === 'android'} onClick={() => switchGuide('android')}
            className={`px-5 md:px-6 py-2.5 rounded-full font-extrabold text-sm md:text-[15px] transition-all cursor-pointer border-0 ${guide === 'android' ? 'bg-amber-400 text-teal-950' : 'bg-transparent text-teal-200'}`}>
            Android
          </button>
        </div>

        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3.5 md:gap-x-12 items-start md:items-center">
          {/* Phone mock-up */}
          <div className="w-[158px] flex flex-col items-center gap-2.5">
            <div className="relative w-[158px] h-[326px] md:w-[288px] md:h-[576px]">
              <div aria-label="Animated phone showing the install steps"
                className="absolute left-0 top-0 w-[272px] h-[560px] rounded-[44px] bg-black border-8 border-[#0a1f1e] shadow-[0_0_0_2px_#115e59,0_40px_70px_-24px_rgba(0,0,0,.85)] overflow-hidden origin-top-left scale-[0.58] md:scale-100">
                <div className="absolute inset-0 overflow-hidden bg-[#07201f] text-white text-[11px]">
                  {/* status bar */}
                  <div className="absolute top-0 inset-x-0 h-[26px] z-30 flex justify-between items-center px-5 font-bold text-[10px] pointer-events-none">
                    <span>9:41</span>
                    <span className="absolute left-1/2 top-1.5 w-16 h-4 rounded-[10px] bg-black -translate-x-1/2" />
                    <span>● ● ▮</span>
                  </div>

                  {/* web layer */}
                  <div className={`absolute inset-0 bg-[#0b3d3a] flex flex-col transition-opacity duration-[450ms] ${step.layer === 'web' ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                    {guide === 'android' && (
                      <div className="mt-[26px] h-[42px] flex-none flex items-center gap-2 px-2.5 bg-[#0a2e2c] border-b border-[#14504c]">
                        <div className="flex-1 h-[26px] rounded-full bg-[#0e4340] flex items-center gap-1.5 px-2.5 text-[10px] text-teal-200">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
                          CIY Academy
                        </div>
                        <div className="flex flex-col gap-[2.5px]">{[0, 1, 2].map((i) => <i key={i} className="w-[3px] h-[3px] rounded-full bg-teal-200" />)}</div>
                      </div>
                    )}
                    <div className={`flex-1 flex flex-col items-center justify-center text-center gap-2.5 px-[22px] ${guide === 'ios' ? 'pb-[70px]' : 'pb-[46px]'}`}>
                      <div className="grid place-items-center w-[62px] h-[62px] rounded-full border-2 border-amber-400 bg-[radial-gradient(circle_at_50%_40%,#0b3a38,#021a19)]">
                        <img src={LOGO} alt="" className="w-11 h-11 rounded-full" />
                      </div>
                      <h3 className="m-0 mt-1.5 text-[17px] font-black leading-tight">Install the CIYA app</h3>
                      <p className="m-0 text-teal-200 text-[11px] leading-snug">{webPageText}</p>
                      {guide === 'android' && (
                        <button type="button" tabIndex={-1}
                          className={`relative mt-1.5 border-0 rounded-full bg-amber-400 text-teal-950 font-black text-[13px] px-[26px] py-[11px] ${step.pulse === 'pbtn' ? 'ig-ring' : ''}`}>
                          Install app
                        </button>
                      )}
                    </div>
                    {guide === 'ios' && (
                      <div className="absolute inset-x-0 bottom-0 h-[60px] bg-[#0a2e2c] border-t border-[#14504c] flex justify-around items-start pt-2.5">
                        <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-teal-300 fill-none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                        <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-teal-300 fill-none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                        <span className={`rounded-lg p-0.5 ${step.pulse === 'share' ? 'ig-shareglow [&_svg]:stroke-amber-400' : ''}`}>
                          <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-teal-300 fill-none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M8 7l4-4 4 4M5 11v9h14v-9" /></svg>
                        </span>
                        <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-teal-300 fill-none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 5a2 2 0 0 1 2-2h12v18l-6-4-6 4z" /></svg>
                        <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-teal-300 fill-none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="3" /></svg>
                      </div>
                    )}
                  </div>

                  {/* home layer */}
                  <div className={`absolute inset-0 bg-[linear-gradient(160deg,#0f766e,#042f2e_55%,#021a19)] transition-opacity duration-[450ms] ${step.layer === 'home' ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                    <div className="absolute left-4 right-4 top-[70px] grid grid-cols-4 row-gap-4 gap-x-2">
                      {HOME_ICONS.map((c, i) => c === 'CIYA' ? (
                        <div key={i} className="flex flex-col items-center gap-[5px] text-[9px] text-[#e6fffb]">
                          <span className={`relative grid place-items-center w-11 h-11 rounded-[11px] border-2 border-amber-400 bg-[radial-gradient(circle_at_50%_40%,#0b3a38,#021a19)] overflow-hidden ${step.pop ? 'ig-pop-ico' : ''}`}>
                            <img src={LOGO} alt="" className="w-9 h-9 rounded-[9px]" />
                          </span>
                          CIYA
                        </div>
                      ) : (
                        <div key={i} className="flex flex-col items-center gap-[5px]">
                          <i className="w-11 h-11 rounded-[11px] block opacity-55" style={{ background: c }} />
                        </div>
                      ))}
                    </div>
                    <div className="absolute left-3 right-3 bottom-3.5 h-[62px] rounded-[22px] bg-white/15 flex justify-around items-center">
                      {['#2dd4bf', '#fb923c', '#a7f3d0', '#fcd34d'].map((c) => <i key={c} className="w-11 h-11 rounded-[11px] block" style={{ background: c }} />)}
                    </div>
                  </div>

                  {/* app login layer */}
                  {step.layer === 'app' && (
                    <div key={`app-${epoch}`} className="ig-openapp absolute inset-0 bg-teal-950 flex flex-col items-center justify-center gap-2.5 px-6 text-center">
                      <img src={LOGO} alt="" className="w-16 h-16 rounded-full border-2 border-amber-400" />
                      <h3 className="m-0 mt-1.5 text-lg font-black">Welcome back</h3>
                      <p className="m-0 mb-1.5 text-teal-200 text-[10.5px]">Sign in to start learning</p>
                      <div className="w-full h-9 rounded-[10px] bg-[#0e4340] border border-teal-700 text-left px-3 flex items-center text-teal-300 text-[11px]">Email</div>
                      <div className="w-full h-9 rounded-[10px] bg-[#0e4340] border border-teal-700 text-left px-3 flex items-center text-teal-300 text-[11px]">Password</div>
                      <div className="w-full h-[38px] rounded-full bg-amber-400 text-teal-950 font-black text-[13px] grid place-items-center mt-1">Sign in</div>
                      <div className="mt-2 text-teal-200 text-[10px] flex items-center gap-1.5">
                        <svg viewBox="0 0 24 24" className="w-[13px] h-[13px] stroke-amber-400 fill-none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
                        Your login details are in your email
                      </div>
                    </div>
                  )}

                  {/* dim + overlays */}
                  <div className={`absolute inset-0 bg-black/55 z-10 transition-opacity duration-[400ms] ${dim ? 'opacity-100 visible' : 'opacity-0 invisible'}`} />

                  {step.dlg && (
                    <div className="absolute left-[18px] right-[18px] top-1/2 -translate-y-1/2 z-20 bg-[#13302e] rounded-[18px] p-[18px]">
                      <h4 className="m-0 mb-3 text-[15px] font-extrabold">Install app?</h4>
                      <div className="flex gap-3 items-center mb-4">
                        <img src={LOGO} alt="" className="w-11 h-11 rounded-[22%] border-2 border-amber-400" />
                        <div>
                          <b className="block text-[13px]">CIY Academy</b>
                          <span className="text-teal-200 text-[10px]">Adds the app to your home screen</span>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2.5">
                        <span className="px-4 py-2 rounded-full font-extrabold text-xs text-teal-200">Cancel</span>
                        <span className="px-4 py-2 rounded-full font-extrabold text-xs bg-amber-400 text-teal-950">Install</span>
                      </div>
                    </div>
                  )}

                  {shrVisible && !step.add && (
                    <div className="absolute inset-x-0 bottom-0 z-20 bg-[#13302e] rounded-t-[18px] p-3 pb-4">
                      <div className="flex items-center gap-2.5 px-1 pb-3 border-b border-[#1f5450]">
                        <img src={LOGO} alt="" className="w-[34px] h-[34px] rounded-[22%] border-2 border-amber-400" />
                        <div>
                          <b className="block text-xs">CIY Academy</b>
                          <span className="text-teal-200 text-[10px]">Options ›</span>
                        </div>
                      </div>
                      <div className="flex gap-3 px-1 py-3 border-b border-[#1f5450]">
                        {[0, 1, 2, 3, 4].map((i) => <i key={i} className="w-9 h-9 rounded-full bg-[#1d4b47] flex-none" />)}
                      </div>
                      <div className="bg-[#0f2928] rounded-xl mt-3 overflow-hidden">
                        <SheetRow label="Copy" icon={<><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M4 16V6a2 2 0 0 1 2-2h10" /></>} />
                        <SheetRow label="Add to Bookmarks" icon={<path d="M4 5a2 2 0 0 1 2-2h12v18l-6-4-6 4z" />} />
                        <SheetRow label="Add to Home Screen" hl={!!step.hl} icon={<><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M12 8v8M8 12h8" /></>} />
                        <SheetRow label="Find on Page" icon={<><circle cx="11" cy="11" r="6" /><path d="M20 20l-4-4" /></>} />
                      </div>
                    </div>
                  )}

                  {step.add && (
                    <div className="absolute inset-x-0 top-[30px] bottom-0 z-20 bg-[#13302e] rounded-t-[18px] p-3 pb-4">
                      <div className="flex justify-between items-center px-1.5 pb-3 text-xs font-bold">
                        <span className="text-teal-200 font-semibold">Cancel</span>
                        <span>Add to Home Screen</span>
                        <span className="text-teal-950 bg-amber-400 rounded-full px-3.5 py-1 font-black">Add</span>
                      </div>
                      <div className="bg-[#0f2928] rounded-xl p-3 flex gap-3 items-center">
                        <img src={LOGO} alt="" className="w-[52px] h-[52px] rounded-[22%] border-2 border-amber-400 flex-none" />
                        <div>
                          <b className="block text-[13px]">CIYA</b>
                          <span className="text-teal-200 text-[10px]">CIY Academy</span>
                        </div>
                      </div>
                      <p className="mt-3 mx-1.5 text-teal-200 text-[10px]">An icon will be added to your Home Screen so you can quickly open the app.</p>
                    </div>
                  )}

                  {/* finger */}
                  {step.f && !shrVisible && (
                    <div key={`f-${epoch}`}
                      className={`ig-fingertap absolute z-40 w-[22px] h-[22px] -mt-[11px] -ml-[11px] rounded-full bg-white/90 shadow-[0_4px_14px_rgba(0,0,0,.5)] pointer-events-none`}
                      style={{ left: `${step.f[0]}%`, top: `${step.f[1]}%` }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* controls */}
            <div className="flex items-center gap-2 md:gap-3">
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? 'Pause animation' : 'Play animation'}
                className="w-9 h-9 md:w-[42px] md:h-[42px] rounded-full border border-teal-700 bg-teal-900/60 grid place-items-center cursor-pointer"
              >
                {playing ? (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-amber-400"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-amber-400"><path d="M7 5l12 7-12 7z" /></svg>
                )}
              </button>
              <small className="text-teal-200 font-semibold text-xs md:text-sm">Step {idx + 1} of {steps.length}</small>
            </div>
          </div>

          {/* steps */}
          <ol
            className="list-none m-0 p-0 flex flex-col gap-2 md:gap-2.5 min-w-0"
            style={{ ['--ig-dur' as string]: `${DUR}ms` } as React.CSSProperties}
          >
            {steps.map((s, i) => {
              const on = i === idx;
              return (
                <li key={i} className={on ? 'on' : ''} aria-current={on ? 'step' : undefined}>
                  <button
                    type="button"
                    onClick={() => show(i)}
                    className={`w-full text-left grid grid-cols-[30px_minmax(0,1fr)] md:grid-cols-[44px_minmax(0,1fr)] gap-2.5 md:gap-3.5 items-start px-3 py-2.5 md:px-[18px] md:py-4 rounded-2xl md:rounded-[22px] border relative overflow-hidden cursor-pointer transition-colors duration-300 ${on ? 'bg-teal-900/45 border-amber-400' : 'bg-teal-900/30 border-teal-800'}`}
                  >
                    <span className={`grid place-items-center w-[30px] h-[30px] md:w-11 md:h-11 rounded-full font-black text-[13px] md:text-[17px] ${on ? 'bg-amber-400 text-teal-950 border border-amber-400' : 'bg-teal-950 text-amber-400 border border-teal-700'}`}>{i + 1}</span>
                    <span className="min-w-0">
                      <b className="block text-sm md:text-[1.05rem] font-extrabold leading-snug">{s.t}</b>
                      <span className={`${on ? 'block' : 'hidden'} text-teal-200 text-xs md:text-[0.95rem] mt-0.5 md:mt-1`}>{s.d}</span>
                    </span>
                    <span key={`bar-${epoch}`} className={`absolute left-0 bottom-0 h-[3px] bg-amber-400 ${on && playing ? 'ig-bar' : ''}`} style={{ width: on ? undefined : 0 }} />
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <p className="mt-[18px] px-4 py-3.5 rounded-[18px] border border-dashed border-teal-700 text-teal-200 text-[0.92rem]">{GUIDES[guide].note}</p>
      </div>
    </section>
  );
}
