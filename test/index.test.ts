import * as core from '@actions/core';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { mockClient } from 'aws-sdk-client-mock';

// Mock the AWS SDK
const snsMock = mockClient(SNSClient);

// Mock the @actions/core module
jest.mock('@actions/core');

// Mock the @actions/github module
jest.mock('@actions/github', () => ({
  context: {
    payload: {
      repository: {
        owner: {
          login: 'testowner',
        },
        name: 'testrepo',
      },
      head_commit: {
        message: 'Test commit message',
      },
    },
    eventName: 'pull_request',
    sha: 'testsha',
    ref: 'refs/heads/main',
  },
}));

// Import the function to test
import { run } from '../src/index';

describe('SNS Publish Action', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    snsMock.reset();

    // Mock the input values
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

  it('should publish a message to SNS successfully', async () => {
    // Mock the SNS publish response
    snsMock.on(PublishCommand).resolves({
      MessageId: '12345678-1234-1234-1234-123456789012',
    });

    await run();

    // Verify that the SNS client was called with the correct parameters
    expect(snsMock.calls()).toHaveLength(1);
    const publishCall = snsMock.calls()[0];
    expect(publishCall.args[0].input).toEqual({
      TopicArn: 'arn:aws:sns:us-east-2:123456789012:MyTopic',
      Message: JSON.stringify({
        eventName: 'pull_request',
        sha: 'testsha',
        ref: 'refs/heads/main',
        owner: 'testowner',
        repo: 'testrepo',
        pullRequestNumber: undefined,
        pullRequestTitle: undefined,
        commitMessage: 'Test commit message',
      }),
      Subject: 'GitHub pull_request Notification',
    });

    // Verify that the output was set correctly
    expect(core.setOutput).toHaveBeenCalledWith(
      'notificationId',
      '12345678-1234-1234-1234-123456789012',
    );

    // Verify that a success message was logged
    expect(core.info).toHaveBeenCalledWith(
      'Message published with ID: 12345678-1234-1234-1234-123456789012',
    );
  });

  it('should handle errors when publishing fails', async () => {
    // Mock an error response from SNS
    snsMock.on(PublishCommand).rejects(new Error('SNS publish failed'));

    await run();

    // Verify that the error was logged
    expect(core.setFailed).toHaveBeenCalledWith('SNS publish failed');
  });

  it('should handle missing MessageId in the response', async () => {
    // Mock a response without MessageId
    snsMock.on(PublishCommand).resolves({});

    await run();

    // Verify that the error was logged
    expect(core.setFailed).toHaveBeenCalledWith(
      'Failed to get MessageId from SNS publish response',
    );
  });
});
