var mongoose = require('mongoose');
var User = mongoose.model('User');
var Project = mongoose.model('Project');

var schema = new mongoose.Schema({
	user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
	project: {type: mongoose.Schema.Types.ObjectId, ref: 'Project'},
	seed: {type:Boolean, default: false},
  fileName: {type: String, required:true},
  dataType:{type:String, enum:['network','linear','text','hierarchy'], default:'linear'},
  data: {type: String}
});

mongoose.model('DataSource', schema);