interface Config {
  awsRegion: string,
  queueUrl: string,
  nodeEnv: string,
  templateId: string,
}

export const getConfig = (): Config => {
  [
    'AWS_DEFAULT_REGION',
    'SQS_QUEUE_URL',
    'NODE_ENV',
    'NOTIFY_TEMPLATE_ID',
  ].forEach((envVar) => {
    if (!process.env[`${envVar}`]) {
      throw new Error(`Environment variable ${envVar} seems to be missing.`);
    }
  });
  return {
    awsRegion: process.env.AWS_DEFAULT_REGION,
    queueUrl: process.env.SQS_QUEUE_URL,
    nodeEnv: process.env.NODE_ENV,
    templateId: process.env.NOTIFY_TEMPLATE_ID,
  };
};
