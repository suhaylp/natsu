export type ItineraryCardType = 'flight' | 'hotel' | 'sightseeing' | 'activities' | 'food';

export type ItinerarySource = 'ideas' | 'schedule';

export type ItineraryApiItem = {
  id: string;
  source: ItinerarySource;
  type: ItineraryCardType;
  city: string;
  country?: string;
  title: string;
  subtitle?: string;
  time?: string;
  timeSub?: string;
  confirmed?: boolean;
  status?: string;
  dayNumber?: number;
  dayLabel?: string;
  location?: string;
  note?: string;
  originIATA?: string;
  destIATA?: string;
  duration?: string;
  arrivalTime?: string;
  checkIn?: string;
  nights?: number;
  checkOut?: string;
};

export type ItineraryApiResponse = {
  generatedAt: string;
  items: ItineraryApiItem[];
};

export type ItineraryApiErrorCode =
  | 'method_not_allowed'
  | 'unauthorized'
  | 'misconfigured'
  | 'notion_error'
  | 'mapping_error'
  | 'unknown_error';

export type ItineraryApiErrorResponse = {
  error: {
    code: ItineraryApiErrorCode;
    message: string;
    details?: string;
  };
};
