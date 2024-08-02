import * as core from '@actions/core';
import * as github from '@actions/github';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

export async function run(): Promise<void> {
  try {
    // Get inputs
    const topicArn = core.getInput('topicArn', { required: true });
    const region = core.getInput('region', { required: true });

    // Extract relevant information from GitHub context
    const { payload, eventName, sha, ref } = github.context;
    const repo = payload.repository;
    const owner = repo?.owner?.login || '';
    const repoName = repo?.name || '';
    let pullRequestNumber: number | undefined;
    let pullRequestTitle: string | undefined;

    if (eventName === 'pull_request') {
      pullRequestNumber = payload.pull_request?.number;
      pullRequestTitle = payload.pull_request?.title;
    }

    // Create message object
    const messageObject = {
      eventName,
      sha,
      ref,
      owner,
      repo: repoName,
      pullRequestNumber,
      pullRequestTitle,
      commitMessage: payload.head_commit?.message || '',
    };

    // Create SNS client
    const client = new SNSClient({ region });

    // Prepare message parameters
    const params = {
      TopicArn: topicArn,
      Message: JSON.stringify(messageObject),
      Subject: `GitHub ${eventName} Notification`,
    };

    // Send message
    const command = new PublishCommand(params);
    const response = await client.send(command);

    // Set output
    if (response.MessageId) {
      core.setOutput('notificationId', response.MessageId);
      core.info(`Message published with ID: ${response.MessageId}`);
    } else {
      throw new Error('Failed to get MessageId from SNS publish response');
    }

    // Log GitHub context (optional, for debugging)
    core.debug(JSON.stringify(github.context, null, 2));
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}

// Only call run() if this file is being run directly
if (require.main === module) {
  void run();
}
