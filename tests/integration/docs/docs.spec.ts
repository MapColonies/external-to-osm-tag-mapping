// import jsLogger from '@map-colonies/js-logger';
// import { trace } from '@opentelemetry/api';
// import Redis, { RedisOptions } from 'ioredis';
// import config from 'config';
// import { container } from 'tsyringe';
// import httpStatusCodes from 'http-status-codes';
// import { getApp } from '../../../src/app';
// import { REDIS_SYMBOL, SERVICES } from '../../../src/common/constants';
// import { registerTestValues } from '../testContainerConfig';
// import { getSchemas } from '../../../src/schema/providers/schemaLoader';
// import { createConnection } from '../../../src/common/db';
// import { schemaSymbol } from '../../../src/schema/models/types';
// import { DocsRequestSender } from './helpers/docsRequestSender';
// import { IDOMAIN_FIELDS_REPO_SYMBOL } from '../../../src/schema/DAL/domainFieldsRepository';
// import { RedisManager } from '../../../src/schema/DAL/redisManager';
// import { SchemaRequestSender } from '../schema/helpers/requestSender';
// // import * as requestSender from '../schema/helpers/requestSender';

// describe('docs', function () {
//   let redisConnection: Redis;
//   let requestSender: DocsRequestSender;
//   // beforeAll(async function () {
//   //   // await registerTestValues();
//   //   // requestSender.init();
//   //   redisConnection = container.resolve<Redis>(REDIS_SYMBOL);
//   // });
//   // afterAll(async function () {
//   //   if (!['end'].includes(redisConnection.status)) {
//   //     await redisConnection.quit();
//   //   }
//   // });
//   // beforeEach(async function () {
//   //   await registerTestValues();
//     // container.register(SERVICES.CONFIG, { useValue: config });
//     // container.register(SERVICES.LOGGER, { useValue: jsLogger({ enabled: false }) });
//     // const schemas = await getSchemas(container);
//     // redisConnection = await createConnection(config.get<RedisOptions>('db'));

//     // const app = getApp({
//     //   override: [
//         // { token: SERVICES.CONFIG, provider: { useValue: config } },
//         // { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
//         // { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },

//         // { token: schemaSymbol, provider: { useValue: schemas } },
//         // { token: REDIS_SYMBOL, provider: { useValue: redisConnection } },
//         // { token: IDOMAIN_FIELDS_REPO_SYMBOL, provider: { useClass: RedisManager } },
//   //     ],
//   //     useChild: true,
//   //   });
//   //   requestSender = new DocsRequestSender(app);
//   //   await redisConnection.flushall();
//   // });
//   // afterAll(async function () {
//   //   if (!['end'].includes(redisConnection.status)) {
//   //     await redisConnection.quit();
//   //   }
//   // });
//   beforeAll(async function () {
//     // await redisConnection.quit();
//     // container.clearInstances();
//     await registerTestValues();
//     // requestSender.init();
//     const app = getApp({
//       override: [
//         { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
//         { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
//       ],
//       useChild: true,
//     });
//     requestSender = new DocsRequestSender(app);
//     // redisConnection = container.resolve<Redis>(REDIS_SYMBOL);
//     // await redisConnection.flushall();
//   });

//   // let requestSender: DocsRequestSender;
//   // beforeEach(function () {
//   //   const app = getApp({
//   //     override: [
//   //       { token: SERVICES.LOGGER, provider: { useValue: jsLogger({ enabled: false }) } },
//   //       { token: SERVICES.TRACER, provider: { useValue: trace.getTracer('testTracer') } },
//   //     ],
//   //     useChild: true,
//   //   });
//   //   requestSender = new DocsRequestSender(app);
//   // });

//   describe('Happy Path', function () {
//     it('should return 200 status code and the resource', async function () {
//       const response = await requestSender.getDocs();

//       expect(response.status).toBe(httpStatusCodes.OK);
//       expect(response.type).toBe('text/html');
//     });
//   });

//   it('should return 200 status code and the json spec', async function () {
//     const response = await requestSender.getDocsJson();

//     expect(response.status).toBe(httpStatusCodes.OK);

//     expect(response.type).toBe('application/json');
//     expect(response.body).toHaveProperty('openapi');
//   });
// });
import httpStatusCodes from 'http-status-codes';
import jsLogger from '@map-colonies/js-logger';
import { trace } from '@opentelemetry/api';
import { getApp } from '../../../src/app';
import { SERVICES } from '../../../src/common/constants';
import { registerTestValues } from '../testContainerConfig';
import { DocsRequestSender } from './helpers/docsRequestSender';

describe('docs', function () {
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
