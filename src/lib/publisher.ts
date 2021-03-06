import { AttributeMap } from 'aws-sdk/clients/dynamodb';
import SNS from 'aws-sdk/clients/sns';
import * as snsService from '../service/sns.service';
import { Logger } from '../util/logger';
import { MessageType, PublishMessageParams } from '../types';
import { getConfig } from './config';
import { AWSError } from 'aws-sdk';

const config = getConfig();

export const publishMessages = async (params: PublishMessageParams, logger: Logger): Promise<void> => {
  const { messages, messageType } = params;

  const promises = messages.map((message) => snsService.publish(getTopicParams(message, messageType))
    .then(() => ({ atfId: message.id, result: 'success' , message: ''}))
    .catch((err: string) => ({ atfId: message.id, result: 'failure', message: err})));

  const results = await Promise.all(promises);

  const successful = results.filter((job) => job.result === 'success').map(({ atfId }) => atfId);
  const failed = results.filter((job) => job.result === 'failure').map(({ atfId, message }) => `${atfId} - ${message}`);

  if (promises.length === successful.length) {
    logger.info(`All ${messageType} messages published successfully.`);
  } else {
    logger.error(`Could not publish ${messageType} messages for the following ATFs: ${failed.join(', ')}`);
  }
  logger.info(`${messageType} messages processed: ${promises.length}, successful: ${successful.length}, failed: ${failed.length}.`);
};

const getTopicParams = (message: AttributeMap, messageType: MessageType): SNS.Types.PublishInput => {
  return {
    Subject: `New ${messageType} message sent to SNS`,
    Message: JSON.stringify(message),
    TopicArn: getTopicArn(messageType),
  };
};

const getTopicArn = (messageType: MessageType): string => {
  switch (messageType) {
    case MessageType.Email:
      return config.emailSnsTopicArn;
    case MessageType.AvailabilityHistory:
      return config.availabilityHistorySnsTopicArn;
    default:
      return config.emailSnsTopicArn;
  }
};
