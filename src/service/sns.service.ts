import type { AWSError, Request } from 'aws-sdk';
import SNS, { PublishResponse } from 'aws-sdk/clients/sns';
import { getConfig } from '../lib/config';

const config = getConfig();

// eslint-disable-next-line @typescript-eslint/require-await
export const publish = async (params: SNS.Types.PublishInput): Promise<Request<PublishResponse, AWSError>> => {
  const snsClient = new SNS({ region: config.awsRegion });
  return snsClient.publish(params);
};
