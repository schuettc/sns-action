import * as core from '@actions/core';
import { SNSClient } from '@aws-sdk/client-sns';
import { mockClient } from 'aws-sdk-client-mock';
import { run } from '../src/index';

// Mock the AWS SDK
const snsMock = mockClient(SNSClient);

// Mock the @actions/core module
jest.mock('@actions/core');

// Mock the @actions/github module
jest.mock('@actions/github', () => ({
  context: {
    eventName: 'pull_request',
    payload: {
      pull_request: {},
      repository: {
        owner: {
          login: 'testowner',
        },
        name: 'testrepo',
      },
    },
  },
}));

describe('SNS Publish Action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    snsMock.reset();
    (core.getInput as jest.Mock).mockImplementation((name: string) => {
      switch (name) {
        case 'topicArn':
          return 'arn:aws:sns:us-east-2:123456789012:MyTopic';
        case 'region':
          return 'us-east-2';
        default:
          return '';
      }
    });
  });

  it('should run without throwing an error', async () => {
    await expect(run()).resolves.not.toThrow();
  });
});
