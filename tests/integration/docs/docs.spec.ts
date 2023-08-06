import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import { container } from 'tsyringe';
import httpStatusCodes from 'http-status-codes';
import { getApp } from '../../../src/app';
import { REDIS_SYMBOL, SERVICES } from '../../../src/common/constants';
import { DocsRequestSender } from './helpers/docsRequestSender';
import Redis from 'ioredis';

describe('docs', function () {
  let redisConnection: Redis;
  beforeAll(async function () {
    // await registerTestValues();
    // requestSender.init();
    redisConnection = container.resolve<Redis>(REDIS_SYMBOL);
  });
  afterAll(async function () {
    if (!['end'].includes(redisConnection.status)) {
      await redisConnection.quit();
    }
  });

  let requestSender: DocsRequestSender;
  beforeEach(function () {
    const app = getApp({
      override: [
        { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
        { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
      ],
      useChild: true,
    });
    requestSender = new DocsRequestSender(app);
  });

  describe('Happy Path', function () {
    it('should return 200 status code and the resource', async function () {
      const response = await requestSender.getDocs();

      expect(response.status).toBe(httpStatusCodes.OK);
      expect(response.type).toBe('text/html');
    });
  });

  it('should return 200 status code and the json spec', async function () {
    const response = await requestSender.getDocsJson();

    expect(response.status).toBe(httpStatusCodes.OK);

    expect(response.type).toBe('application/json');
    expect(response.body).toHaveProperty('openapi');
  });
});
