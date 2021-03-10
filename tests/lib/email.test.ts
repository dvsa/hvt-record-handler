import AWS from 'aws-sdk';
import type { Template } from 'nunjucks';
import {
  buildEmailBody, buildSQSMessage, EmailMessageRequest, enqueueEmailMessages,
} from '../../src/lib/email';
import buildEmailSubject from '../../src/util/build-email-subject';
import { Logger } from '../../src/util/logger';

jest.unmock('light-date');
jest.unmock('../../src/lib/email');

jest.mock('aws-sdk', () => {
  const sqsSendMessageMock = jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue(undefined),
  });
  return {
    __esDefault: true,
    sqsSendMessageMock,
    SQS: jest.fn().mockReturnValue({
      sendMessage: sqsSendMessageMock,
    }),
  };
});
const awsSdkModuleMock = AWS as jest.Mocked<typeof AWS> & { sqsSendMessageMock: jest.Mock<any, any> };

const atfId = 'some-atf-id';
const atfName = 'some-atf-name';
const atfEmail = 'some-atf-email';
const token = 'some-token';
const startDate = new Date(2020, 9, 21, 12, 0, 0).toISOString();
const endDate = new Date(2020, 9, 27, 12, 0, 0).toISOString();
const emailLinkBaseUrl = 'http://localhost';
const emailSubject = 'email-subject';

jest.mock('../../src/util/build-email-subject', () => jest.fn(() => emailSubject));

describe('buildEmailBody()', () => {
  const availableTemplateRender = jest.fn();
  const fullyBookedTemplateRender = jest.fn();
  const availableTemplate = {
    render: availableTemplateRender,
  } as Template;
  const fullyBookedTemplate = {
    render: fullyBookedTemplateRender,
  } as Template;

  afterEach(() => {
    availableTemplateRender.mockClear();
    fullyBookedTemplateRender.mockClear();
  });

  it('uses the "available" email template when the ATF can take more bookings', () => {
    const availability = {
      lastUpdated: startDate,
      startDate,
      endDate,
      isAvailable: true, // some availability
    };

    buildEmailBody({
      availableTemplate,
      fullyBookedTemplate,
      atfName,
      availability,
      token,
      emailLinkBaseUrl,
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(availableTemplate.render).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(availableTemplate.render).toHaveBeenCalledWith({
      atf_name: atfName,
      additional_open_date_start: '21 October 2020',
      additional_open_date_end: '27 October 2020',
      link: `${emailLinkBaseUrl}/update?token=${token}`,
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(fullyBookedTemplate.render).toHaveBeenCalledTimes(0);
  });

  it('uses the "fully booked" email template when the ATF cannot take more bookings', () => {
    const availability = {
      lastUpdated: startDate,
      startDate,
      endDate,
      isAvailable: false, // no availability
    };

    buildEmailBody({
      availableTemplate,
      fullyBookedTemplate,
      atfName,
      availability,
      token,
      emailLinkBaseUrl,
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(fullyBookedTemplate.render).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(fullyBookedTemplate.render).toHaveBeenCalledWith({
      atf_name: atfName,
      additional_open_date_start: '21 October 2020',
      additional_open_date_end: '27 October 2020',
      link: `${emailLinkBaseUrl}/update?token=${token}`,
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(availableTemplate.render).toHaveBeenCalledTimes(0);
  });
});

describe('buildSqsMessage()', () => {
  it('builds an SQS message as expected', () => {
    const queueUrl = 'some-queue-url';
    const emailBody = 'some-email-body';
    const templateId = '752d36a8-0fae-4177-80ad-20dd8bacc3e8';
    const availableTemplateRender = jest.fn().mockReturnValue(emailBody);
    const fullyBookedTemplateRender = jest.fn();
    const availableTemplate = {
      render: availableTemplateRender,
    } as Template;
    const fullyBookedTemplate = {
      render: fullyBookedTemplateRender,
    } as Template;
    const availability = {
      lastUpdated: startDate,
      startDate,
      endDate,
      isAvailable: true, // some availability
    };
    const templateValues = {
      atfName,
      token,
      availableTemplate,
      fullyBookedTemplate,
      availability,
      emailLinkBaseUrl,
    };

    const result = buildSQSMessage({
      queueUrl,
      atfId,
      atfEmail,
      templateId,
      templateValues,
    });

    expect(result).toEqual({
      atfId,
      message: {
        QueueUrl: queueUrl,
        MessageBody: emailBody,
        MessageAttributes: {
          templateId: {
            DataType: 'String',
            StringValue: '752d36a8-0fae-4177-80ad-20dd8bacc3e8',
          },
          messageType: {
            DataType: 'String',
            StringValue: 'email',
          },
          recipient: {
            DataType: 'String',
            StringValue: atfEmail,
          },
          subject: {
            DataType: 'String',
            StringValue: emailSubject,
          },
        },
      },
    });
    expect(buildEmailSubject).toHaveBeenCalledWith(templateValues);
  });
});

describe('enqueueEmailMessages()', () => {
  const awsRegion = 'some-aws-region';
  const loggerInfo = jest.fn();
  const loggerWarn = jest.fn();
  const logger = {
    info: loggerInfo,
    warn: loggerWarn,
  } as unknown as Logger;

  beforeEach(() => {
    loggerInfo.mockClear();
    loggerWarn.mockClear();
    awsSdkModuleMock.sqsSendMessageMock.mockClear();
  });

  afterAll(() => jest.restoreAllMocks);

  it('enqueues email messages', async () => {
    const emailMessages = [
      {
        atfId: '1',
        message: {
          MessageBody: '1',
        } as AWS.SQS.SendMessageRequest,
      } as EmailMessageRequest,
      {
        atfId: '2',
        message: {
          MessageBody: '2',
        } as AWS.SQS.SendMessageRequest,
      } as EmailMessageRequest,
    ];

    await enqueueEmailMessages({
      emailMessages,
      awsRegion,
      logger,
    });

    expect(awsSdkModuleMock.SQS).toHaveBeenCalledTimes(1);
    expect(awsSdkModuleMock.SQS).toHaveBeenCalledWith({
      region: awsRegion,
      apiVersion: '2012-11-05',
    });
    expect(awsSdkModuleMock.sqsSendMessageMock).toHaveBeenCalledTimes(emailMessages.length);
    emailMessages.forEach((message, i) => {
      expect(awsSdkModuleMock.sqsSendMessageMock.mock.calls[i]).toEqual([message.message]);
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.info).toHaveBeenCalledTimes(2);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(logger.warn).toHaveBeenCalledTimes(0);
  });
});
