var router = require('express').Router();
var path = require('path');
var Project = require('mongoose').model('Project');
var generator = require(path.join(__dirname, '../../../../generator'));

router.get('/js/:id', function(req, res) {
  Project.findById(req.params.id)
    .then(function(project) {
      return generator.writeApp(project);
    })
    .then(function(app) {
      res.send(app);
    });
});

router.get('/html/:id', function(req, res) {
  Project.findById(req.params.id)
    .then(function(project) {
            //console.dir(project.config[0].pages.page_1);
            //res.json(project);
      return generator.writeTemplate(project);
    })
    .then(function(index) {
      res.send(index);
    });
});

module.exports = router;