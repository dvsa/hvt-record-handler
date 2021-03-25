import { AWSError, SNS } from 'aws-sdk';
import { PromiseResult } from 'aws-sdk/lib/request';
import { getConfig } from '../lib/config';

const config = getConfig();

// eslint-disable-next-line @typescript-eslint/require-await
export const publish = async (params: SNS.Types.PublishInput): Promise<PromiseResult<SNS.PublishResponse, AWSError>> => {
  const snsClient = new SNS({ region: config.awsRegion });
  return snsClient.publish(params).promise();
};
