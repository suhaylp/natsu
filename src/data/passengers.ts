export const passengers = {
  suhayl: { full: 'Suhayl Usman Patel', short: 'Suhayl' },
  natalia: { full: 'Natalia Alcantara Haddad Martim', short: 'Natalia' },
} as const;

export type PassengerId = keyof typeof passengers;