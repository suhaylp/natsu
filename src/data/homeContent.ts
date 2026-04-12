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
  // add more here
];

export const TODAY_MEMORY = {
  image: require('../../assets/photos/37982074-1E0A-408F-B3D7-3346363FD560_1_102_o.jpg'),
  // swap with real photo
  caption: '1 year ago today',
  title: 'Cypress Bowl sunset',
} as const;

export const RECENT_MOMENTS = [
  {
    image: require('../../assets/photos/AA5D4759-E08E-4198-8ECC-F86E4C7F3E60_4_5005_c.jpg'),
    title: 'Ski day',
    date: 'Feb 8',
  },
  {
    image: require('../../assets/photos/D3ED9139-9045-4653-A3EE-B5F0C5377383_1_102_o.jpg'),
    title: 'Date night',
    date: 'Jan 20',
  },
  {
    image: require('../../assets/photos/DAF2EDEB-1734-4DC4-8B10-6FF84D3F2E69_4_5005_c.jpg'),
    title: "New Year's",
    date: 'Dec 31',
  },
] as const;
