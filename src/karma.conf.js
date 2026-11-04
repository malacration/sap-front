module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    plugins: [
      require('karma-chrome-launcher'),
      require('karma-jasmine'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage')
    ],
    client:{
      clearContext: false // leave Jasmine Spec Runner output visible in browser
    },
    coverageReporter: {
      dir: require('path').join(__dirname, '../coverage'),
      reporters: [{type: 'html'}, {type: 'lcovonly'}]
    },
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    browsers: ['ChromeHeadless']
  });
};
