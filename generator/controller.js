app.controller('ProjectRenderCtrl', function($scope, $compile, $timeout, project, $location, $anchorScroll) {

  // This function renders the string of attributes to include in the directive being rendered
  $scope.renderattributeString = function(obj) {
    var attributeString = '';
    var ngClassString = ' ng-class="{';
    for (var attribName in obj) {
      if (attribName.indexOf('ai_bootstrap_width') > -1) {
        for (var bootSize in obj[attribName]) {
          ngClassString += "'col-" + bootSize + "-" + obj[attribName][bootSize].size + "\': true,";
        }
      } else if (attribName.indexOf('ai_bootstrap_show') > -1) {
        for (var bootShow in obj[attribName]) {
          if (obj[attribName][bootShow].show == 'false') {
            ngClassString += "'hidden-" + bootShow + "' : true,";
          }
        }
      } else {
        attributeString += attribName + '="' + obj[attribName] + '" ';
      }
    }
    ngClassString += "'edit_row_passive' : true,";
    attributeString += ngClassString;
    return attributeString;
  };

  // this function append a compiled page into the DOM
  $scope.renderPageHtmlFromAiConfig = function(obj) {
    if (obj.hasOwnProperty('ai_directive')) {
      if ((obj.ai_directive_type === 'layout') && (obj.ai_directive_name === 'ai_page')) {
        angular.element(workarea).append($compile('<' + obj.ai_directive_name + ' id="p_' + obj.ai_directive_page + '_r_' + obj.ai_directive_row + '_ai_row" ' + $scope.renderattributeString(obj.ai_directive_attributes) + '></' + obj.ai_directive_name + '>')($scope));
      }
    }
    for (var property in obj) {
      if (typeof obj[property] == "object") {
        $scope.renderPageHtmlFromAiConfig(obj[property]);
      }
    }
  };

  // this function append a compiled row into the DOM
  $scope.renderRowHtmlFromAiConfig = function(obj) {
    if (obj.hasOwnProperty('ai_directive')) {
      if ((obj.ai_directive_type === 'layout') && (obj.ai_directive_name === 'ai_row')) {
        angular.element(workarea).append($compile('<div   ' + $scope.renderattributeString(obj.ai_directive_attributes) + '\'edit_row_active\':getEditCandidate(\'p_' + obj.ai_directive_page + '_r_' + obj.ai_directive_row + '_ai_row\')}"  ><div class="container" id="p_' + obj.ai_directive_page + '_r_' + obj.ai_directive_row + '_ai_row"></div></div>')($scope));
      }
    }
    for (var property in obj) {
      if (typeof obj[property] == "object") {
        $scope.renderRowHtmlFromAiConfig(obj[property]);
      }
    }

  };

  // this function append a compiled Column into the DOM
  $scope.renderColHtmlFromAiConfig = function(obj) {
    if (obj.hasOwnProperty('ai_directive')) {
      if ((obj.ai_directive_type === 'layout') && (obj.ai_directive_name === 'ai_col')) {
        $scope.appendTarget = '#p_' + obj.ai_directive_page + '_r_' + obj.ai_directive_row + '_ai_row';
        angular.element(document.querySelector($scope.appendTarget)).append($compile('<div id="p_' + obj.ai_directive_page + '_r_' + obj.ai_directive_row + '_c_' + obj.ai_directive_col + '_ai_col" ' + $scope.renderattributeString(obj.ai_directive_attributes) + '\'edit_row_active\':getEditCandidate(\'p_' + obj.ai_directive_page + '_r_' + obj.ai_directive_row + '_c_' + obj.ai_directive_col + '_ai_col\')}" ng-mouseenter="setEditCandidate(\'p_' + obj.ai_directive_page + '_r_' + obj.ai_directive_row + '_c_' + obj.ai_directive_col + '_ai_col\')" ng-mouseleave="setEditCandidate(\'p_' + obj.ai_directive_page + '_r_' + obj.ai_directive_row + '_ai_row\')"><ai-edit-hot-spot set-active-edit-element="setEditSelect()" active-edit-element="editCandidate" edit-object-type="column" ai-edit-hot-spot-id="p_' + obj.ai_directive_page + '_r_' + obj.ai_directive_row + '_c_' + obj.ai_directive_col + '_ai_col"></ai-edit-hot-spot></div>')($scope));
      }
    }
    for (var property in obj) {
      if (typeof obj[property] == "object") {
        $scope.renderColHtmlFromAiConfig(obj[property]);
      }
    }
  };

  $scope.renderClearfixHtmlFromAiConfig = function(obj) {
    if (obj.hasOwnProperty('ai_directive')) {
      if ((obj.ai_directive_type === 'layout') && (obj.ai_directive_name === 'ai_row')) {
        $scope.appendTarget = '#p_' + obj.ai_directive_page + '_r_' + obj.ai_directive_row + '_ai_row';
        angular.element(document.querySelector($scope.appendTarget)).append($compile('<div class="clearfix"></div>')($scope));
      }
    }
    for (var property in obj) {
      if (typeof obj[property] == "object") {
        $scope.renderClearfixHtmlFromAiConfig(obj[property]);
      }
    }
  };
  // this function append a compiled Directive into the DOM
  // just a note : I dont like the fact that I am using the directives Idea of where it is to render it I would rather use the
  // position of the last column i saw while iterating.
  $scope.renderDirectiveHtmlFromAiConfig = function(obj) {
    if (obj.hasOwnProperty('ai_directive')) {
      if (obj.ai_directive_type === 'content') {
        $scope.appendTarget = '#p_' + obj.ai_directive_page + '_r_' + obj.ai_directive_row + '_c_' + obj.ai_directive_col + '_ai_col';
        angular.element(document.querySelector($scope.appendTarget)).append($compile('<div style="margin:0px;padding:0px" class="directiveLandingZone"><' + obj.ai_directive_name + ' id="p_' + obj.ai_directive_page + '_r_' + obj.ai_directive_row + '_c_' + obj.ai_directive_col + '" ' + $scope.renderattributeString(obj.ai_directive_attributes) + '\'directiveSpace\': true}"></' + obj.ai_directive_name + '></div>')($scope));
      }
    }
    for (var property in obj) {
      if (typeof obj[property] == "object") {
        $scope.renderDirectiveHtmlFromAiConfig(obj[property]);
      }
    }
  };

  $scope.project = project; //init the $scope.project for resolve of project in state machine
  $timeout(function() {
    if ($scope.project === undefined) {
      $scope.appConfig = {
        project_name: 'ourfirst app',
        pages: {}
      };
    } else {
      $scope.appConfig = {};
      angular.copy($scope.project, $scope.appConfig);
    }
  }, 100);
  // this watch block renders a the dom when the appconfig changes
  $scope.$watch('appConfig', function() {
    angular.element(workarea).empty();
    $scope.renderRowHtmlFromAiConfig($scope.appConfig, '');
    $timeout(function() {
      $scope.renderColHtmlFromAiConfig($scope.appConfig, '');
    }, 200);
    $timeout(function() {
      $scope.renderDirectiveHtmlFromAiConfig($scope.appConfig, '');
      $scope.renderClearfixHtmlFromAiConfig($scope.appConfig, '');
    }, 500);
  }, true);

});