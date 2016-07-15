//Dependencies
var fs = require('fs');
var path = require('path');
var jade = require('jade');
var Promise = require('bluebird');
var _ = require('lodash');
var DataSource = require('mongoose').model('DataSource');

//Helper functions
var readFile = Promise.promisify(require('fs').readFile);

var getDirectivesFromConfig = function(config, directives) {
  var directives = directives || [];
  var exceptions = ['ai_page', 'ai_col', 'ai_row'];

  if (config.hasOwnProperty('ai_directive_name') &&
    ((exceptions.indexOf(config.ai_directive_name) === -1) &&
      (directives.indexOf(config.ai_directive_name) === -1))) {
    directives.push(config.ai_directive_name);
  }

  for (var prop in config) {
    if (typeof config[prop] === 'object')
      getDirectivesFromConfig(config[prop], directives);
  }

  return directives;
};

var getDataIdsFromConfig = function(config, dataIds) {
  var dataIds = dataIds || [];

  if (config.hasOwnProperty('ai_info_source') && (dataIds.indexOf(config.ai_info_source) === -1))
    dataIds.push(config.ai_info_source);
  if (config.hasOwnProperty('ai_info_edge_source') && (dataIds.indexOf(config.ai_info_edge_source) === -1))
    dataIds.push(config.ai_info_edge_source);
  if (config.hasOwnProperty('ai_info_node_source') && (dataIds.indexOf(config.ai_info_node_source) === -1))
    dataIds.push(config.ai_info_node_source);

  for (var prop in config) {
    if (typeof config[prop] === 'object')
      getDataIdsFromConfig(config[prop], dataIds);
  }

  return dataIds;
};

var getDataObjFromConfig = function(config) {
  var dataIds = getDataIdsFromConfig(config);
  var dataObj = {};

  return new Promise(function(resolve, reject) {
      resolve(dataIds);
    })
    .each(function(dataId) {
      return DataSource.findById(dataId)
        .then(function(data) {
          dataObj[dataId] = JSON.parse(data.data);
        });
    })
    .then(function() {
      return dataObj;
    });
};

var getDirectivePath = function(directiveName) {
  return path.join('directiveStore', directiveName, directiveName);
};

var getDirectiveHtmlPath = function(directiveName) {
  return getDirectivePath(directiveName) + '.html';
};

var getDirectiveJsPath = function(directiveName) {
  return path.join(__dirname, '../browser', getDirectivePath(directiveName) + '.js');
};

var writeTemplate = function(project) {
  var appConfig = JSON.parse(project.config[0]);

  var directivePaths = getDirectivesFromConfig(appConfig).map(getDirectiveHtmlPath);

  return Promise.all(directivePaths.map(directivePath => readFile(path.join(__dirname, '../browser', directivePath), 'utf8')))
    .then(function(directiveContents) {
      var directives = directivePaths.map(function(elem, index) {
        return { id: elem, content: directiveContents[index] };
      });
      return jade.renderFile(path.join(__dirname, '/index.jade'), { directives: directives, project: appConfig.project_name });
    });
};

var writeApp = function(project) {
  var appConfig = JSON.parse(project.config[0]);
  var controllerPath = path.join(__dirname, '/controller.js');
  var appPath = path.join(__dirname, '/app.js');
  var factoryPath = path.join(__dirname, '/factory.js');
  var dataFactoryPath = path.join(__dirname, '/data_factory.js');
  var directivePaths = getDirectivesFromConfig(appConfig).map(getDirectiveJsPath);

  return Promise.all(_.concat(appPath, controllerPath, directivePaths, factoryPath, dataFactoryPath).map(filePath => readFile(filePath, 'utf8')))
    .then(function(contents) {
      return contents.join('\n')
        .replace('{{project}}', JSON.stringify(appConfig));
    })
    .then(function(app) {
      return getDataObjFromConfig(appConfig)
        .then(function(dataObj) {
          return app.replace('{{dataObj}}', JSON.stringify(dataObj));
        });
    });
};

module.exports = {
  writeApp: writeApp,
  writeTemplate: writeTemplate
};