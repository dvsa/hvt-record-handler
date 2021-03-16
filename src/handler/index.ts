import 'dotenv/config';

import { AttributeMap } from 'aws-sdk/clients/dynamodb';
import AWS from 'aws-sdk';
import type { Context, DynamoDBStreamEvent } from 'aws-lambda';
import { availabilityHasChanged, extractAvailabilityData } from '../lib/availability';
import handle from '../util/handle-await-error';
import { createLogger, Logger } from '../util/logger';
import { AvailabilityChangeData, MessageType, PublishMessageParams } from '../types';
import { publishMessages } from '../lib/publisher';

export const handler = async (event: DynamoDBStreamEvent, context: Context): Promise<void> => {
  const logger: Logger = createLogger(null, context);
  logger.info('Publish to SNS lambda triggered.');
  // Loop through each record
  const records = event.Records;
  const availabilityHistoryMessages: AttributeMap[] = [];
  const emailMessages: AttributeMap[] = [];
  logger.info(`Received ${records.length} records from DynamoDB.`);
  records.forEach((record) => {
    // Discard INSERT and REMOVE events
    if (record.eventName !== 'MODIFY') {
      logger.info(`Discarding ${record.eventName} event.`);
      return;
    }

    logger.debug(`Processing record: ${JSON.stringify(record)}`);

    // Extract data from event
    let availabilityData: AvailabilityChangeData;
    const oldImage: AttributeMap = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.OldImage);
    const newImage: AttributeMap = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);
    try {
      availabilityData = extractAvailabilityData(oldImage, newImage);
    } catch (err2) {
      logger.error((err2 as Error).message);
      return; // skip to next record
    }
    const { oldAvailability, newAvailability } = availabilityData;

    if (availabilityHasChanged(oldAvailability, newAvailability)) {
      availabilityHistoryMessages.push(oldImage);
      emailMessages.push(newImage);
    }
  });
  const publishEmailParams: PublishMessageParams = {
    messages: emailMessages,
    messageType: MessageType.Email,
  };
  const publishAvailabilityHistoryParams: PublishMessageParams = {
    messages: availabilityHistoryMessages,
    messageType: MessageType.AvailabilityHistory,
  };
  const [[publishEmailMessagesError], [publishAvailabilityHistoryMessagesError]] = await Promise.all([
    handle(publishMessages(publishEmailParams, logger)),
    handle(publishMessages(publishAvailabilityHistoryParams, logger)),
  ]);
  if (publishEmailMessagesError) {
    logger.error(`Error while publishing email message(s): ${publishEmailMessagesError.message}`);
    throw publishEmailMessagesError;
  }
  if (publishAvailabilityHistoryMessagesError) {
    logger.error(`Error while publishing availability history message(s): ${publishAvailabilityHistoryMessagesError.message}`);
    throw publishAvailabilityHistoryMessagesError;
  }

  logger.info('Publish to SNS lambda done.');
};
