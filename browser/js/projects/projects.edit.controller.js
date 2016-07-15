"use strict";
app.controller('ProjectEditCtrl', function($scope,$compile,$timeout,project,dataFiles,manifestFactory,$stateParams,AuthService,ProjectFactory,$location,$anchorScroll,Upload,projectDataFactory,anchorSmoothScroll){
// TEST THE FOLLOWING FUNCTIONS
// add a page
// add a row
// add a column
// add a directive

// Project Id & User Id
$scope.projId = $stateParams.id;
var getUserId = function(){
  AuthService.getLoggedInUser().then(function (user){
    $scope.userId = user._id;
  })
}
getUserId();

//fileUploader Functionality
$scope.uploadedFiles = dataFiles;
$scope.uploadFiles = function(file, errFiles) {
  $scope.f = file;
  $scope.errFile = errFiles && errFiles[0];
  if (file) {
    file.upload = Upload.upload({
        url: '/api/data/' + $scope.projId + '/' + $scope.userId,
        data: {file: file},
        method: 'POST'
    });

    file.upload.then(function (response) {
        $timeout(function () {
            file.result = response.data;
            $scope.uploadedFiles.push(file.result);
            $scope.getFields();
        });
    }, function (response) {
        if (response.status > 0)
            $scope.errorMsg = response.status + ': ' + response.data;
    }, function (evt) {
        file.progress = Math.min(100, parseInt(100.0 *
                                 evt.loaded / evt.total));
    });
  }
};


//this is to isolate headers on all files in the array
$scope.getFields= function(){
  let _fileHeaders = {};
    $scope.uploadedFiles.forEach(function(file){
      if(JSON.parse(file.data)[0]){
        let firstRow=JSON.parse(file.data)[0];
        let headers=Object.keys(firstRow);
        _fileHeaders[file._id]=headers;
      } else {
        _fileHeaders[file._id]=['not applicable']
      }
    })
    $scope.fileHeaders=_fileHeaders;
}
//this gets headers for specific file id
$scope.getHeaders = function(fileId,fileHeaders){
  var headers;
  if(fileId){
    headers=fileHeaders[fileId];
  }
  return headers;
}


$scope.getFields();
// this is the app config
$scope.appConfigtemp={};
$scope.allManifests={};
$scope.appConfigMaster={}; // this the version that is in sync with the database 0th position
$scope.appConfigLayoutEditCopy={}
$scope.appConfigEditCopy={}; // this is the copy of of object being edited that copied to appConfigViewDriver when;
$scope.appConfigViewDriver={}; // this is the copy of of object being edited that copied to appConfigViewDriver when
$scope.referenceToEditInAppConfig={};
$scope.activeEdit={};
$scope.CurrentViewWidth='0';
$scope.containermode='container';
//$scope.project_info_sources=[{"id":"5765c87f0c9b38eff0f8dcb7","description":"this is an info"},{"id":"0930ej2n32dj023dn23d02n3d","description":"this is also an info"}];
$scope.availableColumnWidths=[{'width':'1'},{'width':'2'},{'width':'3'},{'width':'4'},{'width':'5'},{'width':'6'},{'width':'7'},{'width':'8'},{'width':'9'},{'width':'10'},{'width':'11'},{'width':'12'}];
$scope.availableColumnShow=[{'show':'true'},{'show':'false'}];
$scope.builtInManifests=[];
$scope.lastPage='0';
$scope.lastRow='0';
$scope.lastColumn='0';
$scope.levelsOfUndo=5;
//get all manifests
manifestFactory.getAll()
.then(function(data){
  $scope.allManifests=data.data;
});
// this object gets

$scope.ai_page_manifest={
    ai_directive : true,
    ai_directive_type : 'layout',
    ai_directive_name : 'ai_page',
    ai_directive_attributes : {
        ai_class : '/css/row_a/style.css',
        ai_page_title:'',
        ai_page_menu_text :''
    }
};

$scope.ai_row_manifest={
    ai_directive : true,
    ai_directive_type : 'layout',
    ai_directive_name : 'ai_row',
    ai_directive_attributes : {
        ai_class : '/css/row_a/style.css',
        'class' : '',
        'style' : '',
        'ai_bootstrap_show': {'xs':{'colsize':'xs','show':'true','devicename':'phone'},'sm':{'colsize':'sm','show':'true','devicename':'tablet'},'md':{'colsize':'md','show':'true','devicename':'laptop'},'lg':{'colsize':'lg','show':'true','devicename':'desktop'}}
    }
};

$scope.ai_column_manifest={
    ai_directive : true,
    ai_directive_type : 'layout',
    ai_directive_name : 'ai_col',
    ai_directive_attributes : {
        ai_class : '/css/row_a/style.css',
        class : '',
        style:'',
        'ai_bootstrap_show': {'xs':{'colsize':'xs','show':'true','devicename':'phone'},'sm':{'colsize':'sm','show':'true','devicename':'tablet'},'md':{'colsize':'md','show':'true','devicename':'laptop'},'lg':{'colsize':'lg','show':'true','devicename':'desktop'}},
        'ai_bootstrap_width': {'xs':{'colsize':'xs','devicename':'phone','size':'12'},'sm':{'colsize':'sm','devicename':'tablet','size':'12'},'md':{'colsize':'md','devicename':'laptop','size':'6'},'lg':{'colsize':'lg','devicename':'desktop','size':'6'}}

    },
    ai_content : {}
};

$scope.builtInManifests[0]=$scope.ai_page_manifest;
$scope.builtInManifests[1]=$scope.ai_row_manifest;

// this function get the last page numb in config
$scope.getTargetObjectById=function(page,row,column,landDirective){
  if(landDirective){
      return $scope.appConfig.pages['page_'+page]['rows']['row_'+row]['cols']['col_'+column]['ai_content'];
  }else if(column){
      return $scope.appConfig.pages['page_'+page]['rows']['row_'+row]['cols']['col_'+column];
  }else if(row){
      return  $scope.appConfig.pages['page_'+page]['rows']['row_'+row];
  }else if(page){
    return  $scope.appConfig.pages['page_'+page];
  }
};

$scope.deleteTargetObjectById=function(page,row,column,landDirective){
  if(landDirective){
      delete $scope.appConfig.pages['page_'+page]['rows']['row_'+row]['cols']['col_'+column]['ai_content'];
  }else if(column){
      delete $scope.appConfig.pages['page_'+page]['rows']['row_'+row]['cols']['col_'+column];
  }else if(row){
      delete  $scope.appConfig.pages['page_'+page]['rows']['row_'+row];
  }else if(page){
    delete  $scope.appConfig.pages['page_'+page];
  }
};

$scope.getLastPage=function(){
  try{
    $scope.lastPage=0;
    for(var key in $scope.appConfig.pages){
        $scope.lastPage++;
    }
    return $scope.lastPage
  }catch(e){}

};

// this function get the last row numb in config or for a given page
$scope.getLastRow=function(page){
    var myPage=0;
    if( page > 0 ){ myPage = page; }else{ myPage = $scope.getLastPage(); }
    try{
        $scope.lastRow=0;
        for(var key in $scope.appConfig.pages['page_'+myPage].rows){
            $scope.lastRow++;
        }
          return $scope.lastRow;
    }catch(e){}
};

// this function get the last col numb in config or for a given row
$scope.getLastColumn=function(page,row){
      var myPage=0;
      var myRow=0;
      if( page > 0 ){ myPage=page; }else{ myPage=$scope.getLastPage(); }
      if( row > 0 ){ myRow = row; }else{ myRow = $scope.getLastRow(myPage); }
      $scope.lastColumn=0;
      for(var key in $scope.appConfig.pages['page_'+myPage].rows['row_'+myRow]['cols']){
          $scope.lastColumn++;
      }
      return $scope.lastColumn;
};

// this function takes a manifest and sets it up for being inserted into the appConfig.
// it does this bt adding the page,row,and,column properites.
$scope.moveConfigObjectToEdit=function(configObject){
  $scope.referenceToEditInAppConfig=configObject; // this is reference to the needed appConfig object
  angular.copy(configObject,$scope.appConfigEditCopy);
};

// this function moves the edit version of teh appconfig object beging edit from edit object to it place in te appConfig objec
$scope.saveEdit=function(caller){
    angular.copy($scope.appConfigEditCopy,$scope.referenceToEditInAppConfig);
    $scope.project.config.unshift(JSON.stringify($scope.appConfig));
    if($scope.project.config.length > $scope.levelsOfUndo ){
        $scope.project.config.splice($scope.levelsOfUndo,$scope.project.config.length);
    }
    ProjectFactory.update($scope.project)
    .then(function(result){
    //    console.dir(result);
      /*angular.copy(result.config[0],$scope.appConfigTemp);
        $scope.normalizeIds($scope.appConfigTemp); // normalize the object before it is render
        $timeout(function(){
            angular.copy($scope.appConfigTemp,$scope.appConfig);
        },500); */
    });
    if(caller !== 'addtoPage'){$scope.clearEdit()};
};

$scope.saveEntireProject=function(caller){
    $scope.project.config.unshift(JSON.stringify($scope.appConfig));
    if($scope.project.config.length > $scope.levelsOfUndo ){
        $scope.project.config.splice($scope.levelsOfUndo,$scope.project.config.length);
    }
    ProjectFactory.update($scope.project)
    .then(function(result){
    });
    if(caller !== 'addtoPage'){$scope.clearEdit()};
};// clear the app out of edit mode

$scope.clearEdit=function(){
    $timeout(function(){$scope.appConfigEditCopy={}},500);
    $scope.cplopen=false;
    $scope.SDopen=false;
};

$scope.deleteElement=function(){
console.dir($scope.appConfigEditCopy);
 $scope.deleteTargetObjectById($scope.appConfigEditCopy.ai_directive_page,$scope.appConfigEditCopy.ai_directive_row,$scope.appConfigEditCopy.ai_directive_col);
 $scope.project.config.unshift($scope.appConfig);
    if($scope.project.config.length > $scope.levelsOfUndo ){
      $scope.project.config.splice($scope.levelsOfUndo,$scope.project.config.length);
    }
    ProjectFactory.update($scope.project)
    .then(function(result){
    });
};
$scope.undoEdit=function(){
    angular.copy({},$scope.referenceToEditInAppConfig);
    $scope.project.config.unshift($scope.appConfig);
    if($scope.project.config.length > $scope.levelsOfUndo ){
      $scope.project.config.splice($scope.levelsOfUndo,$scope.project.config.length);
    }
    ProjectFactory.update($scope.project)
    .then(function(result){
    });
};


// this function takes your manifest object and add the ai-page,ai-row and ai-col attributes makeing is suitable for insertion into the appConfig
$scope.manifestToAppConfig=function(page,row,column,manifestObj){
  //console.log(page);
  if(column > 0){
      manifestObj.ai_directive_page = page;
      manifestObj.ai_directive_row = row;
      manifestObj.ai_directive_col = column;
      return manifestObj;
  }else if(row > 0){
      manifestObj.ai_directive_page = page;
      manifestObj.ai_directive_row = row;
      manifestObj.ai_directive_col = '';
      return manifestObj;
  }else if(page > 0){
    //console.log(manifestObj);
      manifestObj.ai_directive_page = page;
      manifestObj.ai_directive_row = '';
      manifestObj.ai_directive_col = '';
      return manifestObj;
    }
};

// This function renders the string of attributes to include in the directive being rendered
$scope.renderattributeString=function(obj){
    var attributeString='';
    var ngClassString=' ng-class="{';
    for(var attribName in obj){
        if(attribName.indexOf('ai_bootstrap_width') > -1 ){
            for(var bootSize in obj[attribName]){
             ngClassString+="'col-"+bootSize+"-"+obj[attribName][bootSize]['size']+"\': true,";
            }
        }else if(attribName.indexOf('ai_bootstrap_show') > -1){
           for(var bootShow in obj[attribName]){
                if(obj[attribName][bootShow]['show'] == 'false'){
                    ngClassString+="'hidden-"+bootShow+"' : true,";
                }
            }
        }else{
            attributeString+=attribName+'="'+obj[attribName]+'" ';
        }
    }
    ngClassString+="'edit_row_passive' : true,";
    attributeString+=ngClassString;
    return attributeString;
};

$scope.normalizeIds=function(obj,stack){

      if (obj.hasOwnProperty('ai_directive')) {
              if (stack === undefined){
                  var stack={
                      lastNormalPage:0,
                      lastNormalRow:0,
                      lastNormalCol:0
                  }
              }
             //if its a page
             if((obj.ai_directive_type ==='layout') && (obj['ai_directive_name'] === 'ai_page')){
                  stack.lastNormalPage++;
                  stack.lastNormalRow=0;
                  console.log('ai_page'+stack.lastNormalPage);
                  obj.ai_directive_page=stack.lastNormalPage;
                  obj.ai_directive_row="";
                  obj.ai_directive_col="";
             }
             //if its a row
             if((obj.ai_directive_type ==='layout') && (obj['ai_directive_name'] === 'ai_row')){
                stack.lastNormalRow++;
                stack.lastNormalCol=0;
                 console.log('ai_row'+stack.lastNormalRow);
                  obj.ai_directive_page=stack.lastNormalPage;
                  obj.ai_directive_row=stack.lastNormalRow;
                  obj.ai_directive_col="";
                  var counter=0;
                  var tempArry=[];
                  var tempObj={};
                  for(var key in obj['cols']){ tempArry.push(obj['cols'][key]); }
                      obj['cols']={};
                      for(var i=0; i < tempArry.length; i++){
                          tempObj['col_'+(i+1)]=tempArry[i];
                      }
                      obj['cols']=tempObj;
              }
             //if its a col
             if((obj.ai_directive_type ==='layout') && (obj['ai_directive_name'] === 'ai_col')){
                stack.lastNormalCol++;
               // console.log('ai_col'+stack.lastNormalCol);
                  obj.ai_directive_page=stack.lastNormalPage;
                  obj.ai_directive_row=stack.lastNormalRow;
                  obj.ai_directive_col=stack.lastNormalCol;
             }
             //if its a content
             if((obj.ai_directive_type ==='content')){
                  obj.ai_directive_page=stack.lastNormalPage;
                  obj.ai_directive_row=stack.lastNormalRow;
                  obj.ai_directive_col=stack.lastNormalCol;
             }
      }
      for (var property in obj) {
                if(typeof obj[property] == "object"){
                    $scope.normalizeIds(obj[property],stack);
                }
      }
};

// this function append a compiled page into the DOM
$scope.renderPageHtmlFromAiConfig=function(obj) {
      if (obj.hasOwnProperty('ai_directive')) {
        if((obj.ai_directive_type ==='layout') && (obj['ai_directive_name'] === 'ai_page')){
                  angular.element(workarea).append($compile('<'+obj['ai_directive_name']+' id="p_'+obj['ai_directive_page']+'_r_'+obj['ai_directive_row']+'_ai_row" '+ $scope.renderattributeString(obj['ai_directive_attributes'])+'></'+obj['ai_directive_name']+'>')($scope));
        }
      }
      for (var property in obj) {
                if(typeof obj[property] == "object"){
                    $scope.renderPageHtmlFromAiConfig(obj[property]);
                }
      }
};

// this function append a compiled row into the DOM
$scope.renderRowHtmlFromAiConfig=function(obj) {
      if (obj.hasOwnProperty('ai_directive')) {
        if((obj.ai_directive_type ==='layout') && (obj['ai_directive_name'] === 'ai_row')){
                angular.element(workarea).append($compile('<div   '+ $scope.renderattributeString(obj['ai_directive_attributes'])+'\'edit_row_active\':getEditCandidate(\'p_'+obj['ai_directive_page']+'_r_'+obj['ai_directive_row']+'_ai_row\')}"   ng-mouseenter="setEditCandidate(\'p_'+obj['ai_directive_page']+'_r_'+obj['ai_directive_row']+'_ai_row\')" ng-mouseleave="setEditCandidate(\'\')"><ai-edit-hot-spot set-active-edit-element="setEditSelect()" " active-edit-element="editCandidate" edit-object-type="row" ai-edit-hot-spot-id="p_'+obj['ai_directive_page']+'_r_'+obj['ai_directive_row']+'_ai_row"></ai-edit-hot-spot><div class="container" id="p_'+obj['ai_directive_page']+'_r_'+obj['ai_directive_row']+'_ai_row"></div></div>')($scope));
                  //angular.element(workarea).append($compile('<div style="padding:0px" ng-mouseenter="setEditCandidate(\'p_'+obj['ai_directive_page']+'_r_'+obj['ai_directive_row']+'_ai_row\')" ng-mouseleave="setEditCandidate(\'\')"><ai-edit-hot-spot set-active-edit-element="setEditSelect()" active-edit-element="editCandidate" ai-edit-hot-spot-id="p_'+obj['ai_directive_page']+'_r_'+obj['ai_directive_row']+'_ai_row"></ai-edit-hot-spot>    <div  id="p_'+obj['ai_directive_page']+'_r_'+obj['ai_directive_row']+'_ai_row" '+ $scope.renderattributeString(obj['ai_directive_attributes'])+'\'edit_row_active\':getEditCandidate(\'p_'+obj['ai_directive_page']+'_r_'+obj['ai_directive_row']+'_ai_row\')}"</div></div>')($scope));
        }
      }
      for (var property in obj) {
                if(typeof obj[property] == "object"){
                    $scope.renderRowHtmlFromAiConfig(obj[property]);
                }
      }

};

// this function append a compiled Column into the DOM
$scope.renderColHtmlFromAiConfig=function(obj) {
      if (obj.hasOwnProperty('ai_directive')) {
        if((obj['ai_directive_type'] ==='layout') && (obj['ai_directive_name'] === 'ai_col')){
                 $scope.appendTarget='#p_'+obj['ai_directive_page']+'_r_'+obj['ai_directive_row']+'_ai_row';
                  angular.element(document.querySelector( $scope.appendTarget )).append($compile('<div id="p_'+obj['ai_directive_page']+'_r_'+obj['ai_directive_row']+'_c_'+obj['ai_directive_col']+'_ai_col" '+ $scope.renderattributeString(obj['ai_directive_attributes'])+'\'edit_row_active\':getEditCandidate(\'p_'+obj['ai_directive_page']+'_r_'+obj['ai_directive_row']+'_c_'+obj['ai_directive_col']+'_ai_col\')}" ng-mouseenter="setEditCandidate(\'p_'+obj['ai_directive_page']+'_r_'+obj['ai_directive_row']+'_c_'+obj['ai_directive_col']+'_ai_col\')" ng-mouseleave="setEditCandidate(\'p_'+obj['ai_directive_page']+'_r_'+obj['ai_directive_row']+'_ai_row\')"><ai-edit-hot-spot set-active-edit-element="setEditSelect()" active-edit-element="editCandidate" edit-object-type="column" ai-edit-hot-spot-id="p_'+obj['ai_directive_page']+'_r_'+obj['ai_directive_row']+'_c_'+obj['ai_directive_col']+'_ai_col"></ai-edit-hot-spot></div>')($scope));
        }
      }
      for (var property in obj) {
                if(typeof obj[property] == "object"){
                    $scope.renderColHtmlFromAiConfig(obj[property]);
                }
      }
};

$scope.renderClearfixHtmlFromAiConfig=function(obj) {
      if (obj.hasOwnProperty('ai_directive')) {
        if((obj['ai_directive_type'] ==='layout') && (obj['ai_directive_name'] === 'ai_row')){
                 $scope.appendTarget='#p_'+obj['ai_directive_page']+'_r_'+obj['ai_directive_row']+'_ai_row';
                  angular.element(document.querySelector( $scope.appendTarget )).append($compile('<div class="clearfix"></div>')($scope));
        }
      }
      for (var property in obj) {
                if(typeof obj[property] == "object"){
                    $scope.renderClearfixHtmlFromAiConfig(obj[property]);
                }
      }
};
// this function append a compiled Directive into the DOM
// just a note : I dont like the fact that I am using the directives Idea of where it is to render it I would rather use the
// position of the last column i saw while iterating.
$scope.renderDirectiveHtmlFromAiConfig=function(obj) {
      if (obj.hasOwnProperty('ai_directive')) {
        if(obj['ai_directive_type'] === 'content'){
            $scope.appendTarget='#p_'+obj['ai_directive_page']+'_r_'+obj['ai_directive_row']+'_c_'+obj['ai_directive_col']+'_ai_col';
            angular.element(document.querySelector( $scope.appendTarget )).append($compile('<div style="margin:0px;padding:0px" class="directiveLandingZone"><'+obj['ai_directive_name']+' id="p_'+obj['ai_directive_page']+'_r_'+obj['ai_directive_row']+'_c_'+obj['ai_directive_col']+'" '+$scope.renderattributeString(obj['ai_directive_attributes'])+'\'directiveSpace\': true}"></'+obj['ai_directive_name']+'></div>')($scope));
        }
      }
      for (var property in obj) {
                if(typeof obj[property] == "object"){
                    $scope.renderDirectiveHtmlFromAiConfig(obj[property]);
                }
      }
};

// this function adds a new element to the config obj
$scope.creatConfigObject=function(target,obj){
  //target=obj;
  angular.copy(obj,target);
};
// this read a appConfig object
$scope.readConfigObject=function(target,newelement){

};

// this function updates a appconfig object
$scope.updateConfigObject=function(target,newelement,obj){
  target[newelement]=obj;
};

// this function deletes a object from the appConfig object
$scope.deleteconfigObject=function(target,subElement){
  delete target[subElement];
};

// this functon get the next row number to assgin for the current page
$scope.getNextRowPage=function(page){
  var newRow;
  return  newRow;
 };

// this functon get the next row and column number to assgin for the current page
$scope.getNextColumnInRow=function(page,row){
  var newCol;
  return  newCol;
};

// this function will create the needed target object and return a reference to the  config target
$scope.makeConfigTarget=function(page,row,column,landDirective){
  if(landDirective){
    if($scope.appConfig.pages['page_'+page]['rows']['row_'+row]['cols'].hasOwnProperty('col_'+column)){
      return $scope.appConfig.pages['page_'+page]['rows']['row_'+row]['cols']['col_'+column]['ai_content']={};
    }
  }else if(column){
    if(!$scope.appConfig.pages['page_'+page]['rows']['row_'+row].hasOwnProperty('cols')){$scope.appConfig.pages['page_'+page]['rows']['row_'+row]['cols']={}};
      return $scope.appConfig.pages['page_'+page]['rows']['row_'+row]['cols']['col_'+column]={};
  }else if(row){
      if(!$scope.appConfig.pages['page_'+page].hasOwnProperty('rows')){$scope.appConfig.pages['page_'+page]['rows']={}};
      return  $scope.appConfig.pages['page_'+page]['rows']['row_'+row]={};
  }else if(page){
    if(!$scope.appConfig.pages.hasOwnProperty('pages')){$scope.appConfig.pages={}; }
    return  $scope.appConfig.pages['page_'+page]={};
  }
};

$scope.setPostionProperties=function(object,page,row,column){
      object.ai_directive_page=page;
      object.ai_directive_row=row;
      object.ai_directive_col=column;
}

$scope.moveElementHorz=function(direction){
  console.log(direction);
   if(($scope.appConfigEditCopy.ai_directive_col-1 < 1) && (direction === 'left')){return}else{var targetColPosition=$scope.appConfigEditCopy.ai_directive_col-1};
   if(direction === 'right'){var targetColPosition=$scope.appConfigEditCopy.ai_directive_col+1};
    var configTarget=$scope.getTargetObjectById($scope.appConfigEditCopy.ai_directive_page,$scope.appConfigEditCopy.ai_directive_row,targetColPosition);
    if((configTarget === undefined)){return};
    console.log(configTarget);

    // move the element to the left/right into the active elements position
    angular.copy(configTarget,$scope.referenceToEditInAppConfig);
    //correct the position labels

    $scope.setPostionProperties($scope.referenceToEditInAppConfig,$scope.appConfigEditCopy.ai_directive_page,$scope.appConfigEditCopy.ai_directive_row,$scope.appConfigEditCopy.ai_directive_col);
    $scope.setPostionProperties($scope.referenceToEditInAppConfig.ai_content,$scope.appConfigEditCopy.ai_directive_page,$scope.appConfigEditCopy.ai_directive_row,$scope.appConfigEditCopy.ai_directive_col);
    //correct the position labels in the edit copy
    $scope.setPostionProperties($scope.appConfigEditCopy,$scope.appConfigEditCopy.ai_directive_page,$scope.appConfigEditCopy.ai_directive_row,targetColPosition);
    $scope.setPostionProperties($scope.appConfigEditCopy.ai_content,$scope.appConfigEditCopy.ai_directive_page,$scope.appConfigEditCopy.ai_directive_row,$scope.appConfigEditCopy.ai_directive_col);
    // move edit copy content into left element
    angular.copy($scope.appConfigEditCopy,configTarget);
    $scope.saveEntireProject();
}

$scope.moveElementVert=function(direction){
    var targetRowPosition=0;
    if(($scope.appConfigEditCopy.ai_directive_row-1 < 1) && (direction === 'up')){return}else{var targetRowPosition=$scope.appConfigEditCopy.ai_directive_row-1};
    if(direction === 'down'){targetRowPosition=$scope.appConfigEditCopy.ai_directive_row+1};
    var configTarget=$scope.makeConfigTarget($scope.appConfigEditCopy.ai_directive_page,targetRowPosition,$scope.getLastColumn($scope.appConfigEditCopy.ai_directive_page,targetRowPosition)+1);
    if((configTarget === undefined)){return};
    // move the element to the into the active elements position
    angular.copy($scope.appConfigEditCopy,configTarget);
    $scope.setPostionProperties(configTarget,$scope.appConfigEditCopy.ai_directive_page,targetRowPosition,$scope.getLastColumn($scope.appConfigEditCopy.ai_directive_page,targetRowPosition))
    $scope.setPostionProperties(configTarget.ai_content,$scope.appConfigEditCopy.ai_directive_page,targetRowPosition,$scope.getLastColumn($scope.appConfigEditCopy.ai_directive_page,targetRowPosition))
    angular.copy({},$scope.referenceToEditInAppConfig);
    $scope.saveEntireProject();

}


// add a page
$scope.addNewPage=function(page,manifest){
  // get the next available page number
  // call manifestToAppConfig on that page number to the config
  $scope.configTarget=$scope.makeConfigTarget(1);
  // copy it to the edit object
  // send it to the server
  // replace the appconfig the servers reply (now the server and the page are in sync)
  // it will then take that page object and add it
  $scope.creatConfigObject($scope.configTarget,$scope.manifestToAppConfig(page,'','',manifest));
};
// add a row
$scope.addNewRow=function(page,row,manifest){
  // call manifestToAppConfig on that page number to the config
  $scope.configTarget=$scope.makeConfigTarget(page,row);
  // copy it to the edit object
  // send it to the server
  // replace the appconfig the servers reply (now the server and the page are in sync)
  // it will then take that page object and add it
  //console.log($scope.configTarget);
  $scope.creatConfigObject($scope.configTarget,$scope.manifestToAppConfig(page,row,'',manifest));
};
$scope.addNewColumn=function(page,row,column,manifest){
  // get the next available row number
  // call manifestToAppConfig on that page number to the config
  $scope.configTarget=$scope.makeConfigTarget(page,row,column);
  // copy it to the edit object
  // send it to the server
  // replace the appconfig the servers reply (now the server and the page are in sync)
  // it will then take that page object and add it
  $scope.creatConfigObject($scope.configTarget,$scope.manifestToAppConfig(page,row,column,manifest));
};
// add new directive NOTE: there is no add column because there is a one to one relationshiop between direstives and columns
$scope.addNewDirective=function(page,row,column,manifest){
  // get the next available column number
  // call manifestToAppConfig on that page number to the config
  $scope.configTarget=$scope.makeConfigTarget(page,row,column,column);
  // copy it to the edit object
  // send it to the server
  // replace the appconfig the servers reply (now the server and the page are in sync)
  // it will then take that page object and add it
  $scope.creatConfigObject($scope.configTarget,$scope.manifestToAppConfig(page,row,column,manifest));
  $scope.moveConfigObjectToEdit($scope.configTarget);
};

$scope.addToPage=function(manifest){

  console.log('running add',manifest);
  //if the directive is a layout type
  if(manifest.ai_directive_type === 'layout'){
      if(manifest.ai_directive_name === 'ai_page'){
        $scope.addNewPage($scope.lastPage+1,manifest);
      }else if(manifest.ai_directive_name === 'ai_row'){
          $scope.addNewRow($scope.lastPage,$scope.lastRow+1,manifest);
      }else if(manifest.ai_directive_name === 'ai_col'){
        $scope.addNewColumn($scope.lastPage,$scope.lastRow,$scope.lastColumn+1,manifest);
      }
  }else{
      $scope.addNewColumn($scope.lastPage,$scope.lastRow,$scope.lastColumn+1,$scope.ai_column_manifest);
      $timeout(function(){
        $scope.addNewDirective($scope.lastPage,$scope.lastRow,$scope.lastColumn,manifest);
        $scope.setEditCandidate('p_'+$scope.lastPage+'_r_'+$scope.lastRow+'_c_'+$scope.lastColumn+'_ai_col');
        $scope.setEditSelect();
        $scope.DSopen=false;
        $scope.saveEdit('addtoPage');

      },1000);
  }
  $scope.DSopen=false;
  $timeout(function(){$scope.cplopen=true},1500);

  

};

$scope.project=project; //init the $scope.project for resolve of project in state machine
$timeout(function(){
    if($scope.project.config[0] === undefined){
      //console.log('setting up');
        $scope.appConfig={
            project_name : 'ourfirst app',
            pages:{}
        };
    }else{
        $scope.appConfig={};
        $scope.appConfigTemp={};
        angular.copy(JSON.parse($scope.project.config[0]),$scope.appConfigTemp);
        $scope.normalizeIds($scope.appConfigTemp); // normalize the object before it is render
        $timeout(function(){
            angular.copy($scope.appConfigTemp,$scope.appConfig);
            console.dir($scope.appConfig);
        },500);
    }
   // angular.copy($scope.appConfigtemp,$scope.appConfig);
},100);
// this watch block renders a the dom when the appconfig changes
$scope.$watch('appConfig',function(){
  angular.element(workarea).empty();
  $scope.renderRowHtmlFromAiConfig($scope.appConfig, '');
  $timeout(function(){
    $scope.renderColHtmlFromAiConfig($scope.appConfig, '');
  },200);
  $timeout(function(){
      $scope.renderDirectiveHtmlFromAiConfig($scope.appConfig, '');
      $scope.getLastColumn();
      $scope.renderClearfixHtmlFromAiConfig($scope.appConfig, '');
      $scope.gotoElement($scope.editCandidate);
  },500);
},true);

$scope.getEditCandidate=function(id){
    if(id === $scope.editCandidate){
      return true
    }else{
      return  false;
    }
}

$scope.setEditCandidate=function(id){
    $scope.editCandidate = id;
}

$scope.findDirectiveToMakeActiveEdit=function(obj,idToMatch) {
      if (obj.hasOwnProperty('ai_directive')) {
        if((obj.ai_directive_type ==='layout')){
                  var rowidstring='p_'+obj['ai_directive_page']+'_ai_page';
                  var rowidstring='p_'+obj['ai_directive_page']+'_r_'+obj['ai_directive_row']+'_ai_row';
                  var colidstring='p_'+obj['ai_directive_page']+'_r_'+obj['ai_directive_row']+'_c_'+obj['ai_directive_col']+'_ai_col';
                if((idToMatch == rowidstring) || (idToMatch == colidstring)){
                      $scope.referenceToEditInAppConfig=obj;
                      angular.copy(obj,$scope.appConfigEditCopy);
                      return
                }
        }
      }
      for (var property in obj) {
                if(typeof obj[property] == "object"){
                    $scope.findDirectiveToMakeActiveEdit(obj[property],idToMatch);
                }
      }
};

$scope.gotoElement = function (eID){
  // set the location.hash to the id of
  // the element you wish to scroll to.
  $location.hash(eID);
  // call $anchorScroll()
  anchorSmoothScroll.scrollTo(eID);
};

$scope.setEditSelect=function(id){
    // THE DIRECTIVE THAT IS IN THE EDIT CANDIDATE COLUMN
    $scope.cplopen=true;
    $scope.DSopen=false;
    $scope.findDirectiveToMakeActiveEdit($scope.appConfig,$scope.editCandidate);
    $scope.gotoElement($scope.editCandidate);
}
$timeout(function(){
if($scope.appConfig.pages.page_1 === undefined){$scope.addToPage($scope.builtInManifests[0])};
if($scope.appConfig.pages.page_1.rows.row_1 === undefined){$scope.addToPage($scope.builtInManifests[1])};
},1000);
$timeout(function(){
if($scope.appConfig.pages.page_1.rows === undefined){$scope.addToPage($scope.builtInManifests[1])};
},5000);
});

