import AWS from 'aws-sdk';
import nunjucks, { Template } from 'nunjucks';

interface EmailTemplates {
  availableTemplate: Template,
  fullyBookedTemplate: Template,
}

interface GetTemplatesParams {
  awsRegion: string,
  bucket: string,
  availableTemplate: string,
  fullyBookedTemplate: string,
  endpoint?: string,
  forcePathStyle?: boolean,
}

export const getEmailTemplates = async (params: GetTemplatesParams): Promise<EmailTemplates> => {
  const s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    region: params.awsRegion,
    endpoint: params.endpoint,
    s3ForcePathStyle: params.forcePathStyle,
  });
  const results = await Promise.all([
    getEmailTemplate({
      s3,
      bucket: params.bucket,
      template: params.availableTemplate,
    }),
    getEmailTemplate({
      s3,
      bucket: params.bucket,
      template: params.fullyBookedTemplate,
    }),
  ]);
  return {
    availableTemplate: nunjucks.compile(results[0]),
    fullyBookedTemplate: nunjucks.compile(results[1]),
  };
};

interface GetEmailTemplateParams {
  s3: AWS.S3,
  bucket: string,
  template: string,
}

export const getEmailTemplate = async (params: GetEmailTemplateParams): Promise<string> => {
  const getObjectParams = {
    Bucket: params.bucket,
    Key: params.template,
  };
  const data = await params.s3.getObject(getObjectParams).promise();
  return data.Body.toString('utf8');
};
