'use strict';

const runCLI = require('jest').runCLI;
const BbPromise = require('bluebird');
const { setEnv } = require('./utils');
const { dirname, join } = require('path');

// create jest config project for a serverless function
const createProject = (serverless) => (functionName) => {
    const cwd = join(
      serverless.config.servicePath,
      dirname(serverless.service.functions[functionName].handler)
    );

    return {
      displayName: {
        name: functionName,
        color: 'blue',
      },
      rootDir: cwd,
    };
};

const runFunctionTests = (serverless, options, config) => (functionNameToTest) => {
  const path = serverless.config.servicePath;
  setEnv(serverless, functionNameToTest);
  const project = createProject(serverless)(functionNameToTest);

  return runCLI({
    ...config,
    ...project,
  }, [path]);
};

const runAllTests = (serverless, options, config) => {
  const individually = serverless.service.package.individually || false;
  const path = serverless.config.servicePath;
  const allFunctions = serverless.service.getAllFunctions();
  allFunctions.forEach(functionName => setEnv(serverless, functionName));

  const mergedConfig = individually ? {
    ...config,
    projects: allFunctions.map(createProject(serverless)),
  } : config;

  return runCLI(mergedConfig, [path]);
}

const runTests = (serverless, options, conf) =>
  new BbPromise((resolve, reject) => {
    const functionName = options.function;
    const config = Object.assign({
      testEnvironment: 'node',
    }, conf);

    const vars = new serverless.classes.Variables(serverless);
    vars.populateService(options);

    // eslint-disable-next-line dot-notation
    process.env['SERVERLESS_TEST_ROOT'] = serverless.config.servicePath;

    const runPromise = functionName ?
      runFunctionTests(serverless, options, config)(functionName) :
      runAllTests(serverless, options, config);

    return runPromise
      .then((...success) => resolve(...success));
      // .catch(e => reject(e));
  });

module.exports = runTests;
