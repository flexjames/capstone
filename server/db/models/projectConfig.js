var mongoose = require('mongoose');

var schema = new mongoose.Schema({

  config: {type:[String]}
});

mongoose.model('ProjectConfig', schema);