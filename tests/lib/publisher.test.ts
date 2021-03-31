import { AttributeMap, Converter } from 'aws-sdk/clients/dynamodb';
import { publishMessages } from '../../src/lib/publisher';
import { MessageType } from '../../src/types';
import { Logger } from '../../src/util/logger';
import * as snsService from '../../src/service/sns.service';

jest.mock('../../src/lib/config', () => ({
  getConfig: jest.fn().mockReturnValue({
    emailSnsTopicArn: 'test',
    availabilityHistorySnsTopicArn: 'test',
  }),
}));

describe('Publisher unit tests', () => {
  describe('publishMessages() tests', () => {
    const loggerInfoSpy = jest.fn();
    const loggerWarnSpy = jest.fn();
    const loggerErrorSpy = jest.fn();
    let publishMock: jest.SpyInstance;
    const atfOneId = 'atf1';
    let messageOne: AttributeMap = { id: { S: atfOneId } };
    messageOne = Converter.unmarshall(messageOne);
    const atfTwoId = 'atf2';
    let messageTwo: AttributeMap = { id: { S: atfTwoId } };
    messageTwo = Converter.unmarshall(messageTwo);

    const loggerMock = <Logger> <unknown> {
      info: loggerInfoSpy,
      warn: loggerWarnSpy,
      error: loggerErrorSpy
    };
    beforeEach(() => {
      publishMock = jest.spyOn(snsService, 'publish');
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should log all messages published successfully if no failures occur', async () => {
      const publishMessagesParams = {
        messages: [messageOne, messageTwo],
        messageType: MessageType.Email,
      };
      const firstSuccessResult = { atfId: messageOne.id, result: 'success' };
      const secondSuccessResult = { atfId: messageTwo.id, result: 'success' };
      publishMock.mockImplementationOnce(jest.fn(() => Promise.resolve(firstSuccessResult)));
      publishMock.mockImplementationOnce(jest.fn(() => Promise.resolve(secondSuccessResult)));

      await publishMessages(publishMessagesParams, loggerMock);
      expect(loggerInfoSpy).toHaveBeenCalledTimes(2);
      expect(loggerInfoSpy).nthCalledWith(1, `All ${MessageType.Email.toString()} messages published successfully.`);
      expect(loggerInfoSpy).nthCalledWith(2, `${MessageType.Email.toString()} messages processed: 2, successful: 2, failed: 0.`);
      expect(loggerWarnSpy).not.toBeCalled();
    });

    test('should log any ATF IDs that failed to publish', async () => {
      const publishMessagesParams = {
        messages: [messageOne, messageTwo],
        messageType: MessageType.AvailabilityHistory,
      };
      const firstFailureResult = 'invalid credentials';
      const secondFailureResult = 'network failed';
      publishMock.mockImplementationOnce(jest.fn(() => Promise.reject(firstFailureResult)));
      publishMock.mockImplementationOnce(jest.fn(() => Promise.reject(secondFailureResult)));

      await publishMessages(publishMessagesParams, loggerMock);
      expect(loggerInfoSpy).toHaveBeenCalledTimes(1);
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
      expect(loggerInfoSpy).toBeCalledWith(`${MessageType.AvailabilityHistory.toString()} messages processed: 2, successful: 0, failed: 2.`);
      expect(loggerErrorSpy).toBeCalledWith(`Could not publish ${MessageType.AvailabilityHistory.toString()} messages for the following ATFs: ${atfOneId} - ${firstFailureResult}, ${atfTwoId} - ${secondFailureResult}`);
    });
  });
});
