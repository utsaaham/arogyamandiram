import * as logfire from '@pydantic/logfire-node';

const serviceVersion =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.npm_package_version ??
  '1.0.0';

logfire.configure({
  advanced: { baseUrl: 'https://logfire-us.pydantic.dev' },
  serviceName: 'arogyamandiram-server',
  serviceVersion,
  environment:
    process.env.LOGFIRE_ENVIRONMENT ??
    process.env.VERCEL_ENV ??
    process.env.NODE_ENV,
  sendToLogfire: 'if-token-present',
  console: false,
  scrubbing: {
    extraPatterns: [
      'authorization',
      'cookie',
      'email',
      'encryption[_-]?key',
      'imap',
      'mongodb[_-]?uri',
      'openai',
      'pass(word)?',
      'reset[_-]?token',
      'secret',
      'smtp',
      'token',
      'verification[_-]?code',
    ],
  },
});

logfire.info('Arogyamandiram server telemetry initialized', {
  'service.version': serviceVersion,
});
