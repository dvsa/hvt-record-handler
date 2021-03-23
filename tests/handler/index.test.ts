import type { Context, DynamoDBStreamEvent } from 'aws-lambda';
import { Converter } from 'aws-sdk/clients/dynamodb';
import * as logger from '../../src/util/logger';
import * as availability from '../../src/lib/availability';
import * as publisher from '../../src/lib/publisher';
import { handler } from '../../src/handler';
import { MessageType, PublishMessageParams } from '../../src/types';
import validEvent from '../mocks/dynamodb-stream-event.json';

jest.mock('../../src/lib/publisher', () => ({
  publishMessages: jest.fn(),
}));
jest.mock('../../src/lib/availability', () => ({
  extractAvailabilityData: jest.fn(),
  availabilityHasChanged: jest.fn(),
}));
jest.mock('aws-sdk', () => ({
  SNS: jest.fn(),
  DynamoDB: {
    Converter,
  },
}));

describe('Record handler lambda index tests', () => {
  let eventMock: DynamoDBStreamEvent;
  let contextMock: Context;
  let availabilityHistoryPublishParams: PublishMessageParams;
  let emailPublishParams: PublishMessageParams;
  let extractAvailabilityDataSpy: jest.SpyInstance;
  const loggerInfoSpy = jest.fn();
  const loggerErrorSpy = jest.fn();
  const availabilityData = {
    id: 'id',
    name: 'name',
    email: 'email',
    token: 'token',
  };

  beforeAll(() => {
    contextMock = <Context> {};

    jest.spyOn(logger, 'createLogger').mockReturnValue(<logger.Logger> <unknown> {
      debug: jest.fn(),
      info: loggerInfoSpy,
      warn: jest.fn(),
      error: loggerErrorSpy,
    });

    extractAvailabilityDataSpy = jest.spyOn(availability, 'extractAvailabilityData');
  });

  beforeEach(() => {
    eventMock = <DynamoDBStreamEvent> <unknown> {
      Records: [validEvent],
    };

    availabilityHistoryPublishParams = {
      messages: [Converter.unmarshall(eventMock.Records[0].dynamodb.OldImage)],
      messageType: MessageType.AvailabilityHistory,
    };

    emailPublishParams = {
      messages: [Converter.unmarshall(eventMock.Records[0].dynamodb.NewImage)],
      messageType: MessageType.Email,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should not publish to the email topic if availability has not changed', async () => {
    extractAvailabilityDataSpy.mockImplementation(jest.fn()).mockReturnValue(availabilityData);
    jest.spyOn(availability, 'availabilityHasChanged').mockReturnValue(false);
    const publisherSpy = jest.spyOn(publisher, 'publishMessages').mockResolvedValue();

    await handler(eventMock, contextMock);

    expect(publisherSpy).toBeCalledTimes(1);
    expect(publisherSpy).nthCalledWith(1, availabilityHistoryPublishParams, expect.anything());
  });

  test('should not publish to the email topic if extractAvailabilityData fails', async () => {
    const extractError = new Error('Extract error');
    extractAvailabilityDataSpy.mockImplementation(() => { throw extractError; });
    jest.spyOn(availability, 'availabilityHasChanged').mockReturnValue(true);
    const publisherSpy = jest.spyOn(publisher, 'publishMessages').mockResolvedValue();

    await handler(eventMock, contextMock);

    expect(loggerErrorSpy).toBeCalledWith(extractError.message);
    expect(publisherSpy).toBeCalledTimes(1);
    expect(publisherSpy).nthCalledWith(1, availabilityHistoryPublishParams, expect.anything());
  });

  test('should publish the OldImage to the availability history topic even if availability has not changed', async () => {
    extractAvailabilityDataSpy.mockImplementation(jest.fn()).mockReturnValue(availabilityData);
    jest.spyOn(availability, 'availabilityHasChanged').mockReturnValue(false);
    const publisherSpy = jest.spyOn(publisher, 'publishMessages').mockResolvedValue();

    await handler(eventMock, contextMock);

    expect(publisherSpy).toBeCalledWith(availabilityHistoryPublishParams, expect.anything());
  });

  test('should publish the NewImage to the email topic if availability has changed', async () => {
    extractAvailabilityDataSpy.mockImplementation(jest.fn()).mockReturnValue(availabilityData);
    jest.spyOn(availability, 'availabilityHasChanged').mockReturnValue(true);
    const publisherSpy = jest.spyOn(publisher, 'publishMessages').mockResolvedValue();

    await handler(eventMock, contextMock);

    expect(publisherSpy).toBeCalledTimes(2);
    expect(publisherSpy).nthCalledWith(1, emailPublishParams, expect.anything());
  });

  test('should not publish to the availability history topic if availability has changed', async () => {
    extractAvailabilityDataSpy.mockImplementation(jest.fn()).mockReturnValue(availabilityData);
    jest.spyOn(availability, 'availabilityHasChanged').mockReturnValue(true);
    const publisherSpy = jest.spyOn(publisher, 'publishMessages').mockResolvedValue();

    await handler(eventMock, contextMock);

    expect(publisherSpy).toBeCalledTimes(2);
    expect(publisherSpy).nthCalledWith(2, availabilityHistoryPublishParams, expect.anything());
  });

  test('should not publish to any topics if the event type is INSERT', async () => {
    extractAvailabilityDataSpy.mockImplementation(jest.fn()).mockReturnValue(availabilityData);
    const availabilityHasChangedSpy = jest.spyOn(availability, 'availabilityHasChanged').mockReturnValue(true);
    const publisherSpy = jest.spyOn(publisher, 'publishMessages').mockResolvedValue();
    eventMock.Records[0].eventName = 'INSERT';

    await handler(eventMock, contextMock);

    expect(publisherSpy).not.toBeCalled();
    expect(extractAvailabilityDataSpy).not.toBeCalled();
    expect(availabilityHasChangedSpy).not.toBeCalled();
    expect(loggerInfoSpy).nthCalledWith(3, 'Discarding INSERT event.');
  });

  test('should not publish to any topics if the event type is REMOVE', async () => {
    extractAvailabilityDataSpy.mockImplementation(jest.fn()).mockReturnValue(availabilityData);
    const availabilityHasChangedSpy = jest.spyOn(availability, 'availabilityHasChanged').mockReturnValue(true);
    const publisherSpy = jest.spyOn(publisher, 'publishMessages').mockResolvedValue();
    eventMock.Records[0].eventName = 'REMOVE';

    await handler(eventMock, contextMock);

    expect(publisherSpy).not.toBeCalled();
    expect(extractAvailabilityDataSpy).not.toBeCalled();
    expect(availabilityHasChangedSpy).not.toBeCalled();
    expect(loggerInfoSpy).nthCalledWith(3, 'Discarding REMOVE event.');
  });

  test('should log the error and throw an error if publishing email messages fails', async () => {
    extractAvailabilityDataSpy.mockImplementation(jest.fn()).mockReturnValue(availabilityData);
    const publishErrorMessage = 'Email publish error';
    const error = new Error(publishErrorMessage);
    jest.spyOn(availability, 'availabilityHasChanged').mockReturnValue(true);
    const publisherSpy = jest.spyOn(publisher, 'publishMessages').mockRejectedValue(error);

    try {
      await handler(eventMock, contextMock);
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect(e).toHaveProperty('message', publishErrorMessage);
      expect(publisherSpy).toBeCalledTimes(1);
      expect(loggerErrorSpy).toBeCalledWith(`Error while publishing email message(s): ${publishErrorMessage}`);
    }
  });

  test('should log the error and throw an error if publishing availability history messages fails', async () => {
    extractAvailabilityDataSpy.mockImplementation(jest.fn()).mockReturnValue(availabilityData);
    const publishErrorMessage = 'Availability history publish error';
    const error = new Error(publishErrorMessage);
    jest.spyOn(availability, 'availabilityHasChanged').mockReturnValue(true);
    const publisherSpy = jest.spyOn(publisher, 'publishMessages')
      .mockResolvedValueOnce().mockRejectedValueOnce(error);

    try {
      await handler(eventMock, contextMock);
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect(e).toHaveProperty('message', publishErrorMessage);
      expect(publisherSpy).toBeCalledTimes(2);
      expect(loggerErrorSpy).toBeCalledWith(`Error while publishing availability history message(s): ${publishErrorMessage}`);
    }
  });
});
