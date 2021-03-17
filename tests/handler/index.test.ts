import type { Context, DynamoDBStreamEvent } from 'aws-lambda';
import * as logger from '../../src/util/logger';
import * as availability from '../../src/lib/availability';
import * as publisher from '../../src/lib/publisher';
import { handler } from '../../src/handler';
import validEvent from '../mocks/dynamodb-stream-event.json';

jest.mock('../../src/lib/publisher', () => ({
  publishMessages: jest.fn(),
}));
jest.mock('../../src/lib/availability', () => ({
  extractAvailabilityData: jest.fn(),
  availabilityHasChanged: jest.fn(),
}));
jest.mock('aws-sdk');

describe('Record handler lambda index tests', () => {
  let eventMock: DynamoDBStreamEvent;
  let contextMock: Context;
  beforeAll(() => {
    eventMock = <DynamoDBStreamEvent> <unknown> {
      Records: [validEvent],
    };
    contextMock = <Context> {};

    jest.spyOn(logger, 'createLogger').mockReturnValue(<logger.Logger> <unknown> {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should not publish to the email topic if availability has not changed', async () => {
    // mock extract availability
    // mock has avail changed
    // mock publish methods
    jest.spyOn(availability, 'extractAvailabilityData').mockImplementation(jest.fn());
    jest.spyOn(availability, 'availabilityHasChanged').mockReturnValue(true);
    const publisherSpy = jest.spyOn(publisher, 'publishMessages').mockImplementation(jest.fn());

    await handler(eventMock, contextMock);
    expect(publisherSpy).toHaveBeenCalledTimes(2);
  });
});
