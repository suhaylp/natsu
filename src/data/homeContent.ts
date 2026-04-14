export const HOME_SCREEN_COPY = {
  initialGreeting: 'HEY NATI',
  memoryHeading: "Today's memory",
  recentMomentsHeading: 'Recent moments',
} as const;

export const SECRET_GREETINGS: string[] = [
  'HEY NATI, I LOVE YOU',
  'SAMANAMA AY AY',
  'HEY NATI, WE\'RE DATING!!',
  'MARRIAGE WHEN??',
  'YOU\'RE MY FAVOURITE PERSON!!',
  'HI MY LOVE',
  'MUAHAHAHAHAH',
  'OO EH OO EH, OO EH OO EH'
  // add more here
];

export const TODAY_MEMORY = {
  image: require('../../assets/photos/seymour1.jpg'),
  // swap with real photo
  caption: 'Earlier this year!',
  title: 'Seymour sunset',
} as const;

export const RECENT_MOMENTS = [
  {
    image: require('../../assets/photos/seymour3.jpg'),
    title: 'Ski day',
    date: 'Feb 20',
  },
  {
    image: require('../../assets/photos/newyears1.jpg'),
    title: "New Year's",
    date: 'Dec 31',
  },
] as const;
