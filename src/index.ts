import Transport from 'winston-transport';
import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogStreamCommand, CreateLogGroupCommand, DescribeLogStreamsCommand } from '@aws-sdk/client-cloudwatch-logs';

/**
 * Minimal custom Winston transport for AWS CloudWatch Logs.
 * Not production-hardened: no batching, no sequence token management, no retries.
 */
interface CloudWatchTransportOptions extends Transport.TransportStreamOptions {
  logGroupName: string;
  logStreamName: string;
  region?: string;
}

export class CloudWatchTransport extends Transport {
  private client: CloudWatchLogsClient;
  private logGroupName: string;
  private logStreamName: string;
  private sequenceToken?: string;

  constructor(opts: CloudWatchTransportOptions) {
    super(opts);
    this.logGroupName = opts.logGroupName;
    this.logStreamName = opts.logStreamName;
    this.client = new CloudWatchLogsClient({ region: opts.region || 'eu-west-2' });
  }

  async log(info: any, callback: () => void) {
    setImmediate(() => this.emit('logged', info));
    const message = JSON.stringify(info);
    const timestamp = Date.now();

    try {
      // Ensure log group exists
      await this.client.send(new CreateLogGroupCommand({ logGroupName: this.logGroupName }));
    } catch (e: any) {
      if (e.name !== 'ResourceAlreadyExistsException') {
        // Ignore if already exists, else throw
        // eslint-disable-next-line no-console
        console.error('CloudWatch log group error:', e);
      }
    }
    try {
      // Ensure log stream exists
      await this.client.send(new CreateLogStreamCommand({ logGroupName: this.logGroupName, logStreamName: this.logStreamName }));
    } catch (e: any) {
      if (e.name !== 'ResourceAlreadyExistsException') {
        // eslint-disable-next-line no-console
        console.error('CloudWatch log stream error:', e);
      }
    }
    // Get sequence token
    try {
      const describe = await this.client.send(new DescribeLogStreamsCommand({
        logGroupName: this.logGroupName,
        logStreamNamePrefix: this.logStreamName,
      }));
      const stream = describe.logStreams?.find(s => s.logStreamName === this.logStreamName);
      this.sequenceToken = stream?.uploadSequenceToken;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('CloudWatch describe log streams error:', e);
    }
    // Send log event
    try {
      await this.client.send(new PutLogEventsCommand({
        logGroupName: this.logGroupName,
        logStreamName: this.logStreamName,
        logEvents: [{ message, timestamp }],
        sequenceToken: this.sequenceToken,
      }));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('CloudWatch put log events error:', e);
    }
    callback();
  }
}
