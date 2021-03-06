'use strict';

const sinon = require('sinon');
const assert = sinon.assert;
const expect = require('expect.js');
const httpSupport = require('../../../lib/commands/local/http-support');

const sandbox = sinon.createSandbox();

const FC = require('@alicloud/fc2');

const { setProcess } = require('../../test-utils');

const httpOutputStream = `"FC Invoke Start RequestId: 65ca478d-b3cf-41d5-b668-9b89a4d481d8
load code for handler:read.handler
--------------------response begin-----------------
SFRUUC8xLjEgMjAwIE9LCngtZmMtaHR0cC1wYXJhbXM6IGV5Snp
kR0YwZFhNaU9qSXdNQ3dpYUdWaFpHVnljeUk2ZXlKamIyNTBaVz
UwTFhSNWNHVWlPaUpoY0hCc2FXTmhkR2x2Ymk5cWMyOXVJbjBzS
W1obFlXUmxjbk5OWVhBaU9uc2lZMjl1ZEdWdWRDMTBlWEJsSWpw
YkltRndjR3hwWTJGMGFXOXVMMnB6YjI0aVhYMTkKCnRlc3RCb2R5
--------------------response end-----------------
--------------------execution info begin-----------------
OWM4MWI1M2UtZWQxNy00MzI3LWFjNzctMjhkYWMzNzRlMDU1CjE4MgoxOTk4CjIwCg==
--------------------execution info end-----------------
    
    
[0;32mRequestId: 65ca478d-b3cf-41d5-b668-9b89a4d481d8 	 Billed Duration: 44 ms 	 Memory Size: 1998 MB 	 Max Memory Used: 19 MB[0m
`;

const httpErrorOutputStream = `--------------------response begin-----------------
SFRUUC8xLjEgNDAwIE9LCgp0ZXN0Qm9keQ==
--------------------response end-----------------`;

const apiOutputSream = `FC Invoke Start RequestId: 65ca478d-b3cf-41d5-b668-9b89a4d481d8
load code for handler:read.handler
--------------------response begin-----------------
SFRUUC8xLjEgMjAwIE9LCgp0ZXN0Qm9keQ==
--------------------response end-----------------
--------------------execution info begin-----------------
OWM4MWI1M2UtZWQxNy00MzI3LWFjNzctMjhkYWMzNzRlMDU1CjE4MgoxOTk4CjIwCg==
--------------------execution info end-----------------
    
    
[0;32mRequestId: 65ca478d-b3cf-41d5-b668-9b89a4d481d8 	 Billed Duration: 44 ms 	 Memory Size: 1998 MB 	 Max Memory Used: 19 MB[0m
`;

describe('test validateHeader', async () => {
  it('test valid header', () => {
    const result = httpSupport.validateHeader('headerKey', 'headerValue');
    expect(result).to.be(true);
  });

  it('test invalid header key', async () => {
    const result = httpSupport.validateHeader('键', 'headerValue');
    expect(result).to.be(false);
  });

  it('test invalid header value', async () => {
    const result = httpSupport.validateHeader('headerKey', '值');
    expect(result).to.be(false);
  });

  it('test valid header value array', async () => {
    const result = httpSupport.validateHeader('headerKey', ['headerValue1', 'headerValue2']);
    expect(result).to.be(true);
  });

  it('test invalid header value array', async () => {
    const result = httpSupport.validateHeader('headerKey', ['headerValue1', '值']);
    expect(result).to.be(false);
  });
});

describe('test filterFunctionResponseAndExecutionInfo', async () => {

  const response = `"FC Invoke Start RequestId: 65ca478d-b3cf-41d5-b668-9b89a4d481d8
--------------------response begin-----------------
dGVzdA==
--------------------response end-----------------
--------------------execution info begin-----------------
NjVjYTQ3OGQtYjNjZi00MWQ1LWI2NjgtOWI4OWE0ZDQ4MWQ4CgoxOTk4Cgo=
--------------------execution info end-----------------

[0;32mRequestId: 65ca478d-b3cf-41d5-b668-9b89a4d481d8 	 Billed Duration: 44 ms 	 Memory Size: 1998 MB 	 Max Memory Used: 19 MB[0m
`.split('\n');

  it('filter response and execution info', async () => {
    const [httpResponse, executionInfo] = httpSupport.filterFunctionResponseAndExecutionInfo(response);
    expect(httpResponse).to.eql(['dGVzdA==']);
    expect(executionInfo).to.eql('NjVjYTQ3OGQtYjNjZi00MWQ1LWI2NjgtOWI4OWE0ZDQ4MWQ4CgoxOTk4Cgo=');
  });
});

describe('test generateHttpParams', async () => {
  it('test genrate http params', async () => {
    const req = {
      originUrl: 'originUrl',
      method: 'get',
      path: '/prefix/path',
      ip: '127.0.0.1',
      query: {
        host: 'localhost:8000'
      },
      rawHeaders: [
        'testHeader', 'testHeaderValue'
      ]
    };
    const res = httpSupport.generateHttpParams(req, '/prefix');
    expect(res).to.eql('eyJtZXRob2QiOiJnZXQiLCJwYXRoIjoiL3BhdGgiLCJjbGllbnRJUCI6IjEyNy4wLjAuMSIsInF1ZXJpZXNNYXAiOnsiaG9zdCI6WyJsb2NhbGhvc3Q6ODAwMCJdfSwiaGVhZGVyc01hcCI6eyJ0ZXN0SGVhZGVyIjpbInRlc3RIZWFkZXJWYWx1ZSJdfX0=');
  });
});

describe('test parseHeadersAndBodyAndExecutionInfoAndProcessOutput', async () => {

  it('test parse headers and body and executionInfo and process output', async () => {
    const { headers, body, requestId, billedTime, memoryUsage } = httpSupport.parseHeadersAndBodyAndExecutionInfoAndProcessOutput(httpOutputStream);
    expect(headers).to.eql({ 
      'x-fc-http-params': 'eyJzdGF0dXMiOjIwMCwiaGVhZGVycyI6eyJjb250ZW50LXR5cGUiOiJhcHBsaWNhdGlvbi9qc29uIn0sImhlYWRlcnNNYXAiOnsiY29udGVudC10eXBlIjpbImFwcGxpY2F0aW9uL2pzb24iXX19' 
    });
    expect(body).to.eql(Buffer.from('testBody'));
    expect(requestId).to.eql('9c81b53e-ed17-4327-ac77-28dac374e055');
    expect(billedTime).to.eql('182');
    expect(memoryUsage).to.eql('20');
  });
});

describe('test responseHttpTrigger', async () => {

  it('test response success http trigger', async () => {
    const resp = {
      send: sinon.stub(),
      status: sinon.stub(),
      setHeader: sinon.stub()
    };

    httpSupport.responseHttpTrigger(resp, httpOutputStream, '');

    assert.calledWith(resp.status, 200);
    assert.calledWith(resp.setHeader, 'content-type', ['application/json']);
    assert.calledWith(resp.send, Buffer.from('testBody'));
  });

  it('test response with 4xx invoke http status', async () => {
    const resp = {
      send: sinon.stub(),
      status: sinon.stub(),
      setHeader: sinon.stub()
    };

    httpSupport.responseHttpTrigger(resp, httpErrorOutputStream, '');

    assert.calledWith(resp.status, '400');
    assert.calledWith(resp.send, Buffer.from('testBody'));
  });

  it('test response error http trigger', async () => {
    const resp = {
      send: sinon.stub(),
      status: sinon.stub(),
      setHeader: sinon.stub()
    };
    
    httpSupport.responseHttpTrigger(resp, httpErrorOutputStream, 'function invoke error');
    
    assert.calledWith(resp.status, '400');
    assert.calledWith(resp.send, Buffer.from('testBody'));
  });
});

describe('test responseApi', async () => {
  it('test normal resposne', async () => {
    const resp = {
      set: sinon.stub(),
      status: sinon.stub(),
      send: sinon.stub()
    };

    httpSupport.responseApi(resp, apiOutputSream, '');

    assert.calledWith(resp.set, {
      'access-control-expose-headers': 'Date,x-fc-request-id,x-fc-error-type,x-fc-code-checksum,x-fc-invocation-duration,x-fc-max-memory-usage,x-fc-log-result,x-fc-invocation-code-version',
      'content-type': 'application/octet-stream',
      'x-fc-invocation-duration': '182',
      'x-fc-invocation-service-version': 'LATEST',
      'x-fc-max-memory-usage': '20',
      'x-fc-request-id': '9c81b53e-ed17-4327-ac77-28dac374e055'
    });
    
    assert.calledWith(resp.send, Buffer.from('testBody'));
  });

});


describe('test validateSignature', async () => {

  let restoreProcess;
  let req;
  let res;
  const method = 'GET';
  const accessKeyId = 'testKeyId';
  const accessKeySecret = 'testKeySecret';
  const accountId = 'testAccountId';

  beforeEach(() => {

    req = {
      path: '/test',
      headers: {
        'testHeader': 'testHeaderValue'
      },
      queries: {}
    };

    res = {
      status: sandbox.stub(),
      send: sandbox.stub()
    };

    restoreProcess = setProcess({
      ACCOUNT_ID: accountId,
      ACCESS_KEY_ID: accessKeyId,
      ACCESS_KEY_SECRET: accessKeySecret,
    });
  });

  afterEach(() => {
    restoreProcess();
  });

  it('test valid', async () => {

    const clientSignature = FC.getSignature(accessKeyId, accessKeySecret, method, req.path, req.headers, req.queries);

    req.headers['authorization'] = clientSignature;

    const valid = await httpSupport.validateSignature(req, res, method);

    expect(valid).to.be(true);
  });

  it('test invliad', async() => {
    const clientSignature = FC.getSignature(accessKeyId, accessKeySecret, method, req.path, req.headers, req.queries);

    req.headers['authorization'] = clientSignature;

    const valid = await httpSupport.validateSignature(req, res, 'POST');

    expect(valid).to.be(false);
  });
});

describe('test normalizeMultiValues', async () => {
  it('test normal', () => {
    const maps = {
      'header1': 'value1',
      'header2': ['value2', 'value3' ]
    };

    const expectMaps = {
      'header1': [ 'value1' ],
      'header2': [ 'value2', 'value3' ]
    };

    const normallized = httpSupport.normalizeMultiValues(maps);
    expect(normallized).to.eql(expectMaps);
  });

  it('test empty', () => {
    const maps = {};

    const normallized = httpSupport.normalizeMultiValues(maps);
    expect(normallized).to.eql({});
  });

  it('test null', () => {
    const maps = null;

    const normallized = httpSupport.normalizeMultiValues(maps);
    expect(normallized).to.eql({});
  });
});

describe('test normalizeRawHeaders', async () => {
  it('test normal', async () => {
    const rawHeaders = ['A','A',
      'B','B',
      'A', 'C'];
    const headers = httpSupport.normalizeRawHeaders(rawHeaders);
    expect(headers).to.eql({
      'A': ['A', 'C'],
      'B': ['B']
    });
  });
});