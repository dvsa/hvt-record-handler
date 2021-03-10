interface Config {
  awsRegion: string,
  emailTemplateS3Endpoint?: string,
  emailTemplateS3EndpointForcePathStyle?: boolean,
  emailTemplateS3Bucket: string,
  availableEmailTemplateS3Object: string,
  fullyBookedEmailTemplateS3Object: string,
  queueUrl: string,
  emailLinkBaseUrl: string,
  nodeEnv: string,
  templateId: string,
}

export const getConfig = (): Config => {
  [
    'AWS_DEFAULT_REGION',
    'EMAIL_TEMPLATE_S3_BUCKET',
    'AVAILABLE_EMAIL_TEMPLATE_S3_OBJECT',
    'FULLY_BOOKED_EMAIL_TEMPLATE_S3_OBJECT',
    'SQS_QUEUE_URL',
    'EMAIL_LINK_BASE_URL',
    'NODE_ENV',
    'NOTIFY_TEMPLATE_ID',
  ].forEach((envVar) => {
    if (!process.env[`${envVar}`]) {
      throw new Error(`Environment variable ${envVar} seems to be missing.`);
    }
  });
  return {
    awsRegion: process.env.AWS_DEFAULT_REGION,
    emailTemplateS3Endpoint: process.env.EMAIL_TEMPLATE_S3_ENDPOINT,
    emailTemplateS3EndpointForcePathStyle: process.env.EMAIL_TEMPLATE_S3_ENDPOINT_FORCE_PATH_STYLE === 'true',
    emailTemplateS3Bucket: process.env.EMAIL_TEMPLATE_S3_BUCKET,
    availableEmailTemplateS3Object: process.env.AVAILABLE_EMAIL_TEMPLATE_S3_OBJECT,
    fullyBookedEmailTemplateS3Object: process.env.FULLY_BOOKED_EMAIL_TEMPLATE_S3_OBJECT,
    queueUrl: process.env.SQS_QUEUE_URL,
    emailLinkBaseUrl: process.env.EMAIL_LINK_BASE_URL,
    nodeEnv: process.env.NODE_ENV,
    templateId: process.env.NOTIFY_TEMPLATE_ID,
  };
};
