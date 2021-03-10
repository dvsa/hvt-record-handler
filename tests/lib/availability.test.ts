import type { DynamoDBRecord, StreamRecord } from 'aws-lambda';

import { extractAvailabilityData, availabilityHasChanged } from '../../src/lib/availability';

import validEvent from '../mocks/dynamodb-stream-event.json';
import eventWithInvalidEmail from '../mocks/invalid-dynamodb-stream-event-email.json';
import eventWithInvalidAvailability from '../mocks/invalid-dynamodb-stream-event-availability.json';

jest.unmock('../../src/lib/availability');
jest.unmock('aws-sdk');
jest.unmock('joi');
jest.unmock('deep-equal');

describe('extractAvailabilityData()', () => {
  it('extracts the availability data as expected', () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const token = validEvent.NewImage.token.S;
    const testCases = [
      {
        record: {
          dynamodb: validEvent as StreamRecord,
        } as DynamoDBRecord,
        expected: {
          id: '7db12eed-0c3f-4d27-8221-5699f4e3ea22',
          name: 'Derby Cars Ltd.',
          email: 'hello@email.com',
          token,
          oldAvailability: {
            isAvailable: false,
            lastUpdated: '2020-10-09T12:31:46.518Z',
            endDate: '2020-11-03T14:21:45.000Z',
            startDate: '2020-10-06T14:21:45.000Z',
          },
          newAvailability: {
            isAvailable: true,
            lastUpdated: '2020-10-09T12:31:46.518Z',
            endDate: '2020-11-03T14:21:45.000Z',
            startDate: '2020-10-06T14:21:45.000Z',
          },
        },
      },
    ];

    testCases.forEach(({ record, expected }) => {
      expect(extractAvailabilityData(record)).toEqual(expected);
    });
  });

  it('detects when the ATF is in an unexpected format', () => {
    const testCase = {
      record: {
        dynamodb: eventWithInvalidEmail as StreamRecord,
      } as DynamoDBRecord,
    };

    expect(() => {
      extractAvailabilityData(testCase.record);
    }).toThrowError();
  });

  it('detects when the availability data is in an unexpected format', () => {
    const testCase = {
      record: {
        dynamodb: eventWithInvalidAvailability as StreamRecord,
      } as DynamoDBRecord,
    };

    expect(() => {
      extractAvailabilityData(testCase.record);
    }).toThrowError();
  });
});

describe('availabilityHasChanged()', () => {
  it('detects when availability has changed', () => {
    const testCases = [
      // false → true
      {
        oldAvailability: {
          lastUpdated: '2020-10-19T16:01:28.832Z',
          startDate: '2020-10-19T16:01:28.832Z',
          endDate: '2020-10-26T16:01:28.832Z',
          isAvailable: false,
        },
        newAvailability: {
          lastUpdated: '2020-10-19T16:01:28.832Z',
          startDate: '2020-10-19T16:01:28.832Z',
          endDate: '2020-10-26T16:01:28.832Z',
          isAvailable: true,
        },
      },
      // true → false
      {
        oldAvailability: {
          lastUpdated: '2020-10-19T16:01:28.832Z',
          startDate: '2020-10-19T16:01:28.832Z',
          endDate: '2020-10-26T16:01:28.832Z',
          isAvailable: true,
        },
        newAvailability: {
          lastUpdated: '2020-10-19T16:01:28.832Z',
          startDate: '2020-10-19T16:01:28.832Z',
          endDate: '2020-10-26T16:01:28.832Z',
          isAvailable: false,
        },
      },
      // true → true, different dates
      {
        oldAvailability: {
          lastUpdated: '2020-10-19T16:01:28.832Z',
          startDate: '2020-10-19T16:01:28.832Z',
          endDate: '2020-10-26T16:01:28.832Z',
          isAvailable: true,
        },
        newAvailability: {
          lastUpdated: '2020-11-19T16:01:28.832Z',
          startDate: '2020-11-19T16:01:28.832Z',
          endDate: '2020-11-26T16:01:28.832Z',
          isAvailable: true,
        },
      },
      // false → false, different dates
      {
        oldAvailability: {
          lastUpdated: '2020-10-19T16:01:28.832Z',
          startDate: '2020-10-19T16:01:28.832Z',
          endDate: '2020-10-26T16:01:28.832Z',
          isAvailable: false,
        },
        newAvailability: {
          lastUpdated: '2020-11-19T16:01:28.832Z',
          startDate: '2020-11-19T16:01:28.832Z',
          endDate: '2020-11-26T16:01:28.832Z',
          isAvailable: false,
        },
      },
    ];

    testCases.forEach(({ oldAvailability, newAvailability }) => {
      expect(availabilityHasChanged(oldAvailability, newAvailability)).toEqual(true);
    });
  });

  it('detects when availability has not changed', () => {
    const testCases = [
      {
        oldAvailability: {
          lastUpdated: '2020-10-19T16:01:28.832Z',
          startDate: '2020-10-19T16:01:28.832Z',
          endDate: '2020-10-26T16:01:28.832Z',
          isAvailable: false,
        },
        newAvailability: {
          lastUpdated: '2020-10-19T16:01:28.832Z',
          startDate: '2020-10-19T16:01:28.832Z',
          endDate: '2020-10-26T16:01:28.832Z',
          isAvailable: false,
        },
      },
    ];

    testCases.forEach(({ oldAvailability, newAvailability }) => {
      expect(availabilityHasChanged(oldAvailability, newAvailability)).toEqual(false);
    });
  });

  it('detects when availability data was deleted', () => {
    const testCases = [
      {
        oldAvailability: {
          lastUpdated: '2020-10-19T16:01:28.832Z',
          startDate: '2020-10-19T16:01:28.832Z',
          endDate: '2020-10-26T16:01:28.832Z',
          isAvailable: false,
        },
        newAvailability: undefined,
      },
    ];

    testCases.forEach(({ oldAvailability, newAvailability }) => {
      expect(availabilityHasChanged(oldAvailability, newAvailability)).toEqual(false);
    });
  });

  it('detects when availability data is added for the first time', () => {
    const testCases = [
      {
        oldAvailability: undefined,
        newAvailability: {
          lastUpdated: '2020-10-19T16:01:28.832Z',
          startDate: '2020-10-19T16:01:28.832Z',
          endDate: '2020-10-26T16:01:28.832Z',
          isAvailable: false,
        },
      },
    ];

    testCases.forEach(({ oldAvailability, newAvailability }) => {
      expect(availabilityHasChanged(oldAvailability, newAvailability)).toEqual(true);
    });
  });

  it('ignores changes to items with no availability data before and after the change', () => {
    const testCases = [
      {
        oldAvailability: undefined,
        newAvailability: undefined,
      },
    ];

    testCases.forEach(({ oldAvailability, newAvailability }) => {
      expect(availabilityHasChanged(oldAvailability, newAvailability)).toEqual(false);
    });
  });
});
