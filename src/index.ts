import * as core from '@actions/core';
import * as github from '@actions/github';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

export async function run(): Promise<void> {
  try {
    const { eventName, payload } = github.context;

    if (eventName !== 'pull_request' && eventName !== 'push') {
      core.info(
        `Skipping event ${eventName}, only processing pull_request and push events`,
      );
      return;
    }

    // Get inputs
    const topicArn = core.getInput('topicArn', { required: true });
    const region = core.getInput('region', { required: true });

    let messageObject: any;

    if (eventName === 'pull_request') {
      const pullRequest = payload.pull_request;
      if (!pullRequest) {
        throw new Error(
          'Pull request data is missing from the webhook payload',
        );
      }

      const repo = payload.repository;
      const owner = repo?.owner?.login || '';
      const repoName = repo?.name || '';

      messageObject = {
        eventType: 'pull_request',
        action: payload.action || 'unknown',
        pullRequestNumber: payload.number || pullRequest.number,
        pullRequestTitle: pullRequest.title || '',
        pullRequestState: pullRequest.state || 'unknown',
        pullRequestUrl: pullRequest.html_url || '',
        diffUrl: pullRequest.diff_url || '',
        patchUrl: pullRequest.patch_url || '',
        commitSha: pullRequest.head?.sha || '',
        baseBranch: pullRequest.base?.ref || '',
        headBranch: pullRequest.head?.ref || '',
        owner,
        repo: repoName,
        isDraft: pullRequest.draft || false,
        changedFiles: pullRequest.changed_files || 0,
        additions: pullRequest.additions || 0,
        deletions: pullRequest.deletions || 0,
      };
    } else if (eventName === 'push') {
      const push = payload;
      messageObject = {
        eventType: 'push',
        ref: push.ref,
        before: push.before,
        after: push.after,
        repository: {
          id: push.repository!.id,
          name: push.repository!.name,
          full_name: push.repository!.full_name,
        },
        pusher: push.pusher,
        commits: push.commits,
      };
    }

    // Create SNS client
    const client = new SNSClient({ region });

    // Prepare message parameters
    const params = {
      TopicArn: topicArn,
      Message: JSON.stringify(messageObject),
      Subject: `GitHub ${
        eventName.charAt(0).toUpperCase() + eventName.slice(1)
      } Event`,
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
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}

// Only call run() if this file is being run directly
if (require.main === module) {
  void run();
}
