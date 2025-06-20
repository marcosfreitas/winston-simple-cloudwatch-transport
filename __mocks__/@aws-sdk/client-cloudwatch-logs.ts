import { jest } from '@jest/globals';

export class PutLogEventsCommand {
  input: any;
  constructor(input: any) {
    this.input = input;
  }
}
export class CreateLogStreamCommand {
  input: any;
  constructor(input: any) {
    this.input = input;
  }
}
export class CreateLogGroupCommand {
  input: any;
  constructor(input: any) {
    this.input = input;
  }
}
export class DescribeLogStreamsCommand {
  input: any;
  constructor(input: any) {
    this.input = input;
  }
}

export class CloudWatchLogsClient {
  send = jest.fn();
}
