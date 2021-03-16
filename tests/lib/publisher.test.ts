import { publishMessages } from '../../src/lib/publisher';
import { MessageType } from '../../src/types';
import * as logger from '../../src/util/logger';
import * as snsService from '../../src/service/sns.service';

const { createLogger } = logger as jest.Mocked<typeof logger>;
const { sns } = snsService as jest.Mocked<typeof snsService>;

describe('Publisher unit tests', () => {
  describe('publishMessages() tests', () => {
    let publishMock;
    let loggerSpy;
    const publishMessagesParams = {
      messages: [],
      messageType: MessageType.Email,
    };
    const loggerInfoSpy = jest.fn();
    const loggerWarnSpy = jest.fn();

    beforeEach(() => {
      publishMock = jest.spyOn(sns, 'publish').mockImplementation(jest.fn());
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
    });
  });
});