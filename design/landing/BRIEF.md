# Landing page redesign: brief for the implementing agent

Reference prototype: `design/landing/ciya-landing.html` (plain HTML, open it in a browser and click through everything).
Target: `src/pages/Home.tsx` and its section components. The prototype shows look and behaviour only. Port it to React, Tailwind and `motion/react`.

## Rules
1. **Do not change the brand.** Keep the existing Tailwind palette: `teal-950` background, `teal-900/800` cards and borders, `teal-50/200/300` text, `amber-400/500` accents, orange-400 in the gradient headings, `#25D366` for WhatsApp. Keep the spinning `BrandingLogo`. Keep `font-sans`.
2. **Do not touch auth.** Leave `useLogin`, the Firebase redirects (`/admin`, `/dashboard`, `/onboarding`), `LoginModal`, the popup-blocked modal and `?login=true` handling exactly as they are.
3. **Websites only.** The academy teaches AI Landing Page, AI E-commerce and AI Portfolio creation. Do not add AI video or AI graphics anywhere.
4. Keep the existing real data: course copy in `COURSES_DATA`, the `full_prompts.json` templates for the sphere, the WhatsApp community link.

## New section order
1. Hero (pill, typewriter headline, stats, CTAs) plus a **hero video slot**.
2. Past cohort sphere (`InteractiveTemplatesSphere`, keep as is; reuse its popup).
3. Mission statement (heading and text only, the 4 cards move to the values strip below).
4. **Student results** ("Real clients. Real naira"): keep the filter chips. Use **4 projects**. Cards stack on scroll (sticky, each card sticks slightly lower than the one before, earlier cards scale down and dim a little). "Tap for the story" flips the card (3D rotateY) to a back face with a website preview and the story of how it was built.
5. **Values strip** (the 4 mission cards): sits directly under the results, full width, plain edges (no fade or blur). Scroll-linked: it holds still until the strip is well inside the viewport (starts at 72% of viewport height), then scrolling down moves cards left to right and scrolling up moves them right to left. Works with touch scroll. Reduced motion: wrapped static grid.
6. Courses: three tracks named **Landing Page Creation, E-commerce Website Creation, Portfolio Website Creation** (no "AI" in names). Replace tabs with a **floating vertical switcher fixed to the right edge** of the screen, vertically centred. Inactive buttons show 1, 2, 3. The active one expands to its full name. It shows only while the Courses section is on screen and is hidden (and inert) elsewhere. Clicking switches the whole section (header card, demo video slot, practise list, tier cards, format pills).
7. **New paid courses** (`#paid`, above the calculator): 3-column card grid (2 on tablet, 1 on mobile) showing the newest Advanced and Masterclass courses published from the admin dashboard. Each card: cover image slot (16:9), "New" tag for recently published, level tag, title, short description, track name, duration, lesson count, naira price, and an Enrol now button to `/get-started?course=<title>`. Load from the admin-published paid courses (newest first, cap at 3 to 6); hide the section if none are published. Beginner courses stay free in Courses. The cards in the prototype are sample data.
8. **Earnings calculator** (sliders, tier picker, "illustration, not a promise of income" note).
9. How It Works (keep copy).
10. Why CIYA (keep copy).
11. FAQ accordion (5 questions).
12. Closing CTA (Start for Free `/get-started`, View All Courses, WhatsApp block), then footer.

## Round 8 and later changes (these override anything above that conflicts)
- **Hero stats** (10,000+, 12, 5 Days): count up from 0 over 6 seconds on page load. Reduced motion shows final numbers.
- **Mission text**: typed out line by line (about 60 characters per second) when the section scrolls into view, with a blinking amber caret. Reduced motion shows it all at once.
- **Values strip**: the section is pinned (sticky, about 230vh tall) while the 4 cards slide left to right on scroll down (right to left on scroll up). The page does not move on until the cards finish. An amber right-pointing arrow sits between each pair of cards. No edge fade.
- **Courses**: the section title is just "Our Courses" (no sub-heading or intro text). A floating switcher of plain numbers 1, 2, 3 (no container) sits on the right edge; the active one shows its full name. Each track has its own look using only brand colours: Landing = amber, E-commerce = orange, Portfolio = teal-300. The section background shows a faded website sample for the active track (landing page, store, portfolio), fixed in view while scrolling, crossfading on switch, with a staggered entrance and a light sweep. Replace the drawn samples with real screenshots (16:10, at least 1600x1000).
- **Paid courses** section (`#paid`) above the calculator, fed from the admin dashboard (newest Advanced and Masterclass courses). "Try a lesson" is removed.
- **Calculator**: no course-tier picker and no "paid back after" figure. Only websites per month, price per website, per month and per year.
- **How it works**: 3 cards (Pick Your Creator Track, Join the 5-Day Training, Apply or Advance). Each is a tall image card (4:5, at least 800x1000) with the number, title and text overlaid at the bottom on a dark gradient.
- **Why CIYA**: 3 cards (Free Entry Zero Barriers, 5 Days Real Results, Create Your Own Job).
- **FAQ**: one answer open at a time (`<details name="faq">`), first open by default.
- **Section titles** are larger: h2 is clamp(2.4rem, 6.4vw, 4.4rem), weight 900. Eyebrows 15px.

## Behaviour changes
- Remove the 400vh sticky video scroll in Courses. Replace with the tabbed panel above.
- Remove any countdown timer. Keep the text "Countdown to Cohort 4! Check the WhatsApp community for launch updates."
- Hero stat counters animate only when they scroll into view. Hero stats must show their final numbers on first paint.
- Respect `prefers-reduced-motion` (no typewriter, no auto-rotating sphere, no spinning borders).
- Mobile: nav collapses to a menu button; sphere tiles shrink; every grid becomes one column.

## Placeholders to fill with real media
| Slot | Spec |
|---|---|
| Hero video | 16:9, 60 to 90 s intro, muted loop or click to play |
| Logo (header, footer) | circular, at least 240x240 (existing Cloudinary logo already works in the app) |
| Sphere thumbnails (18 in prototype) | 16:9 screenshot, at least 520x292, from `full_prompts.json` `imageUrl` |
| Sphere popup preview | video (`videoUrl`) or screenshot per template |
| Student result project photo and website preview (4 cards, 2 each) | 16:9, at least 1200x675 |
| Course demo video, one per track (3) | looping muted MP4, 16:9, 15 to 30 s. The live site already has four clips per track, so reuse them. |

The prototype has a "Show placeholders" button that outlines every slot and lists them.

## Sample content to replace before launch
- The 4 student result cards are invented placeholders (marked "Sample"). Replace with real students, with their permission, or hide the section until there are real results.
- Sphere tile names in the prototype are invented. In the app they come from `full_prompts.json`.

## Links
Prototype buttons only show a note. In the app wire them to: Start for Free `/get-started`, Projects `/past-cohort-projects`, Prompt Generator `/dashboard?view=prompts`, Student Login (existing login handler), Blog and Contact (existing or TODO), WhatsApp `https://chat.whatsapp.com/BzyYP0DyV2TFRqzfrrCXYi?s=cl&p=a&mlu=3`.

## Acceptance checklist
- [ ] Brand colours, logo and fonts unchanged
- [ ] No AI video or AI graphics mentioned anywhere
- [ ] Login and redirects behave exactly as before
- [ ] All sections present in the order above
- [ ] Hero, course and result media slots wired to real assets
- [ ] Works at 390px wide with no horizontal scroll
- [ ] Reduced-motion users see a static page
- [ ] Lighthouse accessibility check passes (labels, focus states, contrast)
