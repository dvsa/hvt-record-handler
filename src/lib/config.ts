interface Config {
  awsRegion: string,
  awsEndpoint: string,
  emailSnsTopicArn: string,
  availabilityHistorySnsTopicArn: string,
  nodeEnv: string,
}

export const getConfig = (): Config => {
  [
    'AWS_DEFAULT_REGION',
    'AWS_DEFAULT_ENDPOINT',
    'EMAIL_SNS_TOPIC_ARN',
    'AVAILABILITY_HISTORY_SNS_TOPIC_ARN',
    'NODE_ENV',
  ].forEach((envVar) => {
    if (!process.env[`${envVar}`]) {
      throw new Error(`Environment variable ${envVar} seems to be missing.`);
    }
  });
  return {
    awsRegion: process.env.AWS_DEFAULT_REGION,
    awsEndpoint: process.env.AWS_DEFAULT_ENDPOINT,
    emailSnsTopicArn: process.env.EMAIL_SNS_TOPIC_ARN,
    availabilityHistorySnsTopicArn: process.env.AVAILABILITY_HISTORY_SNS_TOPIC_ARN,
    nodeEnv: process.env.NODE_ENV,
  };
};
