import { AttributeMap } from 'aws-sdk/clients/dynamodb';
import * as snsService from '../service/sns.service';
import { Logger } from '../util/logger';
import { MessageType, PublishMessageParams } from '../types';

const emailTopic = process.env.EMAIL_SNS_TOPIC_ARN;
const availabilityHistoryTopic = process.env.AVAILABILITY_HISTORY_SNS_TOPIC_ARN;

export const publishMessages = async (params: PublishMessageParams, logger: Logger): Promise<void> => {
  const { messages, messageType } = params;
  logger.info(`Dee: ${JSON.stringify(messages)}`);

  const promises = messages.map((message) => snsService.publish(getTopicParams(message, messageType))
    .then(() => ({ atfId: message.atfId, result: 'success' }))
    .catch(() => ({ atfId: message.atfId, result: 'failure' })));

  const results = await Promise.all(promises);

  const successful = results.filter((job) => job.result === 'success').map(({ atfId }) => atfId);
  const failed = results.filter((job) => job.result === 'failure').map(({ atfId }) => atfId);

  if (promises.length === successful.length) {
    logger.info(`All ${messageType} messages published successfully.`);
  } else {
    logger.warn(`Could not publish ${messageType} messages for the following ATFs: ${failed.join(', ')}`);
  }
  logger.info(`${messageType} messages processed: ${promises.length}, successful: ${successful.length}, failed: ${failed.length}.`);
};

const getTopicParams = (message: AttributeMap, messageType: MessageType) => {
  return {
    Subject: `New ${messageType} message sent to SNS`,
    Message: JSON.stringify(message),
    TopicArn: getTopicArn(messageType),
  };
};

const getTopicArn = (messageType: MessageType) => {
  switch (messageType) {
    case MessageType.Email:
      return emailTopic;
    case MessageType.AvailabilityHistory:
      return availabilityHistoryTopic;
    default:
      return emailTopic;
  }
};
