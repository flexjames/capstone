/*

This seed file is only a placeholder. It should be expanded and altered
to fit the development of your application.

It uses the same file the server uses to establish
the database connection:
--- server/db/index.js

The name of the database used is set in your environment files:
--- server/env/*

This seed file has a safety check to see if you already have users
in the database. If you are developing multiple applications with the
fsg scaffolding, keep in mind that fsg always uses the same database
name in the environment files.

*/
"use strict";
var fs = require('fs');
var mongoose = require('mongoose');
var Promise = require('bluebird');
var chalk = require('chalk');
var connectToDb = require('./server/db');
var User = mongoose.model('User');
var DataSource = mongoose.model('DataSource');
var Project = mongoose.model('Project');
var fsp = require('fs-promise');
var rootPathArray = __dirname.split("server/app/routes/data");
var rootPath=rootPathArray[0]
var createTemplate= require('./browser_template.js');

var sampleConfig=[
    {project_name : 'ourfirst app',
    pages:{
        page_1:{
          ai_directive : true,
          ai_directive_type : 'layout',
          ai_directive_name : 'ai_page',
          ai_directive_page : '1',
          ai_directive_row : '',
          ai_directive_col : '',
          ai_directive_attributes : {
              ai_class : '/css/row_a/style.css',
              ai_page_title:'',
              ai_page_menu_text :''
          },
          rows:{
              row_1:{
                  ai_directive : true,
                  ai_directive_type : 'layout',
                  ai_directive_name : 'ai_row',
                  ai_directive_page : '1',
                  ai_directive_row : '1',
                  ai_directive_col : '',
                  ai_directive_attributes : {
                      ai_class : '/css/row_a/style.css',
                      class : 'row',
                  },
                  cols:{
                      col_1:{
                          ai_directive : true,
                          ai_directive_type : 'layout',
                          ai_directive_name : 'ai_col',
                          ai_directive_page : '1',
                          ai_directive_row : '1',
                          ai_directive_col: '1',
                          ai_directive_attributes : {
                              ai_class : '/css/row_a/style.css',
                              class : 'col-md-6'
                          },
                          ai_content: {
                                ai_directive : true,
                                ai_directive_type : "content",
                                ai_directive_name : "title_subtitle",
                                ai_directive_page : '1',
                                ai_directive_row : '1',
                                ai_directive_col : '1',
                                ai_directive_attributes : {
                                    ai_title: "Obama is the Best",
                                    ai_subtitle : "by Joe Biden"
                                  }
                        }
                    },col_2:{
                          ai_directive : true,
                          ai_directive_type : 'layout',
                          ai_directive_name : 'ai_col',
                          ai_directive_page : '1',
                          ai_directive_row : '1',
                          ai_directive_col: '2',
                          ai_directive_attributes : {
                              ai_class : 'myclass',
                              class : 'col-md-6'
                          },
                          ai_content: {
                                ai_directive : true,
                                ai_directive_type : 'content',
                                ai_directive_name : 'section_text',
                                ai_directive_page : '1',
                                ai_directive_row : '1',
                                ai_directive_col : '2',
                                ai_directive_attributes : {
                                    ai_title: "Accomplishments in Office",
                                    ai_text:"I think you'll be surprized when you look at all the cool things we did in office. While Barry O was gettin stuff done, I took the time to make this webpage with Angler. I am the internet."
                                }
                        }
                    }
                }
              },
              row_2:{
                   ai_directive : true,
                    ai_directive_type : 'layout',
                    ai_directive_name : 'ai_row',
                    ai_directive_page : '1',
                    ai_directive_row : '2',
                    ai_directive_col : '',
                    ai_directive_attributes : {
                        ai_class : '/css/row_a/style.css',
                        class : 'row',
                    },
                   cols:{
                         col_1:{
                                ai_directive : true,
                                ai_directive_type : 'layout',
                                ai_directive_name : 'ai_col',
                                ai_directive_page : '1',
                                ai_directive_row : '2',
                                ai_directive_col: '1',
                                ai_directive_attributes : {
                                    ai_class : '/css/row_a/style.css',
                                    class : 'col-md-6'
                                },
                                ai_content: {
                                          ai_directive : true,
                                          ai_directive_type : 'content',
                                          ai_directive_name : 'ai_click_img',
                                          ai_directive_page : '1',
                                          ai_directive_row : '2',
                                          ai_directive_col : '1',
                                          ai_directive_attributes : {
                                              ai_height: "262",
                                              ai_width:"465",
                                              ai_img_url:"http://www.theblaze.com/wp-content/uploads/2013/04/obama-biden.jpg",
                                              ai_link:"http://www.fullstackacademy.com",
                                              bordertype:"solid",
                                              bordercolor:"black",
                                              borderweight:"2px",
                                              caption:"best buds"
                                          }
                                }
                        }
                   }
              }
            }
        }
    }

}];


var wipeCollections = function() {
  var removeUsers = User.remove({});
  var removeProjects = Project.remove({});
  return Promise.all([
    removeUsers,
    removeProjects
  ]);
};

var seedUsers = function() {

  var users = [{
    email: 'biden@gmail.com',
    password: 'number2'
  }, {
    email: 'obama@gmail.com',
    password: 'potus'
  }];

  return User.create(users);

};

var seedDataSource_company = function(seedBoolean) {
  if(!seedBoolean){
    seedBoolean=false;
  }
  return new Promise(function(fulfill, reject) {
      fs.readFile('./sample_data_sets/companies.json', 'utf8', function(err, res) {
        if (err) {
          console.log(err);
          reject(err);
        }
        else fulfill(res);
      });
    })
    .then(function(contents) {
      var dataSource = {
        fileName: 'sample-data-linear-company',
        dataType: 'linear',
        data: contents,
        seed: seedBoolean
      };
      return DataSource.create(dataSource);
    });
};

var createManifest_company= function(dataRecord){
 // console.log(dataRecord);
 // let fileId= dataRecord._id;
 let fileId = dataRecord._id.$oid
 console.log(rootPath);
 console.log(fileId);
 debugger;
 let manifestPath=rootPath+ '/browser/directiveStore/nvd3_bar_chart/manifest.json';

 let manifestString= `{
    "ai_directive" : "true",
    "ai_directive_type" : "content",
    "ai_directive_name" : "nvd3_bar_chart",
    "ai_directive_preview":"./directiveStore/nvd3_bar_chart/preview.png",
    "ai_directive_desc":"NVD3 Discrete Bar Chart",
    "ai_datatype":"linear",
    "ai_directive_attributes" : {
        "ai_title": "Corporate Profits",
        "ai_height" : "400",
        "ai_width" : "400",
        "key":"Profits",
        "label":"Company",
        "yvalue":"2014",
        "ai_info_source":"${fileId}"
      }
    },`

 return fsp.writeFile(manifestPath, manifestString)
}

var seedRosterData = function(seedBoolean) {
  if(!seedBoolean){
    seedBoolean=false;
  }
  return new Promise(function(fulfill, reject) {
      fs.readFile('./sample_data_sets/roster.json', 'utf8', function(err, res) {
        if (err) {
          console.log(err);
          reject(err);
        }
        else fulfill(res);
      });
    })
    .then(function(contents) {
      var dataSource = {
        fileName: 'sample-data-hierarchy-roster',
        dataType: 'hierarchy',
        data: contents,
        seed: seedBoolean
      };
      return DataSource.create(dataSource);
    });
};

var createManifest_twoflare= function(dataRecord){
 // console.log(dataRecord);
 // let fileId= dataRecord._id;
 let fileId = dataRecord._id.$oid;
 console.log(rootPath);
 console.log(fileId);
 debugger;
 let manifestPath1=rootPath+ '/browser/directiveStore/vert_flare/manifest.json';
 let manifestPath2=rootPath+ '/browser/directiveStore/horizontal_flare/manifest.json';

 let manifestString1= `{
    "ai_directive" : "true",
    "ai_directive_type" : "content",
    "ai_diretive_category":"data_vis",
    "ai_directive_name" : "vert_flare",
    "ai_directive_title": "Vertical Tree",
    "ai_directive_preview":"./directiveStore/vert_flare/preview.png",
    "ai_directive_desc":"D3 Vertical Collapsable Tree. Heavily based off Mike Bostock's Collapsable Tree Example: https://bl.ocks.org/mbostock/4339083 ",
    "ai_directive_data_desc":"this directive takes heirarchical JSON data with defined arrays for children properites. See roster.json for an example.",
    "ai_datatype":"hierarchy",
    "ai_directive_attributes" : {
        "ai_title": "School Roster Data",
        "ai_height" : "400",
        "ai_width" : "400",
        "ai_info_source":"${fileId}"
      }
    },`

  let manifestString2= `{
    "ai_directive" : "true",
    "ai_directive_type" : "content",
    "ai_diretive_category":"data_vis",
    "ai_directive_name" : "horizontal_flare",
    "ai_directive_title": "Horizontal Tree",
    "ai_directive_preview":"./directiveStore/horizontal_flare/preview.png",
    "ai_directive_desc":"D3 Vertical Collapsable Tree. Heavily based off Mike Bostock's Collapsable Tree Example: https://bl.ocks.org/mbostock/4339083 ",
    "ai_directive_data_desc":"this directive takes heirarchical JSON data with defined arrays for children properites. See roster.json for an example.",
    "ai_datatype":"hierarchy",
    "ai_directive_attributes" : {
        "ai_title": "School Roster Data",
        "ai_height" : "400",
        "ai_width" : "400",
        "ai_info_source":"${fileId}"
      }
    },`

 return Promise.all([fsp.writeFile(manifestPath1, manifestString1),fsp.writeFile(manifestPath2, manifestString2)])
}


var seedNodes_media = function(seedBoolean) {
  if(!seedBoolean){
    seedBoolean=false;
  }
  return new Promise(function(fulfill, reject) {
      fs.readFile('./sample_data_sets/media-example-nodes.json', 'utf8', function(err, res) {
        if (err) {
          console.log(err);
          reject(err);
        }
        else fulfill(res);
      });
    })
    .then(function(contents) {
      var dataSource = {
        fileName: 'sample-data-media-nodes',
        dataType: 'network',
        data: contents,
        seed: seedBoolean
      };
      return DataSource.create(dataSource);
    });
};


var seedEdges_media = function(seedBoolean) {
  if(!seedBoolean){
    seedBoolean=false;
  }
  return new Promise(function(fulfill, reject) {
      fs.readFile('./sample_data_sets/media-example-edges.json', 'utf8', function(err, res) {
        if (err) {
          console.log(err);
          reject(err);
        }
        else fulfill(res);
      });
    })
    .then(function(contents) {
      var dataSource = {
        fileName: 'sample-data-media-edges',
        dataType: 'network',
        data: contents,
        seed: seedBoolean
      };
      return DataSource.create(dataSource);
    });
};

var createManifest_media= function(nodeData,edgeData){
 let nodeId= nodeData._id;
 let edgeId= edgeData._id;

 let manifestPath=rootPath+ '/browser/directiveStore/d3_force_images/manifest.json';

 let manifestString= `{
    "ai_directive" : "true",
    "ai_directive_type" : "content",
    "ai_directive_name" : "d3_force_images",
    "ai_directive_preview":"./directiveStore/d3_force_images/preview.png",
    "ai_directive_desc":"Force Layout with Images for Nodes",
    "ai_datatype":"network",
    "ai_directive_attributes" : {
        "ai_title": "Force Network with Image Nodes",
        "ai_height" : "400",
        "ai_width" : "400",
        "bcolor": "#b3d1ff",
        "ai_info_node_source":"${nodeId}",
        "ai_info_edge_source":"${edgeId}"
      }
    },`

 return fsp.writeFile(manifestPath, manifestString)
}

var seedNodes_lm = function(seedBoolean) {
  if(!seedBoolean){
    seedBoolean=false;
  }
  return new Promise(function(fulfill, reject) {
      fs.readFile('./sample_data_sets/lemis_nodes.json', 'utf8', function(err, res) {
        if (err) {
          console.log(err);
          reject(err);
        }
        else fulfill(res);
      });
    })
    .then(function(contents) {
      var dataSource = {
        fileName: 'sample-data-le-mis-nodes',
        dataType: 'network',
        data: contents,
        seed: seedBoolean
      };
      return DataSource.create(dataSource);
    });
};


var seedEdges_lm = function(seedBoolean) {
  if(!seedBoolean){
    seedBoolean=false;
  }
  return new Promise(function(fulfill, reject) {
      fs.readFile('./sample_data_sets/lemis_edges.json', 'utf8', function(err, res) {
        if (err) {
          console.log(err);
          reject(err);
        }
        else fulfill(res);
      });
    })
    .then(function(contents) {
      var dataSource = {
        fileName: 'sample-data-le-mis-edges',
        dataType: 'network',
        data: contents,
        seed: seedBoolean
      };
      return DataSource.create(dataSource);
    });
};

var createManifest_lm= function(nodeData,edgeData){
  console.log(nodeData);
  console.log(edgeData);

  debugger;

 let nodeId= nodeData._id;
 let edgeId= edgeData._id;

 let manifestPath=rootPath+ '/browser/directiveStore/d3_bostock_force/manifest.json';

 let manifestString= `{
    "ai_directive" : "true",
    "ai_directive_type" : "content",
    "ai_directive_name" : "d3_bostock_force",
    "ai_directive_preview":"./directiveStore/d3_bostock_force/preview.png",
    "ai_directive_desc":"Example Force Layout from D3",
    "ai_datatype":"network",
    "ai_directive_attributes" : {
        "ai_title": "Bostock Force-Directed Graph Example",
        "ai_height" : "400",
        "ai_width" : "400",
        "node_width" : "5",
        "labels":"false",
        "colorSet":"20",
        "ai_info_node_source":"${nodeId}",
        "ai_info_edge_source":"${edgeId}"
      }
    },`

 return fsp.writeFile(manifestPath, manifestString)
}

var seedSmallFamTree = function(seedBoolean) {
  if(!seedBoolean){
    seedBoolean=false;
  }
  return new Promise(function(fulfill, reject) {
      fs.readFile('./sample_data_sets/small_fam_tree.json', 'utf8', function(err, res) {
        if (err) {
          console.log(err);
          reject(err);
        }
        else fulfill(res);
      });
    })
    .then(function(contents) {
      var dataSource = {
        fileName: 'sample-data-small_fam_tree',
        dataType: 'network',
        data: contents,
        seed: seedBoolean
      };
      return DataSource.create(dataSource)
    });
};

var createForceManifest= function(dataRecord){
 console.log(dataRecord);
 let fileId= dataRecord._id;
 // going to also seed config object!
 sampleConfig[0].pages.page_1.rows.row_1.cols.col_1.ai_content.ai_directive_attributes.ai_info_source=fileId;
 let manifestPath=rootPath+ '/browser/directiveStore/d3_force_basic/manifest.json';

 let manifestString= `{
    "ai_directive" : "true",
    "ai_directive_type" : "content",
    "ai_directive_name" : "d3_force_basic",
    "ai_directive_preview":"./directiveStore/d3_force_basic/preview.png",
    "ai_directive_desc":"simple example of a D3 force layout",
    "ai_datatype":"network",
    "ai_directive_attributes" : {
        "ai_title": "Basic Force Graph",
        "ai_height" : "400",
        "ai_width" : "400",
        "node_width" : "5",
        "ai_info_source":"${fileId}"
      }
    },`

 return fsp.writeFile(manifestPath, manifestString)
}

var seedFlare = function(seedBoolean) {
  if(!seedBoolean){
    seedBoolean=false;
  }
  return new Promise(function(fulfill, reject) {
      fs.readFile('./sample_data_sets/flare.json', 'utf8', function(err, res) {
        if (err) {
          console.log(err);
          reject(err);
        }
        else fulfill(res);
      });
    })
    .then(function(contents) {
      var dataSource = {
        fileName: 'sample-data-flare-hierarchy',
        dataType: 'hierarchy',
        data: contents,
        seed: seedBoolean
      };
      return DataSource.create(dataSource)
    });
};

var createFlareManifest= function(dataRecord){
 console.log(dataRecord);
 let fileId= dataRecord._id;
 let manifestPath=rootPath+ '/browser/directiveStore/flare_larskotthoff/manifest.json';

 let manifestString= `{
    "ai_directive" : "true",
    "ai_directive_type" : "content",
    "ai_directive_name" : "flare_larskotthoff",
    "ai_directive_preview":"./directiveStore/flare_larskotthoff/preview.png",
    "ai_directive_desc":"interactive hierarchy display",
    "ai_datatype":"hierarchy",
    "ai_directive_attributes" : {
        "ai_title": "Flare hierarchy",
        "ai_height" : "400",
        "ai_width" : "400",
        "ai_info_source":"${fileId}"
      }
    },`

 return fsp.writeFile(manifestPath, manifestString)
}


var seedIris = function(seedBoolean) {
  if(!seedBoolean){
    seedBoolean=false;
  }
  return new Promise(function(fulfill, reject) {
      fs.readFile('./sample_data_sets/iris.json', 'utf8', function(err, res) {
        if (err) {
          console.log(err);
          reject(err);
        }
        else fulfill(res);
      });
    })
    .then(function(contents) {
      var dataSource = {
        fileName: 'sample-data-Iris',
        dataType: 'linear',
        data: contents,
        seed: seedBoolean
      };
      return DataSource.create(dataSource)
    });
};

var createScatterManifest= function(dataRecord){
 console.log(dataRecord);
 let fileId= dataRecord._id;
 let manifestPath=rootPath+ '/browser/directiveStore/nvd3_scatter_chart/manifest.json';

 let manifestString= `{
    "ai_directive" : "true",
    "ai_directive_type" : "content",
    "ai_directive_name" : "nvd3_scatter_chart",
    "ai_directive_preview":"./directiveStore/nvd3_scatter_chart/preview.png",
    "ai_directive_desc":"interactive scatter plot",
    "ai_datatype":"linear",
    "ai_directive_attributes" : {
        "ai_title": "NVD3 Scatter; Iris Petal Width vs Length",
        "ai_height" : "400",
        "ai_info_source":"${fileId}",
        "xvalue":"petalLength",
        "yvalue": "petalWidth",
        "size":"sepalLength",
        "label":"species"
      }
    },`

 return fsp.writeFile(manifestPath, manifestString)
}

var seedAll = function(){
  return Promise.all([
    seedSmallFamTree(true),
    seedNodes_lm(true),
    seedEdges_lm(true),
    seedNodes_media(true),
    seedEdges_media(true),
    seedDataSource_company(true),
    seedIris(true),
    seedFlare(true),
    seedRosterData(true)
    ]);
};

var createBrowseTemplate=function(d3_force_basic,d3_bostock_force_node,d3_bostock_force_edge,d3_force_images_node,d3_force_images_edge,nvd3_bar_chart,nvd3_scatter_chart,flare_larskotthoff,vert_flare){
  var idObj={
    d3_force_basic:d3_force_basic._id,
    d3_bostock_force_node:d3_bostock_force_node._id,
    d3_bostock_force_edge:d3_bostock_force_edge._id,
    d3_force_images_node:d3_force_images_node._id,
    d3_force_images_edge:d3_force_images_edge._id,
    nvd3_bar_chart:nvd3_bar_chart._id,
    nvd3_scatter_chart:nvd3_scatter_chart._id,
    flare_larskotthoff:flare_larskotthoff._id,
    vert_flare:vert_flare._id
  };

  return createTemplate(idObj);
}


var seedDataSource = function() {
  return new Promise(function(fulfill, reject) {
      fs.readFile('./sample_data_sets/iris.json', 'utf8', function(err, res) {
        if (err) {
          console.log(err);
          reject(err);
        }
        else fulfill(res);
      });
    })
    .then(function(contents) {
      var dataSource = {
        fileName: 'sample-data-iris-2',
        dataType: 'linear',
        data: contents,
        seed: true
      };
      return DataSource.create(dataSource);
    });
};

var seedProject = function(data1) {
  console.log(data1._id);

  console.log(sampleConfig[0].pages.page_1.rows.row_1.cols.col_2.ai_content.ai_directive_attributes.ai_info_source);
  debugger;

  return User.findOne({ email: 'obama@gmail.com' })
    .then(function(obama) {

          return {
            name: 'Obama\s Iris',
            user: obama._id,
            config:sampleConfig,
            dataSource: [data1._id]
          };

    })
    .then(function(project) {
      return Project.create(project);
    });
};

var seedProject2 = function() {
  return User.findOne({ email: 'biden@gmail.com' })
    .then(function(biden) {
      return DataSource.findOne({ fileName: 'sample-data-iris-2' })
        //obama
        .then(function(iris) {

          return {
            name: 'Best Buds; Obama and Me',
            user: biden._id,
            config:sampleConfig,
            dataSource: iris._id
          };
        });
    })
    .then(function(project) {
      return Project.create(project);
    });
};

var seedProject3 = function() {
  return User.findOne({ email: 'obama@gmail.com' })
    .then(function(obama) {
      return DataSource.findOne({ fileName: 'sample-data-iris-2' })
        //obama
        .then(function(iris) {

          return {
            name: 'Obama Secret Project',
            user: obama._id,
            config:sampleConfig,
            dataSource: iris._id
          };
        });
    })
    .then(function(project) {
      return Project.create(project);
    });
};

connectToDb
  .then(function() {
    return wipeCollections();
  })
  .then(function() {
    return seedUsers();
  })
  .then(seedAll)
  .spread(createBrowseTemplate)
  .then(function() {
    return Promise.all([seedNodes_media(false),seedEdges_media(false)])
  })
  .spread(createManifest_media)
  .then(function() {
    return Promise.all([seedNodes_lm(),seedEdges_lm()])
  })
  .spread(createManifest_lm)
  .then(seedSmallFamTree)
  .then(createForceManifest)
  .then(seedFlare)
  .then(createFlareManifest)
  .then(seedIris)
  .then(createScatterManifest)
  .then(seedRosterData)
  .then(createManifest_twoflare)
  .then(seedDataSource_company)
  .then(createManifest_company)
  .then(function() {
    return Promise.all([seedDataSource()])
  })
  .spread(seedProject)
  .then(seedProject2)
  .then(seedProject3)
  .then(function() {
    console.log(chalk.green('Seed successful!'));
    process.kill(0);
  })
  .catch(function(err) {
    console.error(err);
    process.kill(1);
  });
