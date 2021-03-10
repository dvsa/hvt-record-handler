import AWS from 'aws-sdk';
import { Template } from 'nunjucks';

import { getEmailTemplates, getEmailTemplate } from '../../src/lib/get-email-template';

jest.unmock('../../src/lib/get-email-template');
jest.unmock('nunjucks'); // Jest's automock doesn't seem to work with this module

describe('getEmailTemplates()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => jest.restoreAllMocks);

  it('downloads both the "available" and the "fully booked" templates', async () => {
    const awsRegion = 'some-aws-region';
    const endpoint = 'some-endpoint';
    const forcePathStyle = true;
    const bucket = 'some-bucket';
    const availableTemplate = 'some-available-template';
    const fullyBookedTemplate = 'some-fully-booked-template';

    const result = await getEmailTemplates({
      awsRegion,
      bucket,
      availableTemplate,
      fullyBookedTemplate,
      endpoint,
      forcePathStyle,
    });

    expect(AWS.S3).toHaveBeenCalledTimes(1);
    expect(AWS.S3).toHaveBeenCalledWith({
      region: awsRegion,
      apiVersion: '2006-03-01',
      endpoint,
      s3ForcePathStyle: forcePathStyle,
    });
    expect(result).toHaveProperty('availableTemplate');
    expect(result.availableTemplate).toBeInstanceOf(Template);
    expect(result).toHaveProperty('fullyBookedTemplate');
    expect(result.fullyBookedTemplate).toBeInstanceOf(Template);
  });
});

const expectedTemplate = 'some template';

const getObjectMock = jest.fn(() => ({
  promise: jest.fn(() => ({
    Body: Buffer.from(expectedTemplate),
  })),
}));

jest.mock('aws-sdk', () => ({
  __esModule: true,
  default: {
    S3: jest.fn().mockImplementation(() => ({
      getObject: getObjectMock,
    })),
  },
}));

describe('getEmailTemplate()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches the email template from the correct S3 bucket and object', async () => {
    const s3 = new AWS.S3();
    const bucket = 'dummyBucket';
    const templateName = 'dummyKey';
    const template = await getEmailTemplate({
      s3,
      bucket,
      template: templateName,
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(s3.getObject).toHaveBeenCalledTimes(1);
    expect(getObjectMock).toHaveBeenCalledTimes(1);
    expect(getObjectMock).toHaveBeenCalledWith({
      Bucket: bucket,
      Key: templateName,
    });
    expect(template).toEqual(expectedTemplate);
  });
});
