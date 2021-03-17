import { AttributeMap } from 'aws-sdk/clients/dynamodb';
import { publishMessages } from '../../src/lib/publisher';
import { MessageType } from '../../src/types';
import * as logger from '../../src/util/logger';
import * as snsService from '../../src/service/sns.service';

const { createLogger } = logger as jest.Mocked<typeof logger>;
jest.mock('../../src/service/sns.service', () => ({
  publish: jest.fn(),
}));

describe('Publisher unit tests', () => {
  describe('publishMessages() tests', () => {
    let publishMock;
    let loggerSpy;
    const message: AttributeMap = { atfId: { S: 'atf1' } };
    const publishMessagesParams = {
      messages: [message],
      messageType: MessageType.Email,
    };
    const loggerInfoSpy = jest.fn();
    const loggerWarnSpy = jest.fn();

    beforeEach(() => {
      // publishMock = jest.spyOn(snsService, 'publish').mockImplementation(jest.fn(() => Promise.resolve(expect.anything())));
      // publishMock = jest.spyOn(snsService, 'publish').mockResolvedValue(expect.anything());
      // publish.mockImplementation(jest.fn(() => Promise.resolve(expect.anything())));
      createLogger.mockImplementation(jest.fn().mockReturnValue({
        info: loggerInfoSpy,
        warn: loggerWarnSpy,
      }));
      loggerSpy = createLogger(expect.anything(), expect.anything());
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('should log all messages published successfully if no failures occur', async () => {
      await publishMessages(publishMessagesParams, loggerSpy);
      expect(loggerInfoSpy).toHaveBeenCalledTimes(2);
      expect(loggerInfoSpy).nthCalledWith(1, `All ${MessageType.Email.toString()} messages published successfully.`);
      expect(loggerWarnSpy).not.toBeCalled();
    });

    test('should log any ATF IDs that failed to publish', async () => {
      await publishMessages(publishMessagesParams, loggerSpy);
      expect(loggerInfoSpy).toHaveBeenCalledTimes(2);
      expect(loggerWarnSpy).nthCalledWith(1, 'Could not publish Email messages for the following ATFs: ');
    });
  });
});
