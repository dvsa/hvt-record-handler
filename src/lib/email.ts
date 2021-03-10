import qs from 'querystring';
import AWS from 'aws-sdk';
import { format, localeFormat } from 'light-date';
import { Logger } from '../util/logger';
import { BuildEmailBodyParams } from '../types';
import buildEmailSubject from '../util/build-email-subject';

export const buildEmailBody = (params: BuildEmailBodyParams): string => {
  const { availability } = params;

  const template = availability.isAvailable
    ? params.availableTemplate
    : params.fullyBookedTemplate;
  const linkTemplateTag = availability.isAvailable
    ? 'link'
    : 'link';
  const tokenKey = availability.isAvailable ? 'no' : 'yes';
  // eslint-disable-next-line security/detect-object-injection
  const link = `${params.emailLinkBaseUrl}/update?${qs.stringify({ token: params.token })}`;

  const startDate = new Date(availability.startDate);
  const endDate = new Date(availability.endDate);

  return template.render({
    atf_name: params.atfName,
    additional_open_date_start: format(startDate, `{dd} ${localeFormat(startDate, '{MMMM}')} {yyyy}`),
    additional_open_date_end: format(endDate, `{dd} ${localeFormat(endDate, '{MMMM}')} {yyyy}`),
    [linkTemplateTag]: link,
  });
};

interface BuildSQSMessageParams {
  queueUrl: string,
  atfId: string,
  atfEmail: string,
  templateValues: BuildEmailBodyParams,
  templateId: string
}

export interface EmailMessageRequest {
  atfId: string,
  message: AWS.SQS.SendMessageRequest,
}

export const buildSQSMessage = (params: BuildSQSMessageParams): EmailMessageRequest => {
  const emailBody = buildEmailBody(params.templateValues);
  return {
    atfId: params.atfId,
    message: {
      QueueUrl: params.queueUrl,
      MessageBody: emailBody,
      MessageAttributes: {
        templateId: {
          DataType: 'String',
          StringValue: params.templateId,
        },
        messageType: {
          DataType: 'String',
          StringValue: 'email',
        },
        recipient: {
          DataType: 'String',
          StringValue: params.atfEmail,
        },
        subject: {
          DataType: 'String',
          StringValue: buildEmailSubject(params.templateValues),
        },
      },
    },
  };
};

interface EnqueueEmailMessagesRequestParams {
  emailMessages: EmailMessageRequest[],
  awsRegion: string,
  logger: Logger,
}

export const enqueueEmailMessages = async (params: EnqueueEmailMessagesRequestParams): Promise<void> => {
  const { emailMessages, awsRegion, logger } = params;
  const sqs = new AWS.SQS({
    region: awsRegion,
    apiVersion: '2012-11-05',
  });

  const promises = emailMessages.map((req) => sqs.sendMessage(req.message).promise()
    .then(() => ({ atfId: req.atfId, result: 'success' }))
    .catch(() => ({ atfId: req.atfId, result: 'failure' })));

  const results = await Promise.all(promises);

  const successful = results.filter((job) => job.result === 'success').map(({ atfId }) => atfId);
  const failed = results.filter((job) => job.result === 'failure').map(({ atfId }) => atfId);

  if (promises.length === successful.length) {
    logger.info('All emails enqueued successfully.');
  } else {
    logger.warn(`Could not enqueue emails for the following ATFs: ${failed.join(', ')}`);
  }
  logger.info(`Messages processed: ${promises.length}, successful: ${successful.length}, failed: ${failed.length}.`);
};
