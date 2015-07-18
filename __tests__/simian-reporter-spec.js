jest.dontMock('../lib/simian-reporter');

describe('Simian reporter', function () {

  it('sends the results to Simian and adds the access token', function () {

    var request = require('request');

    var SimianReporter = require('../lib/simian-reporter');
    var simianReporter = new SimianReporter({
      simianResultEndPoint: 'api.simian.io/v1.0/result',
      simianAccessToken: 'secretToken'
    });

    var callback = jest.genMockFunction();
    var result = {cucumber: 'response'};
    var asyncChainResponse = [null, [null, [result]]];
    simianReporter.report(asyncChainResponse, callback);

    expect(request.post.mock.calls.length).toBe(1);

    var postedObject = request.post.mock.calls[0][0];

    expect(postedObject.headers).toEqual({'content-type': 'application/json'});
    expect(postedObject.url).toEqual('http://api.simian.io/v1.0/result?accessToken=secretToken');
    expect(postedObject.body).toEqual(JSON.stringify({
      type: 'cucumber',
      result: [result]
    }));


    // calls back on a good response
    var postCallback = request.post.mock.calls[0][1];
    postCallback(null, {statusCode: 200});
    expect(callback.mock.calls.length).toBe(1);

  });

  it('shows the error to the user when Simian returns a non 200 response', function() {

    var request = require('request');

    var SimianReporter = require('../lib/simian-reporter');
    var simianReporter = new SimianReporter({
      simianAccessToken: 'secretToken'
    });

    spyOn(console, 'error');

    var callback = jest.genMockFunction();
    var result = {cucumber: 'response'};
    var asyncChainResponse = [null, [null, [result]]];
    simianReporter.report(asyncChainResponse, callback);


    // calls back on a good response
    var postCallback = request.post.mock.calls[0][1];
    var response = {
      statusCode: 401,
      status: 'something',
      error: 'terrible'
    };
    postCallback(null, response);
    expect(callback.mock.calls.length).toBe(1);
    expect(console.error).toHaveBeenCalledWith('[chimp][simian-reporter] Error from Simian:', response.status, response.error);
  });

});
