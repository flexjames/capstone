'use strict';

var router = require('express').Router();
var DataSource = require('mongoose').model('DataSource');
var Busboy = require('connect-busboy');
var fs = require('fs-extra')
//var rootPath = __dirname.slice(0, 34);
var rootPathStr = __dirname.split('server/app/routes/data');
var rootPath = rootPathStr[0];
var fs1 = require('fs');
var fsp = require('fs-promise');
var Promise = require('bluebird');

function csvJSON(csv){

 var lines=csv.split("\n");
 var result = [];
 var headers=lines[0].split(",");

 for(var i=1; i<lines.length; i++){
      var obj = {};
      var currentline=lines[i].split(",");
      for(var j=0; j<headers.length; j++){
        //if(typeof parseInt(currentline[j]) === 'number'){
        if(!isNaN(parseInt(currentline[j]))){
          console.log("Number Number");
          obj[headers[j]] = parseInt(currentline[j]);
        }
        else {
          console.log("string")
          obj[headers[j]] = currentline[j];
        }
      }
      result.push(obj);
 }

 //return result; //JavaScript object
 return JSON.stringify(result); //JSON
}

router.get('/datasourcesproj/:projId', function(req, res, next){
  console.log('req.params is ' + req.params);
  Promise.all([DataSource.find({project: req.params.projId}),DataSource.find({seed:true})])
    .spread(function(projData,seedData){
      var allData=projData.concat(seedData);
      console.log('allData is ' + allData);

      res.send(allData);
    });
});

router.get('/datasourcesuser/:userId', function(req, res, next){
  Promise.all([DataSource.find({user: req.params.userId}),DataSource.find({seed:true})])
    .spread(function(projData,userdata){
      var allData=projData.concat(userdata);
      res.send(allData);
    });
})

router.get('/:id', function(req, res, next) {
  DataSource.findById(req.params.id)
    .then(function(data) {
      //console.log(data);
      res.json(data);
    })
    .catch(function(err) {
      res.status(404).send(err);
    }, next);
});

router.post('/:projId/:userId', function(req, res, next){
  console.log('Entering POST route');
  console.log('req.files is');
  console.log('req', req.files);
  console.log(req.files.file.name);
  var filePathName = rootPath + 'files/' + req.files.file.name;
  var filename = req.files.file.name;
  console.log('filePathName is ' + filePathName);

  fsp.writeFile(filePathName, req.files.file.data)
  .then(function(){
    console.log('hello');
    return fsp.readFile(filePathName, {encoding: 'utf8'})
  }).then(function(data){
    console.log('data is ' + data);
    if (filename.slice(-3) === 'csv'){
      var _data = csvJSON(data);
    } else{
      _data = data;
    };
    console.log('_data is ' + _data);
    var _dataSource = {
      user: req.params.userId,
      project: req.params.projId,
      fileName: filename,
      data: _data
    };

    return DataSource.create(_dataSource)
    .then(function(dataObj){
      console.log('dataObj is ' + dataObj);
      res.send(dataObj);
    })
 });
});



module.exports = router;