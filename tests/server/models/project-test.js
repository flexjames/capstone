var dbURI    = 'mongodb://localhost:27017/testingDB';
var clearDB  = require('mocha-mongoose')(dbURI);

var sinon    = require('sinon');
var expect   = require('chai').expect;
var mongoose = require('mongoose');

// Require in all models.
require('../../../server/db/models');

var Project  = mongoose.model('Project');
var Promise  = require('bluebird');

describe('Product Model', function () {

  beforeEach('Establish DB connection', function (done) {
      if (mongoose.connection.db) return done();
      mongoose.connect(dbURI, done);
  });

  afterEach('Clear test database', function (done) {
      clearDB(done);
  });

  describe('Projects available', function () {
    var _project;
    beforeEach(function(done) {
      return Project.create({
        name: 'Project 1'
      })
      .then(function(project) {
        _project = project;
        done();
      });
    });

    it('should be an object', function () {
      expect(_project).to.exist;
      expect(_project).to.be.an('object');
    });

    afterEach(function (done) {
      Promise.all([Project.findById(_project._id).remove()])
        .then(function(entries) {
          done();
        })
    });
  });
});
