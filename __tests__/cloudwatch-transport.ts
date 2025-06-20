import { CloudWatchTransport } from '@/index';
import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogStreamCommand, CreateLogGroupCommand, DescribeLogStreamsCommand } from '@aws-sdk/client-cloudwatch-logs';

jest.mock('@aws-sdk/client-cloudwatch-logs');

describe('CloudWatchTransport', () => {
  const logGroupName = 'test-group';
  const logStreamName = 'test-stream';
  const region = 'eu-west-2';
  let transport: CloudWatchTransport;
  let clientSend: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    transport = new CloudWatchTransport({ logGroupName, logStreamName, region });
    // @ts-ignore
    clientSend = transport.client.send;
  });

  it('should send a log event to CloudWatch', async () => {
    // Mock AWS SDK responses
    clientSend.mockImplementation(cmd => {
      if (cmd instanceof CreateLogGroupCommand || cmd instanceof CreateLogStreamCommand) {
        const err: any = new Error('exists');
        err.name = 'ResourceAlreadyExistsException';
        throw err;
      }
      if (cmd instanceof DescribeLogStreamsCommand) {
        return { logStreams: [{ logStreamName, uploadSequenceToken: 'token123' }] };
      }
      if (cmd instanceof PutLogEventsCommand) {
        return { nextSequenceToken: 'token124' };
      }
      return {};
    });

    const info = { level: 'info', message: 'test log', extra: { foo: 'bar' } };
    const callback = jest.fn();
    await transport.log(info, callback);

    // Should call CreateLogGroup, CreateLogStream, DescribeLogStreams, PutLogEvents
    expect(clientSend).toHaveBeenCalledWith(expect.any(CreateLogGroupCommand));
    expect(clientSend).toHaveBeenCalledWith(expect.any(CreateLogStreamCommand));
    expect(clientSend).toHaveBeenCalledWith(expect.any(DescribeLogStreamsCommand));
    expect(clientSend).toHaveBeenCalledWith(expect.any(PutLogEventsCommand));

    // Check the PutLogEventsCommand payload
    const putCall = clientSend.mock.calls.find(call => call[0] instanceof PutLogEventsCommand);
    expect(putCall).toBeDefined();
    const putCmd = putCall[0] as PutLogEventsCommand;
    const input = putCmd.input;
    expect(input.logGroupName).toBe(logGroupName);
    expect(input.logStreamName).toBe(logStreamName);
    expect(input.logEvents).toBeDefined();
    expect(input.logEvents && input.logEvents[0].message).toContain('test log');
    expect(callback).toHaveBeenCalled();
  });
});
