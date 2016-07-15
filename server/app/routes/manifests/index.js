'use strict';
var router = require('express').Router();
var fs = require('fs');
var sys = require('sys')
var exec = require('child_process').exec;
var child;

router.get('/',function(req,res,next){
// executes `pwd`
child = exec("cat browser/directiveStore/*/manifest.json", function (error, stdout, stderr) {
  var manifests=JSON.parse('['+stdout+'{}]');
  console.log(manifests[1]);
 manifests.splice(manifests.length-1,manifests.length-1);
  //console.log(manifests[1]);
  res.json(manifests);
});
	
});
module.exports=router;