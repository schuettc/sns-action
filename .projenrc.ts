import {
  GitHubActionTypeScriptProject,
  RunsUsing,
} from 'projen-github-action-typescript';
const project = new GitHubActionTypeScriptProject({
  defaultReleaseBranch: 'main',
  deps: ['@aws-sdk/client-sns', '@actions/core', '@actions/github'],
  devDeps: ['projen-github-action-typescript', 'aws-sdk-client-mock'],
  name: 'sns-action',
  projenrcTs: true,
  actionMetadata: {
    runs: {
      using: RunsUsing.NODE_20,
      main: 'dist/index.js',
    },
    inputs: {
      topicArn: {
        description: 'The ARN of the topic',
        required: true,
      },
      message: {
        description: 'The message you want to send',
        required: true,
      },
      subject: {
        description: 'The subject of the message',
        required: false,
      },
      region: {
        description: 'The region where the topic is located',
        required: true,
        default: 'us-east-1',
      },
    },
    outputs: {
      notificationId: {
        description: 'The ID of the notification',
      },
    },
  },
});

project.eslint!.addOverride({
  files: ['src/*.ts'],
  rules: {
    '@typescript-eslint/no-require-imports': 'off',
    'import/no-extraneous-dependencies': 'off',
  },
});

project.synth();
