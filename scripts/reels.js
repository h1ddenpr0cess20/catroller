/**
 * The reels scripts/reel.js makes. Each is a soundtrack (the arguments to
 * the game's startMusic, and its tempo), a line to open on, and clips cut on
 * its bar lines: from a room (they count from 0), so many bars long, the best
 * stretch of it the autopilot played. Every one ends on the card with the
 * address. The third floor's theme is the quickest.
 */

const THEME = { args: [3], tempo: 119, lead: 0.1 };

export const REELS = {
  house: {
    hook: ["You're a ball of yarn", 'six cats between you and the cat flap'],
    music: THEME,
    // Six of the seven rooms, the best each has to show, in order down through the house; the front hall to finish.
    clips: { from: [0, 1, 2, 3, 4, 5, 6], take: 6, keep: [6], bars: 2 },
  },
  cats: {
    hook: ['Roll quietly.', "a cat watching a mouse doesn't see you"],
    music: THEME,
    // The three rooms where the cats come closest, their noticing and swatting counting most.
    worth: { notice: 40, swat: 50, hmm: 12 },
    clips: { from: [0, 1, 2, 3, 4, 5, 6], take: 3, bars: 4 },
  },
};

/**
 * What each sound the game makes is worth to a reel: a number, or a
 * function of what it was called with.
 */
export const WORTH = {
  notice: 14,
  hmm: 5,
  swat: 22,
  purr: 2,
  squeak: 6,
  buzz: 1,
  snag: 8,
  snapped: 10,
  rewound: 4,
  button: (n) => 2 * (n || 1),
  tin: 5,
  skein: 8,
  splash: 8,
  hoover: 5,
  fall: 8,
  goal: 25,
  over: 10,
  bump: 0.5,
};

/** How long the card to end on stays up, in seconds. */
export const CARD = 4.6;

/** How long the opening line stays up, and when the address comes in under the HUD. */
export const HOOK = 2.4;
export const PILL = 2.7;
