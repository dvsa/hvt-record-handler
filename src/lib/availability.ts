import AWS from 'aws-sdk';
import type { DynamoDBRecord } from 'aws-lambda';
import deepEqual from 'deep-equal';
import Joi from 'joi';

import { Availability, AvailabilityChangeData } from '../types';

const atfSchema = Joi.object({
  id: Joi.string().uuid().required(),
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  token: Joi.string().required(),
}).unknown(true);

const availabilitySchema = Joi.object({
  lastUpdated: Joi.date().iso().required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
  isAvailable: Joi.boolean().required(),
});

export const extractAvailabilityData = (record: DynamoDBRecord): AvailabilityChangeData => {
  const oldImage = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.OldImage);
  const newImage = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);

  const newImageValResult = atfSchema.validate(newImage);
  if (newImageValResult.error || newImageValResult.errors) {
    throw new Error(`Malformed record: ${JSON.stringify(newImage)}`);
  }

  const {
    id, name, email, token, availability: newAvailability,
  } = newImage;
  const { availability: oldAvailability } = oldImage;
  const newAvailabilityValResult = availabilitySchema.validate(newAvailability);
  if (newAvailabilityValResult.error || newAvailabilityValResult.errors) {
    throw new Error(`Malformed "availability" field in: ${JSON.stringify(newImage)}`);
  }

  return {
    id: id as string,
    name: name as string,
    email: email as string,
    token: token as string,
    oldAvailability: oldAvailability as Availability,
    newAvailability: newImage.availability as Availability,
  };
};

export const availabilityHasChanged = (
  oldAvailability: Availability | void,
  newAvailability: Availability | void,
): boolean => {
  // This addresses the edge case where availability data was deleted. In this case we cannot rely
  // on the deep equality check only.
  // See discussion here: https://gitlab.motdev.org.uk/hvtesting/hvt-email/merge_requests/1#note_134209
  if (oldAvailability && !newAvailability) {
    return false;
  }
  return !deepEqual(oldAvailability, newAvailability, { strict: true });
};
