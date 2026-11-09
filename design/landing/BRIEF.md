# CIYA Landing Page Redesign

The prototype `design/landing/ciya-landing.html` is the source of truth for look and
behaviour only. The page is rebuilt as React components (`src/pages/Home.tsx` plus
`src/pages/home/*`) using Tailwind and motion/react. No prototype markup or CSS is copied.

## Section order

1. Hero with stat counters (10,000+, 12, 5 Days) counting up over 6 seconds, plus a hero video slot.
2. Past cohort sphere (`InteractiveTemplatesSphere` and its popup, unchanged).
3. Mission statement, typed out line by line (~60 chars/second, amber caret) when scrolled into view.
4. Student results ("Real clients. Real naira."): filter chips, 4 projects, sticky stacking cards
   (earlier ones scale down and dim), 3D flip to a back face with a website preview and the story.
5. Values strip: 4 mission cards pinned while they slide left-to-right on scroll (right-to-left on
   scroll up), amber arrows between cards, touch scroll works.
6. Our Courses: title "Our Courses" only; floating switcher fixed to the vertical middle of the
   right edge (numbers 1/2/3, active one shows its name) visible only while the section is on
   screen; per-track accent (amber / orange-400 / teal-300); faded website sample background fixed
   in view and crossfading; staggered entrance with a light sweep.
7. New paid courses: newest published Advanced / Masterclass courses from the admin dashboard;
   section hidden when none are published.
8. Earnings calculator: websites-per-month and price-per-website sliders, monthly and yearly
   results, "illustration, not a promise of income" note. No course-tier picker.
9. How it works: 3 image cards with number, title and text overlaid on the image.
10. Why CIYA: 3 cards.
11. FAQ: one answer open at a time.
12. Closing CTA (Start for Free, View All Courses, WhatsApp) and footer.

Section h2 titles: `clamp(2.4rem, 6.4vw, 4.4rem)`, weight 900.

## Hard rules

- Brand palette stays teal-950/900/800 with amber and orange accents; the only per-course colours
  are amber, orange-400 and teal-300. No new colours, no AI video or AI graphics.
- Auth (`useLogin`, Firebase redirects, LoginModal, popup-blocked modal, `?login=true`) is unchanged.
- Real data: COURSES_DATA copy, `full_prompts.json` for the sphere, the WhatsApp link.
- Course names have no "AI" prefix: Landing Page Creation, E-commerce Website Creation,
  Portfolio Website Creation.
- `prefers-reduced-motion`: no typing, counting, pinned scroll, spinning borders or auto-rotation.
- Works at 390px wide with no horizontal scroll.

## Media slots

Every dashed placeholder in the prototype is a real image or video slot. Media components
(`MediaSlot`) accept a `src` prop and render a labelled placeholder when none is given.
No media is invented. Course background screenshots (`COURSE_BG_SRC`) do not exist yet.

## Media table

| Slot | Size / spec |
| --- | --- |
| Hero video | 16:9, 60-90s intro (muted loop or click to play) |
| How-it-works images | portrait 4:5, at least 800x1000, 3 different subjects |
| Student result photos | about 4:3, at least 1000x750 (4 photos) |
| Student result site previews | 16:10 screenshots or scroll recordings, at least 1200x750 |
| Course demo videos | per track, 16:9, 15-30s muted looping screen recordings |
| Paid course covers | course thumbnails from the admin dashboard (16:9) |
| Course background samples | per track, desktop website screenshots (landing / store / portfolio) |

## Links

- Start for Free -> /get-started
- Paid course "Enrol now" -> /get-started?course=<course title>
- WhatsApp community -> the existing CIYA WhatsApp link
- Sphere projects -> /past-cohort-projects

## Acceptance checklist

- [ ] Hero counters count up over 6 seconds on load (final numbers first paint, reduced-motion safe)
- [ ] Sphere and its popup behave exactly as before
- [ ] Mission types out on scroll with the amber caret; everything at once under reduced motion
- [ ] Result cards stack with sticky offsets, dim/scale, and flip in 3D; filters work
- [ ] Values strip pins and slides with scroll direction; touches work; arrows between cards
- [ ] Courses switcher is edge-fixed, appears only while the section is on screen, and switches
      the whole section; per-track accent and crossfading background work
- [ ] Paid courses section renders from the store and hides when empty
- [ ] Calculator updates monthly and yearly results live
- [ ] FAQ allows exactly one open answer
- [ ] No horizontal scroll at 390px; reduced motion honoured everywhere
