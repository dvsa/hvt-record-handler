import { AWSError, SNS } from 'aws-sdk';
import { PromiseResult } from 'aws-sdk/lib/request';
import { getConfig } from '../lib/config';
import { Logger } from '../util/logger';

const config = getConfig();

// eslint-disable-next-line @typescript-eslint/require-await
export const publish = async (params: SNS.Types.PublishInput, logger: Logger): Promise<PromiseResult<SNS.PublishResponse, AWSError>> => {
  const snsClient = new SNS({ region: config.awsRegion });
  return snsClient.publish(params, (err, data) => {
    if (err) logger.error(`Error while publishing: ${err.message}`);
    else logger.info(`Publishing successful: ${data.toString()}`);
  }).promise();
};
