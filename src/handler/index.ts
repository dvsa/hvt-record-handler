import 'dotenv/config';
import type { Context, DynamoDBStreamEvent } from 'aws-lambda';

import { getConfig } from '../lib/config';
import { availabilityHasChanged, extractAvailabilityData } from '../lib/availability';
import { getEmailTemplates } from '../lib/get-email-template';
import { buildSQSMessage, enqueueEmailMessages, EmailMessageRequest } from '../lib/email';
import handle from '../util/handle-await-error';
import { createLogger, Logger } from '../util/logger';
import { AvailabilityChangeData } from '../types';

export const handler = async (event: DynamoDBStreamEvent, context: Context): Promise<void> => {
  const logger: Logger = createLogger(null, context);
  logger.info('Confirmation email lambda triggered.');

  const config = getConfig();

  // Fetch templates from S3
  logger.info('Fetching email templates from S3...');
  const [err, templates] = await handle(getEmailTemplates({
    awsRegion: config.awsRegion,
    bucket: config.emailTemplateS3Bucket,
    availableTemplate: config.availableEmailTemplateS3Object,
    fullyBookedTemplate: config.fullyBookedEmailTemplateS3Object,
    endpoint: config.emailTemplateS3Endpoint,
  }));
  if (err) {
    logger.error(`An error occurred while fetching the email templates from S3: ${err.message}`);
    throw err;
  }
  const { availableTemplate, fullyBookedTemplate } = templates;

  // Loop through each record
  const records = event.Records;
  const emailMessages: EmailMessageRequest[] = [];
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
    try {
      availabilityData = extractAvailabilityData(record);
    } catch (err2) {
      logger.error((err2 as Error).message);
      return; // skip to next record
    }
    const {
      oldAvailability,
      newAvailability,
    } = availabilityData;

    // Any changes we're actually concerned about?
    if (availabilityHasChanged(oldAvailability, newAvailability)) {
      const emailMessageRequest = buildSQSMessage({
        queueUrl: config.queueUrl,
        atfId: availabilityData.id,
        atfEmail: availabilityData.email,
        templateId: config.templateId,
        templateValues: {
          atfName: availabilityData.name,
          token: availabilityData.token,
          availableTemplate,
          fullyBookedTemplate,
          availability: newAvailability,
          emailLinkBaseUrl: config.emailLinkBaseUrl,
        },
      });
      emailMessages.push(emailMessageRequest);
    }
  });

  if (emailMessages.length) {
    const [err3] = await handle(enqueueEmailMessages({
      emailMessages,
      awsRegion: config.awsRegion,
      logger,
    }));
    if (err3) {
      logger.error(`Error while enqueueing email message(s): ${err3.message}`);
      throw err3;
    }
  }

  logger.info('Confirmation email lambda done.');
};
