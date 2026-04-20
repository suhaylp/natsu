import type { Trip } from '../../data/trips';

export type FlightsApiResponse = {
  generatedAt: string;
  trips: Trip[];
};

export type FlightsApiErrorCode =
  | 'method_not_allowed'
  | 'unauthorized'
  | 'bad_request'
  | 'not_found'
  | 'misconfigured'
  | 'notion_error'
  | 'mapping_error'
  | 'unknown_error';

export type FlightsApiErrorResponse = {
  error: {
    code: FlightsApiErrorCode;
    message: string;
    details?: string;
  };
};
