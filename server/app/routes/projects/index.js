'use strict';
var router = require('express').Router();
var Project = require('mongoose').model('Project');


router.get('/', function(req, res, next) {
  Project.find({})
    .then(function(projects) {
      res.json(projects);
    })
    .catch(function(err) {
      res.json(err);
    }, next);
});

router.get('/user/:userId', function(req, res, next) {
  console.log(req.params);
  Project.find({user:req.params.userId})
    .then(function(projects) {
      res.json(projects);
    })
    .catch(function(err) {
      res.json(err);
    }, next);
});


router.get('/:id', function(req, res, next) {
  Project.findById(req.params.id).populate('user dataSource')
    .then(function(project) {
      console.log('project: ', project);
      res.json(project);
    })
    .catch(function(err) {
      res.status(404).send(err);
    }, next);
});

router.post('/', function(req, res, next) {
  Project.create(req.body)
    .then(function(project) {
      res.json(project);
    })
    .catch(function(err) {
      res.json(err);
    }, next);
});

router.put('/:id', function(req, res) {
  Project.findByIdAndUpdate(req.params.id,{$set:req.body})
    .then(function(project) {
      res.json(project);
    })
    .catch(function(err) {
      res.json(err);
    });
});

router.delete('/:id', function(req, res, next) {
  Project.findByIdAndRemove(req.params.id)
    .then(function(project) {
      res.json(project);
    })
    .catch(function(err) {
      res.json(err);
    }, next);
});

module.exports = router;