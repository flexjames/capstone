var mongoose = require('mongoose');

var schema = new mongoose.Schema({

  name: {
    type: String
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  config: {
    type: []
  },
  dataSource: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DataSource'
  }]
});

mongoose.model('Project', schema);