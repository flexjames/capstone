'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

window.app = angular.module('FullstackGeneratedApp', ['fsaPreBuilt', 'ui.router', 'ui.bootstrap', 'ngAnimate', 'nvd3', 'ngFileUpload']);

app.config(function ($urlRouterProvider, $locationProvider) {
  // This turns off hashbang urls (/#about) and changes it to something normal (/about)
  $locationProvider.html5Mode(true);
  // If we go to a URL that ui-router doesn't have registered, go to the "/" url.
  $urlRouterProvider.otherwise('/');
  // Trigger page refresh when accessing an OAuth route
  $urlRouterProvider.when('/auth/:provider', function () {
    window.location.reload();
  });
});

// This app.run is for controlling access to specific states.
app.run(function ($rootScope, AuthService, $state) {

  // The given state requires an authenticated user.
  var destinationStateRequiresAuth = function destinationStateRequiresAuth(state) {
    return state.data && state.data.authenticate;
  };

  // $stateChangeStart is an event fired
  // whenever the process of changing a state begins.
  $rootScope.$on('$stateChangeStart', function (event, toState, toParams) {

    if (!destinationStateRequiresAuth(toState)) {
      // The destination state does not require authentication
      // Short circuit with return.
      return;
    }

    if (AuthService.isAuthenticated()) {
      // The user is authenticated.
      // Short circuit with return.
      return;
    }

    // Cancel navigating to new state.
    event.preventDefault();

    AuthService.getLoggedInUser().then(function (user) {
      // If a user is retrieved, then renavigate to the destination
      // (the second time, AuthService.isAuthenticated() will work)
      // otherwise, if no user is logged in, go to "login" state.
      if (user) {
        $state.go(toState.name, toParams);
      } else {
        $state.go('login');
      }
    });
  });
});

app.config(function ($stateProvider) {

  // Register our *about* state.
  $stateProvider.state('about', {
    url: '/about',
    controller: 'AboutController',
    templateUrl: 'js/about/about.html'
  });
});

app.controller('AboutController', function ($scope) {});
app.config(function ($stateProvider) {
  $stateProvider.state('docs', {
    url: '/docs',
    templateUrl: 'js/docs/docs.html'
  });
});

app.config(function ($stateProvider) {
  $stateProvider.state('datasources', {
    url: '/datasources',
    templateUrl: 'js/datasources/datasources.html',
    controller: 'DsController',
    resolve: {
      userData: function userData(projectDataFactory, AuthService) {
        return AuthService.getLoggedInUser().then(function (user) {
          if (user) {
            var userId = user._id;
            return projectDataFactory.dataByUserId(userId);
          }
        });
      }
    }
  });
});

app.controller('DsController', function ($scope, userData, $uibModal) {
  $scope.userData = userData;
  $scope.open = function (_data) {
    var modalInstance = $uibModal.open({
      controller: 'ModalController',
      templateUrl: 'js/datasources/modalContent.html',
      resolve: {
        data: function data() {
          return _data;
        }
      }
    });
  };
});
app.controller('ModalController', function ($scope, data, $uibModalInstance) {
  $scope.data = data;

  $scope.close = function () {
    $uibModalInstance.close();
  };
});
app.directive('aiDownload', ['DownloadFactory', function (DownloadFactory) {
  return {
    restrict: 'E',
    templateUrl: '/js/download/download.html',
    scope: '=',
    link: function link(scope, element) {
      scope.downloadHtml = function () {
        DownloadFactory.getHtml(scope.projId).then(function (htmlfile) {
          var myHtmlFile = new File([htmlfile.data], { type: 'text/html' });
          saveAs(myHtmlFile, 'index.html');
        });
      };

      scope.downloadJs = function () {
        DownloadFactory.getJs(scope.projId).then(function (jsfile) {
          var myJsFile = new File([jsfile.data], { type: 'application/javascript' });
          saveAs(myJsFile, 'script.js');
        });
      };
    }
  };
}]);

app.factory('DownloadFactory', ['$http', function ($http) {
  return {
    getJs: function getJs(id) {
      return $http.get('/api/generator/js/' + id);
    },
    getHtml: function getHtml(id) {
      return $http.get('/api/generator/html/' + id);
    }
  };
}]);
(function () {

  'use strict';

  // Hope you didn't forget Angular! Duh-doy.

  if (!window.angular) throw new Error('I can\'t find Angular!');

  var app = angular.module('fsaPreBuilt', []);

  // AUTH_EVENTS is used throughout our app to
  // broadcast and listen from and to the $rootScope
  // for important events about authentication flow.
  app.constant('AUTH_EVENTS', {
    loginSuccess: 'auth-login-success',
    loginFailed: 'auth-login-failed',
    logoutSuccess: 'auth-logout-success',
    sessionTimeout: 'auth-session-timeout',
    notAuthenticated: 'auth-not-authenticated',
    notAuthorized: 'auth-not-authorized'
  });

  app.factory('AuthInterceptor', function ($rootScope, $q, AUTH_EVENTS) {
    var statusDict = {
      401: AUTH_EVENTS.notAuthenticated,
      403: AUTH_EVENTS.notAuthorized,
      419: AUTH_EVENTS.sessionTimeout,
      440: AUTH_EVENTS.sessionTimeout
    };
    return {
      responseError: function responseError(response) {
        $rootScope.$broadcast(statusDict[response.status], response);
        return $q.reject(response);
      }
    };
  });

  app.config(function ($httpProvider) {
    $httpProvider.interceptors.push(['$injector', function ($injector) {
      return $injector.get('AuthInterceptor');
    }]);
  });

  app.service('AuthService', function ($http, Session, $rootScope, AUTH_EVENTS, $q) {

    function onSuccessfulLogin(response) {
      var data = response.data;
      Session.create(data.id, data.user);
      $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
      return data.user;
    }

    // Uses the session factory to see if an
    // authenticated user is currently registered.
    this.isAuthenticated = function () {
      return !!Session.user;
    };

    this.getLoggedInUser = function (fromServer) {

      // If an authenticated session exists, we
      // return the user attached to that session
      // with a promise. This ensures that we can
      // always interface with this method asynchronously.

      // Optionally, if true is given as the fromServer parameter,
      // then this cached value will not be used.

      if (this.isAuthenticated() && fromServer !== true) {
        return $q.when(Session.user);
      }

      // Make request GET /session.
      // If it returns a user, call onSuccessfulLogin with the response.
      // If it returns a 401 response, we catch it and instead resolve to null.
      return $http.get('/session').then(onSuccessfulLogin).catch(function () {
        return null;
      });
    };

    this.login = function (credentials) {
      return $http.post('/login', credentials).then(onSuccessfulLogin).catch(function () {
        return $q.reject({ message: 'Invalid login credentials.' });
      });
    };

    this.logout = function () {
      return $http.get('/logout').then(function () {
        Session.destroy();
        $rootScope.$broadcast(AUTH_EVENTS.logoutSuccess);
      });
    };
  });

  app.service('Session', function ($rootScope, AUTH_EVENTS) {

    var self = this;

    $rootScope.$on(AUTH_EVENTS.notAuthenticated, function () {
      self.destroy();
    });

    $rootScope.$on(AUTH_EVENTS.sessionTimeout, function () {
      self.destroy();
    });

    this.id = null;
    this.user = null;

    this.create = function (sessionId, user) {
      this.id = sessionId;
      this.user = user;
    };

    this.destroy = function () {
      this.id = null;
      this.user = null;
    };
  });
})();

app.config(function ($stateProvider) {

  $stateProvider.state('login', {
    url: '/login',
    templateUrl: 'js/login/login.html',
    controller: 'LoginCtrl'
  });
});

app.controller('LoginCtrl', function ($scope, AuthService, $state) {

  $scope.login = {};
  $scope.error = null;

  $scope.sendLogin = function (loginInfo) {

    $scope.error = null;

    AuthService.login(loginInfo).then(function () {
      $state.go('home');
    }).catch(function () {
      $scope.error = 'Invalid login credentials.';
    });
  };
});
app.config(function ($stateProvider) {
  $stateProvider.state('home', {
    url: '/',
    templateUrl: 'js/home/home.html',
    controller: 'HomeControl',
    resolve: {
      projects: function projects(ProjectFactory, $stateParams) {
        if ($stateParams.id) {

          return ProjectFactory.getOne($stateParams.id);
        }
        return null;
      },
      userData: function userData(projectDataFactory, AuthService) {
        return AuthService.getLoggedInUser().then(function (user) {
          if (user) {
            var userId = user._id;
            return projectDataFactory.dataByUserId(userId);
          }
        });
      }
      // user: function(AuthService){
      //   return AuthService.getLoggedInUser();
      // }
    }
  });
});

app.controller('HomeControl', function ($scope, projects, $rootScope, AuthService, AUTH_EVENTS, $stateParams, ProjectFactory, $state, $location, $anchorScroll, userData, $uibModal) {
  $scope.projects = projects;
  $scope.hello = $stateParams.id;

  // //User data and Modal Functionality
  // $scope.userData = userData;
  // $scope.open = function(_data){
  //   var modalInstance = $uibModal.open({
  //     controller: 'ModalController',
  //     templateUrl: 'js/home/modalContent.html',
  //     resolve: {
  //       data: function(){
  //         return _data;
  //       }
  //     }
  //   });
  // };

  $scope.scrollTo = function (id) {
    $location.hash(id);
    $anchorScroll();
  };

  $scope.signup = function () {
    $state.go('signup');
  };

  $scope.isLoggedIn = function () {
    return AuthService.isAuthenticated();
  };

  var getUser = function getUser() {
    AuthService.getLoggedInUser().then(function (user) {
      $scope.user = user;
      return user;
    }).then(getProjects);
  };
  var getProjects = function getProjects(user) {

    if (user) {
      ProjectFactory.getAllByUser($scope.user._id).then(function (projects) {
        $scope.projects = projects;
      });
    }
  };

  $scope.addProject = function () {
    var _user = null;

    if (AuthService.isAuthenticated()) {
      _user = $scope.user;
    }

    return ProjectFactory.add({
      name: $scope.projectName,
      user: _user
    }).then(function (newProject) {
      $state.go('project', { id: newProject._id });
    });
  };
  getUser();
});
app.config(function ($stateProvider) {
  $stateProvider.state('project', {
    url: '/project/:id',
    templateUrl: '/js/projects/project.edit.html',
    controller: 'ProjectEditCtrl',
    resolve: {
      project: function project(ProjectFactory, $stateParams) {
        return ProjectFactory.getOne($stateParams.id);
      },
      dataFiles: function dataFiles(projectDataFactory, $stateParams) {
        return projectDataFactory.dataByProjId($stateParams.id);
      }
    }
  });
});

app.controller('ProjectEditCtrlx', function ($scope, $compile, $timeout, project, dataFiles, manifestFactory, $stateParams, AuthService, ProjectFactory, Upload) {
  // TEST THE FOLLOWING FUNCTIONS
  // add a page
  // add a row
  // add a column
  // add a directive

  // Project Id & User Id
  $scope.projId = $stateParams.id;
  var getUserId = function getUserId() {
    AuthService.getLoggedInUser().then(function (user) {
      $scope.userId = user._id;
    });
  };
  getUserId();

  //fileUploader Functionality
  $scope.uploadedFiles = dataFiles;
  $scope.uploadFiles = function (file, errFiles) {
    $scope.f = file;
    $scope.errFile = errFiles && errFiles[0];
    if (file) {
      file.upload = Upload.upload({
        url: '/api/data/' + $scope.projId + '/' + $scope.userId,
        data: { file: file },
        method: 'POST'
      });

      file.upload.then(function (response) {
        $timeout(function () {
          file.result = response.data;
          $scope.uploadedFiles.push(file.result);
          console.log($scope.uploadedFiles);
        });
      }, function (response) {
        if (response.status > 0) $scope.errorMsg = response.status + ': ' + response.data;
      }, function (evt) {
        file.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
      });
    }
  };

  //infosource
  $scope.selectedInfosource = function () {};

  // this is the app config
  $scope.allManifests = {};
  $scope.appConfigMaster = {}; // this the version that is in sync with the database 0th position
  $scope.appConfigLayoutEditCopy = {};
  $scope.appConfigEditCopy = {}; // this is the copy of of object being edited that copied to appConfigViewDriver when;
  $scope.appConfigViewDriver = {}; // this is the copy of of object being edited that copied to appConfigViewDriver when
  $scope.referenceToEditInAppConfig = {};
  $scope.activeEdit = {};
  $scope.CurrentViewWidth = '0';
  $scope.containermode = 'container';
  //$scope.project_info_sources=[{"id":"5765c87f0c9b38eff0f8dcb7","description":"this is an info"},{"id":"0930ej2n32dj023dn23d02n3d","description":"this is also an info"}];
  $scope.availableColumnWidths = [{ 'width': '1' }, { 'width': '2' }, { 'width': '3' }, { 'width': '4' }, { 'width': '5' }, { 'width': '6' }, { 'width': '7' }, { 'width': '8' }, { 'width': '9' }, { 'width': '10' }, { 'width': '11' }, { 'width': '12' }];
  $scope.availableColumnShow = [{ 'show': 'true' }, { 'show': 'false' }];
  $scope.builtInManifests = [];
  $scope.lastPage = '0';
  $scope.lastRow = '0';
  $scope.lastColumn = '0';
  $scope.levelsOfUndo = 10;
  //get all manifests
  manifestFactory.getAll().then(function (data) {
    $scope.allManifests = data.data;
  });
  // this object gets

  $scope.ai_page_manifest = {
    ai_directive: true,
    ai_directive_type: 'layout',
    ai_directive_name: 'ai_page',
    ai_directive_attributes: {
      ai_class: '/css/row_a/style.css',
      ai_page_title: '',
      ai_page_menu_text: ''
    }
  };

  $scope.ai_row_manifest = {
    ai_directive: true,
    ai_directive_type: 'layout',
    ai_directive_name: 'ai_row',
    ai_directive_attributes: {
      ai_class: '/css/row_a/style.css',
      'class': '',
      'style': '',
      'ai_bootstrap_show': { 'xs': { 'colsize': 'xs', 'show': 'true', 'devicename': 'phone' }, 'sm': { 'colsize': 'sm', 'show': 'true', 'devicename': 'tablet' }, 'md': { 'colsize': 'md', 'show': 'true', 'devicename': 'laptop' }, 'lg': { 'colsize': 'lg', 'show': 'true', 'devicename': 'desktop' } }
    }
  };

  $scope.ai_column_manifest = {
    ai_directive: true,
    ai_directive_type: 'layout',
    ai_directive_name: 'ai_col',
    ai_directive_attributes: {
      ai_class: '/css/row_a/style.css',
      class: '',
      style: '',
      'ai_bootstrap_show': { 'xs': { 'colsize': 'xs', 'show': 'true', 'devicename': 'phone' }, 'sm': { 'colsize': 'sm', 'show': 'true', 'devicename': 'tablet' }, 'md': { 'colsize': 'md', 'show': 'true', 'devicename': 'laptop' }, 'lg': { 'colsize': 'lg', 'show': 'true', 'devicename': 'desktop' } },
      'ai_bootstrap_width': { 'xs': { 'colsize': 'xs', 'devicename': 'phone', 'size': '12' }, 'sm': { 'colsize': 'sm', 'devicename': 'tablet', 'size': '12' }, 'md': { 'colsize': 'md', 'devicename': 'laptop', 'size': '6' }, 'lg': { 'colsize': 'lg', 'devicename': 'desktop', 'size': '6' } }

    },
    ai_content: {}
  };

  $scope.builtInManifests[0] = $scope.ai_page_manifest;
  $scope.builtInManifests[1] = $scope.ai_row_manifest;

  // this function get the last page numb in config

  $scope.getLastPage = function () {
    try {
      $scope.lastPage = 0;
      for (var key in $scope.appConfig.pages) {
        $scope.lastPage++;
      }
    } catch (e) {}
  };

  // this function get the last row numb in config
  $scope.getLastRow = function () {
    try {
      $scope.getLastPage();
      $scope.lastRow = 0;
      for (var key in $scope.appConfig.pages['page_' + $scope.lastPage].rows) {
        $scope.lastRow++;
      }
    } catch (e) {}
  };

  // this function get the last col numb in config
  $scope.getLastColumn = function () {
    $scope.getLastRow();
    $scope.lastColumn = 0;
    console.log($scope.appConfig.pages['page_' + $scope.lastPage].rows['row_' + $scope.lastRow]);
    for (var key in $scope.appConfig.pages['page_' + $scope.lastPage].rows['row_' + $scope.lastRow]['cols']) {
      $scope.lastColumn++;
      console.log(key);
    }
  };

  // this function takes a manifest and sets it up for being inserted into the appConfig.
  // it does this bt adding the page,row,and,column properites.
  $scope.moveConfigObjectToEdit = function (configObject) {
    $scope.referenceToEditInAppConfig = configObject; // this is reference to the needed appConfig object
    angular.copy(configObject, $scope.appConfigEditCopy);
  };

  // this function moves the edit version of teh appconfig object beging edit from edit object to it place in te appConfig objec
  $scope.saveEdit = function () {
    angular.copy($scope.appConfigEditCopy, $scope.referenceToEditInAppConfig);
    $scope.project.config.unshift($scope.appConfig);
    if ($scope.project.config.length > $scope.levelsOfUndo) {
      $scope.project.config.splice($scope.levelsOfUndo, $scope.project.config.length);
    }
    ProjectFactory.update($scope.project).then(function (result) {});
  };

  $scope.deleteElement = function () {
    angular.copy({}, $scope.referenceToEditInAppConfig);
    $scope.project.config.unshift($scope.appConfig);
    if ($scope.project.config.length > $scope.levelsOfUndo) {
      $scope.project.config.splice($scope.levelsOfUndo, $scope.project.config.length);
    }
    ProjectFactory.update($scope.project).then(function (result) {});
  };
  $scope.undoEdit = function () {
    angular.copy({}, $scope.referenceToEditInAppConfig);
    $scope.project.config.unshift($scope.appConfig);
    if ($scope.project.config.length > $scope.levelsOfUndo) {
      $scope.project.config.splice($scope.levelsOfUndo, $scope.project.config.length);
    }
    ProjectFactory.update($scope.project).then(function (result) {});
  };

  // this function takes your manifest object and add the ai-page,ai-row and ai-col attributes makeing is suitable for insertion into the appConfig
  $scope.manifestToAppConfig = function (page, row, column, manifestObj) {
    //console.log(page);
    if (column > 0) {
      manifestObj.ai_directive_page = page;
      manifestObj.ai_directive_row = row;
      manifestObj.ai_directive_col = column;
      return manifestObj;
    } else if (row > 0) {
      manifestObj.ai_directive_page = page;
      manifestObj.ai_directive_row = row;
      manifestObj.ai_directive_col = '';
      return manifestObj;
    } else if (page > 0) {
      //console.log(manifestObj);
      manifestObj.ai_directive_page = page;
      manifestObj.ai_directive_row = '';
      manifestObj.ai_directive_col = '';
      return manifestObj;
    }
  };

  // This function renders the string of attributes to include in the directive being rendered
  $scope.renderattributeString = function (obj) {
    var attributeString = '';
    var ngClassString = ' ng-class="{';
    for (var attribName in obj) {
      if (attribName.indexOf('ai_bootstrap_width') > -1) {
        for (var bootSize in obj[attribName]) {
          console.log(bootSize);
          ngClassString += "'col-" + bootSize + "-" + obj[attribName][bootSize]['size'] + "\': true,";
          console.log(ngClassString);
        }
      } else if (attribName.indexOf('ai_bootstrap_show') > -1) {
        for (var bootShow in obj[attribName]) {
          console.log(bootShow);
          if (obj[attribName][bootShow]['show'] == 'false') {
            ngClassString += "'hidden-" + bootShow + "' : true,";
          }
        }
      } else {
        attributeString += attribName + '="' + obj[attribName] + '" ';
      }
    }
    ngClassString += "'edit_row_passive' : true,";
    attributeString += ngClassString;
    console.log(attributeString);
    return attributeString;
  };

  // this function append a compiled page into the DOM
  $scope.renderPageHtmlFromAiConfig = function (obj) {
    if (obj.hasOwnProperty('ai_directive')) {
      if (obj.ai_directive_type === 'layout' && obj['ai_directive_name'] === 'ai_page') {
        angular.element(workarea).append($compile('<' + obj['ai_directive_name'] + ' id="p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_ai_row" ' + $scope.renderattributeString(obj['ai_directive_attributes']) + '></' + obj['ai_directive_name'] + '>')($scope));
      }
    }
    for (var property in obj) {
      if (_typeof(obj[property]) == "object") {
        $scope.renderPageHtmlFromAiConfig(obj[property]);
      }
    }
  };

  // this function append a compiled row into the DOM
  $scope.renderRowHtmlFromAiConfig = function (obj) {
    console.log(obj);
    if (obj.hasOwnProperty('ai_directive')) {
      if (obj.ai_directive_type === 'layout' && obj['ai_directive_name'] === 'ai_row') {
        angular.element(workarea).append($compile('<div   ' + $scope.renderattributeString(obj['ai_directive_attributes']) + '\'edit_row_active\':getEditCandidate(\'p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_ai_row\')}"   ng-mouseenter="setEditCandidate(\'p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_ai_row\')" ng-mouseleave="setEditCandidate(\'\')"><ai-edit-hot-spot set-active-edit-element="setEditSelect()" " active-edit-element="editCandidate" edit-object-type="row" ai-edit-hot-spot-id="p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_ai_row"></ai-edit-hot-spot><div class="container" id="p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_ai_row"></div></div>')($scope));
        //angular.element(workarea).append($compile('<div style="padding:0px" ng-mouseenter="setEditCandidate(\'p_'+obj['ai_directive_page']+'_r_'+obj['ai_directive_row']+'_ai_row\')" ng-mouseleave="setEditCandidate(\'\')"><ai-edit-hot-spot set-active-edit-element="setEditSelect()" active-edit-element="editCandidate" ai-edit-hot-spot-id="p_'+obj['ai_directive_page']+'_r_'+obj['ai_directive_row']+'_ai_row"></ai-edit-hot-spot>    <div  id="p_'+obj['ai_directive_page']+'_r_'+obj['ai_directive_row']+'_ai_row" '+ $scope.renderattributeString(obj['ai_directive_attributes'])+'\'edit_row_active\':getEditCandidate(\'p_'+obj['ai_directive_page']+'_r_'+obj['ai_directive_row']+'_ai_row\')}"</div></div>')($scope));
      }
    }
    for (var property in obj) {
      if (_typeof(obj[property]) == "object") {
        $scope.renderRowHtmlFromAiConfig(obj[property]);
      }
    }
  };

  // this function append a compiled Column into the DOM
  $scope.renderColHtmlFromAiConfig = function (obj) {
    if (obj.hasOwnProperty('ai_directive')) {
      if (obj['ai_directive_type'] === 'layout' && obj['ai_directive_name'] === 'ai_col') {
        $scope.appendTarget = '#p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_ai_row';
        angular.element(document.querySelector($scope.appendTarget)).append($compile('<div id="p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_c_' + obj['ai_directive_col'] + '_ai_col" ' + $scope.renderattributeString(obj['ai_directive_attributes']) + '\'edit_row_active\':getEditCandidate(\'p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_c_' + obj['ai_directive_col'] + '_ai_col\')}" ng-mouseenter="setEditCandidate(\'p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_c_' + obj['ai_directive_col'] + '_ai_col\')" ng-mouseleave="setEditCandidate(\'p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_ai_row\')"><ai-edit-hot-spot set-active-edit-element="setEditSelect()" active-edit-element="editCandidate" edit-object-type="column" ai-edit-hot-spot-id="p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_c_' + obj['ai_directive_col'] + '_ai_col"></ai-edit-hot-spot></div>')($scope));
      }
    }
    for (var property in obj) {
      if (_typeof(obj[property]) == "object") {
        $scope.renderColHtmlFromAiConfig(obj[property]);
      }
    }
  };

  $scope.renderClearfixHtmlFromAiConfig = function (obj) {
    if (obj.hasOwnProperty('ai_directive')) {
      if (obj['ai_directive_type'] === 'layout' && obj['ai_directive_name'] === 'ai_row') {
        $scope.appendTarget = '#p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_ai_row';
        angular.element(document.querySelector($scope.appendTarget)).append($compile('<div class="clearfix"></div>')($scope));
      }
    }
    for (var property in obj) {
      if (_typeof(obj[property]) == "object") {
        $scope.renderClearfixHtmlFromAiConfig(obj[property]);
      }
    }
  };
  // this function append a compiled Directive into the DOM
  // just a note : I dont like the fact that I am using the directives Idea of where it is to render it I would rather use the
  // position of the last column i saw while iterating.
  $scope.renderDirectiveHtmlFromAiConfig = function (obj) {
    if (obj.hasOwnProperty('ai_directive')) {
      if (obj['ai_directive_type'] === 'content') {
        $scope.appendTarget = '#p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_c_' + obj['ai_directive_col'] + '_ai_col';
        angular.element(document.querySelector($scope.appendTarget)).append($compile('<div style="margin:0px;padding:10px"><' + obj['ai_directive_name'] + ' id="p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_c_' + obj['ai_directive_col'] + '" ' + $scope.renderattributeString(obj['ai_directive_attributes']) + '\'directiveSpace\': true}"></' + obj['ai_directive_name'] + '></div>')($scope));
      }
    }
    for (var property in obj) {
      if (_typeof(obj[property]) == "object") {
        $scope.renderDirectiveHtmlFromAiConfig(obj[property]);
      }
    }
  };

  // this function adds a new element to the config obj
  $scope.creatConfigObject = function (target, obj) {
    //target=obj;
    angular.copy(obj, target);
  };
  // this read a appConfig object
  $scope.readConfigObject = function (target, newelement) {};

  // this function updates a appconfig object
  $scope.updateConfigObject = function (target, newelement, obj) {
    target[newelement] = obj;
  };

  // this function deletes a object from the appConfig object
  $scope.deleteconfigObject = function (target, subElement) {
    delete target[subElement];
  };

  // this functon get the next row number to assgin for the current page
  $scope.getNextRowPage = function (page) {
    var newRow;
    return newRow;
  };

  // this functon get the next row and column number to assgin for the current page
  $scope.getNextColumnInRow = function (page, row) {
    var newCol;
    return newCol;
  };

  // this function will return a reference to the needed config tagget
  $scope.makeConfigTarget = function (page, row, column, landDirective) {
    if (landDirective) {
      if ($scope.appConfig.pages['page_' + page]['rows']['row_' + row]['cols'].hasOwnProperty('col_' + column)) {
        return $scope.appConfig.pages['page_' + page]['rows']['row_' + row]['cols']['col_' + column]['ai_content'] = {};
      }
    } else if (column) {
      if (!$scope.appConfig.pages['page_' + page]['rows']['row_' + row].hasOwnProperty('cols')) {
        $scope.appConfig.pages['page_' + page]['rows']['row_' + row]['cols'] = {};
      };
      return $scope.appConfig.pages['page_' + page]['rows']['row_' + row]['cols']['col_' + column] = {};
    } else if (row) {
      if (!$scope.appConfig.pages['page_' + page].hasOwnProperty('rows')) {
        $scope.appConfig.pages['page_' + page]['rows'] = {};
      };
      return $scope.appConfig.pages['page_' + page]['rows']['row_' + row] = {};
    } else if (page) {
      if (!$scope.appConfig.pages.hasOwnProperty('pages')) {
        $scope.appConfig.pages = {};
      }
      return $scope.appConfig.pages['page_' + page] = {};
    }
  };

  // add a page
  $scope.addNewPage = function (page, manifest) {
    // get the next available page number
    // call manifestToAppConfig on that page number to the config
    $scope.configTarget = $scope.makeConfigTarget(1);
    // copy it to the edit object
    // send it to the server
    // replace the appconfig the servers reply (now the server and the page are in sync)
    // it will then take that page object and add it
    console.dir($scope.manifestToAppConfig(1, '', '', manifest));
    $scope.creatConfigObject($scope.configTarget, $scope.manifestToAppConfig(page, '', '', manifest));
  };
  // add a row
  $scope.addNewRow = function (page, row, manifest) {
    console.log(page, row);
    // call manifestToAppConfig on that page number to the config
    $scope.configTarget = $scope.makeConfigTarget(page, row);
    // copy it to the edit object
    // send it to the server
    // replace the appconfig the servers reply (now the server and the page are in sync)
    // it will then take that page object and add it
    //console.log($scope.configTarget);
    console.log($scope.manifestToAppConfig(page, row, '', manifest));
    $scope.creatConfigObject($scope.configTarget, $scope.manifestToAppConfig(page, row, '', manifest));
  };
  $scope.addNewColumn = function (page, row, column, manifest) {
    // get the next available row number
    // call manifestToAppConfig on that page number to the config
    $scope.configTarget = $scope.makeConfigTarget(page, row, column);
    // copy it to the edit object
    // send it to the server
    // replace the appconfig the servers reply (now the server and the page are in sync)
    // it will then take that page object and add it
    console.log($scope.configTarget);
    $scope.creatConfigObject($scope.configTarget, $scope.manifestToAppConfig(page, row, column, manifest));
  };
  // add new directive NOTE: there is no add column because there is a one to one relationshiop between direstives and columns
  $scope.addNewDirective = function (page, row, column, manifest) {
    // get the next available column number
    // call manifestToAppConfig on that page number to the config
    $scope.configTarget = $scope.makeConfigTarget(page, row, column, column);
    // copy it to the edit object
    // send it to the server
    // replace the appconfig the servers reply (now the server and the page are in sync)
    // it will then take that page object and add it
    console.log($scope.configTarget);
    $scope.creatConfigObject($scope.configTarget, $scope.manifestToAppConfig(page, row, column, manifest));
    $scope.moveConfigObjectToEdit($scope.configTarget);
  };

  $scope.addToPage = function (manifest) {
    console.log('running add', manifest);
    //if the directive is a layout type
    if (manifest.ai_directive_type === 'layout') {
      if (manifest.ai_directive_name === 'ai_page') {
        $scope.addNewPage($scope.lastPage + 1, manifest);
      } else if (manifest.ai_directive_name === 'ai_row') {
        $scope.addNewRow($scope.lastPage, $scope.lastRow + 1, manifest);
      } else if (manifest.ai_directive_name === 'ai_col') {
        $scope.addNewColumn($scope.lastPage, $scope.lastRow, $scope.lastColumn + 1, manifest);
      }
    } else {
      $scope.addNewColumn($scope.lastPage, $scope.lastRow, $scope.lastColumn + 1, $scope.ai_column_manifest);
      $timeout(function () {
        $scope.addNewDirective($scope.lastPage, $scope.lastRow, $scope.lastColumn, manifest);
        $scope.setEditCandidate('p_' + $scope.lastPage + '_r_' + $scope.lastRow + '_c_' + $scope.lastColumn + '_ai_col');
        $scope.setEditSelect();
        $scope.DSopen = false;
      }, 1000);
    }
    $scope.DSopen = false;
    $scope.cplopen = true;
  };

  $scope.project = project; //init the $scope.project for resolve of project in state machine
  $timeout(function () {
    if ($scope.project.config[0] === undefined) {
      //console.log('setting up');
      $scope.appConfig = {
        project_name: 'ourfirst app',
        pages: {}
      };
    } else {
      $scope.appConfig = {};
      angular.copy($scope.project.config[0], $scope.appConfig);
    }
  }, 100);

  // this watch block renders a the dom when the appconfig changes
  $scope.$watch('appConfig', function () {
    angular.element(workarea).empty();
    $scope.renderRowHtmlFromAiConfig($scope.appConfig, '');
    $timeout(function () {
      $scope.renderColHtmlFromAiConfig($scope.appConfig, '');
    }, 200);
    $timeout(function () {
      $scope.renderDirectiveHtmlFromAiConfig($scope.appConfig, '');
      $scope.getLastColumn();
      $scope.renderClearfixHtmlFromAiConfig($scope.appConfig, '');
    }, 500);
  }, true);

  $scope.getEditCandidate = function (id) {
    if (id === $scope.editCandidate) {
      return true;
    } else {
      return false;
    }
  };

  $scope.setEditCandidate = function (id) {
    $scope.editCandidate = id;
  };

  $scope.findDirectiveToMakeActiveEdit = function (obj, idToMatch) {
    if (obj.hasOwnProperty('ai_directive')) {
      if (obj.ai_directive_type === 'layout') {
        var rowidstring = 'p_' + obj['ai_directive_page'] + '_ai_page';
        var rowidstring = 'p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_ai_row';
        var colidstring = 'p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_c_' + obj['ai_directive_col'] + '_ai_col';
        if (idToMatch == rowidstring || idToMatch == colidstring) {
          $scope.referenceToEditInAppConfig = obj;
          angular.copy(obj, $scope.appConfigEditCopy);
          return;
        }
      }
    }
    for (var property in obj) {
      if (_typeof(obj[property]) == "object") {
        $scope.findDirectiveToMakeActiveEdit(obj[property], idToMatch);
      }
    }
  };

  $scope.setEditSelect = function (id) {
    // THE DIRECTIVE THAT IS IN THE EDIT CANDIDATE COLUMN
    $scope.cplopen = true;
    $scope.findDirectiveToMakeActiveEdit($scope.appConfig, $scope.editCandidate);
  };
});

"use strict";
app.controller('ProjectEditCtrl', function ($scope, $compile, $timeout, project, dataFiles, manifestFactory, $stateParams, AuthService, ProjectFactory, $location, $anchorScroll, Upload, projectDataFactory, anchorSmoothScroll) {
  // TEST THE FOLLOWING FUNCTIONS
  // add a page
  // add a row
  // add a column
  // add a directive

  // Project Id & User Id
  $scope.projId = $stateParams.id;
  var getUserId = function getUserId() {
    AuthService.getLoggedInUser().then(function (user) {
      $scope.userId = user._id;
    });
  };
  getUserId();

  //fileUploader Functionality
  $scope.uploadedFiles = dataFiles;
  $scope.uploadFiles = function (file, errFiles) {
    $scope.f = file;
    $scope.errFile = errFiles && errFiles[0];
    if (file) {
      file.upload = Upload.upload({
        url: '/api/data/' + $scope.projId + '/' + $scope.userId,
        data: { file: file },
        method: 'POST'
      });

      file.upload.then(function (response) {
        $timeout(function () {
          file.result = response.data;
          $scope.uploadedFiles.push(file.result);
          $scope.getFields();
        });
      }, function (response) {
        if (response.status > 0) $scope.errorMsg = response.status + ': ' + response.data;
      }, function (evt) {
        file.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
      });
    }
  };

  //this is to isolate headers on all files in the array
  $scope.getFields = function () {
    var _fileHeaders = {};
    $scope.uploadedFiles.forEach(function (file) {
      if (JSON.parse(file.data)[0]) {
        var firstRow = JSON.parse(file.data)[0];
        var headers = Object.keys(firstRow);
        _fileHeaders[file._id] = headers;
      } else {
        _fileHeaders[file._id] = ['not applicable'];
      }
    });
    $scope.fileHeaders = _fileHeaders;
  };
  //this gets headers for specific file id
  $scope.getHeaders = function (fileId, fileHeaders) {
    var headers;
    if (fileId) {
      headers = fileHeaders[fileId];
    }
    return headers;
  };

  $scope.getFields();
  // this is the app config
  $scope.appConfigtemp = {};
  $scope.allManifests = {};
  $scope.appConfigMaster = {}; // this the version that is in sync with the database 0th position
  $scope.appConfigLayoutEditCopy = {};
  $scope.appConfigEditCopy = {}; // this is the copy of of object being edited that copied to appConfigViewDriver when;
  $scope.appConfigViewDriver = {}; // this is the copy of of object being edited that copied to appConfigViewDriver when
  $scope.referenceToEditInAppConfig = {};
  $scope.activeEdit = {};
  $scope.CurrentViewWidth = '0';
  $scope.containermode = 'container';
  //$scope.project_info_sources=[{"id":"5765c87f0c9b38eff0f8dcb7","description":"this is an info"},{"id":"0930ej2n32dj023dn23d02n3d","description":"this is also an info"}];
  $scope.availableColumnWidths = [{ 'width': '1' }, { 'width': '2' }, { 'width': '3' }, { 'width': '4' }, { 'width': '5' }, { 'width': '6' }, { 'width': '7' }, { 'width': '8' }, { 'width': '9' }, { 'width': '10' }, { 'width': '11' }, { 'width': '12' }];
  $scope.availableColumnShow = [{ 'show': 'true' }, { 'show': 'false' }];
  $scope.builtInManifests = [];
  $scope.lastPage = '0';
  $scope.lastRow = '0';
  $scope.lastColumn = '0';
  $scope.levelsOfUndo = 5;
  //get all manifests
  manifestFactory.getAll().then(function (data) {
    $scope.allManifests = data.data;
  });
  // this object gets

  $scope.ai_page_manifest = {
    ai_directive: true,
    ai_directive_type: 'layout',
    ai_directive_name: 'ai_page',
    ai_directive_attributes: {
      ai_class: '/css/row_a/style.css',
      ai_page_title: '',
      ai_page_menu_text: ''
    }
  };

  $scope.ai_row_manifest = {
    ai_directive: true,
    ai_directive_type: 'layout',
    ai_directive_name: 'ai_row',
    ai_directive_attributes: {
      ai_class: '/css/row_a/style.css',
      'class': '',
      'style': '',
      'ai_bootstrap_show': { 'xs': { 'colsize': 'xs', 'show': 'true', 'devicename': 'phone' }, 'sm': { 'colsize': 'sm', 'show': 'true', 'devicename': 'tablet' }, 'md': { 'colsize': 'md', 'show': 'true', 'devicename': 'laptop' }, 'lg': { 'colsize': 'lg', 'show': 'true', 'devicename': 'desktop' } }
    }
  };

  $scope.ai_column_manifest = {
    ai_directive: true,
    ai_directive_type: 'layout',
    ai_directive_name: 'ai_col',
    ai_directive_attributes: {
      ai_class: '/css/row_a/style.css',
      class: '',
      style: '',
      'ai_bootstrap_show': { 'xs': { 'colsize': 'xs', 'show': 'true', 'devicename': 'phone' }, 'sm': { 'colsize': 'sm', 'show': 'true', 'devicename': 'tablet' }, 'md': { 'colsize': 'md', 'show': 'true', 'devicename': 'laptop' }, 'lg': { 'colsize': 'lg', 'show': 'true', 'devicename': 'desktop' } },
      'ai_bootstrap_width': { 'xs': { 'colsize': 'xs', 'devicename': 'phone', 'size': '12' }, 'sm': { 'colsize': 'sm', 'devicename': 'tablet', 'size': '12' }, 'md': { 'colsize': 'md', 'devicename': 'laptop', 'size': '6' }, 'lg': { 'colsize': 'lg', 'devicename': 'desktop', 'size': '6' } }

    },
    ai_content: {}
  };

  $scope.builtInManifests[0] = $scope.ai_page_manifest;
  $scope.builtInManifests[1] = $scope.ai_row_manifest;

  // this function get the last page numb in config
  $scope.getTargetObjectById = function (page, row, column, landDirective) {
    if (landDirective) {
      return $scope.appConfig.pages['page_' + page]['rows']['row_' + row]['cols']['col_' + column]['ai_content'];
    } else if (column) {
      return $scope.appConfig.pages['page_' + page]['rows']['row_' + row]['cols']['col_' + column];
    } else if (row) {
      return $scope.appConfig.pages['page_' + page]['rows']['row_' + row];
    } else if (page) {
      return $scope.appConfig.pages['page_' + page];
    }
  };

  $scope.deleteTargetObjectById = function (page, row, column, landDirective) {
    if (landDirective) {
      delete $scope.appConfig.pages['page_' + page]['rows']['row_' + row]['cols']['col_' + column]['ai_content'];
    } else if (column) {
      delete $scope.appConfig.pages['page_' + page]['rows']['row_' + row]['cols']['col_' + column];
    } else if (row) {
      delete $scope.appConfig.pages['page_' + page]['rows']['row_' + row];
    } else if (page) {
      delete $scope.appConfig.pages['page_' + page];
    }
  };

  $scope.getLastPage = function () {
    try {
      $scope.lastPage = 0;
      for (var key in $scope.appConfig.pages) {
        $scope.lastPage++;
      }
      return $scope.lastPage;
    } catch (e) {}
  };

  // this function get the last row numb in config or for a given page
  $scope.getLastRow = function (page) {
    var myPage = 0;
    if (page > 0) {
      myPage = page;
    } else {
      myPage = $scope.getLastPage();
    }
    try {
      $scope.lastRow = 0;
      for (var key in $scope.appConfig.pages['page_' + myPage].rows) {
        $scope.lastRow++;
      }
      return $scope.lastRow;
    } catch (e) {}
  };

  // this function get the last col numb in config or for a given row
  $scope.getLastColumn = function (page, row) {
    var myPage = 0;
    var myRow = 0;
    if (page > 0) {
      myPage = page;
    } else {
      myPage = $scope.getLastPage();
    }
    if (row > 0) {
      myRow = row;
    } else {
      myRow = $scope.getLastRow(myPage);
    }
    $scope.lastColumn = 0;
    for (var key in $scope.appConfig.pages['page_' + myPage].rows['row_' + myRow]['cols']) {
      $scope.lastColumn++;
    }
    return $scope.lastColumn;
  };

  // this function takes a manifest and sets it up for being inserted into the appConfig.
  // it does this bt adding the page,row,and,column properites.
  $scope.moveConfigObjectToEdit = function (configObject) {
    $scope.referenceToEditInAppConfig = configObject; // this is reference to the needed appConfig object
    angular.copy(configObject, $scope.appConfigEditCopy);
  };

  // this function moves the edit version of teh appconfig object beging edit from edit object to it place in te appConfig objec
  $scope.saveEdit = function (caller) {
    angular.copy($scope.appConfigEditCopy, $scope.referenceToEditInAppConfig);
    $scope.project.config.unshift(JSON.stringify($scope.appConfig));
    if ($scope.project.config.length > $scope.levelsOfUndo) {
      $scope.project.config.splice($scope.levelsOfUndo, $scope.project.config.length);
    }
    ProjectFactory.update($scope.project).then(function (result) {
      //    console.dir(result);
      /*angular.copy(result.config[0],$scope.appConfigTemp);
        $scope.normalizeIds($scope.appConfigTemp); // normalize the object before it is render
        $timeout(function(){
            angular.copy($scope.appConfigTemp,$scope.appConfig);
        },500); */
    });
    if (caller !== 'addtoPage') {
      $scope.clearEdit();
    };
  };

  $scope.saveEntireProject = function (caller) {
    $scope.project.config.unshift(JSON.stringify($scope.appConfig));
    if ($scope.project.config.length > $scope.levelsOfUndo) {
      $scope.project.config.splice($scope.levelsOfUndo, $scope.project.config.length);
    }
    ProjectFactory.update($scope.project).then(function (result) {});
    if (caller !== 'addtoPage') {
      $scope.clearEdit();
    };
  }; // clear the app out of edit mode

  $scope.clearEdit = function () {
    $timeout(function () {
      $scope.appConfigEditCopy = {};
    }, 500);
    $scope.cplopen = false;
    $scope.SDopen = false;
  };

  $scope.deleteElement = function () {
    console.dir($scope.appConfigEditCopy);
    $scope.deleteTargetObjectById($scope.appConfigEditCopy.ai_directive_page, $scope.appConfigEditCopy.ai_directive_row, $scope.appConfigEditCopy.ai_directive_col);
    $scope.project.config.unshift($scope.appConfig);
    if ($scope.project.config.length > $scope.levelsOfUndo) {
      $scope.project.config.splice($scope.levelsOfUndo, $scope.project.config.length);
    }
    ProjectFactory.update($scope.project).then(function (result) {});
  };
  $scope.undoEdit = function () {
    angular.copy({}, $scope.referenceToEditInAppConfig);
    $scope.project.config.unshift($scope.appConfig);
    if ($scope.project.config.length > $scope.levelsOfUndo) {
      $scope.project.config.splice($scope.levelsOfUndo, $scope.project.config.length);
    }
    ProjectFactory.update($scope.project).then(function (result) {});
  };

  // this function takes your manifest object and add the ai-page,ai-row and ai-col attributes makeing is suitable for insertion into the appConfig
  $scope.manifestToAppConfig = function (page, row, column, manifestObj) {
    //console.log(page);
    if (column > 0) {
      manifestObj.ai_directive_page = page;
      manifestObj.ai_directive_row = row;
      manifestObj.ai_directive_col = column;
      return manifestObj;
    } else if (row > 0) {
      manifestObj.ai_directive_page = page;
      manifestObj.ai_directive_row = row;
      manifestObj.ai_directive_col = '';
      return manifestObj;
    } else if (page > 0) {
      //console.log(manifestObj);
      manifestObj.ai_directive_page = page;
      manifestObj.ai_directive_row = '';
      manifestObj.ai_directive_col = '';
      return manifestObj;
    }
  };

  // This function renders the string of attributes to include in the directive being rendered
  $scope.renderattributeString = function (obj) {
    var attributeString = '';
    var ngClassString = ' ng-class="{';
    for (var attribName in obj) {
      if (attribName.indexOf('ai_bootstrap_width') > -1) {
        for (var bootSize in obj[attribName]) {
          ngClassString += "'col-" + bootSize + "-" + obj[attribName][bootSize]['size'] + "\': true,";
        }
      } else if (attribName.indexOf('ai_bootstrap_show') > -1) {
        for (var bootShow in obj[attribName]) {
          if (obj[attribName][bootShow]['show'] == 'false') {
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

  $scope.normalizeIds = function (obj, stack) {

    if (obj.hasOwnProperty('ai_directive')) {
      if (stack === undefined) {
        var stack = {
          lastNormalPage: 0,
          lastNormalRow: 0,
          lastNormalCol: 0
        };
      }
      //if its a page
      if (obj.ai_directive_type === 'layout' && obj['ai_directive_name'] === 'ai_page') {
        stack.lastNormalPage++;
        stack.lastNormalRow = 0;
        console.log('ai_page' + stack.lastNormalPage);
        obj.ai_directive_page = stack.lastNormalPage;
        obj.ai_directive_row = "";
        obj.ai_directive_col = "";
      }
      //if its a row
      if (obj.ai_directive_type === 'layout' && obj['ai_directive_name'] === 'ai_row') {
        stack.lastNormalRow++;
        stack.lastNormalCol = 0;
        console.log('ai_row' + stack.lastNormalRow);
        obj.ai_directive_page = stack.lastNormalPage;
        obj.ai_directive_row = stack.lastNormalRow;
        obj.ai_directive_col = "";
        var counter = 0;
        var tempArry = [];
        var tempObj = {};
        for (var key in obj['cols']) {
          tempArry.push(obj['cols'][key]);
        }
        obj['cols'] = {};
        for (var i = 0; i < tempArry.length; i++) {
          tempObj['col_' + (i + 1)] = tempArry[i];
        }
        obj['cols'] = tempObj;
      }
      //if its a col
      if (obj.ai_directive_type === 'layout' && obj['ai_directive_name'] === 'ai_col') {
        stack.lastNormalCol++;
        // console.log('ai_col'+stack.lastNormalCol);
        obj.ai_directive_page = stack.lastNormalPage;
        obj.ai_directive_row = stack.lastNormalRow;
        obj.ai_directive_col = stack.lastNormalCol;
      }
      //if its a content
      if (obj.ai_directive_type === 'content') {
        obj.ai_directive_page = stack.lastNormalPage;
        obj.ai_directive_row = stack.lastNormalRow;
        obj.ai_directive_col = stack.lastNormalCol;
      }
    }
    for (var property in obj) {
      if (_typeof(obj[property]) == "object") {
        $scope.normalizeIds(obj[property], stack);
      }
    }
  };

  // this function append a compiled page into the DOM
  $scope.renderPageHtmlFromAiConfig = function (obj) {
    if (obj.hasOwnProperty('ai_directive')) {
      if (obj.ai_directive_type === 'layout' && obj['ai_directive_name'] === 'ai_page') {
        angular.element(workarea).append($compile('<' + obj['ai_directive_name'] + ' id="p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_ai_row" ' + $scope.renderattributeString(obj['ai_directive_attributes']) + '></' + obj['ai_directive_name'] + '>')($scope));
      }
    }
    for (var property in obj) {
      if (_typeof(obj[property]) == "object") {
        $scope.renderPageHtmlFromAiConfig(obj[property]);
      }
    }
  };

  // this function append a compiled row into the DOM
  $scope.renderRowHtmlFromAiConfig = function (obj) {
    if (obj.hasOwnProperty('ai_directive')) {
      if (obj.ai_directive_type === 'layout' && obj['ai_directive_name'] === 'ai_row') {
        angular.element(workarea).append($compile('<div   ' + $scope.renderattributeString(obj['ai_directive_attributes']) + '\'edit_row_active\':getEditCandidate(\'p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_ai_row\')}"   ng-mouseenter="setEditCandidate(\'p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_ai_row\')" ng-mouseleave="setEditCandidate(\'\')"><ai-edit-hot-spot set-active-edit-element="setEditSelect()" " active-edit-element="editCandidate" edit-object-type="row" ai-edit-hot-spot-id="p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_ai_row"></ai-edit-hot-spot><div class="container" id="p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_ai_row"></div></div>')($scope));
        //angular.element(workarea).append($compile('<div style="padding:0px" ng-mouseenter="setEditCandidate(\'p_'+obj['ai_directive_page']+'_r_'+obj['ai_directive_row']+'_ai_row\')" ng-mouseleave="setEditCandidate(\'\')"><ai-edit-hot-spot set-active-edit-element="setEditSelect()" active-edit-element="editCandidate" ai-edit-hot-spot-id="p_'+obj['ai_directive_page']+'_r_'+obj['ai_directive_row']+'_ai_row"></ai-edit-hot-spot>    <div  id="p_'+obj['ai_directive_page']+'_r_'+obj['ai_directive_row']+'_ai_row" '+ $scope.renderattributeString(obj['ai_directive_attributes'])+'\'edit_row_active\':getEditCandidate(\'p_'+obj['ai_directive_page']+'_r_'+obj['ai_directive_row']+'_ai_row\')}"</div></div>')($scope));
      }
    }
    for (var property in obj) {
      if (_typeof(obj[property]) == "object") {
        $scope.renderRowHtmlFromAiConfig(obj[property]);
      }
    }
  };

  // this function append a compiled Column into the DOM
  $scope.renderColHtmlFromAiConfig = function (obj) {
    if (obj.hasOwnProperty('ai_directive')) {
      if (obj['ai_directive_type'] === 'layout' && obj['ai_directive_name'] === 'ai_col') {
        $scope.appendTarget = '#p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_ai_row';
        angular.element(document.querySelector($scope.appendTarget)).append($compile('<div id="p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_c_' + obj['ai_directive_col'] + '_ai_col" ' + $scope.renderattributeString(obj['ai_directive_attributes']) + '\'edit_row_active\':getEditCandidate(\'p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_c_' + obj['ai_directive_col'] + '_ai_col\')}" ng-mouseenter="setEditCandidate(\'p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_c_' + obj['ai_directive_col'] + '_ai_col\')" ng-mouseleave="setEditCandidate(\'p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_ai_row\')"><ai-edit-hot-spot set-active-edit-element="setEditSelect()" active-edit-element="editCandidate" edit-object-type="column" ai-edit-hot-spot-id="p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_c_' + obj['ai_directive_col'] + '_ai_col"></ai-edit-hot-spot></div>')($scope));
      }
    }
    for (var property in obj) {
      if (_typeof(obj[property]) == "object") {
        $scope.renderColHtmlFromAiConfig(obj[property]);
      }
    }
  };

  $scope.renderClearfixHtmlFromAiConfig = function (obj) {
    if (obj.hasOwnProperty('ai_directive')) {
      if (obj['ai_directive_type'] === 'layout' && obj['ai_directive_name'] === 'ai_row') {
        $scope.appendTarget = '#p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_ai_row';
        angular.element(document.querySelector($scope.appendTarget)).append($compile('<div class="clearfix"></div>')($scope));
      }
    }
    for (var property in obj) {
      if (_typeof(obj[property]) == "object") {
        $scope.renderClearfixHtmlFromAiConfig(obj[property]);
      }
    }
  };
  // this function append a compiled Directive into the DOM
  // just a note : I dont like the fact that I am using the directives Idea of where it is to render it I would rather use the
  // position of the last column i saw while iterating.
  $scope.renderDirectiveHtmlFromAiConfig = function (obj) {
    if (obj.hasOwnProperty('ai_directive')) {
      if (obj['ai_directive_type'] === 'content') {
        $scope.appendTarget = '#p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_c_' + obj['ai_directive_col'] + '_ai_col';
        angular.element(document.querySelector($scope.appendTarget)).append($compile('<div style="margin:0px;padding:0px" class="directiveLandingZone"><' + obj['ai_directive_name'] + ' id="p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_c_' + obj['ai_directive_col'] + '" ' + $scope.renderattributeString(obj['ai_directive_attributes']) + '\'directiveSpace\': true}"></' + obj['ai_directive_name'] + '></div>')($scope));
      }
    }
    for (var property in obj) {
      if (_typeof(obj[property]) == "object") {
        $scope.renderDirectiveHtmlFromAiConfig(obj[property]);
      }
    }
  };

  // this function adds a new element to the config obj
  $scope.creatConfigObject = function (target, obj) {
    //target=obj;
    angular.copy(obj, target);
  };
  // this read a appConfig object
  $scope.readConfigObject = function (target, newelement) {};

  // this function updates a appconfig object
  $scope.updateConfigObject = function (target, newelement, obj) {
    target[newelement] = obj;
  };

  // this function deletes a object from the appConfig object
  $scope.deleteconfigObject = function (target, subElement) {
    delete target[subElement];
  };

  // this functon get the next row number to assgin for the current page
  $scope.getNextRowPage = function (page) {
    var newRow;
    return newRow;
  };

  // this functon get the next row and column number to assgin for the current page
  $scope.getNextColumnInRow = function (page, row) {
    var newCol;
    return newCol;
  };

  // this function will create the needed target object and return a reference to the  config target
  $scope.makeConfigTarget = function (page, row, column, landDirective) {
    if (landDirective) {
      if ($scope.appConfig.pages['page_' + page]['rows']['row_' + row]['cols'].hasOwnProperty('col_' + column)) {
        return $scope.appConfig.pages['page_' + page]['rows']['row_' + row]['cols']['col_' + column]['ai_content'] = {};
      }
    } else if (column) {
      if (!$scope.appConfig.pages['page_' + page]['rows']['row_' + row].hasOwnProperty('cols')) {
        $scope.appConfig.pages['page_' + page]['rows']['row_' + row]['cols'] = {};
      };
      return $scope.appConfig.pages['page_' + page]['rows']['row_' + row]['cols']['col_' + column] = {};
    } else if (row) {
      if (!$scope.appConfig.pages['page_' + page].hasOwnProperty('rows')) {
        $scope.appConfig.pages['page_' + page]['rows'] = {};
      };
      return $scope.appConfig.pages['page_' + page]['rows']['row_' + row] = {};
    } else if (page) {
      if (!$scope.appConfig.pages.hasOwnProperty('pages')) {
        $scope.appConfig.pages = {};
      }
      return $scope.appConfig.pages['page_' + page] = {};
    }
  };

  $scope.setPostionProperties = function (object, page, row, column) {
    object.ai_directive_page = page;
    object.ai_directive_row = row;
    object.ai_directive_col = column;
  };

  $scope.moveElementHorz = function (direction) {
    console.log(direction);
    if ($scope.appConfigEditCopy.ai_directive_col - 1 < 1 && direction === 'left') {
      return;
    } else {
      var targetColPosition = $scope.appConfigEditCopy.ai_directive_col - 1;
    };
    if (direction === 'right') {
      var targetColPosition = $scope.appConfigEditCopy.ai_directive_col + 1;
    };
    var configTarget = $scope.getTargetObjectById($scope.appConfigEditCopy.ai_directive_page, $scope.appConfigEditCopy.ai_directive_row, targetColPosition);
    if (configTarget === undefined) {
      return;
    };
    console.log(configTarget);

    // move the element to the left/right into the active elements position
    angular.copy(configTarget, $scope.referenceToEditInAppConfig);
    //correct the position labels

    $scope.setPostionProperties($scope.referenceToEditInAppConfig, $scope.appConfigEditCopy.ai_directive_page, $scope.appConfigEditCopy.ai_directive_row, $scope.appConfigEditCopy.ai_directive_col);
    $scope.setPostionProperties($scope.referenceToEditInAppConfig.ai_content, $scope.appConfigEditCopy.ai_directive_page, $scope.appConfigEditCopy.ai_directive_row, $scope.appConfigEditCopy.ai_directive_col);
    //correct the position labels in the edit copy
    $scope.setPostionProperties($scope.appConfigEditCopy, $scope.appConfigEditCopy.ai_directive_page, $scope.appConfigEditCopy.ai_directive_row, targetColPosition);
    $scope.setPostionProperties($scope.appConfigEditCopy.ai_content, $scope.appConfigEditCopy.ai_directive_page, $scope.appConfigEditCopy.ai_directive_row, $scope.appConfigEditCopy.ai_directive_col);
    // move edit copy content into left element
    angular.copy($scope.appConfigEditCopy, configTarget);
    $scope.saveEntireProject();
  };

  $scope.moveElementVert = function (direction) {
    var targetRowPosition = 0;
    if ($scope.appConfigEditCopy.ai_directive_row - 1 < 1 && direction === 'up') {
      return;
    } else {
      var targetRowPosition = $scope.appConfigEditCopy.ai_directive_row - 1;
    };
    if (direction === 'down') {
      targetRowPosition = $scope.appConfigEditCopy.ai_directive_row + 1;
    };
    var configTarget = $scope.makeConfigTarget($scope.appConfigEditCopy.ai_directive_page, targetRowPosition, $scope.getLastColumn($scope.appConfigEditCopy.ai_directive_page, targetRowPosition) + 1);
    if (configTarget === undefined) {
      return;
    };
    // move the element to the into the active elements position
    angular.copy($scope.appConfigEditCopy, configTarget);
    $scope.setPostionProperties(configTarget, $scope.appConfigEditCopy.ai_directive_page, targetRowPosition, $scope.getLastColumn($scope.appConfigEditCopy.ai_directive_page, targetRowPosition));
    $scope.setPostionProperties(configTarget.ai_content, $scope.appConfigEditCopy.ai_directive_page, targetRowPosition, $scope.getLastColumn($scope.appConfigEditCopy.ai_directive_page, targetRowPosition));
    angular.copy({}, $scope.referenceToEditInAppConfig);
    $scope.saveEntireProject();
  };

  // add a page
  $scope.addNewPage = function (page, manifest) {
    // get the next available page number
    // call manifestToAppConfig on that page number to the config
    $scope.configTarget = $scope.makeConfigTarget(1);
    // copy it to the edit object
    // send it to the server
    // replace the appconfig the servers reply (now the server and the page are in sync)
    // it will then take that page object and add it
    $scope.creatConfigObject($scope.configTarget, $scope.manifestToAppConfig(page, '', '', manifest));
  };
  // add a row
  $scope.addNewRow = function (page, row, manifest) {
    // call manifestToAppConfig on that page number to the config
    $scope.configTarget = $scope.makeConfigTarget(page, row);
    // copy it to the edit object
    // send it to the server
    // replace the appconfig the servers reply (now the server and the page are in sync)
    // it will then take that page object and add it
    //console.log($scope.configTarget);
    $scope.creatConfigObject($scope.configTarget, $scope.manifestToAppConfig(page, row, '', manifest));
  };
  $scope.addNewColumn = function (page, row, column, manifest) {
    // get the next available row number
    // call manifestToAppConfig on that page number to the config
    $scope.configTarget = $scope.makeConfigTarget(page, row, column);
    // copy it to the edit object
    // send it to the server
    // replace the appconfig the servers reply (now the server and the page are in sync)
    // it will then take that page object and add it
    $scope.creatConfigObject($scope.configTarget, $scope.manifestToAppConfig(page, row, column, manifest));
  };
  // add new directive NOTE: there is no add column because there is a one to one relationshiop between direstives and columns
  $scope.addNewDirective = function (page, row, column, manifest) {
    // get the next available column number
    // call manifestToAppConfig on that page number to the config
    $scope.configTarget = $scope.makeConfigTarget(page, row, column, column);
    // copy it to the edit object
    // send it to the server
    // replace the appconfig the servers reply (now the server and the page are in sync)
    // it will then take that page object and add it
    $scope.creatConfigObject($scope.configTarget, $scope.manifestToAppConfig(page, row, column, manifest));
    $scope.moveConfigObjectToEdit($scope.configTarget);
  };

  $scope.addToPage = function (manifest) {

    console.log('running add', manifest);
    //if the directive is a layout type
    if (manifest.ai_directive_type === 'layout') {
      if (manifest.ai_directive_name === 'ai_page') {
        $scope.addNewPage($scope.lastPage + 1, manifest);
      } else if (manifest.ai_directive_name === 'ai_row') {
        $scope.addNewRow($scope.lastPage, $scope.lastRow + 1, manifest);
      } else if (manifest.ai_directive_name === 'ai_col') {
        $scope.addNewColumn($scope.lastPage, $scope.lastRow, $scope.lastColumn + 1, manifest);
      }
    } else {
      $scope.addNewColumn($scope.lastPage, $scope.lastRow, $scope.lastColumn + 1, $scope.ai_column_manifest);
      $timeout(function () {
        $scope.addNewDirective($scope.lastPage, $scope.lastRow, $scope.lastColumn, manifest);
        $scope.setEditCandidate('p_' + $scope.lastPage + '_r_' + $scope.lastRow + '_c_' + $scope.lastColumn + '_ai_col');
        $scope.setEditSelect();
        $scope.DSopen = false;
        $scope.saveEdit('addtoPage');
      }, 1000);
    }
    $scope.DSopen = false;
    $timeout(function () {
      $scope.cplopen = true;
    }, 1500);
  };

  $scope.project = project; //init the $scope.project for resolve of project in state machine
  $timeout(function () {
    if ($scope.project.config[0] === undefined) {
      //console.log('setting up');
      $scope.appConfig = {
        project_name: 'ourfirst app',
        pages: {}
      };
    } else {
      $scope.appConfig = {};
      $scope.appConfigTemp = {};
      angular.copy(JSON.parse($scope.project.config[0]), $scope.appConfigTemp);
      $scope.normalizeIds($scope.appConfigTemp); // normalize the object before it is render
      $timeout(function () {
        angular.copy($scope.appConfigTemp, $scope.appConfig);
        console.dir($scope.appConfig);
      }, 500);
    }
    // angular.copy($scope.appConfigtemp,$scope.appConfig);
  }, 100);
  // this watch block renders a the dom when the appconfig changes
  $scope.$watch('appConfig', function () {
    angular.element(workarea).empty();
    $scope.renderRowHtmlFromAiConfig($scope.appConfig, '');
    $timeout(function () {
      $scope.renderColHtmlFromAiConfig($scope.appConfig, '');
    }, 200);
    $timeout(function () {
      $scope.renderDirectiveHtmlFromAiConfig($scope.appConfig, '');
      $scope.getLastColumn();
      $scope.renderClearfixHtmlFromAiConfig($scope.appConfig, '');
      $scope.gotoElement($scope.editCandidate);
    }, 500);
  }, true);

  $scope.getEditCandidate = function (id) {
    if (id === $scope.editCandidate) {
      return true;
    } else {
      return false;
    }
  };

  $scope.setEditCandidate = function (id) {
    $scope.editCandidate = id;
  };

  $scope.findDirectiveToMakeActiveEdit = function (obj, idToMatch) {
    if (obj.hasOwnProperty('ai_directive')) {
      if (obj.ai_directive_type === 'layout') {
        var rowidstring = 'p_' + obj['ai_directive_page'] + '_ai_page';
        var rowidstring = 'p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_ai_row';
        var colidstring = 'p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_c_' + obj['ai_directive_col'] + '_ai_col';
        if (idToMatch == rowidstring || idToMatch == colidstring) {
          $scope.referenceToEditInAppConfig = obj;
          angular.copy(obj, $scope.appConfigEditCopy);
          return;
        }
      }
    }
    for (var property in obj) {
      if (_typeof(obj[property]) == "object") {
        $scope.findDirectiveToMakeActiveEdit(obj[property], idToMatch);
      }
    }
  };

  $scope.gotoElement = function (eID) {
    // set the location.hash to the id of
    // the element you wish to scroll to.
    $location.hash(eID);
    // call $anchorScroll()
    anchorSmoothScroll.scrollTo(eID);
  };

  $scope.setEditSelect = function (id) {
    // THE DIRECTIVE THAT IS IN THE EDIT CANDIDATE COLUMN
    $scope.cplopen = true;
    $scope.DSopen = false;
    $scope.findDirectiveToMakeActiveEdit($scope.appConfig, $scope.editCandidate);
    $scope.gotoElement($scope.editCandidate);
  };
  $timeout(function () {
    if ($scope.appConfig.pages.page_1 === undefined) {
      $scope.addToPage($scope.builtInManifests[0]);
    };
    if ($scope.appConfig.pages.page_1.rows.row_1 === undefined) {
      $scope.addToPage($scope.builtInManifests[1]);
    };
  }, 1000);
  $timeout(function () {
    if ($scope.appConfig.pages.page_1.rows === undefined) {
      $scope.addToPage($scope.builtInManifests[1]);
    };
  }, 5000);
});

app.service('anchorSmoothScroll', function () {

  this.scrollTo = function (eID) {

    // This scrolling function
    // is from http://www.itnewb.com/tutorial/Creating-the-Smooth-Scroll-Effect-with-JavaScript

    var startY = currentYPosition();
    var stopY = elmYPosition(eID);
    var distance = stopY > startY ? stopY - startY : startY - stopY;
    if (distance < 100) {
      scrollTo(0, stopY);return;
    }
    var speed = Math.round(distance / 100);
    if (speed >= 20) speed = 20;
    var step = Math.round(distance / 25);
    var leapY = stopY > startY ? startY + step : startY - step;
    var timer = 0;
    if (stopY > startY) {
      for (var i = startY; i < stopY; i += step) {
        setTimeout("window.scrollTo(0, " + leapY + ")", timer * speed);
        leapY += step;if (leapY > stopY) leapY = stopY;timer++;
      }return;
    }
    for (var i = startY; i > stopY; i -= step) {
      setTimeout("window.scrollTo(0, " + leapY + ")", timer * speed);
      leapY -= step;if (leapY < stopY) leapY = stopY;timer++;
    }

    function currentYPosition() {
      // Firefox, Chrome, Opera, Safari
      if (self.pageYOffset) return self.pageYOffset;
      // Internet Explorer 6 - standards mode
      if (document.documentElement && document.documentElement.scrollTop) return document.documentElement.scrollTop;
      // Internet Explorer 6, 7 and 8
      if (document.body.scrollTop) return document.body.scrollTop;
      return 0;
    }

    function elmYPosition(eID) {
      var elm = document.getElementById(eID);
      var y = elm.offsetTop;
      var node = elm;
      while (node.offsetParent && node.offsetParent != document.body) {
        node = node.offsetParent;
        y += node.offsetTop;
      }return y;
    }
  };
});

app.factory('manifestFactoryStatic', function () {
  return [{
    ai_directive: true,
    ai_directive_type: 'content',
    ai_directive_name: 'solo_table',
    ai_directive_attributes: {
      solo_table_title: 'title',
      solo_table_class: 'myclass',
      solo_table_info_source: 'myclass',
      solo_table_info_type: 'file'
    }
  }, {
    ai_directive: true,
    ai_directive_type: 'content',
    ai_directive_name: 'solo_table',
    ai_directive_attributes: {
      solo_table_title: 'title',
      solo_table_class: 'myclass',
      solo_table_info_source: 'myclass',
      solo_table_info_type: 'file'
    }
  }, {
    ai_directive: true,
    ai_directive_type: 'content',
    ai_directive_name: 'solo_table',
    ai_directive_attributes: {
      solo_table_title: 'title',
      solo_table_class: 'myclass',
      solo_table_info_source: 'myclass',
      solo_table_info_type: 'file'
    }
  }];
});

app.directive('aiPage', function () {
  return {
    transclude: true,
    restrict: 'EA',
    scope: {
      aiClass: '/css/row_a/style.css',
      aiPageTitle: '',
      aiPageMenuText: ''
    },
    template: ''
  };
});
app.directive('aiRow', function () {
  return {
    transclude: true,
    restrict: 'EA',
    scope: {
      inceptRowOrder: '@',
      inceptRowBgColor: '@',
      inceptRowBgImage: '@'
    },
    template: ''
  };
});

app.directive('aiCol', function () {
  return {
    transclude: true,
    restrict: 'E',
    scope: {
      inceptionColId: '@',
      inceptionColWidth: '@',
      inceptionRowId: '@',
      inceptionColOrderInRow: '@'
    },
    template: ''
  };
});

app.directive('directiveShopCard', function () {
  return {
    restrict: "EA",
    scope: {
      manifest: '='
    },
    templateUrl: 'directiveStore/directiveStoreCard/card.html'
  };
});

app.directive('aiEditHotSpot', function () {
  return {
    transclude: true,
    restrict: 'EA',
    scope: {
      aiEditHotSpotId: '@',
      editObjectType: '@',
      activeEditElement: '=',
      setActiveEditElement: '&'
    },
    templateUrl: 'js/projects/edithotspot.html'
  };
});

app.factory('manifestFactory', function ($http) {
  return {
    getAll: function getAll() {
      return $http.get('/api/manifests/').then(function (manifests) {
        console.log(manifests.data);
        return manifests;
      });
    }
  };
});

app.factory('ProjectFactory', function ($http) {
  var projectObj;
  var _projectCache = [];

  projectObj = {
    getAll: function getAll() {
      return $http.get('/api/projects').then(function (projects) {
        console.log(projects);
        angular.copy(projects.data, _projectCache);
        return _projectCache;
      });
    },

    getAllByUser: function getAllByUser(userId) {
      return $http.get('/api/projects/user/' + userId).then(function (projects) {
        //console.log(projects);
        angular.copy(projects.data, _projectCache);
        return _projectCache;
      });
    },

    getOne: function getOne(id) {
      return $http.get('/api/projects/' + id).then(function (project) {
        return project.data;
      });
    },

    add: function add(project) {
      return $http({
        url: '/api/projects/',
        method: "POST",
        data: project
      }).then(function (_project) {
        return _project.data;
      });
    },

    delete: function _delete(id) {
      return $http.delete('/api/projects/' + id).then(function (project) {
        return project.data;
      });
    },

    update: function update(project) {
      return $http({
        url: '/api/projects/' + project._id,
        method: "PUT",
        data: project
      }).then(function (_project) {
        return _project.data;
      });
    },

    getDataSets: function getDataSets(productId) {
      return null;
    }

  };

  return projectObj;
});
app.config(function ($stateProvider) {
  $stateProvider.state('signup', {
    url: '/signup',
    templateUrl: 'js/signup/signup.html',
    controller: 'SignupCtrl'
  });
});

app.controller('SignupCtrl', function ($scope, $state, AuthService, Session, UserFactory) {
  $scope.checkUser = function () {
    if (Session.user) return true;else return false;
  };

  $scope.changeValue = function () {
    $scope.NewUserForm.$setUntouched();
  };

  $scope.createUser = function () {
    UserFactory.create($scope.newUser).then(function (user) {
      return AuthService.login($scope.newUser);
    }).then(function () {
      $state.go('home');
    });
  };
});

// var data2 = [{"hdrid":1640712493,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"7","teachercode":"338635086","teachername":"Gregory,Polly","teacheremailaddress":"aja@lu.org","classcode":"aahoi-9-41","classname":"PE 902","classgradelevel":9,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"11263113779326","studentfirstname":"Stella","studentmiddlename":"Lura","studentlastname":"Strickland","studentphone":"5304461587","studentemailaddress":"jiwezsu@bomguwuf.co.uk","studentgender":"F","studentethnicity":"Other","studentdateofbirth":"20010704","studentaddress1":"869 Apdak Ave","studentaddress2":"Apt 9d","studentaddresscity":"Gakukoac","studentaddressstate":"NV","studentaddresszip":"30464","guardianphone":"9779059052","studentgradelevel":"9","sourcestudentusername":"b5693eb69d3f2321","projectedgraduationdate":"2018","sourceteacherusername":"f28f1342","teacherpersonaltitleprefix":"Mrs.","teacherfirstname":"Polly","teacherlastname":"Gregory","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":0},{"hdrid":1640712487,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"7","teachercode":"338635086","teachername":"Gregory,Polly","teacheremailaddress":"aja@lu.org","classcode":"aahoi-9-41","classname":"PE 902","classgradelevel":9,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"13876185028089","studentfirstname":"Lettie","studentmiddlename":"Lucille","studentlastname":"Salazar","studentphone":"1922232899","studentemailaddress":"onewi@jiwewe.com","studentgender":"F","studentethnicity":"Asian","studentdateofbirth":"20010520","studentaddress1":"1255 Husdef Ext","studentaddress2":"Apt 10a","studentaddresscity":"Nuvapgal","studentaddressstate":"NM","studentaddresszip":"22332","guardianphone":"4371804394","studentgradelevel":"9","sourcestudentusername":"f7234b516b28ec6d","projectedgraduationdate":"2018","sourceteacherusername":"f28f1342","teacherpersonaltitleprefix":"Mrs.","teacherfirstname":"Polly","teacherlastname":"Gregory","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":1},{"hdrid":1640712482,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"7","teachercode":"338635086","teachername":"Gregory,Polly","teacheremailaddress":"aja@lu.org","classcode":"aahoi-9-41","classname":"PE 902","classgradelevel":9,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"29749285222755","studentfirstname":"Terry","studentmiddlename":"Gordon","studentlastname":"Brock","studentphone":"6018101572","studentemailaddress":"welge@datu.com","studentgender":"M","studentethnicity":"Black, Not Of Hispanic Origin","studentdateofbirth":"20010216","studentaddress1":"471 Vial Loop","studentaddress2":"Apt 6c","studentaddresscity":"Gumujolo","studentaddressstate":"SC","studentaddresszip":"15765","guardianphone":"3777784388","studentgradelevel":"9","sourcestudentusername":"249df8ecde14c86a","projectedgraduationdate":"2018","sourceteacherusername":"f28f1342","teacherpersonaltitleprefix":"Mrs.","teacherfirstname":"Polly","teacherlastname":"Gregory","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":2},{"hdrid":1640712476,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"7","teachercode":"338635086","teachername":"Gregory,Polly","teacheremailaddress":"aja@lu.org","classcode":"aahoi-9-41","classname":"PE 902","classgradelevel":9,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"29848177172243","studentfirstname":"Millie","studentmiddlename":"Eula","studentlastname":"Swanson","studentphone":"9991703997","studentemailaddress":"mazraw@athiolu.io","studentgender":"F","studentethnicity":"Asian","studentdateofbirth":"20010715","studentaddress1":"780 Suvamo Path","studentaddress2":"Apt 8c","studentaddresscity":"Ucnefil","studentaddressstate":"WA","studentaddresszip":"41946","guardianphone":"1620832650","studentgradelevel":"9","sourcestudentusername":"aee859a7f9cf1df5","projectedgraduationdate":"2018","sourceteacherusername":"f28f1342","teacherpersonaltitleprefix":"Mrs.","teacherfirstname":"Polly","teacherlastname":"Gregory","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":3},{"hdrid":1640712486,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"7","teachercode":"338635086","teachername":"Gregory,Polly","teacheremailaddress":"aja@lu.org","classcode":"aahoi-9-41","classname":"PE 902","classgradelevel":9,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"31767793744802","studentfirstname":"Alice","studentmiddlename":"Sarah","studentlastname":"Walters","studentphone":"4726623840","studentemailaddress":"lid@cavcaz.co.uk","studentgender":"F","studentethnicity":"Other","studentdateofbirth":"20010526","studentaddress1":"1415 Pokob Pass","studentaddress2":"Apt 7a","studentaddresscity":"Beldevce","studentaddressstate":"SC","studentaddresszip":"92221","guardianphone":"3840691505","studentgradelevel":"9","sourcestudentusername":"de4fa44c721e82e9","projectedgraduationdate":"2018","sourceteacherusername":"f28f1342","teacherpersonaltitleprefix":"Mrs.","teacherfirstname":"Polly","teacherlastname":"Gregory","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":4},{"hdrid":1640712496,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"7","teachercode":"338635086","teachername":"Gregory,Polly","teacheremailaddress":"aja@lu.org","classcode":"aahoi-9-41","classname":"PE 902","classgradelevel":9,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"31953047857516","studentfirstname":"Jennie","studentmiddlename":"Frances","studentlastname":"Dennis","studentphone":"5964867304","studentemailaddress":"hakdoave@feb.co.uk","studentgender":"F","studentethnicity":"Asian","studentdateofbirth":"20010202","studentaddress1":"1912 Carto Pl","studentaddress2":"Apt 3c","studentaddresscity":"Rozahfe","studentaddressstate":"CT","studentaddresszip":"77462","guardianphone":"7423265458","studentgradelevel":"9","sourcestudentusername":"4d0ef3390e3a8803","projectedgraduationdate":"2018","sourceteacherusername":"f28f1342","teacherpersonaltitleprefix":"Mrs.","teacherfirstname":"Polly","teacherlastname":"Gregory","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":5},{"hdrid":1640712479,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"7","teachercode":"338635086","teachername":"Gregory,Polly","teacheremailaddress":"aja@lu.org","classcode":"aahoi-9-41","classname":"PE 902","classgradelevel":9,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"32893227020071","studentfirstname":"Lelia","studentmiddlename":"Mary","studentlastname":"Gill","studentphone":"5493772352","studentemailaddress":"jenzucof@jogo.net","studentgender":"F","studentethnicity":"Black, Not Of Hispanic Origin","studentdateofbirth":"20010805","studentaddress1":"569 Migid Mill","studentaddress2":"Apt 3e","studentaddresscity":"Ticjescu","studentaddressstate":"MI","studentaddresszip":"96072","guardianphone":"7630549857","studentgradelevel":"9","sourcestudentusername":"86eecbc4b191e20d","projectedgraduationdate":"2018","sourceteacherusername":"f28f1342","teacherpersonaltitleprefix":"Mrs.","teacherfirstname":"Polly","teacherlastname":"Gregory","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":6},{"hdrid":1640712481,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"7","teachercode":"338635086","teachername":"Gregory,Polly","teacheremailaddress":"aja@lu.org","classcode":"aahoi-9-41","classname":"PE 902","classgradelevel":9,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"38444645226829","studentfirstname":"Randy","studentmiddlename":"Ryan","studentlastname":"Coleman","studentphone":"4697023586","studentemailaddress":"zuv@na.io","studentgender":"M","studentethnicity":"Other","studentdateofbirth":"20011217","studentaddress1":"154 Raico Gln","studentaddress2":"Apt 9a","studentaddresscity":"Lijotra","studentaddressstate":"HI","studentaddresszip":"03740","guardianphone":"3865757050","studentgradelevel":"9","sourcestudentusername":"9554a4418cf7ddcd","projectedgraduationdate":"2018","sourceteacherusername":"f28f1342","teacherpersonaltitleprefix":"Mrs.","teacherfirstname":"Polly","teacherlastname":"Gregory","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":7},{"hdrid":1640712488,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"7","teachercode":"338635086","teachername":"Gregory,Polly","teacheremailaddress":"aja@lu.org","classcode":"aahoi-9-41","classname":"PE 902","classgradelevel":9,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"39066109330289","studentfirstname":"Maud","studentmiddlename":"Jeanette","studentlastname":"Henry","studentphone":"7495395903","studentemailaddress":"ojefasuko@rogtifus.edu","studentgender":"F","studentethnicity":"Other","studentdateofbirth":"20010909","studentaddress1":"1194 Kacpe Path","studentaddress2":"Apt 2b","studentaddresscity":"Gimkamsaj","studentaddressstate":"MD","studentaddresszip":"88548","guardianphone":"7824358660","studentgradelevel":"9","sourcestudentusername":"4a1e7d8b9cfc3c4a","projectedgraduationdate":"2018","sourceteacherusername":"f28f1342","teacherpersonaltitleprefix":"Mrs.","teacherfirstname":"Polly","teacherlastname":"Gregory","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":8},{"hdrid":1640712491,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"7","teachercode":"338635086","teachername":"Gregory,Polly","teacheremailaddress":"aja@lu.org","classcode":"aahoi-9-41","classname":"PE 902","classgradelevel":9,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"41243427412377","studentfirstname":"George","studentmiddlename":"Louis","studentlastname":"Delgado","studentphone":"1701148913","studentemailaddress":"du@dimkipan.edu","studentgender":"M","studentethnicity":"Native Hawaiian or Pacific Islander","studentdateofbirth":"20011011","studentaddress1":"1273 Wovi Mnr","studentaddress2":"Apt 3b","studentaddresscity":"Podomduc","studentaddressstate":"LA","studentaddresszip":"95686","guardianphone":"9624063786","studentgradelevel":"9","sourcestudentusername":"98cf6e7b449c1220","projectedgraduationdate":"2018","sourceteacherusername":"f28f1342","teacherpersonaltitleprefix":"Mrs.","teacherfirstname":"Polly","teacherlastname":"Gregory","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":9},{"hdrid":1640712478,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"7","teachercode":"338635086","teachername":"Gregory,Polly","teacheremailaddress":"aja@lu.org","classcode":"aahoi-9-41","classname":"PE 902","classgradelevel":9,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"48011763704319","studentfirstname":"Francis","studentmiddlename":"Nelle","studentlastname":"Little","studentphone":"6854757341","studentemailaddress":"meltep@jajpiduv.co.uk","studentgender":"F","studentethnicity":"Hispanic","studentdateofbirth":"20010628","studentaddress1":"685 Seti Plz","studentaddress2":"Apt 1c","studentaddresscity":"Objicaj","studentaddressstate":"DE","studentaddresszip":"49643","guardianphone":"8269398487","studentgradelevel":"9","sourcestudentusername":"28d58d76b8021b3e","projectedgraduationdate":"2018","sourceteacherusername":"f28f1342","teacherpersonaltitleprefix":"Mrs.","teacherfirstname":"Polly","teacherlastname":"Gregory","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":10},{"hdrid":1640712492,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"7","teachercode":"338635086","teachername":"Gregory,Polly","teacheremailaddress":"aja@lu.org","classcode":"aahoi-9-41","classname":"PE 902","classgradelevel":9,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"64122011678086","studentfirstname":"Louise","studentmiddlename":"Iva","studentlastname":"Schultz","studentphone":"9309236746","studentemailaddress":"kiizgi@eko.net","studentgender":"F","studentethnicity":"Hispanic","studentdateofbirth":"20011226","studentaddress1":"749 Cufmam Mill","studentaddress2":"Apt 7b","studentaddresscity":"Heganaico","studentaddressstate":"RI","studentaddresszip":"37582","guardianphone":"2443650954","studentgradelevel":"9","sourcestudentusername":"1f8e2b883415cdee","projectedgraduationdate":"2018","sourceteacherusername":"f28f1342","teacherpersonaltitleprefix":"Mrs.","teacherfirstname":"Polly","teacherlastname":"Gregory","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":11},{"hdrid":1640712494,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"7","teachercode":"338635086","teachername":"Gregory,Polly","teacheremailaddress":"aja@lu.org","classcode":"aahoi-9-41","classname":"PE 902","classgradelevel":9,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"64263952585558","studentfirstname":"Virgie","studentmiddlename":"Verna","studentlastname":"Simpson","studentphone":"4658883880","studentemailaddress":"zilba@vuupoozu.net","studentgender":"F","studentethnicity":"Asian","studentdateofbirth":"20011119","studentaddress1":"78 Caaja St","studentaddress2":"Apt 8d","studentaddresscity":"Pumerepur","studentaddressstate":"MD","studentaddresszip":"07531","guardianphone":"2293604194","studentgradelevel":"9","sourcestudentusername":"bfe7cd31510e6aaf","projectedgraduationdate":"2018","sourceteacherusername":"f28f1342","teacherpersonaltitleprefix":"Mrs.","teacherfirstname":"Polly","teacherlastname":"Gregory","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":12},{"hdrid":1640712480,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"7","teachercode":"338635086","teachername":"Gregory,Polly","teacheremailaddress":"aja@lu.org","classcode":"aahoi-9-41","classname":"PE 902","classgradelevel":9,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"66984581036700","studentfirstname":"Andre","studentmiddlename":"Francisco","studentlastname":"Jacobs","studentphone":"4015254696","studentemailaddress":"assano@nacnuif.org","studentgender":"M","studentethnicity":"Native Hawaiian or Pacific Islander","studentdateofbirth":"20010615","studentaddress1":"1483 Pezzuf Rdg","studentaddress2":"Apt 3a","studentaddresscity":"Kibumukuz","studentaddressstate":"OK","studentaddresszip":"02310","guardianphone":"6546309118","studentgradelevel":"9","sourcestudentusername":"a6a18d0fc31fe644","projectedgraduationdate":"2018","sourceteacherusername":"f28f1342","teacherpersonaltitleprefix":"Mrs.","teacherfirstname":"Polly","teacherlastname":"Gregory","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":13},{"hdrid":1640712484,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"7","teachercode":"338635086","teachername":"Gregory,Polly","teacheremailaddress":"aja@lu.org","classcode":"aahoi-9-41","classname":"PE 902","classgradelevel":9,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"73051808236373","studentfirstname":"Willie","studentmiddlename":"Amelia","studentlastname":"Parks","studentphone":"3772544941","studentemailaddress":"hecohroh@tef.gov","studentgender":"F","studentethnicity":"Other","studentdateofbirth":"20010304","studentaddress1":"1207 Opbu Pt","studentaddress2":"Apt 9c","studentaddresscity":"Dogasran","studentaddressstate":"CT","studentaddresszip":"41839","guardianphone":"6688103104","studentgradelevel":"9","sourcestudentusername":"eeb933afed3971cf","projectedgraduationdate":"2018","sourceteacherusername":"f28f1342","teacherpersonaltitleprefix":"Mrs.","teacherfirstname":"Polly","teacherlastname":"Gregory","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":14},{"hdrid":1640712495,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"7","teachercode":"338635086","teachername":"Gregory,Polly","teacheremailaddress":"aja@lu.org","classcode":"aahoi-9-41","classname":"PE 902","classgradelevel":9,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"75306609955926","studentfirstname":"Arthur","studentmiddlename":"Duane","studentlastname":"Sullivan","studentphone":"4654545225","studentemailaddress":"moura@fos.com","studentgender":"M","studentethnicity":"Native Hawaiian or Pacific Islander","studentdateofbirth":"20011022","studentaddress1":"607 Sume Grv","studentaddress2":"Apt 6d","studentaddresscity":"Wiicpo","studentaddressstate":"HI","studentaddresszip":"33851","guardianphone":"3151070500","studentgradelevel":"9","sourcestudentusername":"ec15418d34b4c60b","projectedgraduationdate":"2018","sourceteacherusername":"f28f1342","teacherpersonaltitleprefix":"Mrs.","teacherfirstname":"Polly","teacherlastname":"Gregory","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":15},{"hdrid":1640712475,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"7","teachercode":"338635086","teachername":"Gregory,Polly","teacheremailaddress":"aja@lu.org","classcode":"aahoi-9-41","classname":"PE 902","classgradelevel":9,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"76569585502147","studentfirstname":"Esther","studentmiddlename":"Emilie","studentlastname":"Cobb","studentphone":"5852424814","studentemailaddress":"so@gurorumes.com","studentgender":"F","studentethnicity":"Asian","studentdateofbirth":"20010628","studentaddress1":"303 Fatho Blvd","studentaddress2":"Apt 8b","studentaddresscity":"Vepbohel","studentaddressstate":"MT","studentaddresszip":"61245","guardianphone":"4239189726","studentgradelevel":"9","sourcestudentusername":"04369584c85e8479","projectedgraduationdate":"2018","sourceteacherusername":"f28f1342","teacherpersonaltitleprefix":"Mrs.","teacherfirstname":"Polly","teacherlastname":"Gregory","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":16},{"hdrid":1640712483,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"7","teachercode":"338635086","teachername":"Gregory,Polly","teacheremailaddress":"aja@lu.org","classcode":"aahoi-9-41","classname":"PE 902","classgradelevel":9,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"88770636647111","studentfirstname":"Eleanor","studentmiddlename":"Mollie","studentlastname":"Burns","studentphone":"3200580336","studentemailaddress":"mankuwuf@ba.co.uk","studentgender":"F","studentethnicity":"Hispanic","studentdateofbirth":"20010217","studentaddress1":"824 Sagit Park","studentaddress2":"Apt 1c","studentaddresscity":"Wegpalad","studentaddressstate":"AL","studentaddresszip":"05510","guardianphone":"1296365258","studentgradelevel":"9","sourcestudentusername":"80b190af46abcba8","projectedgraduationdate":"2018","sourceteacherusername":"f28f1342","teacherpersonaltitleprefix":"Mrs.","teacherfirstname":"Polly","teacherlastname":"Gregory","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":17},{"hdrid":1640712485,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"7","teachercode":"338635086","teachername":"Gregory,Polly","teacheremailaddress":"aja@lu.org","classcode":"aahoi-9-41","classname":"PE 902","classgradelevel":9,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"90517253056168","studentfirstname":"Dylan","studentmiddlename":"Lee","studentlastname":"James","studentphone":"3388136734","studentemailaddress":"kozami@nirvo.io","studentgender":"M","studentethnicity":"Other","studentdateofbirth":"20011206","studentaddress1":"395 Vepcim Blvd","studentaddress2":"Apt 10e","studentaddresscity":"Dupagi","studentaddressstate":"HI","studentaddresszip":"56815","guardianphone":"2981891344","studentgradelevel":"9","sourcestudentusername":"ec29536a4501791e","projectedgraduationdate":"2018","sourceteacherusername":"f28f1342","teacherpersonaltitleprefix":"Mrs.","teacherfirstname":"Polly","teacherlastname":"Gregory","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":18},{"hdrid":1640712489,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"7","teachercode":"338635086","teachername":"Gregory,Polly","teacheremailaddress":"aja@lu.org","classcode":"aahoi-9-41","classname":"PE 902","classgradelevel":9,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"92861849835349","studentfirstname":"Andrew","studentmiddlename":"Shawn","studentlastname":"Ortega","studentphone":"8035788138","studentemailaddress":"fucug@kasideho.net","studentgender":"M","studentethnicity":"Black, Not Of Hispanic Origin","studentdateofbirth":"20010422","studentaddress1":"1262 Vihmok Hwy","studentaddress2":"Apt 6a","studentaddresscity":"Sodavewo","studentaddressstate":"OR","studentaddresszip":"69203","guardianphone":"9515361730","studentgradelevel":"9","sourcestudentusername":"e6b13e52fca0b4bd","projectedgraduationdate":"2018","sourceteacherusername":"f28f1342","teacherpersonaltitleprefix":"Mrs.","teacherfirstname":"Polly","teacherlastname":"Gregory","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":19},{"hdrid":1640712490,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"7","teachercode":"338635086","teachername":"Gregory,Polly","teacheremailaddress":"aja@lu.org","classcode":"aahoi-9-41","classname":"PE 902","classgradelevel":9,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"94929212580124","studentfirstname":"Eddie","studentmiddlename":"Shawn","studentlastname":"Crawford","studentphone":"9058149169","studentemailaddress":"ros@leopenoc.gov","studentgender":"M","studentethnicity":"Asian","studentdateofbirth":"20011124","studentaddress1":"1122 Ibanug Pike","studentaddress2":"Apt 1d","studentaddresscity":"Pewavpe","studentaddressstate":"MO","studentaddresszip":"58098","guardianphone":"4326480794","studentgradelevel":"9","sourcestudentusername":"656d3f62a0680857","projectedgraduationdate":"2018","sourceteacherusername":"f28f1342","teacherpersonaltitleprefix":"Mrs.","teacherfirstname":"Polly","teacherlastname":"Gregory","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":20},{"hdrid":1640712477,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"7","teachercode":"338635086","teachername":"Gregory,Polly","teacheremailaddress":"aja@lu.org","classcode":"aahoi-9-41","classname":"PE 902","classgradelevel":9,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"96894435770809","studentfirstname":"Adeline","studentmiddlename":"Barbara","studentlastname":"Schultz","studentphone":"6714964051","studentemailaddress":"moci@wu.gov","studentgender":"F","studentethnicity":"Other","studentdateofbirth":"20010629","studentaddress1":"1092 Pisufe Gln","studentaddress2":"Apt 3a","studentaddresscity":"Pipozik","studentaddressstate":"CO","studentaddresszip":"88335","guardianphone":"7751297762","studentgradelevel":"9","sourcestudentusername":"24b6d4b5d72e9142","projectedgraduationdate":"2018","sourceteacherusername":"f28f1342","teacherpersonaltitleprefix":"Mrs.","teacherfirstname":"Polly","teacherlastname":"Gregory","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":21},{"hdrid":1640714336,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"6","teachercode":"268988674","teachername":"Herrera,Miguel","teacheremailaddress":"idivi@vosabdil.io","classcode":"acipl-10-44","classname":"History 1005","classgradelevel":10,"classsubjectcode":"44","classsubjectname":"History","sectioncode":null,"studentcode":"22850716610749","studentfirstname":"Hulda","studentmiddlename":"Dora","studentlastname":"Pittman","studentphone":"6560575332","studentemailaddress":"wizuz@cizvihat.io","studentgender":"F","studentethnicity":"Black, Not Of Hispanic Origin","studentdateofbirth":"20000114","studentaddress1":"1337 Japmaj Rd","studentaddress2":"Apt 2a","studentaddresscity":"Ussiwi","studentaddressstate":"MA","studentaddresszip":"57007","guardianphone":"9177439695","studentgradelevel":"10","sourcestudentusername":"fd8f1efbd1fb09d2","projectedgraduationdate":"2017","sourceteacherusername":"c5cc7816","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Miguel","teacherlastname":"Herrera","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":22},{"hdrid":1640714328,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"6","teachercode":"268988674","teachername":"Herrera,Miguel","teacheremailaddress":"idivi@vosabdil.io","classcode":"acipl-10-44","classname":"History 1005","classgradelevel":10,"classsubjectcode":"44","classsubjectname":"History","sectioncode":null,"studentcode":"23834300889736","studentfirstname":"Kyle","studentmiddlename":"Nathaniel","studentlastname":"Hanson","studentphone":"1343165536","studentemailaddress":"don@garul.net","studentgender":"M","studentethnicity":"Native Hawaiian or Pacific Islander","studentdateofbirth":"20001017","studentaddress1":"607 Esda Grv","studentaddress2":"Apt 9d","studentaddresscity":"Sanhizuh","studentaddressstate":"NV","studentaddresszip":"67336","guardianphone":"4553912677","studentgradelevel":"10","sourcestudentusername":"82ee95bfcf446701","projectedgraduationdate":"2017","sourceteacherusername":"c5cc7816","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Miguel","teacherlastname":"Herrera","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":23},{"hdrid":1640714325,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"6","teachercode":"268988674","teachername":"Herrera,Miguel","teacheremailaddress":"idivi@vosabdil.io","classcode":"acipl-10-44","classname":"History 1005","classgradelevel":10,"classsubjectcode":"44","classsubjectname":"History","sectioncode":null,"studentcode":"27844542140761","studentfirstname":"Benjamin","studentmiddlename":"Gregory","studentlastname":"Norman","studentphone":"1882980556","studentemailaddress":"noda@uvo.org","studentgender":"M","studentethnicity":"Native Hawaiian or Pacific Islander","studentdateofbirth":"20000620","studentaddress1":"375 Otvet Blvd","studentaddress2":"Apt 4e","studentaddresscity":"Pawawiw","studentaddressstate":"TN","studentaddresszip":"80139","guardianphone":"2443796414","studentgradelevel":"10","sourcestudentusername":"4b37e492fa66c013","projectedgraduationdate":"2017","sourceteacherusername":"c5cc7816","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Miguel","teacherlastname":"Herrera","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":24},{"hdrid":1640714339,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"6","teachercode":"268988674","teachername":"Herrera,Miguel","teacheremailaddress":"idivi@vosabdil.io","classcode":"acipl-10-44","classname":"History 1005","classgradelevel":10,"classsubjectcode":"44","classsubjectname":"History","sectioncode":null,"studentcode":"42157173881100","studentfirstname":"Janie","studentmiddlename":"Barbara","studentlastname":"Curtis","studentphone":"8571430548","studentemailaddress":"weoho@abu.org","studentgender":"F","studentethnicity":"Hispanic","studentdateofbirth":"20001209","studentaddress1":"455 Hunde Ext","studentaddress2":"Apt 4d","studentaddresscity":"Ziubuwuj","studentaddressstate":"NJ","studentaddresszip":"03899","guardianphone":"2190869185","studentgradelevel":"10","sourcestudentusername":"6e88e967ac4c4c6a","projectedgraduationdate":"2017","sourceteacherusername":"c5cc7816","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Miguel","teacherlastname":"Herrera","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":25},{"hdrid":1640714326,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"6","teachercode":"268988674","teachername":"Herrera,Miguel","teacheremailaddress":"idivi@vosabdil.io","classcode":"acipl-10-44","classname":"History 1005","classgradelevel":10,"classsubjectcode":"44","classsubjectname":"History","sectioncode":null,"studentcode":"45942940521571","studentfirstname":"Lee","studentmiddlename":"Alan","studentlastname":"Ramos","studentphone":"1684851269","studentemailaddress":"zojoifo@fivaoh.org","studentgender":"M","studentethnicity":"Hispanic","studentdateofbirth":"20000530","studentaddress1":"970 Beraf Ln","studentaddress2":"Apt 7c","studentaddresscity":"Caevvij","studentaddressstate":"CO","studentaddresszip":"58310","guardianphone":"6599943817","studentgradelevel":"10","sourcestudentusername":"102a3c7d920cd3cd","projectedgraduationdate":"2017","sourceteacherusername":"c5cc7816","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Miguel","teacherlastname":"Herrera","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":26},{"hdrid":1640714341,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"6","teachercode":"268988674","teachername":"Herrera,Miguel","teacheremailaddress":"idivi@vosabdil.io","classcode":"acipl-10-44","classname":"History 1005","classgradelevel":10,"classsubjectcode":"44","classsubjectname":"History","sectioncode":null,"studentcode":"48174289883010","studentfirstname":"Johnny","studentmiddlename":"Curtis","studentlastname":"Carroll","studentphone":"8637963609","studentemailaddress":"moh@uh.net","studentgender":"M","studentethnicity":"Black, Not Of Hispanic Origin","studentdateofbirth":"20000707","studentaddress1":"335 Vuner Dr","studentaddress2":"Apt 10a","studentaddresscity":"Cuanafiv","studentaddressstate":"NC","studentaddresszip":"37402","guardianphone":"2909939572","studentgradelevel":"10","sourcestudentusername":"c0949c75fada5c18","projectedgraduationdate":"2017","sourceteacherusername":"c5cc7816","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Miguel","teacherlastname":"Herrera","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":27},{"hdrid":1640714324,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"6","teachercode":"268988674","teachername":"Herrera,Miguel","teacheremailaddress":"idivi@vosabdil.io","classcode":"acipl-10-44","classname":"History 1005","classgradelevel":10,"classsubjectcode":"44","classsubjectname":"History","sectioncode":null,"studentcode":"56778392361270","studentfirstname":"Ruby","studentmiddlename":"Verna","studentlastname":"Howard","studentphone":"7908158850","studentemailaddress":"roocihes@ru.edu","studentgender":"F","studentethnicity":"Native Hawaiian or Pacific Islander","studentdateofbirth":"20001222","studentaddress1":"1269 Ovineh Ln","studentaddress2":"Apt 6c","studentaddresscity":"Ilogaema","studentaddressstate":"HI","studentaddresszip":"87476","guardianphone":"3692274412","studentgradelevel":"10","sourcestudentusername":"d83f4e3165c6265b","projectedgraduationdate":"2017","sourceteacherusername":"c5cc7816","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Miguel","teacherlastname":"Herrera","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":28},{"hdrid":1640714329,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"6","teachercode":"268988674","teachername":"Herrera,Miguel","teacheremailaddress":"idivi@vosabdil.io","classcode":"acipl-10-44","classname":"History 1005","classgradelevel":10,"classsubjectcode":"44","classsubjectname":"History","sectioncode":null,"studentcode":"59335850241283","studentfirstname":"Nathan","studentmiddlename":"Jesus","studentlastname":"Webb","studentphone":"5683983233","studentemailaddress":"lite@goccuod.org","studentgender":"M","studentethnicity":"White, Not Of Hispanic Origin","studentdateofbirth":"20001204","studentaddress1":"466 Feaw Mill","studentaddress2":"Apt 7d","studentaddresscity":"Ivuukvak","studentaddressstate":"CA","studentaddresszip":"53741","guardianphone":"4283379303","studentgradelevel":"10","sourcestudentusername":"e35d6a028aa4de01","projectedgraduationdate":"2017","sourceteacherusername":"c5cc7816","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Miguel","teacherlastname":"Herrera","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":29},{"hdrid":1640714343,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"6","teachercode":"268988674","teachername":"Herrera,Miguel","teacheremailaddress":"idivi@vosabdil.io","classcode":"acipl-10-44","classname":"History 1005","classgradelevel":10,"classsubjectcode":"44","classsubjectname":"History","sectioncode":null,"studentcode":"60030515222913","studentfirstname":"Mattie","studentmiddlename":"Dollie","studentlastname":"Cole","studentphone":"8989593326","studentemailaddress":"muj@rotmar.org","studentgender":"F","studentethnicity":"American Indian or Alaskan Native","studentdateofbirth":"20000214","studentaddress1":"1278 Cibzar Ctr","studentaddress2":"Apt 8d","studentaddresscity":"Paviwagi","studentaddressstate":"RI","studentaddresszip":"19879","guardianphone":"3782940442","studentgradelevel":"10","sourcestudentusername":"de5f58f5ba798784","projectedgraduationdate":"2017","sourceteacherusername":"c5cc7816","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Miguel","teacherlastname":"Herrera","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":30},{"hdrid":1640714327,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"6","teachercode":"268988674","teachername":"Herrera,Miguel","teacheremailaddress":"idivi@vosabdil.io","classcode":"acipl-10-44","classname":"History 1005","classgradelevel":10,"classsubjectcode":"44","classsubjectname":"History","sectioncode":null,"studentcode":"61089101599322","studentfirstname":"Gene","studentmiddlename":"John","studentlastname":"Rogers","studentphone":"8330590563","studentemailaddress":"joblaw@gek.net","studentgender":"M","studentethnicity":"Other","studentdateofbirth":"20000203","studentaddress1":"997 Ahves Pt","studentaddress2":"Apt 6a","studentaddresscity":"Fomhibe","studentaddressstate":"WA","studentaddresszip":"34804","guardianphone":"9748443938","studentgradelevel":"10","sourcestudentusername":"08cbaf273cb79664","projectedgraduationdate":"2017","sourceteacherusername":"c5cc7816","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Miguel","teacherlastname":"Herrera","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":31},{"hdrid":1640714332,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"6","teachercode":"268988674","teachername":"Herrera,Miguel","teacheremailaddress":"idivi@vosabdil.io","classcode":"acipl-10-44","classname":"History 1005","classgradelevel":10,"classsubjectcode":"44","classsubjectname":"History","sectioncode":null,"studentcode":"61302118272417","studentfirstname":"Jim","studentmiddlename":"Harry","studentlastname":"Hart","studentphone":"2419187707","studentemailaddress":"utacu@ifo.io","studentgender":"M","studentethnicity":"Other","studentdateofbirth":"20000504","studentaddress1":"1213 Himli Tpke","studentaddress2":"Apt 3d","studentaddresscity":"Bivajorij","studentaddressstate":"MN","studentaddresszip":"71759","guardianphone":"2487262038","studentgradelevel":"10","sourcestudentusername":"4d4466a5232ef798","projectedgraduationdate":"2017","sourceteacherusername":"c5cc7816","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Miguel","teacherlastname":"Herrera","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":32},{"hdrid":1640714334,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"6","teachercode":"268988674","teachername":"Herrera,Miguel","teacheremailaddress":"idivi@vosabdil.io","classcode":"acipl-10-44","classname":"History 1005","classgradelevel":10,"classsubjectcode":"44","classsubjectname":"History","sectioncode":null,"studentcode":"67221362185147","studentfirstname":"Elva","studentmiddlename":"Rachel","studentlastname":"Beck","studentphone":"3862828003","studentemailaddress":"jokavcu@ve.edu","studentgender":"F","studentethnicity":"Black, Not Of Hispanic Origin","studentdateofbirth":"20000921","studentaddress1":"1006 Useoz Park","studentaddress2":"Apt 8e","studentaddresscity":"Fiusni","studentaddressstate":"DE","studentaddresszip":"76204","guardianphone":"8587109436","studentgradelevel":"10","sourcestudentusername":"98425e647d53a708","projectedgraduationdate":"2017","sourceteacherusername":"c5cc7816","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Miguel","teacherlastname":"Herrera","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":33},{"hdrid":1640714340,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"6","teachercode":"268988674","teachername":"Herrera,Miguel","teacheremailaddress":"idivi@vosabdil.io","classcode":"acipl-10-44","classname":"History 1005","classgradelevel":10,"classsubjectcode":"44","classsubjectname":"History","sectioncode":null,"studentcode":"70435074489149","studentfirstname":"Mae","studentmiddlename":"Victoria","studentlastname":"Watson","studentphone":"9699633371","studentemailaddress":"kuvunih@fe.co.uk","studentgender":"F","studentethnicity":"Asian","studentdateofbirth":"20000529","studentaddress1":"720 Uhokoc Blvd","studentaddress2":"Apt 9c","studentaddresscity":"Ositoka","studentaddressstate":"ME","studentaddresszip":"73161","guardianphone":"8828662849","studentgradelevel":"10","sourcestudentusername":"8781f3c48fb6e75e","projectedgraduationdate":"2017","sourceteacherusername":"c5cc7816","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Miguel","teacherlastname":"Herrera","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":34},{"hdrid":1640714342,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"6","teachercode":"268988674","teachername":"Herrera,Miguel","teacheremailaddress":"idivi@vosabdil.io","classcode":"acipl-10-44","classname":"History 1005","classgradelevel":10,"classsubjectcode":"44","classsubjectname":"History","sectioncode":null,"studentcode":"71013641771342","studentfirstname":"Terry","studentmiddlename":"Mitchell","studentlastname":"Berry","studentphone":"8399824543","studentemailaddress":"gaep@cunachag.org","studentgender":"M","studentethnicity":"Black, Not Of Hispanic Origin","studentdateofbirth":"20000318","studentaddress1":"1277 Lejur Riv","studentaddress2":"Apt 2a","studentaddresscity":"Mapgejup","studentaddressstate":"MD","studentaddresszip":"73220","guardianphone":"4157948500","studentgradelevel":"10","sourcestudentusername":"0867992e6fb6aa3b","projectedgraduationdate":"2017","sourceteacherusername":"c5cc7816","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Miguel","teacherlastname":"Herrera","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":35},{"hdrid":1640714333,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"6","teachercode":"268988674","teachername":"Herrera,Miguel","teacheremailaddress":"idivi@vosabdil.io","classcode":"acipl-10-44","classname":"History 1005","classgradelevel":10,"classsubjectcode":"44","classsubjectname":"History","sectioncode":null,"studentcode":"74476059215764","studentfirstname":"Dora","studentmiddlename":"Phoebe","studentlastname":"Love","studentphone":"3309555637","studentemailaddress":"ecru@du.net","studentgender":"F","studentethnicity":"Other","studentdateofbirth":"20000125","studentaddress1":"1801 Roto Loop","studentaddress2":"Apt 8a","studentaddresscity":"Nokgawtih","studentaddressstate":"WV","studentaddresszip":"00547","guardianphone":"5840531651","studentgradelevel":"10","sourcestudentusername":"d295a315b5992ca2","projectedgraduationdate":"2017","sourceteacherusername":"c5cc7816","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Miguel","teacherlastname":"Herrera","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":36},{"hdrid":1640714323,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"6","teachercode":"268988674","teachername":"Herrera,Miguel","teacheremailaddress":"idivi@vosabdil.io","classcode":"acipl-10-44","classname":"History 1005","classgradelevel":10,"classsubjectcode":"44","classsubjectname":"History","sectioncode":null,"studentcode":"80287237465381","studentfirstname":"Larry","studentmiddlename":"Martin","studentlastname":"Hughes","studentphone":"3672056688","studentemailaddress":"vaj@wub.io","studentgender":"M","studentethnicity":"Black, Not Of Hispanic Origin","studentdateofbirth":"20000907","studentaddress1":"1217 Zecut Hwy","studentaddress2":"Apt 5c","studentaddresscity":"Kofafli","studentaddressstate":"DC","studentaddresszip":"96901","guardianphone":"6578499844","studentgradelevel":"10","sourcestudentusername":"e27cbdd68ce5c3d8","projectedgraduationdate":"2017","sourceteacherusername":"c5cc7816","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Miguel","teacherlastname":"Herrera","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":37},{"hdrid":1640714338,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"6","teachercode":"268988674","teachername":"Herrera,Miguel","teacheremailaddress":"idivi@vosabdil.io","classcode":"acipl-10-44","classname":"History 1005","classgradelevel":10,"classsubjectcode":"44","classsubjectname":"History","sectioncode":null,"studentcode":"82408401452832","studentfirstname":"Lester","studentmiddlename":"Tyler","studentlastname":"Byrd","studentphone":"6190302007","studentemailaddress":"sel@limidhe.com","studentgender":"M","studentethnicity":"Black, Not Of Hispanic Origin","studentdateofbirth":"20000525","studentaddress1":"1956 Juul Mnr","studentaddress2":"Apt 4a","studentaddresscity":"Osanecate","studentaddressstate":"NE","studentaddresszip":"73524","guardianphone":"8403925134","studentgradelevel":"10","sourcestudentusername":"b6bf6be55a6c8e27","projectedgraduationdate":"2017","sourceteacherusername":"c5cc7816","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Miguel","teacherlastname":"Herrera","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":38},{"hdrid":1640714331,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"6","teachercode":"268988674","teachername":"Herrera,Miguel","teacheremailaddress":"idivi@vosabdil.io","classcode":"acipl-10-44","classname":"History 1005","classgradelevel":10,"classsubjectcode":"44","classsubjectname":"History","sectioncode":null,"studentcode":"83424092849923","studentfirstname":"Juan","studentmiddlename":"Ethan","studentlastname":"Powers","studentphone":"9149194875","studentemailaddress":"rokra@uhari.com","studentgender":"M","studentethnicity":"Native Hawaiian or Pacific Islander","studentdateofbirth":"20000714","studentaddress1":"1168 Odsed Mill","studentaddress2":"Apt 7e","studentaddresscity":"Ibukinoz","studentaddressstate":"NH","studentaddresszip":"62452","guardianphone":"4429106066","studentgradelevel":"10","sourcestudentusername":"3b264736c67f7cce","projectedgraduationdate":"2017","sourceteacherusername":"c5cc7816","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Miguel","teacherlastname":"Herrera","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":39},{"hdrid":1640714335,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"6","teachercode":"268988674","teachername":"Herrera,Miguel","teacheremailaddress":"idivi@vosabdil.io","classcode":"acipl-10-44","classname":"History 1005","classgradelevel":10,"classsubjectcode":"44","classsubjectname":"History","sectioncode":null,"studentcode":"86278988317482","studentfirstname":"Henry","studentmiddlename":"Gordon","studentlastname":"Weaver","studentphone":"5193618490","studentemailaddress":"dowva@tob.org","studentgender":"M","studentethnicity":"Asian","studentdateofbirth":"20000610","studentaddress1":"1692 Hurmuc Pike","studentaddress2":"Apt 5b","studentaddresscity":"Kihovgap","studentaddressstate":"ME","studentaddresszip":"70215","guardianphone":"4948901368","studentgradelevel":"10","sourcestudentusername":"647a184e6f1c56b5","projectedgraduationdate":"2017","sourceteacherusername":"c5cc7816","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Miguel","teacherlastname":"Herrera","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":40},{"hdrid":1640714344,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"6","teachercode":"268988674","teachername":"Herrera,Miguel","teacheremailaddress":"idivi@vosabdil.io","classcode":"acipl-10-44","classname":"History 1005","classgradelevel":10,"classsubjectcode":"44","classsubjectname":"History","sectioncode":null,"studentcode":"86554794820646","studentfirstname":"Olive","studentmiddlename":"Katie","studentlastname":"Davis","studentphone":"5569981518","studentemailaddress":"befjur@rithedgog.io","studentgender":"F","studentethnicity":"American Indian or Alaskan Native","studentdateofbirth":"20001016","studentaddress1":"335 Ponje Grv","studentaddress2":"Apt 6c","studentaddresscity":"Rivcehdun","studentaddressstate":"CA","studentaddresszip":"52147","guardianphone":"6351384437","studentgradelevel":"10","sourcestudentusername":"67880c35f2ab276a","projectedgraduationdate":"2017","sourceteacherusername":"c5cc7816","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Miguel","teacherlastname":"Herrera","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":41},{"hdrid":1640714330,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"6","teachercode":"268988674","teachername":"Herrera,Miguel","teacheremailaddress":"idivi@vosabdil.io","classcode":"acipl-10-44","classname":"History 1005","classgradelevel":10,"classsubjectcode":"44","classsubjectname":"History","sectioncode":null,"studentcode":"92860496147639","studentfirstname":"Jack","studentmiddlename":"Chase","studentlastname":"Morales","studentphone":"9124394907","studentemailaddress":"vu@mufbu.net","studentgender":"M","studentethnicity":"Asian","studentdateofbirth":"20000114","studentaddress1":"1481 Zupo Plz","studentaddress2":"Apt 8c","studentaddresscity":"Nikumzed","studentaddressstate":"CO","studentaddresszip":"56774","guardianphone":"4936346599","studentgradelevel":"10","sourcestudentusername":"522c497915bc8894","projectedgraduationdate":"2017","sourceteacherusername":"c5cc7816","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Miguel","teacherlastname":"Herrera","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":42},{"hdrid":1640714337,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"6","teachercode":"268988674","teachername":"Herrera,Miguel","teacheremailaddress":"idivi@vosabdil.io","classcode":"acipl-10-44","classname":"History 1005","classgradelevel":10,"classsubjectcode":"44","classsubjectname":"History","sectioncode":null,"studentcode":"97937456642587","studentfirstname":"Walter","studentmiddlename":"Wayne","studentlastname":"Weaver","studentphone":"4315158062","studentemailaddress":"bek@isafi.net","studentgender":"M","studentethnicity":"White, Not Of Hispanic Origin","studentdateofbirth":"20000501","studentaddress1":"126 Duju Dr","studentaddress2":"Apt 6e","studentaddresscity":"Uvcitfow","studentaddressstate":"KY","studentaddresszip":"66862","guardianphone":"4183574233","studentgradelevel":"10","sourcestudentusername":"825bfd6006533c29","projectedgraduationdate":"2017","sourceteacherusername":"c5cc7816","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Miguel","teacherlastname":"Herrera","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":43},{"hdrid":1640713382,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"972297121","teachername":"Dennis,Cole","teacheremailaddress":"me@ke.edu","classcode":"adpnp-10-1","classname":"ELA 1000","classgradelevel":10,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"17116238590743","studentfirstname":"Russell","studentmiddlename":"Christopher","studentlastname":"Walsh","studentphone":"8245415149","studentemailaddress":"telma@ju.io","studentgender":"M","studentethnicity":"Hispanic","studentdateofbirth":"20000420","studentaddress1":"748 Wujgic Mill","studentaddress2":"Apt 8c","studentaddresscity":"Anoakuive","studentaddressstate":"TX","studentaddresszip":"97149","guardianphone":"2923631477","studentgradelevel":"10","sourcestudentusername":"fd7fb8cef194defd","projectedgraduationdate":"2017","sourceteacherusername":"494f958d","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Cole","teacherlastname":"Dennis","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":44},{"hdrid":1640713397,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"972297121","teachername":"Dennis,Cole","teacheremailaddress":"me@ke.edu","classcode":"adpnp-10-1","classname":"ELA 1000","classgradelevel":10,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"18656088391111","studentfirstname":"Michael","studentmiddlename":"Dylan","studentlastname":"Lindsey","studentphone":"5752515418","studentemailaddress":"dadidfud@tibnib.gov","studentgender":"M","studentethnicity":"Other","studentdateofbirth":"20000123","studentaddress1":"1411 Kado Pass","studentaddress2":"Apt 5e","studentaddresscity":"Durofi","studentaddressstate":"PA","studentaddresszip":"48727","guardianphone":"8008468060","studentgradelevel":"10","sourcestudentusername":"f54498e425ea26be","projectedgraduationdate":"2017","sourceteacherusername":"494f958d","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Cole","teacherlastname":"Dennis","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":45},{"hdrid":1640713394,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"972297121","teachername":"Dennis,Cole","teacheremailaddress":"me@ke.edu","classcode":"adpnp-10-1","classname":"ELA 1000","classgradelevel":10,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"20829867136975","studentfirstname":"Seth","studentmiddlename":"Jacob","studentlastname":"James","studentphone":"8975519840","studentemailaddress":"cifuttis@ij.gov","studentgender":"M","studentethnicity":"Other","studentdateofbirth":"20000115","studentaddress1":"485 Gohpub Key","studentaddress2":"Apt 5b","studentaddresscity":"Arlakza","studentaddressstate":"HI","studentaddresszip":"18136","guardianphone":"8574647874","studentgradelevel":"10","sourcestudentusername":"0546438040e2b91b","projectedgraduationdate":"2017","sourceteacherusername":"494f958d","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Cole","teacherlastname":"Dennis","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":46},{"hdrid":1640713396,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"972297121","teachername":"Dennis,Cole","teacheremailaddress":"me@ke.edu","classcode":"adpnp-10-1","classname":"ELA 1000","classgradelevel":10,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"25847066856092","studentfirstname":"Lida","studentmiddlename":"Willie","studentlastname":"Moore","studentphone":"6860277412","studentemailaddress":"asauvuku@lokebe.net","studentgender":"F","studentethnicity":"Native Hawaiian or Pacific Islander","studentdateofbirth":"20001128","studentaddress1":"1321 Getam St","studentaddress2":"Apt 1c","studentaddresscity":"Oskobab","studentaddressstate":"KS","studentaddresszip":"18629","guardianphone":"1744645535","studentgradelevel":"10","sourcestudentusername":"cbe17b2804637690","projectedgraduationdate":"2017","sourceteacherusername":"494f958d","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Cole","teacherlastname":"Dennis","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":47},{"hdrid":1640713391,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"972297121","teachername":"Dennis,Cole","teacheremailaddress":"me@ke.edu","classcode":"adpnp-10-1","classname":"ELA 1000","classgradelevel":10,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"26834131570325","studentfirstname":"Lucinda","studentmiddlename":"Ora","studentlastname":"Singleton","studentphone":"6203016688","studentemailaddress":"niz@couhuroz.edu","studentgender":"F","studentethnicity":"Asian","studentdateofbirth":"20000227","studentaddress1":"800 Zodiv St","studentaddress2":"Apt 4e","studentaddresscity":"Jufmofsu","studentaddressstate":"MT","studentaddresszip":"72448","guardianphone":"9413164212","studentgradelevel":"10","sourcestudentusername":"7e1e916a359a3c65","projectedgraduationdate":"2017","sourceteacherusername":"494f958d","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Cole","teacherlastname":"Dennis","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":48},{"hdrid":1640713386,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"972297121","teachername":"Dennis,Cole","teacheremailaddress":"me@ke.edu","classcode":"adpnp-10-1","classname":"ELA 1000","classgradelevel":10,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"28155733831226","studentfirstname":"Ola","studentmiddlename":"Lulu","studentlastname":"Young","studentphone":"7325142284","studentemailaddress":"ni@fuvon.co.uk","studentgender":"F","studentethnicity":"Native Hawaiian or Pacific Islander","studentdateofbirth":"20000226","studentaddress1":"560 Urdec Tpke","studentaddress2":"Apt 4d","studentaddresscity":"Evvolcas","studentaddressstate":"GA","studentaddresszip":"69162","guardianphone":"6309158216","studentgradelevel":"10","sourcestudentusername":"efa3f62bf2aa69b2","projectedgraduationdate":"2017","sourceteacherusername":"494f958d","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Cole","teacherlastname":"Dennis","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":49},{"hdrid":1640713377,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"972297121","teachername":"Dennis,Cole","teacheremailaddress":"me@ke.edu","classcode":"adpnp-10-1","classname":"ELA 1000","classgradelevel":10,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"29116794860197","studentfirstname":"Harriett","studentmiddlename":"Mollie","studentlastname":"King","studentphone":"5720302299","studentemailaddress":"esiiz@mew.co.uk","studentgender":"F","studentethnicity":"Black, Not Of Hispanic Origin","studentdateofbirth":"20001230","studentaddress1":"773 Elzu St","studentaddress2":"Apt 7e","studentaddresscity":"Lazpezab","studentaddressstate":"TN","studentaddresszip":"49293","guardianphone":"4553953425","studentgradelevel":"10","sourcestudentusername":"bfdaa630aaa806b4","projectedgraduationdate":"2017","sourceteacherusername":"494f958d","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Cole","teacherlastname":"Dennis","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":50},{"hdrid":1640713384,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"972297121","teachername":"Dennis,Cole","teacheremailaddress":"me@ke.edu","classcode":"adpnp-10-1","classname":"ELA 1000","classgradelevel":10,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"32606306672096","studentfirstname":"Marian","studentmiddlename":"Henrietta","studentlastname":"Marshall","studentphone":"6779955553","studentemailaddress":"uki@nu.gov","studentgender":"F","studentethnicity":"American Indian or Alaskan Native","studentdateofbirth":"20001025","studentaddress1":"1818 Kibi Rd","studentaddress2":"Apt 10d","studentaddresscity":"Epafeec","studentaddressstate":"RI","studentaddresszip":"25649","guardianphone":"8251938370","studentgradelevel":"10","sourcestudentusername":"1140ff896074ac6f","projectedgraduationdate":"2017","sourceteacherusername":"494f958d","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Cole","teacherlastname":"Dennis","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":51},{"hdrid":1640713389,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"972297121","teachername":"Dennis,Cole","teacheremailaddress":"me@ke.edu","classcode":"adpnp-10-1","classname":"ELA 1000","classgradelevel":10,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"42285926991866","studentfirstname":"Eula","studentmiddlename":"Violet","studentlastname":"Johnson","studentphone":"3024109370","studentemailaddress":"dakumafu@muh.com","studentgender":"F","studentethnicity":"Native Hawaiian or Pacific Islander","studentdateofbirth":"20000524","studentaddress1":"1163 Pihso Ext","studentaddress2":"Apt 4c","studentaddresscity":"Zorjokiju","studentaddressstate":"MD","studentaddresszip":"80347","guardianphone":"1154042045","studentgradelevel":"10","sourcestudentusername":"fbcb5db459976826","projectedgraduationdate":"2017","sourceteacherusername":"494f958d","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Cole","teacherlastname":"Dennis","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":52},{"hdrid":1640713395,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"972297121","teachername":"Dennis,Cole","teacheremailaddress":"me@ke.edu","classcode":"adpnp-10-1","classname":"ELA 1000","classgradelevel":10,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"45760081811911","studentfirstname":"Glen","studentmiddlename":"Dylan","studentlastname":"Keller","studentphone":"9335170193","studentemailaddress":"fazcaavo@tifocget.com","studentgender":"M","studentethnicity":"Hispanic","studentdateofbirth":"20000117","studentaddress1":"1352 Uslak Hts","studentaddress2":"Apt 4c","studentaddresscity":"Zufmisi","studentaddressstate":"WA","studentaddresszip":"54375","guardianphone":"5448469782","studentgradelevel":"10","sourcestudentusername":"2735adfd846094f6","projectedgraduationdate":"2017","sourceteacherusername":"494f958d","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Cole","teacherlastname":"Dennis","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":53},{"hdrid":1640713378,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"972297121","teachername":"Dennis,Cole","teacheremailaddress":"me@ke.edu","classcode":"adpnp-10-1","classname":"ELA 1000","classgradelevel":10,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"59913978870544","studentfirstname":"Jeremy","studentmiddlename":"Dean","studentlastname":"Stephens","studentphone":"7249333576","studentemailaddress":"tebufsif@bugjez.io","studentgender":"M","studentethnicity":"Native Hawaiian or Pacific Islander","studentdateofbirth":"20000323","studentaddress1":"1864 Zuofo Pl","studentaddress2":"Apt 3d","studentaddresscity":"Tigaho","studentaddressstate":"SD","studentaddresszip":"52735","guardianphone":"7878958487","studentgradelevel":"10","sourcestudentusername":"01bf1dada7747bca","projectedgraduationdate":"2017","sourceteacherusername":"494f958d","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Cole","teacherlastname":"Dennis","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":54},{"hdrid":1640713393,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"972297121","teachername":"Dennis,Cole","teacheremailaddress":"me@ke.edu","classcode":"adpnp-10-1","classname":"ELA 1000","classgradelevel":10,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"61478087036973","studentfirstname":"Evan","studentmiddlename":"Max","studentlastname":"Yates","studentphone":"2552308733","studentemailaddress":"nigafe@ci.net","studentgender":"M","studentethnicity":"Asian","studentdateofbirth":"20001028","studentaddress1":"170 Giuba Pt","studentaddress2":"Apt 5d","studentaddresscity":"Gemniem","studentaddressstate":"NM","studentaddresszip":"66228","guardianphone":"6090223662","studentgradelevel":"10","sourcestudentusername":"40389ba57b4d7ed1","projectedgraduationdate":"2017","sourceteacherusername":"494f958d","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Cole","teacherlastname":"Dennis","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":55},{"hdrid":1640713387,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"972297121","teachername":"Dennis,Cole","teacheremailaddress":"me@ke.edu","classcode":"adpnp-10-1","classname":"ELA 1000","classgradelevel":10,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"64915829979711","studentfirstname":"Adeline","studentmiddlename":"Bernice","studentlastname":"Wells","studentphone":"3323811948","studentemailaddress":"kuhsiv@rure.org","studentgender":"F","studentethnicity":"Black, Not Of Hispanic Origin","studentdateofbirth":"20000305","studentaddress1":"1245 Magheb Blvd","studentaddress2":"Apt 1d","studentaddresscity":"Umisaziwu","studentaddressstate":"VT","studentaddresszip":"90049","guardianphone":"7762382465","studentgradelevel":"10","sourcestudentusername":"27180133cefdf0a8","projectedgraduationdate":"2017","sourceteacherusername":"494f958d","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Cole","teacherlastname":"Dennis","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":56},{"hdrid":1640713390,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"972297121","teachername":"Dennis,Cole","teacheremailaddress":"me@ke.edu","classcode":"adpnp-10-1","classname":"ELA 1000","classgradelevel":10,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"67050017519957","studentfirstname":"Elsie","studentmiddlename":"Lelia","studentlastname":"Smith","studentphone":"2978296188","studentemailaddress":"ju@ire.io","studentgender":"F","studentethnicity":"American Indian or Alaskan Native","studentdateofbirth":"20000326","studentaddress1":"1352 Ijli Vw","studentaddress2":"Apt 3a","studentaddresscity":"Munivsas","studentaddressstate":"IN","studentaddresszip":"47638","guardianphone":"6609430511","studentgradelevel":"10","sourcestudentusername":"3947ba45e1c4d1c7","projectedgraduationdate":"2017","sourceteacherusername":"494f958d","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Cole","teacherlastname":"Dennis","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":57},{"hdrid":1640713381,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"972297121","teachername":"Dennis,Cole","teacheremailaddress":"me@ke.edu","classcode":"adpnp-10-1","classname":"ELA 1000","classgradelevel":10,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"67426061133543","studentfirstname":"Maggie","studentmiddlename":"Betty","studentlastname":"Houston","studentphone":"4330912722","studentemailaddress":"niko@ganhecun.io","studentgender":"F","studentethnicity":"Other","studentdateofbirth":"20000215","studentaddress1":"675 Vezmo Park","studentaddress2":"Apt 6d","studentaddresscity":"Pantevih","studentaddressstate":"MA","studentaddresszip":"48007","guardianphone":"2175756891","studentgradelevel":"10","sourcestudentusername":"5e48588028ea9786","projectedgraduationdate":"2017","sourceteacherusername":"494f958d","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Cole","teacherlastname":"Dennis","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":58},{"hdrid":1640713383,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"972297121","teachername":"Dennis,Cole","teacheremailaddress":"me@ke.edu","classcode":"adpnp-10-1","classname":"ELA 1000","classgradelevel":10,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"70750750746164","studentfirstname":"Mabel","studentmiddlename":"Ada","studentlastname":"Figueroa","studentphone":"4182470680","studentemailaddress":"momu@fakpa.org","studentgender":"F","studentethnicity":"Other","studentdateofbirth":"20000209","studentaddress1":"402 Herloz St","studentaddress2":"Apt 9b","studentaddresscity":"Domelowi","studentaddressstate":"PA","studentaddresszip":"41186","guardianphone":"9214746076","studentgradelevel":"10","sourcestudentusername":"c23e25736fff8984","projectedgraduationdate":"2017","sourceteacherusername":"494f958d","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Cole","teacherlastname":"Dennis","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":59},{"hdrid":1640713392,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"972297121","teachername":"Dennis,Cole","teacheremailaddress":"me@ke.edu","classcode":"adpnp-10-1","classname":"ELA 1000","classgradelevel":10,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"71436870553427","studentfirstname":"Carlos","studentmiddlename":"Paul","studentlastname":"Reynolds","studentphone":"1242390968","studentemailaddress":"wucsuogi@ofanepet.com","studentgender":"M","studentethnicity":"Other","studentdateofbirth":"20001224","studentaddress1":"698 Tivseg Pass","studentaddress2":"Apt 8d","studentaddresscity":"Mectodte","studentaddressstate":"ND","studentaddresszip":"56696","guardianphone":"5056354604","studentgradelevel":"10","sourcestudentusername":"f7e6e51b49989736","projectedgraduationdate":"2017","sourceteacherusername":"494f958d","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Cole","teacherlastname":"Dennis","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":60},{"hdrid":1640713380,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"972297121","teachername":"Dennis,Cole","teacheremailaddress":"me@ke.edu","classcode":"adpnp-10-1","classname":"ELA 1000","classgradelevel":10,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"75656032293207","studentfirstname":"Gilbert","studentmiddlename":"Charlie","studentlastname":"Reid","studentphone":"4756091530","studentemailaddress":"jaadujiw@kuwzevu.co.uk","studentgender":"M","studentethnicity":"Hispanic","studentdateofbirth":"20000120","studentaddress1":"713 Dowu Ext","studentaddress2":"Apt 5b","studentaddresscity":"Beapias","studentaddressstate":"ID","studentaddresszip":"87432","guardianphone":"6760358748","studentgradelevel":"10","sourcestudentusername":"d02c4320d3e24e76","projectedgraduationdate":"2017","sourceteacherusername":"494f958d","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Cole","teacherlastname":"Dennis","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":61},{"hdrid":1640713385,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"972297121","teachername":"Dennis,Cole","teacheremailaddress":"me@ke.edu","classcode":"adpnp-10-1","classname":"ELA 1000","classgradelevel":10,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"79377939924597","studentfirstname":"Theresa","studentmiddlename":"Mae","studentlastname":"Castillo","studentphone":"7124231316","studentemailaddress":"pela@seckil.net","studentgender":"F","studentethnicity":"Asian","studentdateofbirth":"20000725","studentaddress1":"649 Rozi Riv","studentaddress2":"Apt 7a","studentaddresscity":"Dafinfo","studentaddressstate":"KS","studentaddresszip":"40591","guardianphone":"7521989150","studentgradelevel":"10","sourcestudentusername":"3595aad213ada55d","projectedgraduationdate":"2017","sourceteacherusername":"494f958d","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Cole","teacherlastname":"Dennis","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":62},{"hdrid":1640713388,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"972297121","teachername":"Dennis,Cole","teacheremailaddress":"me@ke.edu","classcode":"adpnp-10-1","classname":"ELA 1000","classgradelevel":10,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"88312117631236","studentfirstname":"Margaret","studentmiddlename":"Mildred","studentlastname":"Fuller","studentphone":"1385371707","studentemailaddress":"mubwi@kud.co.uk","studentgender":"F","studentethnicity":"White, Not Of Hispanic Origin","studentdateofbirth":"20000830","studentaddress1":"1048 Medas Hwy","studentaddress2":"Apt 8d","studentaddresscity":"Hikdava","studentaddressstate":"MT","studentaddresszip":"27846","guardianphone":"3417654745","studentgradelevel":"10","sourcestudentusername":"e5196822e9c0dc0f","projectedgraduationdate":"2017","sourceteacherusername":"494f958d","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Cole","teacherlastname":"Dennis","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":63},{"hdrid":1640713398,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"972297121","teachername":"Dennis,Cole","teacheremailaddress":"me@ke.edu","classcode":"adpnp-10-1","classname":"ELA 1000","classgradelevel":10,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"91828560042712","studentfirstname":"Allen","studentmiddlename":"Ricardo","studentlastname":"Figueroa","studentphone":"7068950173","studentemailaddress":"totgon@den.org","studentgender":"M","studentethnicity":"Black, Not Of Hispanic Origin","studentdateofbirth":"20000815","studentaddress1":"129 Sacbi Ct","studentaddress2":"Apt 8d","studentaddresscity":"Rocgakda","studentaddressstate":"RI","studentaddresszip":"57402","guardianphone":"6926661555","studentgradelevel":"10","sourcestudentusername":"b947b230eb3452f1","projectedgraduationdate":"2017","sourceteacherusername":"494f958d","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Cole","teacherlastname":"Dennis","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":64},{"hdrid":1640713379,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"972297121","teachername":"Dennis,Cole","teacheremailaddress":"me@ke.edu","classcode":"adpnp-10-1","classname":"ELA 1000","classgradelevel":10,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"95758462345434","studentfirstname":"Birdie","studentmiddlename":"Dorothy","studentlastname":"Kim","studentphone":"5559874143","studentemailaddress":"ga@hiles.org","studentgender":"F","studentethnicity":"Black, Not Of Hispanic Origin","studentdateofbirth":"20000902","studentaddress1":"863 Miuf Pt","studentaddress2":"Apt 6d","studentaddresscity":"Evziibo","studentaddressstate":"VT","studentaddresszip":"02187","guardianphone":"6124638935","studentgradelevel":"10","sourcestudentusername":"a787b9105d860b93","projectedgraduationdate":"2017","sourceteacherusername":"494f958d","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Cole","teacherlastname":"Dennis","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":65},{"hdrid":1640714044,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"815927965","teachername":"Leonard,Ronnie","teacheremailaddress":"wepora@dukes.edu","classcode":"aeldh-12-1","classname":"ELA 1205","classgradelevel":12,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"11217165759040","studentfirstname":"Olive","studentmiddlename":"Genevieve","studentlastname":"Massey","studentphone":"5042836519","studentemailaddress":"jibpa@enu.edu","studentgender":"F","studentethnicity":"Black, Not Of Hispanic Origin","studentdateofbirth":"19980530","studentaddress1":"521 Gebasu Cir","studentaddress2":"Apt 8d","studentaddresscity":"Awwago","studentaddressstate":"MS","studentaddresszip":"67091","guardianphone":"9541727109","studentgradelevel":"12","sourcestudentusername":"05b425f195bddd08","projectedgraduationdate":"2015","sourceteacherusername":"2ebb82dd","teacherpersonaltitleprefix":"Dr.","teacherfirstname":"Ronnie","teacherlastname":"Leonard","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":66},{"hdrid":1640714039,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"815927965","teachername":"Leonard,Ronnie","teacheremailaddress":"wepora@dukes.edu","classcode":"aeldh-12-1","classname":"ELA 1205","classgradelevel":12,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"13078992689649","studentfirstname":"Devin","studentmiddlename":"Kyle","studentlastname":"Strickland","studentphone":"8838184167","studentemailaddress":"muw@hogogpa.com","studentgender":"M","studentethnicity":"Black, Not Of Hispanic Origin","studentdateofbirth":"19981201","studentaddress1":"403 Ihodi Ctr","studentaddress2":"Apt 9b","studentaddresscity":"Rawaceka","studentaddressstate":"OR","studentaddresszip":"43909","guardianphone":"8396702539","studentgradelevel":"12","sourcestudentusername":"0b0dbf593348c9f6","projectedgraduationdate":"2015","sourceteacherusername":"2ebb82dd","teacherpersonaltitleprefix":"Dr.","teacherfirstname":"Ronnie","teacherlastname":"Leonard","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":67},{"hdrid":1640714054,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"815927965","teachername":"Leonard,Ronnie","teacheremailaddress":"wepora@dukes.edu","classcode":"aeldh-12-1","classname":"ELA 1205","classgradelevel":12,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"13591230909029","studentfirstname":"Celia","studentmiddlename":"Hilda","studentlastname":"Carlson","studentphone":"1468117893","studentemailaddress":"patrikiz@fo.org","studentgender":"F","studentethnicity":"White, Not Of Hispanic Origin","studentdateofbirth":"19980619","studentaddress1":"337 Nidoc Vw","studentaddress2":"Apt 2d","studentaddresscity":"Tefmimeh","studentaddressstate":"MN","studentaddresszip":"30990","guardianphone":"3420108291","studentgradelevel":"12","sourcestudentusername":"d7f49e55d6df5065","projectedgraduationdate":"2015","sourceteacherusername":"2ebb82dd","teacherpersonaltitleprefix":"Dr.","teacherfirstname":"Ronnie","teacherlastname":"Leonard","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":68},{"hdrid":1640714050,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"815927965","teachername":"Leonard,Ronnie","teacheremailaddress":"wepora@dukes.edu","classcode":"aeldh-12-1","classname":"ELA 1205","classgradelevel":12,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"14073668854931","studentfirstname":"Anne","studentmiddlename":"Belle","studentlastname":"Vaughn","studentphone":"3018818211","studentemailaddress":"fadtumfut@ijacaaw.edu","studentgender":"F","studentethnicity":"Native Hawaiian or Pacific Islander","studentdateofbirth":"19980115","studentaddress1":"1024 Ujid Way","studentaddress2":"Apt 3c","studentaddresscity":"Seficnuh","studentaddressstate":"WY","studentaddresszip":"60439","guardianphone":"2088619015","studentgradelevel":"12","sourcestudentusername":"0a104fafaedf0cdf","projectedgraduationdate":"2015","sourceteacherusername":"2ebb82dd","teacherpersonaltitleprefix":"Dr.","teacherfirstname":"Ronnie","teacherlastname":"Leonard","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":69},{"hdrid":1640714041,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"815927965","teachername":"Leonard,Ronnie","teacheremailaddress":"wepora@dukes.edu","classcode":"aeldh-12-1","classname":"ELA 1205","classgradelevel":12,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"15359964946077","studentfirstname":"Theodore","studentmiddlename":"Jared","studentlastname":"Lawrence","studentphone":"7006162100","studentemailaddress":"ijijin@tarwotuve.io","studentgender":"M","studentethnicity":"Native Hawaiian or Pacific Islander","studentdateofbirth":"19980312","studentaddress1":"1076 Semal Key","studentaddress2":"Apt 2e","studentaddresscity":"Sunteuz","studentaddressstate":"WV","studentaddresszip":"09826","guardianphone":"3592079859","studentgradelevel":"12","sourcestudentusername":"7bc87b436e09ea0e","projectedgraduationdate":"2015","sourceteacherusername":"2ebb82dd","teacherpersonaltitleprefix":"Dr.","teacherfirstname":"Ronnie","teacherlastname":"Leonard","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":70},{"hdrid":1640714052,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"815927965","teachername":"Leonard,Ronnie","teacheremailaddress":"wepora@dukes.edu","classcode":"aeldh-12-1","classname":"ELA 1205","classgradelevel":12,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"17222746378845","studentfirstname":"Louise","studentmiddlename":"Adelaide","studentlastname":"Moody","studentphone":"8358714922","studentemailaddress":"oklih@lopep.org","studentgender":"F","studentethnicity":"Black, Not Of Hispanic Origin","studentdateofbirth":"19980411","studentaddress1":"807 Udne Rdg","studentaddress2":"Apt 4b","studentaddresscity":"Kaulhi","studentaddressstate":"OR","studentaddresszip":"83195","guardianphone":"4704455035","studentgradelevel":"12","sourcestudentusername":"11884051661a86c4","projectedgraduationdate":"2015","sourceteacherusername":"2ebb82dd","teacherpersonaltitleprefix":"Dr.","teacherfirstname":"Ronnie","teacherlastname":"Leonard","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":71},{"hdrid":1640714046,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"815927965","teachername":"Leonard,Ronnie","teacheremailaddress":"wepora@dukes.edu","classcode":"aeldh-12-1","classname":"ELA 1205","classgradelevel":12,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"27164030137161","studentfirstname":"Catherine","studentmiddlename":"Margaret","studentlastname":"Townsend","studentphone":"2122874185","studentemailaddress":"demnalkab@ipo.com","studentgender":"F","studentethnicity":"American Indian or Alaskan Native","studentdateofbirth":"19981105","studentaddress1":"83 Zuta Mill","studentaddress2":"Apt 2a","studentaddresscity":"Tocefjo","studentaddressstate":"DC","studentaddresszip":"97123","guardianphone":"8724461063","studentgradelevel":"12","sourcestudentusername":"0c751ace49c8e59f","projectedgraduationdate":"2015","sourceteacherusername":"2ebb82dd","teacherpersonaltitleprefix":"Dr.","teacherfirstname":"Ronnie","teacherlastname":"Leonard","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":72},{"hdrid":1640714055,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"815927965","teachername":"Leonard,Ronnie","teacheremailaddress":"wepora@dukes.edu","classcode":"aeldh-12-1","classname":"ELA 1205","classgradelevel":12,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"29183061296741","studentfirstname":"Ronald","studentmiddlename":"Aiden","studentlastname":"Dunn","studentphone":"5556608212","studentemailaddress":"poji@pucopos.org","studentgender":"M","studentethnicity":"Native Hawaiian or Pacific Islander","studentdateofbirth":"19981003","studentaddress1":"666 Udisop Loop","studentaddress2":"Apt 5d","studentaddresscity":"Lutial","studentaddressstate":"HI","studentaddresszip":"34644","guardianphone":"1356240276","studentgradelevel":"12","sourcestudentusername":"326f692086333f7f","projectedgraduationdate":"2015","sourceteacherusername":"2ebb82dd","teacherpersonaltitleprefix":"Dr.","teacherfirstname":"Ronnie","teacherlastname":"Leonard","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":73},{"hdrid":1640714051,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"815927965","teachername":"Leonard,Ronnie","teacheremailaddress":"wepora@dukes.edu","classcode":"aeldh-12-1","classname":"ELA 1205","classgradelevel":12,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"29724999662074","studentfirstname":"Lily","studentmiddlename":"Ruby","studentlastname":"Gutierrez","studentphone":"7444572326","studentemailaddress":"asi@tawni.net","studentgender":"F","studentethnicity":"Native Hawaiian or Pacific Islander","studentdateofbirth":"19981227","studentaddress1":"1587 Abowu Mnr","studentaddress2":"Apt 6d","studentaddresscity":"Zaerfin","studentaddressstate":"ID","studentaddresszip":"91763","guardianphone":"5869902256","studentgradelevel":"12","sourcestudentusername":"a9bf06e111650bef","projectedgraduationdate":"2015","sourceteacherusername":"2ebb82dd","teacherpersonaltitleprefix":"Dr.","teacherfirstname":"Ronnie","teacherlastname":"Leonard","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":74},{"hdrid":1640714048,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"815927965","teachername":"Leonard,Ronnie","teacheremailaddress":"wepora@dukes.edu","classcode":"aeldh-12-1","classname":"ELA 1205","classgradelevel":12,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"30118887043661","studentfirstname":"Marguerite","studentmiddlename":"Bess","studentlastname":"Glover","studentphone":"4061576448","studentemailaddress":"udaepzum@kanaob.co.uk","studentgender":"F","studentethnicity":"Native Hawaiian or Pacific Islander","studentdateofbirth":"19980613","studentaddress1":"479 Rairo Cir","studentaddress2":"Apt 7e","studentaddresscity":"Irlizot","studentaddressstate":"MO","studentaddresszip":"68328","guardianphone":"7313124998","studentgradelevel":"12","sourcestudentusername":"81226e2c8d60cd8b","projectedgraduationdate":"2015","sourceteacherusername":"2ebb82dd","teacherpersonaltitleprefix":"Dr.","teacherfirstname":"Ronnie","teacherlastname":"Leonard","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":75},{"hdrid":1640714049,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"815927965","teachername":"Leonard,Ronnie","teacheremailaddress":"wepora@dukes.edu","classcode":"aeldh-12-1","classname":"ELA 1205","classgradelevel":12,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"38095883486999","studentfirstname":"Johanna","studentmiddlename":"Lulu","studentlastname":"McGee","studentphone":"6268016147","studentemailaddress":"kej@ka.org","studentgender":"F","studentethnicity":"Asian","studentdateofbirth":"19981226","studentaddress1":"968 Civtaj Key","studentaddress2":"Apt 10b","studentaddresscity":"Kagifhi","studentaddressstate":"RI","studentaddresszip":"83385","guardianphone":"6158878461","studentgradelevel":"12","sourcestudentusername":"87ee21f3fab9d1c9","projectedgraduationdate":"2015","sourceteacherusername":"2ebb82dd","teacherpersonaltitleprefix":"Dr.","teacherfirstname":"Ronnie","teacherlastname":"Leonard","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":76},{"hdrid":1640714045,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"815927965","teachername":"Leonard,Ronnie","teacheremailaddress":"wepora@dukes.edu","classcode":"aeldh-12-1","classname":"ELA 1205","classgradelevel":12,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"40450125456684","studentfirstname":"Derek","studentmiddlename":"Henry","studentlastname":"Rodriguez","studentphone":"1809756697","studentemailaddress":"ihuseg@sen.com","studentgender":"M","studentethnicity":"White, Not Of Hispanic Origin","studentdateofbirth":"19980705","studentaddress1":"748 Wozwi St","studentaddress2":"Apt 1d","studentaddresscity":"Domumob","studentaddressstate":"CO","studentaddresszip":"85661","guardianphone":"5193335581","studentgradelevel":"12","sourcestudentusername":"bc119d939a87b169","projectedgraduationdate":"2015","sourceteacherusername":"2ebb82dd","teacherpersonaltitleprefix":"Dr.","teacherfirstname":"Ronnie","teacherlastname":"Leonard","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":77},{"hdrid":1640714042,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"815927965","teachername":"Leonard,Ronnie","teacheremailaddress":"wepora@dukes.edu","classcode":"aeldh-12-1","classname":"ELA 1205","classgradelevel":12,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"49117819033563","studentfirstname":"Rosa","studentmiddlename":"Adeline","studentlastname":"Brown","studentphone":"2125291451","studentemailaddress":"lug@jevel.gov","studentgender":"F","studentethnicity":"Asian","studentdateofbirth":"19980131","studentaddress1":"1162 Goso Loop","studentaddress2":"Apt 2a","studentaddresscity":"Fuurdal","studentaddressstate":"NC","studentaddresszip":"37203","guardianphone":"3222823287","studentgradelevel":"12","sourcestudentusername":"0e993ef55c04b8ff","projectedgraduationdate":"2015","sourceteacherusername":"2ebb82dd","teacherpersonaltitleprefix":"Dr.","teacherfirstname":"Ronnie","teacherlastname":"Leonard","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":78},{"hdrid":1640714053,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"815927965","teachername":"Leonard,Ronnie","teacheremailaddress":"wepora@dukes.edu","classcode":"aeldh-12-1","classname":"ELA 1205","classgradelevel":12,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"55047137414415","studentfirstname":"Michael","studentmiddlename":"George","studentlastname":"Roberson","studentphone":"3644676119","studentemailaddress":"wodpel@nertopvel.com","studentgender":"M","studentethnicity":"Native Hawaiian or Pacific Islander","studentdateofbirth":"19980613","studentaddress1":"660 Nufgi Grv","studentaddress2":"Apt 8c","studentaddresscity":"Rujipaeji","studentaddressstate":"WY","studentaddresszip":"98290","guardianphone":"5743293526","studentgradelevel":"12","sourcestudentusername":"27f104db12f733a1","projectedgraduationdate":"2015","sourceteacherusername":"2ebb82dd","teacherpersonaltitleprefix":"Dr.","teacherfirstname":"Ronnie","teacherlastname":"Leonard","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":79},{"hdrid":1640714043,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"815927965","teachername":"Leonard,Ronnie","teacheremailaddress":"wepora@dukes.edu","classcode":"aeldh-12-1","classname":"ELA 1205","classgradelevel":12,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"60955505756040","studentfirstname":"Stanley","studentmiddlename":"Matthew","studentlastname":"Massey","studentphone":"8963018409","studentemailaddress":"zab@epu.edu","studentgender":"M","studentethnicity":"Black, Not Of Hispanic Origin","studentdateofbirth":"19980629","studentaddress1":"1593 Oteema Pass","studentaddress2":"Apt 7d","studentaddresscity":"Dilolpam","studentaddressstate":"MI","studentaddresszip":"67536","guardianphone":"1687797827","studentgradelevel":"12","sourcestudentusername":"158989b303c3997a","projectedgraduationdate":"2015","sourceteacherusername":"2ebb82dd","teacherpersonaltitleprefix":"Dr.","teacherfirstname":"Ronnie","teacherlastname":"Leonard","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":80},{"hdrid":1640714040,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"815927965","teachername":"Leonard,Ronnie","teacheremailaddress":"wepora@dukes.edu","classcode":"aeldh-12-1","classname":"ELA 1205","classgradelevel":12,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"62068810727861","studentfirstname":"Vernon","studentmiddlename":"Charlie","studentlastname":"Gibbs","studentphone":"7170556750","studentemailaddress":"ba@has.com","studentgender":"M","studentethnicity":"Native Hawaiian or Pacific Islander","studentdateofbirth":"19980808","studentaddress1":"565 Liviju Gln","studentaddress2":"Apt 8d","studentaddresscity":"Fuzsute","studentaddressstate":"HI","studentaddresszip":"21405","guardianphone":"3089154509","studentgradelevel":"12","sourcestudentusername":"0eb0fde03a3bff79","projectedgraduationdate":"2015","sourceteacherusername":"2ebb82dd","teacherpersonaltitleprefix":"Dr.","teacherfirstname":"Ronnie","teacherlastname":"Leonard","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":81},{"hdrid":1640714057,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"815927965","teachername":"Leonard,Ronnie","teacheremailaddress":"wepora@dukes.edu","classcode":"aeldh-12-1","classname":"ELA 1205","classgradelevel":12,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"68338829051289","studentfirstname":"Marie","studentmiddlename":"Effie","studentlastname":"Lawson","studentphone":"1515475797","studentemailaddress":"niscut@me.edu","studentgender":"F","studentethnicity":"White, Not Of Hispanic Origin","studentdateofbirth":"19980404","studentaddress1":"265 Munled Key","studentaddress2":"Apt 4a","studentaddresscity":"Vewudij","studentaddressstate":"TX","studentaddresszip":"16742","guardianphone":"8537257940","studentgradelevel":"12","sourcestudentusername":"1b16a984b6bb0325","projectedgraduationdate":"2015","sourceteacherusername":"2ebb82dd","teacherpersonaltitleprefix":"Dr.","teacherfirstname":"Ronnie","teacherlastname":"Leonard","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":82},{"hdrid":1640714056,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"815927965","teachername":"Leonard,Ronnie","teacheremailaddress":"wepora@dukes.edu","classcode":"aeldh-12-1","classname":"ELA 1205","classgradelevel":12,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"69322902771333","studentfirstname":"Olive","studentmiddlename":"Christina","studentlastname":"Richards","studentphone":"2995874200","studentemailaddress":"do@se.org","studentgender":"F","studentethnicity":"Native Hawaiian or Pacific Islander","studentdateofbirth":"19980425","studentaddress1":"890 Lego Pike","studentaddress2":"Apt 4e","studentaddresscity":"Mabzubu","studentaddressstate":"IL","studentaddresszip":"23369","guardianphone":"8491159114","studentgradelevel":"12","sourcestudentusername":"c540d86280464adf","projectedgraduationdate":"2015","sourceteacherusername":"2ebb82dd","teacherpersonaltitleprefix":"Dr.","teacherfirstname":"Ronnie","teacherlastname":"Leonard","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":83},{"hdrid":1640714037,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"815927965","teachername":"Leonard,Ronnie","teacheremailaddress":"wepora@dukes.edu","classcode":"aeldh-12-1","classname":"ELA 1205","classgradelevel":12,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"74034158926871","studentfirstname":"Millie","studentmiddlename":"Elnora","studentlastname":"Simon","studentphone":"6820862539","studentemailaddress":"tahji@ivesi.edu","studentgender":"F","studentethnicity":"Asian","studentdateofbirth":"19980718","studentaddress1":"899 Neli Vw","studentaddress2":"Apt 8c","studentaddresscity":"Feplaca","studentaddressstate":"IL","studentaddresszip":"70806","guardianphone":"6067481500","studentgradelevel":"12","sourcestudentusername":"ee6889affd76efc0","projectedgraduationdate":"2015","sourceteacherusername":"2ebb82dd","teacherpersonaltitleprefix":"Dr.","teacherfirstname":"Ronnie","teacherlastname":"Leonard","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":84},{"hdrid":1640714038,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"815927965","teachername":"Leonard,Ronnie","teacheremailaddress":"wepora@dukes.edu","classcode":"aeldh-12-1","classname":"ELA 1205","classgradelevel":12,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"83839960913691","studentfirstname":"Bill","studentmiddlename":"Jorge","studentlastname":"Cohen","studentphone":"3722485601","studentemailaddress":"tir@dobgezu.edu","studentgender":"M","studentethnicity":"Black, Not Of Hispanic Origin","studentdateofbirth":"19981206","studentaddress1":"1682 Unsop Path","studentaddress2":"Apt 1c","studentaddresscity":"Muhtihfok","studentaddressstate":"IA","studentaddresszip":"88926","guardianphone":"4446674881","studentgradelevel":"12","sourcestudentusername":"90ac588454e13b3d","projectedgraduationdate":"2015","sourceteacherusername":"2ebb82dd","teacherpersonaltitleprefix":"Dr.","teacherfirstname":"Ronnie","teacherlastname":"Leonard","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":85},{"hdrid":1640714058,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"815927965","teachername":"Leonard,Ronnie","teacheremailaddress":"wepora@dukes.edu","classcode":"aeldh-12-1","classname":"ELA 1205","classgradelevel":12,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"96547237680190","studentfirstname":"Ellen","studentmiddlename":"Annie","studentlastname":"Malone","studentphone":"5732318473","studentemailaddress":"hemog@sum.edu","studentgender":"F","studentethnicity":"Other","studentdateofbirth":"19981030","studentaddress1":"1335 Cese Way","studentaddress2":"Apt 10b","studentaddresscity":"Mijnuksa","studentaddressstate":"CO","studentaddresszip":"53374","guardianphone":"1434427363","studentgradelevel":"12","sourcestudentusername":"a4bd9a0f7e642992","projectedgraduationdate":"2015","sourceteacherusername":"2ebb82dd","teacherpersonaltitleprefix":"Dr.","teacherfirstname":"Ronnie","teacherlastname":"Leonard","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":86},{"hdrid":1640714047,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"4","teachercode":"815927965","teachername":"Leonard,Ronnie","teacheremailaddress":"wepora@dukes.edu","classcode":"aeldh-12-1","classname":"ELA 1205","classgradelevel":12,"classsubjectcode":"1","classsubjectname":"ELA","sectioncode":null,"studentcode":"98929781611594","studentfirstname":"Hilda","studentmiddlename":"Jeanette","studentlastname":"Campbell","studentphone":"2308791801","studentemailaddress":"hievan@vafi.net","studentgender":"F","studentethnicity":"Asian","studentdateofbirth":"19980501","studentaddress1":"1305 Misic Hts","studentaddress2":"Apt 9c","studentaddresscity":"Bumdipatu","studentaddressstate":"NM","studentaddresszip":"28099","guardianphone":"5686398251","studentgradelevel":"12","sourcestudentusername":"867e951cfa9be187","projectedgraduationdate":"2015","sourceteacherusername":"2ebb82dd","teacherpersonaltitleprefix":"Dr.","teacherfirstname":"Ronnie","teacherlastname":"Leonard","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":87},{"hdrid":1640714358,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"0","teachercode":"847501377","teachername":"Henry,Christopher","teacheremailaddress":"vefal@sumuzeda.net","classcode":"ajdca-10-41","classname":"PE 1002","classgradelevel":10,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"22850716610749","studentfirstname":"Hulda","studentmiddlename":"Dora","studentlastname":"Pittman","studentphone":"6560575332","studentemailaddress":"wizuz@cizvihat.io","studentgender":"F","studentethnicity":"Black, Not Of Hispanic Origin","studentdateofbirth":"20000114","studentaddress1":"1337 Japmaj Rd","studentaddress2":"Apt 2a","studentaddresscity":"Ussiwi","studentaddressstate":"MA","studentaddresszip":"57007","guardianphone":"9177439695","studentgradelevel":"10","sourcestudentusername":"fd8f1efbd1fb09d2","projectedgraduationdate":"2017","sourceteacherusername":"6f2ced8a","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Christopher","teacherlastname":"Henry","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":88},{"hdrid":1640714350,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"0","teachercode":"847501377","teachername":"Henry,Christopher","teacheremailaddress":"vefal@sumuzeda.net","classcode":"ajdca-10-41","classname":"PE 1002","classgradelevel":10,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"23834300889736","studentfirstname":"Kyle","studentmiddlename":"Nathaniel","studentlastname":"Hanson","studentphone":"1343165536","studentemailaddress":"don@garul.net","studentgender":"M","studentethnicity":"Native Hawaiian or Pacific Islander","studentdateofbirth":"20001017","studentaddress1":"607 Esda Grv","studentaddress2":"Apt 9d","studentaddresscity":"Sanhizuh","studentaddressstate":"NV","studentaddresszip":"67336","guardianphone":"4553912677","studentgradelevel":"10","sourcestudentusername":"82ee95bfcf446701","projectedgraduationdate":"2017","sourceteacherusername":"6f2ced8a","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Christopher","teacherlastname":"Henry","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":89},{"hdrid":1640714347,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"0","teachercode":"847501377","teachername":"Henry,Christopher","teacheremailaddress":"vefal@sumuzeda.net","classcode":"ajdca-10-41","classname":"PE 1002","classgradelevel":10,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"27844542140761","studentfirstname":"Benjamin","studentmiddlename":"Gregory","studentlastname":"Norman","studentphone":"1882980556","studentemailaddress":"noda@uvo.org","studentgender":"M","studentethnicity":"Native Hawaiian or Pacific Islander","studentdateofbirth":"20000620","studentaddress1":"375 Otvet Blvd","studentaddress2":"Apt 4e","studentaddresscity":"Pawawiw","studentaddressstate":"TN","studentaddresszip":"80139","guardianphone":"2443796414","studentgradelevel":"10","sourcestudentusername":"4b37e492fa66c013","projectedgraduationdate":"2017","sourceteacherusername":"6f2ced8a","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Christopher","teacherlastname":"Henry","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":90},{"hdrid":1640714361,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"0","teachercode":"847501377","teachername":"Henry,Christopher","teacheremailaddress":"vefal@sumuzeda.net","classcode":"ajdca-10-41","classname":"PE 1002","classgradelevel":10,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"42157173881100","studentfirstname":"Janie","studentmiddlename":"Barbara","studentlastname":"Curtis","studentphone":"8571430548","studentemailaddress":"weoho@abu.org","studentgender":"F","studentethnicity":"Hispanic","studentdateofbirth":"20001209","studentaddress1":"455 Hunde Ext","studentaddress2":"Apt 4d","studentaddresscity":"Ziubuwuj","studentaddressstate":"NJ","studentaddresszip":"03899","guardianphone":"2190869185","studentgradelevel":"10","sourcestudentusername":"6e88e967ac4c4c6a","projectedgraduationdate":"2017","sourceteacherusername":"6f2ced8a","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Christopher","teacherlastname":"Henry","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":91},{"hdrid":1640714348,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"0","teachercode":"847501377","teachername":"Henry,Christopher","teacheremailaddress":"vefal@sumuzeda.net","classcode":"ajdca-10-41","classname":"PE 1002","classgradelevel":10,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"45942940521571","studentfirstname":"Lee","studentmiddlename":"Alan","studentlastname":"Ramos","studentphone":"1684851269","studentemailaddress":"zojoifo@fivaoh.org","studentgender":"M","studentethnicity":"Hispanic","studentdateofbirth":"20000530","studentaddress1":"970 Beraf Ln","studentaddress2":"Apt 7c","studentaddresscity":"Caevvij","studentaddressstate":"CO","studentaddresszip":"58310","guardianphone":"6599943817","studentgradelevel":"10","sourcestudentusername":"102a3c7d920cd3cd","projectedgraduationdate":"2017","sourceteacherusername":"6f2ced8a","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Christopher","teacherlastname":"Henry","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":92},{"hdrid":1640714363,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"0","teachercode":"847501377","teachername":"Henry,Christopher","teacheremailaddress":"vefal@sumuzeda.net","classcode":"ajdca-10-41","classname":"PE 1002","classgradelevel":10,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"48174289883010","studentfirstname":"Johnny","studentmiddlename":"Curtis","studentlastname":"Carroll","studentphone":"8637963609","studentemailaddress":"moh@uh.net","studentgender":"M","studentethnicity":"Black, Not Of Hispanic Origin","studentdateofbirth":"20000707","studentaddress1":"335 Vuner Dr","studentaddress2":"Apt 10a","studentaddresscity":"Cuanafiv","studentaddressstate":"NC","studentaddresszip":"37402","guardianphone":"2909939572","studentgradelevel":"10","sourcestudentusername":"c0949c75fada5c18","projectedgraduationdate":"2017","sourceteacherusername":"6f2ced8a","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Christopher","teacherlastname":"Henry","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":93},{"hdrid":1640714346,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"0","teachercode":"847501377","teachername":"Henry,Christopher","teacheremailaddress":"vefal@sumuzeda.net","classcode":"ajdca-10-41","classname":"PE 1002","classgradelevel":10,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"56778392361270","studentfirstname":"Ruby","studentmiddlename":"Verna","studentlastname":"Howard","studentphone":"7908158850","studentemailaddress":"roocihes@ru.edu","studentgender":"F","studentethnicity":"Native Hawaiian or Pacific Islander","studentdateofbirth":"20001222","studentaddress1":"1269 Ovineh Ln","studentaddress2":"Apt 6c","studentaddresscity":"Ilogaema","studentaddressstate":"HI","studentaddresszip":"87476","guardianphone":"3692274412","studentgradelevel":"10","sourcestudentusername":"d83f4e3165c6265b","projectedgraduationdate":"2017","sourceteacherusername":"6f2ced8a","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Christopher","teacherlastname":"Henry","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":94},{"hdrid":1640714351,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"0","teachercode":"847501377","teachername":"Henry,Christopher","teacheremailaddress":"vefal@sumuzeda.net","classcode":"ajdca-10-41","classname":"PE 1002","classgradelevel":10,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"59335850241283","studentfirstname":"Nathan","studentmiddlename":"Jesus","studentlastname":"Webb","studentphone":"5683983233","studentemailaddress":"lite@goccuod.org","studentgender":"M","studentethnicity":"White, Not Of Hispanic Origin","studentdateofbirth":"20001204","studentaddress1":"466 Feaw Mill","studentaddress2":"Apt 7d","studentaddresscity":"Ivuukvak","studentaddressstate":"CA","studentaddresszip":"53741","guardianphone":"4283379303","studentgradelevel":"10","sourcestudentusername":"e35d6a028aa4de01","projectedgraduationdate":"2017","sourceteacherusername":"6f2ced8a","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Christopher","teacherlastname":"Henry","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":95},{"hdrid":1640714365,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"0","teachercode":"847501377","teachername":"Henry,Christopher","teacheremailaddress":"vefal@sumuzeda.net","classcode":"ajdca-10-41","classname":"PE 1002","classgradelevel":10,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"60030515222913","studentfirstname":"Mattie","studentmiddlename":"Dollie","studentlastname":"Cole","studentphone":"8989593326","studentemailaddress":"muj@rotmar.org","studentgender":"F","studentethnicity":"American Indian or Alaskan Native","studentdateofbirth":"20000214","studentaddress1":"1278 Cibzar Ctr","studentaddress2":"Apt 8d","studentaddresscity":"Paviwagi","studentaddressstate":"RI","studentaddresszip":"19879","guardianphone":"3782940442","studentgradelevel":"10","sourcestudentusername":"de5f58f5ba798784","projectedgraduationdate":"2017","sourceteacherusername":"6f2ced8a","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Christopher","teacherlastname":"Henry","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":96},{"hdrid":1640714349,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"0","teachercode":"847501377","teachername":"Henry,Christopher","teacheremailaddress":"vefal@sumuzeda.net","classcode":"ajdca-10-41","classname":"PE 1002","classgradelevel":10,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"61089101599322","studentfirstname":"Gene","studentmiddlename":"John","studentlastname":"Rogers","studentphone":"8330590563","studentemailaddress":"joblaw@gek.net","studentgender":"M","studentethnicity":"Other","studentdateofbirth":"20000203","studentaddress1":"997 Ahves Pt","studentaddress2":"Apt 6a","studentaddresscity":"Fomhibe","studentaddressstate":"WA","studentaddresszip":"34804","guardianphone":"9748443938","studentgradelevel":"10","sourcestudentusername":"08cbaf273cb79664","projectedgraduationdate":"2017","sourceteacherusername":"6f2ced8a","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Christopher","teacherlastname":"Henry","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":97},{"hdrid":1640714354,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"0","teachercode":"847501377","teachername":"Henry,Christopher","teacheremailaddress":"vefal@sumuzeda.net","classcode":"ajdca-10-41","classname":"PE 1002","classgradelevel":10,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"61302118272417","studentfirstname":"Jim","studentmiddlename":"Harry","studentlastname":"Hart","studentphone":"2419187707","studentemailaddress":"utacu@ifo.io","studentgender":"M","studentethnicity":"Other","studentdateofbirth":"20000504","studentaddress1":"1213 Himli Tpke","studentaddress2":"Apt 3d","studentaddresscity":"Bivajorij","studentaddressstate":"MN","studentaddresszip":"71759","guardianphone":"2487262038","studentgradelevel":"10","sourcestudentusername":"4d4466a5232ef798","projectedgraduationdate":"2017","sourceteacherusername":"6f2ced8a","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Christopher","teacherlastname":"Henry","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":98},{"hdrid":1640714356,"districtcode":"perf01","districtname":"Twin Peaks","schoolcode":"123","schoolname":"Apollo Symposium","schoolyear":"2015-2016","schoolgradingPeriod":1,"schoolgradingperiodstartdate":"20150901","schoolgradingperiodenddate":"20160625","period":"0","teachercode":"847501377","teachername":"Henry,Christopher","teacheremailaddress":"vefal@sumuzeda.net","classcode":"ajdca-10-41","classname":"PE 1002","classgradelevel":10,"classsubjectcode":"41","classsubjectname":"PE","sectioncode":null,"studentcode":"67221362185147","studentfirstname":"Elva","studentmiddlename":"Rachel","studentlastname":"Beck","studentphone":"3862828003","studentemailaddress":"jokavcu@ve.edu","studentgender":"F","studentethnicity":"Black, Not Of Hispanic Origin","studentdateofbirth":"20000921","studentaddress1":"1006 Useoz Park","studentaddress2":"Apt 8e","studentaddresscity":"Fiusni","studentaddressstate":"DE","studentaddresszip":"76204","guardianphone":"8587109436","studentgradelevel":"10","sourcestudentusername":"98425e647d53a708","projectedgraduationdate":"2017","sourceteacherusername":"6f2ced8a","teacherpersonaltitleprefix":"Mr.","teacherfirstname":"Christopher","teacherlastname":"Henry","alternateid1":null,"alternateid2":null,"alternateid3":null,"alternateid4":null,"index":99}]

//     var newData = {
//         "name":"root",
//         "children":
//             d3.nest()
//                 .key(function(d){ return d.districtname})
//                 .key(function(d){return d.schoolname})
//                 .key(function(d){return d.teacherlastname})
//                 .key(function(d){return d.classcode})
//                 .key(function(d){return d.studentlastname})
//                 .entries(data2)
//     }
//     var stringer=JSON.stringify(newData);

// for(i=0; i<data2.length; i++){
//   stringer=stringer.replace("key", "name");
//   stringer=stringer.replace("values", "children");
// }
"use strict";
app.factory('projectDataFactory', function ($http) {
  return {
    getInternal: function getInternal(dataId, type) {
      console.log('gettin', dataId);
      return $http.get('/api/data/' + dataId).then(function (dataObject) {
        console.dir(dataObject);
        if (type === 'json') {
          return JSON.parse(dataObject.data.data);
        } else if (type === 'text') {
          return dataObject.data.data;
        }
      });
    }, // get internal
    dataByProjId: function dataByProjId(projId) {
      return $http.get('/api/data/datasourcesproj/' + projId).then(function (dataObject) {
        //console.log('dataObject is ');
        //console.log(dataObject.data)
        return dataObject.data;
      });
    },
    dataByUserId: function dataByUserId(userId) {
      return $http.get('/api/data/datasourcesuser/' + userId).then(function (dataObject) {
        return dataObject.data;
      });
    }
  };
});
app.config(function ($stateProvider) {
  $stateProvider.state('viewer', {
    url: '/viewer',
    templateUrl: 'js/viewer/view.html',
    controller: 'viewerControl'
    // resolve: {
    //   projects: function(ProjectFactory,$stateParams){
    //     if($stateParams.id){

    //       return ProjectFactory.getOne($stateParams.id);
    //     }
    //     return null;
    //   },
    // user: function(AuthService){
    //   return AuthService.getLoggedInUser();
    // }
    //}
  });
});

app.controller('viewerControl', function ($scope, $location, $anchorScroll) {
  $scope.scrollTo = function (id) {
    $location.hash(id);
    $anchorScroll();
  };
});
app.factory('RandomGreetings', function () {

  var getRandomFromArray = function getRandomFromArray(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  };

  var greetings = ['Hello, world!', 'At long last, I live!', 'Hello, simple human.', 'What a beautiful day!', 'I\'m like any other project, except that I am yours. :)', 'This empty string is for Lindsay Levine.', 'こんにちは、ユーザー様。', 'Welcome. To. WEBSITE.', ':D', 'Yes, I think we\'ve met before.', 'Gimme 3 mins... I just grabbed this really dope frittata', 'If Cooper could offer only one piece of advice, it would be to nevSQUIRREL!'];

  return {
    greetings: greetings,
    getRandomGreeting: function getRandomGreeting() {
      return getRandomFromArray(greetings);
    }
  };
});

app.factory('DataFactory', function ($http, Upload, $timeout) {
  var DataFactory = {};

  DataFactory.getDataById = function (id) {
    return $http.get('/api/data/' + id).then(function (response) {
      return response.data;
    });
  };

  DataFactory.getAllData = function () {
    return $http.get('/api/data/').then(function (response) {
      return response.data;
    });
  };

  return DataFactory;
});
app.factory('UserFactory', function ($http) {
  var FactoryObj = {};
  FactoryObj.create = function (data) {
    return $http.post('/api/users', data).then(function (response) {
      return response.data;
    });
  };

  return FactoryObj;
});
// app.directive('aiEditor', function() {
//   return {
//     restrict: 'E',
//     templateUrl: 'js/common/directives/editor_2/editor.html'
//   };
// });

app.directive('aiEditor', function () {
  return {
    restrict: 'E',
    templateUrl: 'js/common/directives/editor_2/editor.html'
  };
});
app.directive('fileUploader', function () {

  return {
    restrict: 'E',
    scope: true,
    templateUrl: 'js/common/directives/file-uploader/file-uploader.html',
    controller: function controller($scope, Upload, $timeout) {
      $scope.uploadFiles = function (file, errFiles) {
        $scope.f = file;
        $scope.errFile = errFiles && errFiles[0];
        if (file) {
          file.upload = Upload.upload({
            url: '/api/data/' + $scope.projId + '/' + $scope.userId,
            data: { file: file },
            method: 'POST'
          });

          file.upload.then(function (response) {
            $timeout(function () {
              file.result = response.data;
            });
          }, function (response) {
            if (response.status > 0) $scope.errorMsg = response.status + ': ' + response.data;
          }, function (evt) {
            file.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
          });
        }
      };
    }
  };
});
app.directive('fileUploader2', function () {

  return {
    restrict: 'E',
    scope: true,
    templateUrl: 'js/common/directives/file-uploader_am/file-uploader.html',
    controller: function controller($scope, Upload, $timeout) {
      $scope.upload = function () {
        console.log(userFile);
      };
    }
  };
});
app.directive('fullstackLogo', function () {
  return {
    restrict: 'E',
    templateUrl: 'js/common/directives/fullstack-logo/fullstack-logo.html'
  };
});
app.directive('navbar', function ($rootScope, AuthService, AUTH_EVENTS, $state, ProjectFactory) {

  return {
    restrict: 'E',
    scope: {},
    templateUrl: 'js/common/directives/navbar/navbar.html',
    link: function link(scope) {

      scope.items = [{ label: 'Home', state: 'home' },
      // { label: 'About', state: 'about' },

      { label: 'Browse', state: 'viewer' }
      // { label: 'Members Only', state: 'membersOnly', auth: true }
      ];

      scope.user = null;
      scope.projBadge = null;

      scope.isLoggedIn = function () {
        return AuthService.isAuthenticated();
      };

      scope.logout = function () {
        AuthService.logout().then(function () {
          $state.go('home');
        });
      };

      var setUser = function setUser() {
        AuthService.getLoggedInUser().then(function (user) {
          scope.user = user;
          if (user) {
            $state.go('home', { id: user._id });
          };
        });
      };

      var removeUser = function removeUser() {
        scope.user = null;
      };

      setUser();

      $rootScope.$on(AUTH_EVENTS.loginSuccess, setUser);
      $rootScope.$on(AUTH_EVENTS.logoutSuccess, removeUser);
      $rootScope.$on(AUTH_EVENTS.sessionTimeout, removeUser);
    }

  };
});

app.directive('randoGreeting', function (RandomGreetings) {

  return {
    restrict: 'E',
    templateUrl: 'js/common/directives/rando-greeting/rando-greeting.html',
    link: function link(scope) {
      scope.greeting = RandomGreetings.getRandomGreeting();
    }
  };
});
app.directive('aiBlockquote', function () {
  return {
    restrict: 'EA',
    scope: {
      aiQuote: '@',
      aiPerson: '@'
    },
    templateUrl: 'directiveStore/ai_blockquote/ai_blockquote.html',
    link: function link(scope, elem, attr) {}
  };
});
app.directive('aiSocial', function () {
  return {
    restrict: 'EA',
    scope: {
      aiHeader: '@',
      aiText: '@',
      aiFacebook: '@',
      aiTwitter: '@',
      aiInsta: '@',
      aiGithub: '@'
    },
    templateUrl: 'directiveStore/ai_social/ai_social.html',
    link: function link(scope, elem, attr) {
      console.log(attr.aiHeader);
      scope.links = {};

      scope.links = {
        "facebook": attr.aiFacebook,
        "twitter": attr.aiTwitter,
        "instagram": attr.aiInsta,
        "github": attr.aiGithub
      };
    }
  };
});
app.directive('aiClickImg', function () {
  return {
    restrict: 'EA',
    scope: {
      aiHeight: '@',
      aiWidth: '@',
      aiLink: '@',
      aiImgUrl: '@',
      bordertype: '@',
      bordercolor: '@',
      borderweight: '@',
      caption: '@'
    },
    templateUrl: 'directiveStore/ai_click_img/ai_click_img.html',
    link: function link(scope, elem, attr) {

      var width = attr.aiWidth;
      var height = attr.aiHeight;
      var href = attr.aiLink;
      var imgUrl = attr.aiImgUrl;
      var bordertype = attr.bordertype;
      var bordercolor = attr.bordercolor;
      var borderweight = attr.borderweight;
      var caption = attr.caption;

      scope.image = {
        "params": null
      };

      scope.image.params = {
        "height": height,
        "width": width,
        "src": imgUrl,
        "href": href,
        "caption": caption
      };

      if (bordertype && borderweight && bordercolor) {
        scope.image.params["border"] = "border: " + bordertype + " " + bordercolor + " " + borderweight;
      }
    }
  };
});
"use strict";
app.directive('d3ForceImages', function ($window, projectDataFactory) {
  return {
    restrict: 'EA',
    scope: {
      aiTitle: '@',
      aiInfoNodeSource: '@',
      aiInfoEdgeSource: '@',
      aiWidth: '@',
      aiHeight: '@',
      labels: '@',
      nodeImage: '@',
      bcolor: '@'
    },
    templateUrl: 'directiveStore/d3_force_images/d3_force_images.html',
    link: function link(scope, elem, attr) {
      var d3 = $window.d3;
      //const Promise = $window.bluebird;
      var width = attr.aiWidth;
      var height = attr.aiHeight;
      var nodeWidth = parseInt(attr.nodeWidth);
      var showLabels = attr.labels;
      var nodeImage = attr.nodeImage;
      var bcolor = attr.bcolor;

      console.log(nodeImage);

      var force = d3.layout.force().charge(-500).linkDistance(30).size([width, height]);

      var svg = d3.select('#chart-force-image').append("svg").attr("width", width).attr("height", height).style("background", bcolor);

      Promise.all([projectDataFactory.getInternal(attr.aiInfoNodeSource, 'json'), projectDataFactory.getInternal(attr.aiInfoEdgeSource, 'json')]).spread(function (nodeData, edgeData) {
        var _nodes = nodeData;
        var _links = edgeData;

        force.nodes(_nodes).links(_links).start();

        var link = svg.selectAll(".link").data(_links).enter().append("line").attr("class", "link").style("stroke-width", function (d) {
          return Math.sqrt(d.value);
        });

        var node = svg.selectAll(".node").data(_nodes).enter().append("g").attr("class", "node").call(force.drag);

        node.append("title").text(function (d) {
          return d.name;
        }); // abstract this

        // node.append('text')
        //     .text(function(d) { return d.name })
        //      .attr('fill','#D11C24')
        // .attr("dx", 12)
        // .attr("dy", ".35em")

        node.append("image").attr("xlink:href", function (d) {
          console.log(d);
          console.log(d.source);
          // return String(nodeImage);
          return String(d.image);
        }).attr("x", -8).attr("y", -8).attr("width", 25).attr("height", 25);

        force.on("tick", function () {
          link.attr("x1", function (d) {
            return d.source.x;
          }).attr("y1", function (d) {
            return d.source.y;
          }).attr("x2", function (d) {
            return d.target.x;
          }).attr("y2", function (d) {
            return d.target.y;
          });

          node.attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
          });
        });
      }); //end of promise.all
    } // end link
  }; // end return
});
"use strict";
app.directive('d3ForceBasic', function ($window, projectDataFactory) {
  return {
    restrict: 'EA',
    scope: {
      aiTitle: '@',
      aiInfoSource: '@',
      aiWidth: '@',
      aiHeight: '@',
      nodeWidth: '@'

    },
    templateUrl: 'directiveStore/d3_force_basic/d3_force_basic.html',
    link: function link(scope, elem, attr) {
      var d3 = $window.d3;
      var w = attr.aiWidth;
      var h = attr.aiHeight;
      var nodeWidth = attr.nodeWidth;
      var colors = {
        "lightgray": "#819090",
        "gray": "#708284",
        "mediumgray": "#536870",
        "darkgray": "#475B62",
        "darkblue": "#0A2933",
        "darkerblue": "#042029",
        "paleryellow": "#FCF4DC",
        "paleyellow": "#EAE3CB",
        "yellow": "#A57706",
        "orange": "#BD3613",
        "red": "#D11C24",
        "pink": "#C61C6F",
        "purple": "#595AB7",
        "blue": "#2176C7",
        "green": "#259286",
        "yellowgreen": "#738A05"
      };
      //5764766789ad8a8a23011d7e
      projectDataFactory.getInternal(attr.aiInfoSource, 'json').then(function (_data) {
        scope.data = _data;
        return _data;
      }).then(function (_data) {
        console.log(_data);
        var nodes = _data.nodes;
        var links = [];

        for (var i = 0; i < nodes.length; i++) {
          // split nodes and links...
          if (nodes[i].target !== undefined) {
            for (var x = 0; x < nodes[i].target.length; x++) {
              links.push({
                source: nodes[i],
                target: nodes[nodes[i].target[x]]
              });
            }
          }
        }

        var myChart = d3.select('#chart-force-basic').append('svg').attr('width', w).attr('height', h);

        var force = d3.layout.force().nodes(nodes).links([]).gravity(0.3).charge(-1000).size([w, h]);

        var link = myChart.selectAll('line').data(links).enter().append('line').attr('stroke', colors.gray);

        var node = myChart.selectAll('circle').data(nodes).enter().append('g').call(force.drag);

        node.append('circle').attr('cx', function (d) {
          return d.x;
        }).attr('cy', function (d) {
          return d.y;
        }).attr('r', nodeWidth).attr('fill', function (d, i) {
          if (i > 0) {
            // change color based on level
            return colors.pink;
          } else {
            return colors.blue;
          }
        });

        node.append('text').text(function (d) {
          console.log(d.name);return d.name;
        }).attr('font-family', 'Roboto Slab').attr('fill', function (d, i) {
          if (i > 0) {
            // change color based on level
            return colors.mediumgray;
          } else {
            return colors.darkblue;
          }
        }).attr('font-size', function (d, i) {
          if (i > 0) {
            // change font based on level
            return '1em';
          } else {
            return '1.3em';
          }
        });

        force.on('tick', function (e) {
          node.attr('transform', function (d, i) {
            return 'translate(' + d.x + ',' + d.y + ')';
          });

          link.attr('x1', function (d) {
            return d.source.x;
          }).attr('y1', function (d) {
            return d.source.y;
          }).attr('x2', function (d) {
            return d.target.x;
          }).attr('y2', function (d) {
            return d.target.y;
          });
        });

        force.start();
      }); // end _data promise
    } // end link
  }; // end return
});
"use strict";
app.directive('d3BostockForce', function ($window, projectDataFactory) {
  return {
    restrict: 'EA',
    scope: {
      aiTitle: '@',
      aiInfoNodeSource: '@',
      aiInfoEdgeSource: '@',
      aiWidth: '@',
      aiHeight: '@',
      labels: '@',
      nodeWidth: '@',
      colorSet: '@'
    },
    templateUrl: 'directiveStore/d3_bostock_force/d3_bostock_force.html',
    link: function link(scope, elem, attr) {
      var d3 = $window.d3;
      //const Promise = $window.bluebird;
      var width = attr.aiWidth;
      var height = attr.aiHeight;
      var nodeWidth = parseInt(attr.nodeWidth);
      var showLabels = attr.labels;
      var color = d3.scale.category20(); // abstract this

      if (attr.colorSet === "10") {
        color = d3.scale.category10();
      }

      var force = d3.layout.force().charge(-120).linkDistance(30).size([width, height]);

      var svg = d3.select('#chart-bostock-force-example').append("svg").attr("width", width).attr("height", height);

      Promise.all([projectDataFactory.getInternal(attr.aiInfoNodeSource, 'json'), projectDataFactory.getInternal(attr.aiInfoEdgeSource, 'json')]).spread(function (nodeData, edgeData) {
        var _nodes = nodeData;
        var _links = edgeData;

        force.nodes(_nodes).links(_links).start();

        var link = svg.selectAll(".link").data(_links).enter().append("line").attr("class", "link").style("stroke-width", function (d) {
          return Math.sqrt(d.value);
        });

        var node = svg.selectAll(".node").data(_nodes).enter().append("circle").attr("class", "node").attr("r", 5).style("fill", function (d) {
          return color(d.group);
        }) // abstract group
        .call(force.drag);

        node.append("title").text(function (d) {
          return d.name;
        }); // abstract this

        if (showLabels === "true") {
          console.log("labels turned on");
          var label = svg.selectAll(".label").data(_nodes).enter().append("g").attr("class", "label").call(force.drag);

          label.append('text').text(function (d) {
            return d.name;
          });
        }

        force.on("tick", function () {
          link.attr("x1", function (d) {
            return d.source.x;
          }).attr("y1", function (d) {
            return d.source.y;
          }).attr("x2", function (d) {
            return d.target.x;
          }).attr("y2", function (d) {
            return d.target.y;
          });

          node.attr("cx", function (d) {
            return d.x;
          }).attr("cy", function (d) {
            return d.y;
          });

          if (showLabels === "true") {
            label.attr('transform', function (d, i) {
              return 'translate(' + d.x + ',' + d.y + ')';
            });
          }
        }); // end force.on
      }); //end of promise.all
    } // end link
  }; // end return
});
"use strict";
app.directive('horizontalFlare', function ($window, projectDataFactory) {
  return {
    restrict: 'EA',
    scope: {
      aiTitle: '@',
      aiInfoSource: '@',
      aiWidth: '@',
      aiHeight: '@'
    },
    templateUrl: 'directiveStore/horizontal_flare/horizontal_flare.html',
    link: function link(scope, elem, attr) {
      var d3 = $window.d3;

      console.log(attr.aiInfoSource); // maybe make the chart id out of this?

      projectDataFactory.getInternal(attr.aiInfoSource, 'json').then(function (_data) {
        scope.data = _data;
        console.log('_data is ' + _data);
        return _data;
      }).then(function (_data) {

        var margin = { top: 20, right: 20, bottom: 20, left: 20 },
            width = attr.aiWidth + 20 - margin.right - margin.left,
            height = attr.aiHeight - margin.top - margin.bottom;

        var i = 0,
            duration = 750,
            root;

        var tree = d3.layout.tree().size([height, width]);

        var diagonal = d3.svg.diagonal().projection(function (d) {
          return [d.y, d.x];
        });

        var svg = d3.select("#chart11").append("svg").attr("width", width + margin.right + margin.left).attr("height", height + margin.top + margin.bottom).append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        root = _data;
        root.x0 = width / 2;
        root.y0 = 0;

        function collapse(d) {
          if (d.children) {
            d._children = d.children;
            d._children.forEach(collapse);
            d.children = null;
          }
        }

        root.children.forEach(collapse);
        update(root);

        d3.select(self.frameElement).style("height", "1000px");

        function update(source) {

          // Compute the new tree layout.
          var nodes = tree.nodes(root).reverse(),
              links = tree.links(nodes);

          // Normalize for fixed-depth.
          nodes.forEach(function (d) {
            d.y = d.depth * 100;
          });
          //nodes.forEach(function(d){d.x = d.x+20});

          // Update the nodes…
          var node = svg.selectAll("g.node").data(nodes, function (d) {
            return d.id || (d.id = ++i);
          });

          // Enter any new nodes at the parent's previous position.
          var nodeEnter = node.enter().append("g").attr("class", "node").attr("transform", function (d) {
            return "translate(" + source.y0 + "," + source.x0 + ")";
          }).on("click", click);

          nodeEnter.append("circle").attr("r", 1e-6).style("fill", function (d) {
            return d._children ? "lightsteelblue" : "#fff";
          });

          nodeEnter.append("text").attr("x", function (d) {
            return d.children || d._children ? -10 : 10;
          }).attr("y", function (d) {
            return d.children || d._children ? -10 : 10;
          }).attr("dy", ".35em").attr("text-anchor", function (d) {
            return d.children || d._children ? "end" : "start";
          }).text(function (d) {
            return d.name || d.studentname || "student code: " + d.studentcode;
          }).style("fill-opacity", 1e-6).attr('style', 'stroke:none;font-family: sans-serif;letter-spacing: 2;');

          // Transition nodes to their new position.
          var nodeUpdate = node.transition().duration(duration).attr("transform", function (d) {
            return "translate(" + d.y + "," + d.x + ")";
          });

          nodeUpdate.select("circle").attr("r", 4.5).style("fill", function (d) {
            return d._children ? "lightsteelblue" : "#fff";
          });

          nodeUpdate.select("text").style("fill-opacity", 1);

          // Transition exiting nodes to the parent's new position.
          var nodeExit = node.exit().transition().duration(duration).attr("transform", function (d) {
            return "translate(" + source.y + "," + source.x + ")";
          }).remove();

          nodeExit.select("circle").attr("r", 1e-6);

          nodeExit.select("text").style("fill-opacity", 1e-6);

          // Update the links…
          var link = svg.selectAll("path.link").data(links, function (d) {
            return d.target.id;
          });

          // Enter any new links at the parent's previous position.
          link.enter().insert("path", "g").attr("class", "link").attr("d", function (d) {
            var o = { x: source.x0, y: source.y0 };
            return diagonal({ source: o, target: o });
          });

          // Transition links to their new position.
          link.transition().duration(duration).attr("d", diagonal);

          // Transition exiting nodes to the parent's new position.
          link.exit().transition().duration(duration).attr("d", function (d) {
            var o = { x: source.x, y: source.y };
            return diagonal({ source: o, target: o });
          }).remove();

          // Stash the old positions for transition.
          nodes.forEach(function (d) {
            d.x0 = d.x;
            d.y0 = d.y;
          });
        }
        // Toggle children on click.
        function click(d) {
          if (d.children) {
            d._children = d.children;
            d.children = null;
          } else {
            d.children = d._children;
            d._children = null;
          }
          update(d);
        }
      }); // end then
    }
  };
});
// app.factory('justatableDataFactory',function($http){
//   return{
//    // this represents the result of opening a csv file turning it into a json array of objects
//    // all factory function must be a promise to standardize the interface
//     getdata :  function(dataSourceLocation,dataSourceType){
//      // alert (dataSourceType);
//       if(dataSourceType === 'file'){
//       // put node fs asyncopen
//         return [
//           {firstname:'first name', lastname:'last name', age : 'age'},
//           {firstname:'John', lastname:'Doe', age : '22'},
//           {firstname:'Bart', lastname:'Simson', age : '10'},
//           {firstname:'Donald', lastname:'Trump', age : 'Dick'}
//         ];
//       }else if(dataSourceType === 'website'){
//           return $http.get(dataSourceLocation);
//       }
//     }
//   };
// });

app.directive('justatable', function (projectDataFactory) {
  return {
    restrict: 'EA',
    scope: {
      aiTitle: '@',
      aiInfoSource: '@',
      aiInfoType: '@'
    },
    templateUrl: 'directiveStore/justatable/justatable.html',
    //controller : function($scope, dataFactory){
    //$scope.data=dataFactory.getdata($scope.sectionLocation,$scope.sectionType);
    //},
    link: function link(scope, elem, attr) {

      projectDataFactory.getInternal(attr.aiInfoSource, 'json').then(function (data) {
        // console.log(typeof data);
        // console.log(data[0]);
        // console.log(Object.keys(data[0]))
        //debugger
        scope.data = data;
        scope.headers = Object.keys(data[0]);
      });
    }
  };
});

app.directive('nvd3BarChart', function ($window, projectDataFactory) {
  return {
    restrict: 'EA',
    scope: {
      aiTitle: '@',
      aiInfoSource: '@',
      aiInfoType: '@',
      aiHeight: '@',
      aiWidth: '@',
      yvalue: '@',
      label: '@',
      key: '@'
    },
    templateUrl: 'directiveStore/nvd3_bar_chart/nvd3_bar_chart.html',
    //controller : function($scope, dataFactory){
    //$scope.data=dataFactory.getdata($scope.sectionLocation,$scope.sectionType);
    //},
    link: function link(scope, elem, attr) {
      var d3 = $window.d3;

      var convertToXY = function convertToXY(_data, _key, label, field) {
        var transformed = [{
          key: _key,
          values: []
        }];

        _data.forEach(function (row) {
          var newRow = {
            "x": row[label],
            "y": row[field]
          };

          transformed[0].values.push(newRow);
        });
        return transformed;
      };
      console.log('what is aiinfosource ' + attr.aiInfoSource);

      projectDataFactory.getInternal(attr.aiInfoSource, 'json').then(function (_data) {
        console.log('_data is ' + _data);
        _data = convertToXY(_data, attr.key, attr.label, attr.yvalue);
        console.log(_data);
        scope.data = _data;

        // chart.xAxis.rotateLabels(-45);
      });

      scope.options = {
        chart: {
          type: 'discreteBarChart',
          height: attr.aiHeight,
          width: attr.aiWidth,
          color: d3.scale.category10().range(),
          reducexticks: true,
          showValues: true,
          duration: 350,
          rotateLabels: -45
        }
      };
    }
  };
});
"use strict";
app.directive('flareLarskotthoff', function ($window, projectDataFactory) {
  return {
    restrict: 'EA',
    scope: {
      aiTitle: '@',
      aiInfoSource: '@',
      aiWidth: '@',
      aiHeight: '@'
    },
    templateUrl: 'directiveStore/flare_larskotthoff/flare_larskotthoff.html',
    link: function link(scope, elem, attr) {

      var d3 = $window.d3;
      var w = attr.aiWidth,
          h = attr.aiHeight,
          i = 0,
          barHeight = 20,
          barWidth = w * 1,
          duration = 400,
          root;

      var tree = d3.layout.tree().size([h, 100]);

      var diagonal = d3.svg.diagonal().projection(function (d) {
        return [d.y, d.x];
      });

      var vis = d3.select("#chart7").append("svg:svg").attr("width", w).attr("height", h).append("svg:g").attr("transform", "translate(20,30)");

      function moveChildren(node) {
        if (node.children) {
          node.children.forEach(function (c) {
            moveChildren(c);
          });
          node._children = node.children;
          node.children = null;
        }
      }

      projectDataFactory.getInternal(attr.aiInfoSource, 'json').then(function (_data) {
        console.log('flare data', _data);
        scope.data = _data;
        var json = _data;
        return json;
      }).then(function (json) {

        json.x0 = 0;
        json.y0 = 0;
        moveChildren(json);
        update(root = json);
      });

      function update(source) {

        // Compute the flattened node list. TODO use d3.layout.hierarchy.
        var nodes = tree.nodes(root);

        // Compute the "layout".
        nodes.forEach(function (n, i) {
          n.x = i * barHeight;
        });

        // Update the nodes…
        var node = vis.selectAll("g.node").data(nodes, function (d) {
          return d.id || (d.id = ++i);
        });

        var nodeEnter = node.enter().append("svg:g").attr("class", "node").attr("transform", function (d) {
          return "translate(" + source.y0 + "," + source.x0 + ")";
        }).style("opacity", 1e-6);

        // Enter any new nodes at the parent's previous position.
        nodeEnter.append("svg:rect").attr("y", -barHeight / 2).attr("height", barHeight).attr("width", barWidth).style("fill", color).on("click", click);

        nodeEnter.append("svg:text").attr("dy", 3.5).attr("dx", 5.5).text(function (d) {
          return d.name;
        }).attr('style', 'stroke:none;font-family: sans-serif;letter-spacing: 2;');

        // Transition nodes to their new position.
        nodeEnter.transition().duration(duration).attr("transform", function (d) {
          return "translate(" + d.y + "," + d.x + ")";
        }).style("opacity", 1);

        node.transition().duration(duration).attr("transform", function (d) {
          return "translate(" + d.y + "," + d.x + ")";
        }).style("opacity", 1).select("rect").style("fill", color);

        // Transition exiting nodes to the parent's new position.
        node.exit().transition().duration(duration).attr("transform", function (d) {
          return "translate(" + source.y + "," + source.x + ")";
        }).style("opacity", 1e-6).remove();

        // Update the links…
        var link = vis.selectAll("path.link").data(tree.links(nodes), function (d) {
          return d.target.id;
        });

        // Enter any new links at the parent's previous position.
        link.enter().insert("svg:path", "g").attr("class", "link").attr("d", function (d) {
          var o = { x: source.x0, y: source.y0 };
          return diagonal({ source: o, target: o });
        }).transition().duration(duration).attr("d", diagonal);

        // Transition links to their new position.
        link.transition().duration(duration).attr("d", diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition().duration(duration).attr("d", function (d) {
          var o = { x: source.x, y: source.y };
          return diagonal({ source: o, target: o });
        }).remove();

        // Stash the old positions for transition.
        nodes.forEach(function (d) {
          d.x0 = d.x;
          d.y0 = d.y;
        });
      }

      // Toggle children on click.
      function click(d) {
        if (d.children) {
          d._children = d.children;
          d.children = null;
        } else {
          d.children = d._children;
          d._children = null;
        }
        update(d);
      }

      function color(d) {
        return d._children ? "#3182bd" : d.children ? "#c6dbef" : "#fd8d3c";
      }
    }
  };
});

app.directive('pieGraphTextures', function ($window) {

  return {
    restrict: 'E',
    templateUrl: 'directiveStore/pie_graph_textures/pie_graph_textures.html',
    scope: {
      aiTitle: '@',
      aiWidth: '@',
      aiHeight: '@',
      aiRadius: '@',
      label1: '@',
      value1: '@',
      label2: '@',
      value2: '@',
      label3: '@',
      value3: '@',
      label4: '@',
      value4: '@',
      label5: '@',
      value5: '@',
      label6: '@',
      value6: '@'

    },
    link: function link(scope, elem, attr) {
      var d3 = $window.d3;
      var width = attr.aiWidth || 400;
      var height = attr.aiHeight || 400;
      var radius = attr.aiRadius || 200;
      var colors = attr.colors || d3.scale.category10(); // come back to this!
      var piedata = [];

      for (var i = 1; i < 9; i++) {
        var labelString = "label" + i;
        var valueString = "value" + i;
        if (attr[labelString] && attr[valueString] && attr[labelString] != "undefined" && attr[valueString] != "undefined") {
          var _label = attr[labelString];
          var _value = attr[valueString];
          piedata.push({ "label": _label, "value": _value });
        };
      }
      var pie = d3.layout.pie().value(function (d) {
        return d.value;
      });

      var arc = d3.svg.arc().outerRadius(radius);

      //var t = textures.circles();

      var svg = d3.select("#hello").append("svg").attr("width", 200).attr("height", 200);

      var t = textures.circles().radius(4).fill("transparent").strokeWidth(2);

      svg.call(t);

      svg.append("rect").attr('y', 50).attr('x', 50).attr('width', 50).attr('height', 20).style("stroke", "blue").style("fill", t.url());

      var myChart = d3.select('#pie-chart-textures').append('svg').attr('width', width).attr('height', height).append('g').attr('transform', 'translate(' + (width - radius) + ',' + (height - radius) + ')').selectAll('path').data(pie(piedata)) //returns an array of arcs
      .enter().append('g').attr('class', 'slice');

      myChart.call(t);

      var slices = d3.selectAll('g.slice').append('path')
      // .attr('fill', function(d, i) {
      //   let c=colors(i)
      //   console.log(c);
      //   return t.stroke(c);
      // })
      .style('stroke', function (d, i) {
        return colors(i);
      }).style("fill", t.url()).attr('d', arc); // passing in the arc function

      var text = d3.selectAll('g.slice').append('text').text(function (d, i) {
        //data object..
        return d.data.label;
      }).attr('text-anchor', 'middle').attr('fill', 'black').attr('transform', function (d) {
        d.innerRadius = 0;
        d.outerRadius = radius;
        return 'translate(' + arc.centroid(d) + ')';
      });
    }
  };
});

app.directive('nvd3ScatterChart', function (projectDataFactory) {
  return {
    restrict: 'EA',
    scope: {
      aiTitle: '@',
      aiInfoSource: '@',
      aiInfoType: '@',
      aiHeight: '@',
      xvalue: '@',
      yvalue: '@',
      size: '@',
      label: '@'
    },
    templateUrl: 'directiveStore/nvd3_scatter_chart/nvd3_scatter_chart.html',
    //controller : function($scope, dataFactory){
    //$scope.data=dataFactory.getdata($scope.sectionLocation,$scope.sectionType);
    //},
    link: function link(scope, elem, attr) {

      var convertToXY = function convertToXY(_data, x_value, y_value, size, group_field) {
        var transformed = [];
        var unique_groups = [];

        _data.forEach(function (row) {
          var newRow = {
            "x": row[x_value],
            "y": row[y_value],
            "size": row[size]
          };
          var groupIndex = unique_groups.indexOf(row[group_field]);

          if (groupIndex === -1) {
            unique_groups.push(row[group_field]);

            transformed.push({
              "key": row[group_field],
              "values": [newRow]
            });
          } else if (groupIndex > -1) {
            transformed[groupIndex].values.push(newRow);
          }
        });
        return transformed;
      };

      projectDataFactory.getInternal(attr.aiInfoSource, 'json').then(function (data) {
        scope.data = convertToXY(data, attr.xvalue, attr.yvalue, attr.size, attr.label);
      });

      scope.options = {
        chart: {
          type: 'scatterChart',
          height: attr.aiHeight,
          color: d3.scale.category10().range(),
          scatter: {
            onlyCircles: true
          },
          showDistX: true,
          showDistY: true,
          tooltipContent: function tooltipContent(key) {
            return '<h3>' + key + '</h3>';
          },
          duration: 350,
          xAxis: {
            axisLabel: attr.xvalue,
            tickFormat: function tickFormat(d) {
              return d3.format('.02f')(d);
            }
          },
          yAxis: {
            axisLabel: attr.yvalue,
            tickFormat: function tickFormat(d) {
              return d3.format('.02f')(d);
            },
            axisLabelDistance: -5
          },
          zoom: {
            //NOTE: All attributes below are optional
            enabled: false,
            scaleExtent: [1, 10],
            useFixedDomain: false,
            useNiceScale: false,
            horizontalOff: false,
            verticalOff: false,
            unzoomEventType: 'dblclick.zoom'
          }
        }
      };
    }
  };
});

app.directive('pieGraphUserInput', function ($window) {

  return {
    restrict: 'E',
    templateUrl: 'directiveStore/pie_graph_user_input/pie_graph_user_input.html',
    scope: {
      aiTitle: '@',
      aiWidth: '@',
      aiHeight: '@',
      aiRadius: '@',
      label1: '@',
      value1: '@',
      label2: '@',
      value2: '@',
      label3: '@',
      value3: '@',
      label4: '@',
      value4: '@',
      label5: '@',
      value5: '@',
      label6: '@',
      value6: '@',
      label7: '@',
      value7: '@',
      label8: '@',
      value8: '@'

    },
    link: function link(scope, elem, attr) {
      var d3 = $window.d3;
      var width = attr.aiWidth || 400;
      var height = attr.aiHeight || 400;
      var radius = attr.aiRadius || 200;
      var colors = attr.colors || d3.scale.category10(); // come back to this!
      var piedata = [];

      for (var i = 1; i < 9; i++) {
        var labelString = "label" + i;
        var valueString = "value" + i;
        if (attr[labelString] && attr[valueString] && attr[labelString] != "undefined" && attr[valueString] != "undefined") {
          var _label = attr[labelString];
          var _value = attr[valueString];
          piedata.push({ "label": _label, "value": _value });
        };
      }
      var pie = d3.layout.pie().value(function (d) {
        return d.value;
      });

      var arc = d3.svg.arc().outerRadius(radius);

      var myChart = d3.select('#pie-chart').append('svg').attr('width', width).attr('height', height).append('g').attr('transform', 'translate(' + (width - radius) + ',' + (height - radius) + ')').selectAll('path').data(pie(piedata)) //returns an array of arcs
      .enter().append('g').attr('class', 'slice');

      var slices = d3.selectAll('g.slice').append('path').attr('fill', function (d, i) {
        return colors(i);
      }).attr('d', arc); // passing in the arc function

      var text = d3.selectAll('g.slice').append('text').text(function (d, i) {
        //data object..
        return d.data.label;
      }).attr('text-anchor', 'middle').attr('fill', 'white').attr('transform', function (d) {
        d.innerRadius = 0;
        d.outerRadius = radius;
        return 'translate(' + arc.centroid(d) + ')';
      });
    }
  };
});
app.directive('titleSubtitle', function () {
  return {
    restrict: 'EA',
    scope: {
      aiTitle: '@',
      aiSubtitle: '@'
    },
    templateUrl: 'directiveStore/title_subtitle/title_subtitle.html',
    link: function link(scope, elem, attr) {}
  };
});

// the factory must be named like this directiveName_Factory
app.factory('soloTable_Factory', function ($http) {
  return {
    // this represents the result of opening a csv file turning it into a json array of objects
    // all factory function must be a promise to standardize the interface
    getdata: function getdata(dataSourceLocation, dataSourceType) {
      // alert (dataSourceType);
      if (dataSourceType === 'file') {
        // put node fs asyncopen
        return [{ firstname: 'first name', lastname: 'last name', age: 'age' }, { firstname: 'John', lastname: 'Doe', age: '22' }, { firstname: 'Bart', lastname: 'Simson', age: '10' }, { firstname: 'Donald', lastname: 'Trump', age: 'Dick' }];
      } else if (dataSourceType === 'website') {
        return $http.get(dataSourceLocation);
      }
    }
  };
});
// you must apply for a directivename (it could be in use)
app.directive('soloTable', function (soloTable_Factory) {
  return {
    restrict: 'EA',
    scope: {
      soloTableTitle: '@',
      soloTableInfoSource: '@',
      soloTableInfoType: '@'
    },
    templateUrl: 'directiveStore/solo_table/solo_table.html',
    //controller : function($scope, dataFactory){
    //$scope.data=dataFactory.getdata($scope.sectionLocation,$scope.sectionType);
    //},
    link: function link(scope, elem, attr) {
      // the link function is going to take all data requests and put them in an array of promisses
      //  for(var i=0;i< a.length;i++;){
      //if(a[i].indexOf(sectionLocation))
      // scope.aiTitle=attr.aiInfoType
      scope.data = soloTable_Factory.getdata(attr.soloTableInfoSource, attr.soloTableInfoType);

      //  }
    }
  };
});
app.directive('userProfile', function () {
  return {
    restrict: 'EA',
    scope: {
      aiHeight: '@',
      aiWidth: '@',
      aiImgUrl: '@',
      round: '@',
      aiName: '@',
      aiTitle: '@',
      aiProfile: '@'
    },
    templateUrl: 'directiveStore/user_profile/user_profile.html',
    link: function link(scope, elem, attr) {

      var round = attr.round;

      scope.prof = {};

      scope.prof.image = {
        "height": attr.aiHeight,
        "width": attr.aiWidth,
        "src": attr.aiImgUrl
      };

      if (round === "true") {
        scope.prof.image["round"] = "border-radius:100%";
      };
    }
  };
});
"use strict";
app.directive('vertFlare', function ($window, projectDataFactory) {
  return {
    restrict: 'EA',
    scope: {
      aiTitle: '@',
      aiInfoSource: '@',
      aiWidth: '@',
      aiHeight: '@'
    },
    templateUrl: 'directiveStore/vert_flare/vert_flare.html',
    link: function link(scope, elem, attr) {
      var d3 = $window.d3;

      console.log(attr.aiInfoSource); // maybe make the chart id out of this?

      projectDataFactory.getInternal(attr.aiInfoSource, 'json').then(function (_data) {
        console.log('flare data', _data);
        scope.data = _data;

        return _data;
      }).then(function (_data) {

        console.log(_data);

        var margin = { top: 20, right: 20, bottom: 20, left: 20 },
            width = attr.aiWidth - margin.right - margin.left,
            height = attr.aiHeight - margin.top - margin.bottom;

        var i = 0,
            duration = 750,
            root;

        var tree = d3.layout.tree().size([height, width]);

        var diagonal = d3.svg.diagonal().projection(function (d) {
          return [d.x, d.y];
        });

        var svg = d3.select("#chart10").append("svg").attr("width", width + margin.right + margin.left).attr("height", height + margin.top + margin.bottom).append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        root = _data;
        root.x0 = width / 2;
        root.y0 = 0;

        function collapse(d) {
          if (d.children) {
            d._children = d.children;
            d._children.forEach(collapse);
            d.children = null;
          }
        }

        root.children.forEach(collapse);
        update(root);

        d3.select(self.frameElement).style("height", "1000px");

        function update(source) {

          // Compute the new tree layout.
          var nodes = tree.nodes(root).reverse(),
              links = tree.links(nodes);

          // Normalize for fixed-depth.
          nodes.forEach(function (d) {
            d.y = d.depth * 80;
          });
          //nodes.forEach(function(d){d.x = d.x+20});

          // Update the nodes…
          var node = svg.selectAll("g.node").data(nodes, function (d) {
            return d.id || (d.id = ++i);
          });

          // Enter any new nodes at the parent's previous position.
          var nodeEnter = node.enter().append("g").attr("class", "node").attr("transform", function (d) {
            return "translate(" + source.x0 + "," + source.y0 + ")";
          }).on("click", click);

          nodeEnter.append("circle").attr("r", 1e-6).style("fill", function (d) {
            return d._children ? "lightsteelblue" : "#fff";
          });

          nodeEnter.append("text").attr("x", function (d) {
            return d.children || d._children ? 0 : 10;
          }).attr("y", function (d) {
            return d.children || d._children ? Math.floor(Math.random() * 4) * 7 : Math.floor(Math.random() * 6) * 7;
          }).attr("dy", ".35em").attr("text-anchor", function (d) {
            return d.children || d._children ? "end" : "start";
          }).text(function (d) {
            return d.name || d.studentname || "student code: " + d.studentcode;
          }).style("fill-opacity", 1e-6).attr('style', 'stroke:none;font-family: sans-serif;letter-spacing: 2;');

          // Transition nodes to their new position.
          var nodeUpdate = node.transition().duration(duration).attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
          });

          nodeUpdate.select("circle").attr("r", 4.5).style("fill", function (d) {
            return d._children ? "lightsteelblue" : "#fff";
          });

          nodeUpdate.select("text").style("fill-opacity", 1);

          // Transition exiting nodes to the parent's new position.
          var nodeExit = node.exit().transition().duration(duration).attr("transform", function (d) {
            return "translate(" + source.x + "," + source.y + ")";
          }).remove();

          nodeExit.select("circle").attr("r", 1e-6);

          nodeExit.select("text").style("fill-opacity", 1e-6);

          // Update the links…
          var link = svg.selectAll("path.link").data(links, function (d) {
            return d.target.id;
          });

          // Enter any new links at the parent's previous position.
          link.enter().insert("path", "g").attr("class", "link").attr("d", function (d) {
            var o = { x: source.x0, y: source.y0 };
            return diagonal({ source: o, target: o });
          });

          // Transition links to their new position.
          link.transition().duration(duration).attr("d", diagonal);

          // Transition exiting nodes to the parent's new position.
          link.exit().transition().duration(duration).attr("d", function (d) {
            var o = { x: source.x, y: source.y };
            return diagonal({ source: o, target: o });
          }).remove();

          // Stash the old positions for transition.
          nodes.forEach(function (d) {
            d.x0 = d.x;
            d.y0 = d.y;
          });
        }

        // Toggle children on click.
        function click(d) {
          if (d.children) {
            d._children = d.children;
            d.children = null;
          } else {
            d.children = d._children;
            d._children = null;
          }
          update(d);
        }
      }); // end then
    }
  };
});

app.directive('sectionText', function () {
  return {
    restrict: 'EA',
    scope: {
      aiTitle: '@',
      aiText: '@'
    },
    templateUrl: 'directiveStore/section_text/section_text.html',
    link: function link(scope, elem, attr) {}
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiZG9jcy9kb2NzLmpzIiwiZGF0YXNvdXJjZXMvZGF0YXNvdXJjZXMuanMiLCJkYXRhc291cmNlcy9tb2RhbC5jb250cm9sbGVyLmpzIiwiZG93bmxvYWQvZG93bmxvYWQuanMiLCJmc2EvZnNhLXByZS1idWlsdC5qcyIsImxvZ2luL2xvZ2luLmpzIiwiaG9tZS9ob21lLmpzIiwicHJvamVjdHMvcHJvamVjdHMuY29uZmlnLmpzIiwicHJvamVjdHMvcHJvamVjdHMuY29udHJvbGxlci5qcyIsInByb2plY3RzL3Byb2plY3RzLmVkaXQuY29udHJvbGxlci5qcyIsInByb2plY3RzL3Byb2plY3RzLmZhY3RvcnkuanMiLCJzaWdudXAvc2lnbnVwLmpzIiwidXRpbGl0eS9kYXRhX2ludGVybmFsLmpzIiwidmlld2VyL3ZpZXdlci5qcyIsImNvbW1vbi9mYWN0b3JpZXMvUmFuZG9tR3JlZXRpbmdzLmpzIiwiY29tbW9uL2ZhY3Rvcmllcy9kYXRhRmFjdG9yeS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvdXNlci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2VkaXRvcl8yL2VkaXRvci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2ZpbGUtdXBsb2FkZXIvZmlsZS11cGxvYWRlci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2ZpbGUtdXBsb2FkZXJfYW0vZmlsZS11cGxvYWRlcl9hbS5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3JhbmRvLWdyZWV0aW5nL3JhbmRvLWdyZWV0aW5nLmpzIiwiYWlfYmxvY2txdW90ZS9haV9ibG9ja3F1b3RlLmpzIiwiYWlfc29jaWFsL2FpX3NvY2lhbC5qcyIsImFpX2NsaWNrX2ltZy9haV9jbGlja19pbWcuanMiLCJkM19mb3JjZV9pbWFnZXMvZDNfZm9yY2VfaW1hZ2VzLmpzIiwiZDNfZm9yY2VfYmFzaWMvZDNfZm9yY2VfYmFzaWMuanMiLCJkM19ib3N0b2NrX2ZvcmNlL2QzX2Jvc3RvY2tfZm9yY2UuanMiLCJob3Jpem9udGFsX2ZsYXJlL2hvcml6b250YWxfZmxhcmUuanMiLCJqdXN0YXRhYmxlL2p1c3RhdGFibGUuZGlyZWN0aXZlLmpzIiwibnZkM19iYXJfY2hhcnQvbnZkM19iYXJfY2hhcnQuanMiLCJmbGFyZV9sYXJza290dGhvZmYvZmxhcmVfbGFyc2tvdHRob2ZmLmpzIiwicGllX2dyYXBoX3RleHR1cmVzL3BpZV9ncmFwaF90ZXh0dXJlcy5qcyIsIm52ZDNfc2NhdHRlcl9jaGFydC9udmQzX3NjYXR0ZXJfY2hhcnQuanMiLCJwaWVfZ3JhcGhfdXNlcl9pbnB1dC9waWVfZ3JhcGhfdXNlcl9pbnB1dC5qcyIsInRpdGxlX3N1YnRpdGxlL3RpdGxlX3N1YnRpdGxlLmpzIiwic29sb190YWJsZS9zb2xvX3RhYmxlLmpzIiwidXNlcl9wcm9maWxlL3VzZXJfcHJvZmlsZS5qcyIsInZlcnRfZmxhcmUvdmVydF9mbGFyZS5qcyIsInNlY3Rpb25fdGV4dC9zZWN0aW9uX3RleHQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7QUFFQSxPQUFBLEdBQUEsR0FBQSxRQUFBLE1BQUEsQ0FBQSx1QkFBQSxFQUFBLENBQUEsYUFBQSxFQUFBLFdBQUEsRUFBQSxjQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQSxjQUFBLENBQUEsQ0FBQTs7QUFFQSxJQUFBLE1BQUEsQ0FBQSxVQUFBLGtCQUFBLEVBQUEsaUJBQUEsRUFBQTs7QUFFQSxvQkFBQSxTQUFBLENBQUEsSUFBQTs7QUFFQSxxQkFBQSxTQUFBLENBQUEsR0FBQTs7QUFFQSxxQkFBQSxJQUFBLENBQUEsaUJBQUEsRUFBQSxZQUFBO0FBQ0EsV0FBQSxRQUFBLENBQUEsTUFBQTtBQUNBLEdBRkE7QUFHQSxDQVRBOzs7QUFZQSxJQUFBLEdBQUEsQ0FBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOzs7QUFHQSxNQUFBLCtCQUFBLFNBQUEsNEJBQUEsQ0FBQSxLQUFBLEVBQUE7QUFDQSxXQUFBLE1BQUEsSUFBQSxJQUFBLE1BQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSxHQUZBOzs7O0FBTUEsYUFBQSxHQUFBLENBQUEsbUJBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsUUFBQSxFQUFBOztBQUVBLFFBQUEsQ0FBQSw2QkFBQSxPQUFBLENBQUEsRUFBQTs7O0FBR0E7QUFDQTs7QUFFQSxRQUFBLFlBQUEsZUFBQSxFQUFBLEVBQUE7OztBQUdBO0FBQ0E7OztBQUdBLFVBQUEsY0FBQTs7QUFFQSxnQkFBQSxlQUFBLEdBQUEsSUFBQSxDQUFBLFVBQUEsSUFBQSxFQUFBOzs7O0FBSUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxlQUFBLEVBQUEsQ0FBQSxRQUFBLElBQUEsRUFBQSxRQUFBO0FBQ0EsT0FGQSxNQUVBO0FBQ0EsZUFBQSxFQUFBLENBQUEsT0FBQTtBQUNBO0FBQ0EsS0FUQTtBQVdBLEdBNUJBO0FBOEJBLENBdkNBOztBQ2hCQSxJQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTs7O0FBR0EsaUJBQUEsS0FBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLFNBQUEsUUFEQTtBQUVBLGdCQUFBLGlCQUZBO0FBR0EsaUJBQUE7QUFIQSxHQUFBO0FBTUEsQ0FUQTs7QUFXQSxJQUFBLFVBQUEsQ0FBQSxpQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLENBSUEsQ0FKQTtBQ1hBLElBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0EsaUJBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLFNBQUEsT0FEQTtBQUVBLGlCQUFBO0FBRkEsR0FBQTtBQUlBLENBTEE7O0FDQUEsSUFBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxpQkFBQSxLQUFBLENBQUEsYUFBQSxFQUFBO0FBQ0EsU0FBQSxjQURBO0FBRUEsaUJBQUEsaUNBRkE7QUFHQSxnQkFBQSxjQUhBO0FBSUEsYUFBQTtBQUNBLGdCQUFBLGtCQUFBLGtCQUFBLEVBQUEsV0FBQSxFQUFBO0FBQ0EsZUFBQSxZQUFBLGVBQUEsR0FDQSxJQURBLENBQ0EsVUFBQSxJQUFBLEVBQUE7QUFDQSxjQUFBLElBQUEsRUFBQTtBQUNBLGdCQUFBLFNBQUEsS0FBQSxHQUFBO0FBQ0EsbUJBQUEsbUJBQUEsWUFBQSxDQUFBLE1BQUEsQ0FBQTtBQUNBO0FBQ0EsU0FOQSxDQUFBO0FBT0E7QUFUQTtBQUpBLEdBQUE7QUFnQkEsQ0FqQkE7O0FBbUJBLElBQUEsVUFBQSxDQUFBLGNBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxRQUFBLEVBQUEsU0FBQSxFQUFBO0FBQ0EsU0FBQSxRQUFBLEdBQUEsUUFBQTtBQUNBLFNBQUEsSUFBQSxHQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsUUFBQSxnQkFBQSxVQUFBLElBQUEsQ0FBQTtBQUNBLGtCQUFBLGlCQURBO0FBRUEsbUJBQUEsa0NBRkE7QUFHQSxlQUFBO0FBQ0EsY0FBQSxnQkFBQTtBQUNBLGlCQUFBLEtBQUE7QUFDQTtBQUhBO0FBSEEsS0FBQSxDQUFBO0FBU0EsR0FWQTtBQVdBLENBYkE7QUNuQkEsSUFBQSxVQUFBLENBQUEsaUJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxJQUFBLEVBQUEsaUJBQUEsRUFBQTtBQUNBLFNBQUEsSUFBQSxHQUFBLElBQUE7O0FBRUEsU0FBQSxLQUFBLEdBQUEsWUFBQTtBQUNBLHNCQUFBLEtBQUE7QUFDQSxHQUZBO0FBR0EsQ0FOQTtBQ0FBLElBQUEsU0FBQSxDQUFBLFlBQUEsRUFBQSxDQUFBLGlCQUFBLEVBQUEsVUFBQSxlQUFBLEVBQUE7QUFDQSxTQUFBO0FBQ0EsY0FBQSxHQURBO0FBRUEsaUJBQUEsNEJBRkE7QUFHQSxXQUFBLEdBSEE7QUFJQSxVQUFBLGNBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQTtBQUNBLFlBQUEsWUFBQSxHQUFBLFlBQUE7QUFDQSx3QkFBQSxPQUFBLENBQUEsTUFBQSxNQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsY0FBQSxhQUFBLElBQUEsSUFBQSxDQUFBLENBQUEsU0FBQSxJQUFBLENBQUEsRUFBQSxFQUFBLE1BQUEsV0FBQSxFQUFBLENBQUE7QUFDQSxpQkFBQSxVQUFBLEVBQUEsWUFBQTtBQUNBLFNBSkE7QUFLQSxPQU5BOztBQVFBLFlBQUEsVUFBQSxHQUFBLFlBQUE7QUFDQSx3QkFBQSxLQUFBLENBQUEsTUFBQSxNQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsTUFBQSxFQUFBO0FBQ0EsY0FBQSxXQUFBLElBQUEsSUFBQSxDQUFBLENBQUEsT0FBQSxJQUFBLENBQUEsRUFBQSxFQUFBLE1BQUEsd0JBQUEsRUFBQSxDQUFBO0FBQ0EsaUJBQUEsUUFBQSxFQUFBLFdBQUE7QUFDQSxTQUpBO0FBS0EsT0FOQTtBQU9BO0FBcEJBLEdBQUE7QUFzQkEsQ0F2QkEsQ0FBQTs7QUF5QkEsSUFBQSxPQUFBLENBQUEsaUJBQUEsRUFBQSxDQUFBLE9BQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLFNBQUE7QUFDQSxXQUFBLGVBQUEsRUFBQSxFQUFBO0FBQ0EsYUFBQSxNQUFBLEdBQUEsQ0FBQSx1QkFBQSxFQUFBLENBQUE7QUFDQSxLQUhBO0FBSUEsYUFBQSxpQkFBQSxFQUFBLEVBQUE7QUFDQSxhQUFBLE1BQUEsR0FBQSxDQUFBLHlCQUFBLEVBQUEsQ0FBQTtBQUNBO0FBTkEsR0FBQTtBQVFBLENBVEEsQ0FBQTtBQ3pCQSxDQUFBLFlBQUE7O0FBRUE7Ozs7QUFHQSxNQUFBLENBQUEsT0FBQSxPQUFBLEVBQUEsTUFBQSxJQUFBLEtBQUEsQ0FBQSx3QkFBQSxDQUFBOztBQUVBLE1BQUEsTUFBQSxRQUFBLE1BQUEsQ0FBQSxhQUFBLEVBQUEsRUFBQSxDQUFBOzs7OztBQU9BLE1BQUEsUUFBQSxDQUFBLGFBQUEsRUFBQTtBQUNBLGtCQUFBLG9CQURBO0FBRUEsaUJBQUEsbUJBRkE7QUFHQSxtQkFBQSxxQkFIQTtBQUlBLG9CQUFBLHNCQUpBO0FBS0Esc0JBQUEsd0JBTEE7QUFNQSxtQkFBQTtBQU5BLEdBQUE7O0FBU0EsTUFBQSxPQUFBLENBQUEsaUJBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxFQUFBLEVBQUEsV0FBQSxFQUFBO0FBQ0EsUUFBQSxhQUFBO0FBQ0EsV0FBQSxZQUFBLGdCQURBO0FBRUEsV0FBQSxZQUFBLGFBRkE7QUFHQSxXQUFBLFlBQUEsY0FIQTtBQUlBLFdBQUEsWUFBQTtBQUpBLEtBQUE7QUFNQSxXQUFBO0FBQ0EscUJBQUEsdUJBQUEsUUFBQSxFQUFBO0FBQ0EsbUJBQUEsVUFBQSxDQUFBLFdBQUEsU0FBQSxNQUFBLENBQUEsRUFBQSxRQUFBO0FBQ0EsZUFBQSxHQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUE7QUFDQTtBQUpBLEtBQUE7QUFNQSxHQWJBOztBQWVBLE1BQUEsTUFBQSxDQUFBLFVBQUEsYUFBQSxFQUFBO0FBQ0Esa0JBQUEsWUFBQSxDQUFBLElBQUEsQ0FBQSxDQUNBLFdBREEsRUFFQSxVQUFBLFNBQUEsRUFBQTtBQUNBLGFBQUEsVUFBQSxHQUFBLENBQUEsaUJBQUEsQ0FBQTtBQUNBLEtBSkEsQ0FBQTtBQU1BLEdBUEE7O0FBU0EsTUFBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLEVBQUEsRUFBQTs7QUFFQSxhQUFBLGlCQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsVUFBQSxPQUFBLFNBQUEsSUFBQTtBQUNBLGNBQUEsTUFBQSxDQUFBLEtBQUEsRUFBQSxFQUFBLEtBQUEsSUFBQTtBQUNBLGlCQUFBLFVBQUEsQ0FBQSxZQUFBLFlBQUE7QUFDQSxhQUFBLEtBQUEsSUFBQTtBQUNBOzs7O0FBSUEsU0FBQSxlQUFBLEdBQUEsWUFBQTtBQUNBLGFBQUEsQ0FBQSxDQUFBLFFBQUEsSUFBQTtBQUNBLEtBRkE7O0FBSUEsU0FBQSxlQUFBLEdBQUEsVUFBQSxVQUFBLEVBQUE7Ozs7Ozs7Ozs7QUFVQSxVQUFBLEtBQUEsZUFBQSxNQUFBLGVBQUEsSUFBQSxFQUFBO0FBQ0EsZUFBQSxHQUFBLElBQUEsQ0FB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QUE7QUFDQSxnQkFBQSxTQUFBLEtBQUEsR0FBQTtBQUNBLG1CQUFBLG1CQUFBLFlBQUEsQ0FBQSxNQUFBLENBQUE7QUFDQTtBQUVBLFNBUEEsQ0FBQTtBQVFBOzs7O0FBakJBO0FBSkEsR0FBQTtBQTJCQSxDQTVCQTs7QUE4QkEsSUFBQSxVQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFFBQUEsRUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLFdBQUEsRUFBQSxZQUFBLEVBQUEsY0FBQSxFQUFBLE1BQUEsRUFBQSxTQUFBLEVBQUEsYUFBQSxFQUFBLFFBQUEsRUFBQSxTQUFBLEVBQUE7QUFDQSxTQUFBLFFBQUEsR0FBQSxRQUFBO0FBQ0EsU0FBQSxLQUFBLEdBQUEsYUFBQSxFQUFBOzs7Ozs7Ozs7Ozs7Ozs7O0FBZ0JBLFNBQUEsUUFBQSxHQUFBLFVBQUEsRUFBQSxFQUFBO0FBQ0EsY0FBQSxJQUFBLENBQUEsRUFBQTtBQUNBO0FBQ0EsR0FIQTs7QUFLQSxTQUFBLE1BQUEsR0FBQSxZQUFBO0FBQ0EsV0FBQSxFQUFBLENBQUEsUUFBQTtBQUNBLEdBRkE7O0FBSUEsU0FBQSxVQUFBLEdBQUEsWUFBQTtBQUNBLFdBQUEsWUFBQSxlQUFBLEVBQUE7QUFDQSxHQUZBOztBQUlBLE1BQUEsVUFBQSxTQUFBLE9BQUEsR0FBQTtBQUNBLGdCQUFBLGVBQUEsR0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxhQUFBLElBQUEsR0FBQSxJQUFBO0FBQ0EsYUFBQSxJQUFBO0FBQ0EsS0FIQSxFQUdBLElBSEEsQ0FHQSxXQUhBO0FBSUEsR0FMQTtBQU1BLE1BQUEsY0FBQSxTQUFBLFdBQUEsQ0FBQSxJQUFBLEVBQUE7O0FBRUEsUUFBQSxJQUFBLEVBQUE7QUFDQSxxQkFBQSxZQUFBLENBQUEsT0FBQSxJQUFBLENBQUEsR0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLFFBQUEsRUFBQTtBQUNBLGVBQUEsUUFBQSxHQUFBLFFBQUE7QUFDQSxPQUhBO0FBSUE7QUFDQSxHQVJBOztBQVVBLFNBQUEsVUFBQSxHQUFBLFlBQUE7QUFDQSxRQUFBLFFBQUEsSUFBQTs7QUFFQSxRQUFBLFlBQUEsZUFBQSxFQUFBLEVBQUE7QUFDQSxjQUFBLE9BQUEsSUFBQTtBQUNBOztBQUVBLFdBQUEsZUFBQSxHQUFBLENBQUE7QUFDQSxZQUFBLE9BQUEsV0FEQTtBQUVBLFlBQUE7QUFGQSxLQUFBLEVBR0EsSUFIQSxDQUdBLFVBQUEsVUFBQSxFQUFBO0FBQ0EsYUFBQSxFQUFBLENBQUEsU0FBQSxFQUFBLEVBQUEsSUFBQSxXQUFBLEdBQUEsRUFBQTtBQUNBLEtBTEEsQ0FBQTtBQU1BLEdBYkE7QUFjQTtBQUNBLENBOURBO0FDOUJBLElBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0EsaUJBQ0EsS0FEQSxDQUNBLFNBREEsRUFDQTtBQUNBLFNBQUEsY0FEQTtBQUVBLGlCQUFBLGdDQUZBO0FBR0EsZ0JBQUEsaUJBSEE7QUFJQSxhQUFBO0FBQ0EsZUFBQSxpQkFBQSxjQUFBLEVBQUEsWUFBQSxFQUFBO0FBQ0EsZUFBQSxlQUFBLE1BQUEsQ0FBQSxhQUFBLEVBQUEsQ0FBQTtBQUNBLE9BSEE7QUFJQSxpQkFBQSxtQkFBQSxrQkFBQSxFQUFBLFlBQUEsRUFBQTtBQUNBLGVBQUEsbUJBQUEsWUFBQSxDQUFBLGFBQUEsRUFBQSxDQUFBO0FBQ0E7QUFOQTtBQUpBLEdBREE7QUFjQSxDQWZBOztBQ0NBLElBQUEsVUFBQSxDQUFBLGtCQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsUUFBQSxFQUFBLFFBQUEsRUFBQSxPQUFBLEVBQUEsU0FBQSxFQUFBLGVBQUEsRUFBQSxZQUFBLEVBQUEsV0FBQSxFQUFBLGNBQUEsRUFBQSxNQUFBLEVBQUE7Ozs7Ozs7O0FBUUEsU0FBQSxNQUFBLEdBQUEsYUFBQSxFQUFBO0FBQ0EsTUFBQSxZQUFBLFNBQUEsU0FBQSxHQUFBO0FBQ0EsZ0JBQUEsZUFBQSxHQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLGFBQUEsTUFBQSxHQUFBLEtBQUEsR0FBQTtBQUNBLEtBRkE7QUFHQSxHQUpBO0FBS0E7OztBQUdBLFNBQUEsYUFBQSxHQUFBLFNBQUE7QUFDQSxTQUFBLFdBQUEsR0FBQSxVQUFBLElBQUEsRUFBQSxRQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxJQUFBO0FBQ0EsV0FBQSxPQUFBLEdBQUEsWUFBQSxTQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsSUFBQSxFQUFBO0FBQ0EsV0FBQSxNQUFBLEdBQUEsT0FBQSxNQUFBLENBQUE7QUFDQSxhQUFBLGVBQUEsT0FBQSxNQUFBLEdBQUEsR0FBQSxHQUFBLE9BQUEsTUFEQTtBQUVBLGNBQUEsRUFBQSxNQUFBLElBQUEsRUFGQTtBQUdBLGdCQUFBO0FBSEEsT0FBQSxDQUFBOztBQU1BLFdBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLGlCQUFBLFlBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxTQUFBLElBQUE7QUFDQSxpQkFBQSxhQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsTUFBQTtBQUNBLGtCQUFBLEdBQUEsQ0FBQSxPQUFBLGFBQUE7QUFDQSxTQUpBO0FBS0EsT0FOQSxFQU1BLFVBQUEsUUFBQSxFQUFBO0FBQ0EsWUFBQSxTQUFBLE1BQUEsR0FBQSxDQUFBLEVBQ0EsT0FBQSxRQUFBLEdBQUEsU0FBQSxNQUFBLEdBQUEsSUFBQSxHQUFBLFNBQUEsSUFBQTtBQUNBLE9BVEEsRUFTQSxVQUFBLEdBQUEsRUFBQTtBQUNBLGFBQUEsUUFBQSxHQUFBLEtBQUEsR0FBQSxDQUFBLEdBQUEsRUFBQSxTQUFBLFFBQ0EsSUFBQSxNQURBLEdBQ0EsSUFBQSxLQURBLENBQUEsQ0FBQTtBQUVBLE9BWkE7QUFhQTtBQUNBLEdBeEJBOzs7QUEyQkEsU0FBQSxrQkFBQSxHQUFBLFlBQUEsQ0FBQSxDQUFBOzs7QUFJQSxTQUFBLFlBQUEsR0FBQSxFQUFBO0FBQ0EsU0FBQSxlQUFBLEdBQUEsRUFBQSxDO0FBQ0EsU0FBQSx1QkFBQSxHQUFBLEVBQUE7QUFDQSxTQUFBLGlCQUFBLEdBQUEsRUFBQSxDO0FBQ0EsU0FBQSxtQkFBQSxHQUFBLEVBQUEsQztBQUNBLFNBQUEsMEJBQUEsR0FBQSxFQUFBO0FBQ0EsU0FBQSxVQUFBLEdBQUEsRUFBQTtBQUNBLFNBQUEsZ0JBQUEsR0FBQSxHQUFBO0FBQ0EsU0FBQSxhQUFBLEdBQUEsV0FBQTs7QUFFQSxTQUFBLHFCQUFBLEdBQUEsQ0FBQSxFQUFBLFNBQUEsR0FBQSxFQUFBLEVBQUEsRUFBQSxTQUFBLEdBQUEsRUFBQSxFQUFBLEVBQUEsU0FBQSxHQUFBLEVBQUEsRUFBQSxFQUFBLFNBQUEsR0FBQSxFQUFBLEVBQUEsRUFBQSxTQUFBLEdBQUEsRUFBQSxFQUFBLEVBQUEsU0FBQSxHQUFBLEVBQUEsRUFBQSxFQUFBLFNBQUEsR0FBQSxFQUFBLEVBQUEsRUFBQSxTQUFBLEdBQUEsRUFBQSxFQUFBLEVBQUEsU0FBQSxHQUFBLEVBQUEsRUFBQSxFQUFBLFNBQUEsSUFBQSxFQUFBLEVBQUEsRUFBQSxTQUFBLElBQUEsRUFBQSxFQUFBLEVBQUEsU0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLFNBQUEsbUJBQUEsR0FBQSxDQUFBLEVBQUEsUUFBQSxNQUFBLEVBQUEsRUFBQSxFQUFBLFFBQUEsT0FBQSxFQUFBLENBQUE7QUFDQSxTQUFBLGdCQUFBLEdBQUEsRUFBQTtBQUNBLFNBQUEsUUFBQSxHQUFBLEdBQUE7QUFDQSxTQUFBLE9BQUEsR0FBQSxHQUFBO0FBQ0EsU0FBQSxVQUFBLEdBQUEsR0FBQTtBQUNBLFNBQUEsWUFBQSxHQUFBLEVBQUE7O0FBRUEsa0JBQUEsTUFBQSxHQUNBLElBREEsQ0FDQSxVQUFBLElBQUEsRUFBQTtBQUNBLFdBQUEsWUFBQSxHQUFBLEtBQUEsSUFBQTtBQUNBLEdBSEE7OztBQU1BLFNBQUEsZ0JBQUEsR0FBQTtBQUNBLGtCQUFBLElBREE7QUFFQSx1QkFBQSxRQUZBO0FBR0EsdUJBQUEsU0FIQTtBQUlBLDZCQUFBO0FBQ0EsZ0JBQUEsc0JBREE7QUFFQSxxQkFBQSxFQUZBO0FBR0EseUJBQUE7QUFIQTtBQUpBLEdBQUE7O0FBV0EsU0FBQSxlQUFBLEdBQUE7QUFDQSxrQkFBQSxJQURBO0FBRUEsdUJBQUEsUUFGQTtBQUdBLHVCQUFBLFFBSEE7QUFJQSw2QkFBQTtBQUNBLGdCQUFBLHNCQURBO0FBRUEsZUFBQSxFQUZBO0FBR0EsZUFBQSxFQUhBO0FBSUEsMkJBQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxJQUFBLEVBQUEsUUFBQSxNQUFBLEVBQUEsY0FBQSxPQUFBLEVBQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxJQUFBLEVBQUEsUUFBQSxNQUFBLEVBQUEsY0FBQSxRQUFBLEVBQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxJQUFBLEVBQUEsUUFBQSxNQUFBLEVBQUEsY0FBQSxRQUFBLEVBQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxJQUFBLEVBQUEsUUFBQSxNQUFBLEVBQUEsY0FBQSxTQUFBLEVBQUE7QUFKQTtBQUpBLEdBQUE7O0FBWUEsU0FBQSxrQkFBQSxHQUFBO0FBQ0Esa0JBQUEsSUFEQTtBQUVBLHVCQUFBLFFBRkE7QUFHQSx1QkFBQSxRQUhBO0FBSUEsNkJBQUE7QUFDQSxnQkFBQSxzQkFEQTtBQUVBLGFBQUEsRUFGQTtBQUdBLGFBQUEsRUFIQTtBQUlBLDJCQUFBLEVBQUEsTUFBQSxFQUFBLFdBQUEsSUFBQSxFQUFBLFFBQUEsTUFBQSxFQUFBLGNBQUEsT0FBQSxFQUFBLEVBQUEsTUFBQSxFQUFBLFdBQUEsSUFBQSxFQUFBLFFBQUEsTUFBQSxFQUFBLGNBQUEsUUFBQSxFQUFBLEVBQUEsTUFBQSxFQUFBLFdBQUEsSUFBQSxFQUFBLFFBQUEsTUFBQSxFQUFBLGNBQUEsUUFBQSxFQUFBLEVBQUEsTUFBQSxFQUFBLFdBQUEsSUFBQSxFQUFBLFFBQUEsTUFBQSxFQUFBLGNBQUEsU0FBQSxFQUFBLEVBSkE7QUFLQSw0QkFBQSxFQUFBLE1BQUEsRUFBQSxXQUFBLElBQUEsRUFBQSxjQUFBLE9BQUEsRUFBQSxRQUFBLElBQUEsRUFBQSxFQUFBLE1BQUEsRUFBQSxXQUFBLElBQUEsRUFBQSxjQUFBLFFBQUEsRUFBQSxRQUFBLElBQUEsRUFBQSxFQUFBLE1BQUEsRUFBQSxXQUFBLElBQUEsRUFBQSxjQUFBLFFBQUEsRUFBQSxRQUFBLEdBQUEsRUFBQSxFQUFBLE1BQUEsRUFBQSxXQUFBLElBQUEsRUFBQSxjQUFBLFNBQUEsRUFBQSxRQUFBLEdBQUEsRUFBQTs7QUFMQSxLQUpBO0FBWUEsZ0JBQUE7QUFaQSxHQUFBOztBQWVBLFNBQUEsZ0JBQUEsQ0FBQSxDQUFBLElBQUEsT0FBQSxnQkFBQTtBQUNBLFNBQUEsZ0JBQUEsQ0FBQSxDQUFBLElBQUEsT0FBQSxlQUFBOzs7O0FBSUEsU0FBQSxXQUFBLEdBQUEsWUFBQTtBQUNBLFFBQUE7QUFDQSxhQUFBLFFBQUEsR0FBQSxDQUFBO0FBQ0EsV0FBQSxJQUFBLEdBQUEsSUFBQSxPQUFBLFNBQUEsQ0FBQSxLQUFBLEVBQUE7QUFDQSxlQUFBLFFBQUE7QUFDQTtBQUNBLEtBTEEsQ0FLQSxPQUFBLENBQUEsRUFBQSxDQUFBO0FBQ0EsR0FQQTs7O0FBVUEsU0FBQSxVQUFBLEdBQUEsWUFBQTtBQUNBLFFBQUE7QUFDQSxhQUFBLFdBQUE7QUFDQSxhQUFBLE9BQUEsR0FBQSxDQUFBO0FBQ0EsV0FBQSxJQUFBLEdBQUEsSUFBQSxPQUFBLFNBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxPQUFBLFFBQUEsRUFBQSxJQUFBLEVBQUE7QUFDQSxlQUFBLE9BQUE7QUFDQTtBQUNBLEtBTkEsQ0FNQSxPQUFBLENBQUEsRUFBQSxDQUFBO0FBQ0EsR0FSQTs7O0FBV0EsU0FBQSxhQUFBLEdBQUEsWUFBQTtBQUNBLFdBQUEsVUFBQTtBQUNBLFdBQUEsVUFBQSxHQUFBLENBQUE7QUFDQSxZQUFBLEdBQUEsQ0FBQSxPQUFBLFNBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxPQUFBLFFBQUEsRUFBQSxJQUFBLENBQUEsU0FBQSxPQUFBLE9BQUEsQ0FBQTtBQUNBLFNBQUEsSUFBQSxHQUFBLElBQUEsT0FBQSxTQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsT0FBQSxRQUFBLEVBQUEsSUFBQSxDQUFBLFNBQUEsT0FBQSxPQUFBLEVBQUEsTUFBQSxDQUFBLEVBQUE7QUFDQSxhQUFBLFVBQUE7QUFDQSxjQUFBLEdBQUEsQ0FBQSxHQUFBO0FBQ0E7QUFDQSxHQVJBOzs7O0FBWUEsU0FBQSxzQkFBQSxHQUFBLFVBQUEsWUFBQSxFQUFBO0FBQ0EsV0FBQSwwQkFBQSxHQUFBLFlBQUEsQztBQUNBLFlBQUEsSUFBQSxDQUFBLFlBQUEsRUFBQSxPQUFBLGlCQUFBO0FBQ0EsR0FIQTs7O0FBTUEsU0FBQSxRQUFBLEdBQUEsWUFBQTtBQUNBLFlBQUEsSUFBQSxDQUFBLE9BQUEsaUJBQUEsRUFBQSxPQUFBLDBCQUFBO0FBQ0EsV0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxPQUFBLFNBQUE7QUFDQSxRQUFBLE9BQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLEdBQUEsT0FBQSxZQUFBLEVBQUE7QUFDQSxhQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsWUFBQSxFQUFBLE9BQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBO0FBQ0E7QUFDQSxtQkFBQSxNQUFBLENBQUEsT0FBQSxPQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsTUFBQSxFQUFBLENBQ0EsQ0FGQTtBQUdBLEdBVEE7O0FBYUEsU0FBQSxhQUFBLEdBQUEsWUFBQTtBQUNBLFlBQUEsSUFBQSxDQUFBLEVBQUEsRUFBQSxPQUFBLDBCQUFBO0FBQ0EsV0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxPQUFBLFNBQUE7QUFDQSxRQUFBLE9BQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLEdBQUEsT0FBQSxZQUFBLEVBQUE7QUFDQSxhQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsWUFBQSxFQUFBLE9BQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBO0FBQ0E7QUFDQSxtQkFBQSxNQUFBLENBQUEsT0FBQSxPQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsTUFBQSxFQUFBLENBQ0EsQ0FGQTtBQUdBLEdBVEE7QUFVQSxTQUFBLFFBQUEsR0FBQSxZQUFBO0FBQ0EsWUFBQSxJQUFBLENBQUEsRUFBQSxFQUFBLE9BQUEsMEJBQUE7QUFDQSxXQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLE9BQUEsU0FBQTtBQUNBLFFBQUEsT0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsR0FBQSxPQUFBLFlBQUEsRUFBQTtBQUNBLGFBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxZQUFBLEVBQUEsT0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUE7QUFDQTtBQUNBLG1CQUFBLE1BQUEsQ0FBQSxPQUFBLE9BQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxNQUFBLEVBQUEsQ0FDQSxDQUZBO0FBR0EsR0FUQTs7O0FBWUEsU0FBQSxtQkFBQSxHQUFBLFVBQUEsSUFBQSxFQUFBLEdBQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxFQUFBOztBQUVBLFFBQUEsU0FBQSxDQUFBLEVBQUE7QUFDQSxrQkFBQSxpQkFBQSxHQUFBLElBQUE7QUFDQSxrQkFBQSxnQkFBQSxHQUFBLEdBQUE7QUFDQSxrQkFBQSxnQkFBQSxHQUFBLE1BQUE7QUFDQSxhQUFBLFdBQUE7QUFDQSxLQUxBLE1BS0EsSUFBQSxNQUFBLENBQUEsRUFBQTtBQUNBLGtCQUFBLGlCQUFBLEdBQUEsSUFBQTtBQUNBLGtCQUFBLGdCQUFBLEdBQUEsR0FBQTtBQUNBLGtCQUFBLGdCQUFBLEdBQUEsRUFBQTtBQUNBLGFBQUEsV0FBQTtBQUNBLEtBTEEsTUFLQSxJQUFBLE9BQUEsQ0FBQSxFQUFBOztBQUVBLGtCQUFBLGlCQUFBLEdBQUEsSUFBQTtBQUNBLGtCQUFBLGdCQUFBLEdBQUEsRUFBQTtBQUNBLGtCQUFBLGdCQUFBLEdBQUEsRUFBQTtBQUNBLGFBQUEsV0FBQTtBQUNBO0FBQ0EsR0FuQkE7OztBQXNCQSxTQUFBLHFCQUFBLEdBQUEsVUFBQSxHQUFBLEVBQUE7QUFDQSxRQUFBLGtCQUFBLEVBQUE7QUFDQSxRQUFBLGdCQUFBLGNBQUE7QUFDQSxTQUFBLElBQUEsVUFBQSxJQUFBLEdBQUEsRUFBQTtBQUNBLFVBQUEsV0FBQSxPQUFBLENBQUEsb0JBQUEsSUFBQSxDQUFBLENBQUEsRUFBQTtBQUNBLGFBQUEsSUFBQSxRQUFBLElBQUEsSUFBQSxVQUFBLENBQUEsRUFBQTtBQUNBLGtCQUFBLEdBQUEsQ0FBQSxRQUFBO0FBQ0EsMkJBQUEsVUFBQSxRQUFBLEdBQUEsR0FBQSxHQUFBLElBQUEsVUFBQSxFQUFBLFFBQUEsRUFBQSxNQUFBLENBQUEsR0FBQSxXQUFBO0FBQ0Esa0JBQUEsR0FBQSxDQUFBLGFBQUE7QUFDQTtBQUNBLE9BTkEsTUFNQSxJQUFBLFdBQUEsT0FBQSxDQUFBLG1CQUFBLElBQUEsQ0FBQSxDQUFBLEVBQUE7QUFDQSxhQUFBLElBQUEsUUFBQSxJQUFBLElBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxrQkFBQSxHQUFBLENBQUEsUUFBQTtBQUNBLGNBQUEsSUFBQSxVQUFBLEVBQUEsUUFBQSxFQUFBLE1BQUEsS0FBQSxPQUFBLEVBQUE7QUFDQSw2QkFBQSxhQUFBLFFBQUEsR0FBQSxXQUFBO0FBQ0E7QUFDQTtBQUNBLE9BUEEsTUFPQTtBQUNBLDJCQUFBLGFBQUEsSUFBQSxHQUFBLElBQUEsVUFBQSxDQUFBLEdBQUEsSUFBQTtBQUNBO0FBQ0E7QUFDQSxxQkFBQSw0QkFBQTtBQUNBLHVCQUFBLGFBQUE7QUFDQSxZQUFBLEdBQUEsQ0FBQSxlQUFBO0FBQ0EsV0FBQSxlQUFBO0FBQ0EsR0F6QkE7OztBQTRCQSxTQUFBLDBCQUFBLEdBQUEsVUFBQSxHQUFBLEVBQUE7QUFDQSxRQUFBLElBQUEsY0FBQSxDQUFBLGNBQUEsQ0FBQSxFQUFBO0FBQ0EsVUFBQSxJQUFBLGlCQUFBLEtBQUEsUUFBQSxJQUFBLElBQUEsbUJBQUEsTUFBQSxTQUFBLEVBQUE7QUFDQSxnQkFBQSxPQUFBLENBQUEsUUFBQSxFQUFBLE1BQUEsQ0FBQSxTQUFBLE1BQUEsSUFBQSxtQkFBQSxDQUFBLEdBQUEsU0FBQSxHQUFBLElBQUEsbUJBQUEsQ0FBQSxHQUFBLEtBQUEsR0FBQSxJQUFBLGtCQUFBLENBQUEsR0FBQSxXQUFBLEdBQUEsT0FBQSxxQkFBQSxDQUFBLElBQUEseUJBQUEsQ0FBQSxDQUFBLEdBQUEsS0FBQSxHQUFBLElBQUEsbUJBQUEsQ0FBQSxHQUFBLEdBQUEsRUFBQSxNQUFBLENBQUE7QUFDQTtBQUNBO0FBQ0EsU0FBQSxJQUFBLFFBQUEsSUFBQSxHQUFBLEVBQUE7QUFDQSxVQUFBLFFBQUEsSUFBQSxRQUFBLENBQUEsS0FBQSxRQUFBLEVBQUE7QUFDQSxlQUFBLDBCQUFBLENBQUEsSUFBQSxRQUFBLENBQUE7QUFDQTtBQUNBO0FBQ0EsR0FYQTs7O0FBY0EsU0FBQSx5QkFBQSxHQUFBLFVBQUEsR0FBQSxFQUFBO0FBQ0EsWUFBQSxHQUFBLENBQUEsR0FBQTtBQUNBLFFBQUEsSUFBQSxjQUFBLENBQUEsY0FBQSxDQUFBLEVBQUE7QUFDQSxVQUFBLElBQUEsaUJBQUEsS0FBQSxRQUFBLElBQUEsSUFBQSxtQkFBQSxNQUFBLFFBQUEsRUFBQTtBQUNBLGdCQUFBLE9BQUEsQ0FBQSxRQUFBLEVBQUEsTUFBQSxDQUFBLFNBQUEsWUFBQSxPQUFBLHFCQUFBLENBQUEsSUFBQSx5QkFBQSxDQUFBLENBQUEsR0FBQSwyQ0FBQSxHQUFBLElBQUEsbUJBQUEsQ0FBQSxHQUFBLEtBQUEsR0FBQSxJQUFBLGtCQUFBLENBQUEsR0FBQSxxREFBQSxHQUFBLElBQUEsbUJBQUEsQ0FBQSxHQUFBLEtBQUEsR0FBQSxJQUFBLGtCQUFBLENBQUEsR0FBQSxxTUFBQSxHQUFBLElBQUEsbUJBQUEsQ0FBQSxHQUFBLEtBQUEsR0FBQSxJQUFBLGtCQUFBLENBQUEsR0FBQSwyREFBQSxHQUFBLElBQUEsbUJBQUEsQ0FBQSxHQUFBLEtBQUEsR0FBQSxJQUFBLGtCQUFBLENBQUEsR0FBQSx1QkFBQSxFQUFBLE1BQUEsQ0FBQTs7QUFFQTtBQUNBO0FBQ0EsU0FBQSxJQUFBLFFBQUEsSUFBQSxHQUFBLEVBQUE7QUFDQSxVQUFBLFFBQUEsSUFBQSxRQUFBLENBQUEsS0FBQSxRQUFBLEVBQUE7QUFDQSxlQUFBLHlCQUFBLENBQUEsSUFBQSxRQUFB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QSxDQUFBLEtBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQSxNQUFBLEVBQUEsU0FBQSxHQUFBLEVBQUEsTUFBQSxFQUFBLGNBQUEsQ0FBQSxTQUFBLE1BQUEsQ0FBQSxFQUFBO0FBQ0EsZUFBQSxPQUFBLFNBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxJQUFBLEVBQUEsTUFBQSxFQUFBLFNBQUEsR0FBQSxFQUFBLE1BQUEsRUFBQSxTQUFBLE1BQUEsRUFBQSxZQUFBLElBQUEsRUFBQTtBQUNBO0FBQ0EsS0FKQSxNQUlBLElBQUEsTUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLE9BQUEsU0FBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQSxNQUFBLEVBQUEsU0FBQSxHQUFBLEVBQUEsY0FBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBO0FBQUEsZUFBQSxTQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsSUFBQSxFQUFBLE1BQUEsRUFBQSxTQUFBLEdBQUEsRUFBQSxNQUFBLElBQUEsRUFBQTtBQUFBO0FBQ0EsYUFBQSxPQUFBLFNBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxJQUFBLEVBQUEsTUFBQSxFQUFBLFNBQUEsR0FBQSxFQUFBLE1BQUEsRUFBQSxTQUFBLE1BQUEsSUFBQSxFQUFBO0FBQ0EsS0FIQSxNQUdBLElBQUEsR0FBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLE9BQUEsU0FBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQSxjQUFBLENBQUEsTUFBQSxDQUFBLEVBQUE7QUFBQSxlQUFBLFNBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxJQUFBLEVBQUEsTUFBQSxJQUFBLEVBQUE7QUFBQTtBQUNBLGFBQUEsT0FBQSxTQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsSUFBQSxFQUFBLE1BQUEsRUFBQSxTQUFBLEdBQUEsSUFBQSxFQUFBO0FBQ0EsS0FIQSxNQUdBLElBQUEsSUFBQSxFQUFBO0FBQ0EsVUFBQSxDQUFBLE9BQUEsU0FBQSxDQUFBLEtBQUEsQ0FBQSxjQUFBLENBQUEsT0FBQSxDQUFBLEVBQUE7QUFBQSxlQUFBLFNBQUEsQ0FBQSxLQUFBLEdBQUEsRUFBQTtBQUFBO0FBQ0EsYUFBQSxPQUFBLFNBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxJQUFBLElBQUEsRUFBQTtBQUNBO0FBQ0EsR0FmQTs7O0FBa0JBLFNBQUEsVUFBQSxHQUFBLFVBQUEsSUFBQSxFQUFBLFFBQUEsRUFBQTs7O0FBR0EsV0FBQSxZQUFBLEdBQUEsT0FBQSxnQkFBQSxDQUFBLENBQUEsQ0FBQTs7Ozs7QUFLQSxZQUFBLEdBQUEsQ0FBQSxPQUFBLG1CQUFBLENBQUEsQ0FBQSxFQUFBLEVBQUEsRUFBQSxFQUFBLEVBQUEsUUFBQSxDQUFBO0FBQ0EsV0FBQSxpQkFBQSxDQUFBLE9BQUEsWUFBQSxFQUFBLE9BQUEsbUJBQUEsQ0FBQSxJQUFBLEVBQUEsRUFBQSxFQUFBLEVBQUEsRUFBQSxRQUFBLENBQUE7QUFDQSxHQVZBOztBQVlBLFNBQUEsU0FBQSxHQUFBLFVBQUEsSUFBQSxFQUFBLEdBQUEsRUFBQSxRQUFBLEVBQUE7QUFDQSxZQUFBLEdBQUEsQ0FBQSxJQUFBLEVBQUEsR0FBQTs7QUFFQSxXQUFBLFlBQUEsR0FBQSxPQUFBLGdCQUFBLENBQUEsSUFBQSxFQUFBLEdBQUEsQ0FBQTs7Ozs7O0FBTUEsWUFBQSxHQUFBLENBQUEsT0FBQSxtQkFBQSxDQUFBLElBQUEsRUFBQSxHQUFBLEVBQUEsRUFBQSxFQUFBLFFBQUEsQ0FBQTtBQUNBLFdBQUEsaUJBQUEsQ0FBQSxPQUFBLFlBQUEsRUFBQSxPQUFBLG1CQUFBLENBQUEsSUFBQSxFQUFBLEdBQUEsRUFBQSxFQUFBLEVBQUEsUUFBQSxDQUFBO0FBQ0EsR0FYQTtBQVlBLFNBQUEsWUFBQSxHQUFBLFVBQUEsSUFBQSxFQUFBLEdBQUEsRUFBQSxNQUFBLEVBQUEsUUFBQSxFQUFBOzs7QUFHQSxXQUFBLFlBQUEsR0FBQSxPQUFBLGdCQUFBLENBQUEsSUFBQSxFQUFBLEdBQUEsRUFBQSxNQUFBLENBQUE7Ozs7O0FBS0EsWUFBQSxHQUFBLENBQUEsT0FBQSxZQUFBO0FBQ0EsV0FBQSxpQkFBQSxDQUFBLE9BQUEsWUFBQSxFQUFBLE9BQUEsbUJBQUEsQ0FBQSxJQUFBLEVBQUEsR0FBQSxFQUFBLE1BQUEsRUFBQSxRQUFBLENBQUE7QUFDQSxHQVZBOztBQVlBLFNBQUEsZUFBQSxHQUFBLFVBQUEsSUFBQSxFQUFBLEdBQUEsRUFBQSxNQUFBLEVBQUEsUUFBQSxFQUFBOzs7QUFHQSxXQUFBLFlBQUEsR0FBQSxPQUFBLGdCQUFBLENBQUEsSUFBQSxFQUFBLEdBQUEsRUFBQSxNQUFBLEVBQUEsTUFBQSxDQUFBOzs7OztBQUtBLFlBQUEsR0FBQSxDQUFBLE9BQUEsWUFBQTtBQUNBLFdBQUEsaUJBQUEsQ0FBQSxPQUFBLFlBQUEsRUFBQSxPQUFBLG1CQUFBLENBQUEsSUFBQSxFQUFBLEdBQUEsRUFBQSxNQUFBLEVBQUEsUUFBQSxDQUFBO0FBQ0EsV0FBQSxzQkFBQSxDQUFBLE9BQUEsWUFBQTtBQUNBLEdBWEE7O0FBYUEsU0FBQSxTQUFBLEdBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxZQUFBLEdBQUEsQ0FBQSxhQUFBLEVBQUEsUUFBQTs7QUFFQSxRQUFBLFNBQUEsaUJBQUEsS0FBQSxRQUFBLEVBQUE7QUFDQSxVQUFBLFNBQUEsaUJBQUEsS0FBQSxTQUFBLEVBQUE7QUFDQSxlQUFBLFVBQUEsQ0FBQSxPQUFBLFFBQUEsR0FBQSxDQUFBLEVBQUEsUUFBQTtBQUNBLE9BRkEsTUFFQSxJQUFBLFNBQUEsaUJBQUEsS0FBQSxRQUFBLEVBQUE7QUFDQSxlQUFBLFNBQUEsQ0FBQSxPQUFBLFFBQUEsRUFBQSxPQUFBLE9BQUEsR0FBQSxDQUFBLEVBQUEsUUFBQTtBQUNBLE9BRkEsTUFFQSxJQUFBLFNBQUEsaUJBQUEsS0FBQSxRQUFBLEVBQUE7QUFDQSxlQUFBLFlBQUEsQ0FBQSxPQUFBLFFBQUEsRUFBQSxPQUFBLE9BQUEsRUFBQSxPQUFBLFVBQUEsR0FBQSxDQUFBLEVBQUEsUUFBQTtBQUNBO0FBQ0EsS0FSQSxNQVFBO0FBQ0EsYUFBQSxZQUFBLENBQUEsT0FBQSxRQUFBLEVBQUEsT0FBQSxPQUFBLEVBQUEsT0FBQSxVQUFBLEdBQUEsQ0FBQSxFQUFBLE9BQUEsa0JBQUE7QUFDQSxlQUFBLFlBQUE7QUFDQSxlQUFBLGVBQUEsQ0FBQSxPQUFBLFFBQUEsRUFBQSxPQUFBLE9BQUEsRUFBQSxPQUFBLFVBQUEsRUFBQSxRQUFBO0FBQ0EsZUFBQSxnQkFBQSxDQUFBLE9BQUEsT0FBQSxRQUFBLEdBQUEsS0FBQSxHQUFBLE9BQUEsT0FBQSxHQUFBLEtBQUEsR0FBQSxPQUFBLFVBQUEsR0FBQSxTQUFBO0FBQ0EsZUFBQSxhQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsS0FBQTtBQUNBLE9BTEEsRUFLQSxJQUxBO0FBTUE7QUFDQSxXQUFBLE1BQUEsR0FBQSxLQUFBO0FBQ0EsV0FBQSxPQUFBLEdBQUEsSUFBQTtBQUNBLEdBdEJBOztBQXdCQSxTQUFBLE9BQUEsR0FBQSxPQUFBLEM7QUFDQSxXQUFBLFlBQUE7QUFDQSxRQUFBLE9BQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLE1BQUEsU0FBQSxFQUFBOztBQUVBLGFBQUEsU0FBQSxHQUFBO0FBQ0Esc0JBQUEsY0FEQTtBQUVBLGVBQUE7QUFGQSxPQUFBO0FBSUEsS0FOQSxNQU1BO0FBQ0EsYUFBQSxTQUFBLEdBQUEsRUFBQTtBQUNBLGNBQUEsSUFBQSxDQUFBLE9BQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxDQUFBLENBQUEsRUFBQSxPQUFBLFNBQUE7QUFDQTtBQUNBLEdBWEEsRUFXQSxHQVhBOzs7QUFjQSxTQUFBLE1BQUEsQ0FBQSxXQUFBLEVBQUEsWUFBQTtBQUNBLFlBQUEsT0FBQSxDQUFBLFFBQUEsRUFBQSxLQUFBO0FBQ0EsV0FBQSx5QkFBQSxDQUFBLE9BQUEsU0FBQSxFQUFBLEVBQUE7QUFDQSxhQUFBLFlBQUE7QUFDQSxhQUFBLHlCQUFBLENBQUEsT0FBQSxTQUFBLEVBQUEsRUFBQTtBQUNBLEtBRkEsRUFFQSxHQUZBO0FBR0EsYUFBQSxZQUFBO0FBQ0EsYUFBQSwrQkFBQSxDQUFBLE9BQUEsU0FBQSxFQUFBLEVBQUE7QUFDQSxhQUFBLGFBQUE7QUFDQSxhQUFBLDhCQUFBLENBQUEsT0FBQSxTQUFBLEVBQUEsRUFBQTtBQUdBLEtBTkEsRUFNQSxHQU5BO0FBT0EsR0FiQSxFQWFBLElBYkE7O0FBZUEsU0FBQSxnQkFBQSxHQUFBLFVBQUEsRUFBQSxFQUFBO0FBQ0EsUUFBQSxPQUFBLE9BQUEsYUFBQSxFQUFBO0FBQ0EsYUFBQSxJQUFBO0FBQ0EsS0FGQSxNQUVBO0FBQ0EsYUFBQSxLQUFBO0FBQ0E7QUFDQSxHQU5BOztBQVFBLFNBQUEsZ0JBQUEsR0FBQSxVQUFBLEVBQUEsRUFBQTtBQUNBLFdBQUEsYUFBQSxHQUFBLEVBQUE7QUFDQSxHQUZBOztBQUlBLFNBQUEsNkJBQUEsR0FBQSxVQUFBLEdBQUEsRUFBQSxTQUFBLEVBQUE7QUFDQSxRQUFBLElBQUEsY0FBQSxDQUFBLGNBQUEsQ0FBQSxFQUFBO0FBQ0EsVUFBQSxJQUFBLGlCQUFBLEtBQUEsUUFBQSxFQUFBO0FBQ0EsWUFBQSxjQUFBLE9BQUEsSUFBQSxtQkFBQSxDQUFBLEdBQUEsVUFBQTtBQUNBLFlBQUEsY0FBQSxPQUFBLElBQUEsbUJBQUEsQ0FBQSxHQUFBLEtBQUEsR0FBQSxJQUFBLGtCQUFBLENBQUEsR0FBQSxTQUFBO0FBQ0EsWUFBQSxjQUFBLE9BQUEsSUFBQSxtQkFBQSxDQUFBLEdBQUEsS0FBQSxHQUFBLElBQUEsa0JBQUEsQ0FBQSxHQUFBLEtBQUEsR0FBQSxJQUFBLGtCQUFBLENBQUEsR0FBQSxTQUFBO0FBQ0EsWUFBQSxhQUFBLFdBQUEsSUFBQSxhQUFBLFdBQUEsRUFBQTtBQUNBLGlCQUFBLDBCQUFBLEdBQUEsR0FBQTtBQUNBLGtCQUFBLElBQUEsQ0FBQSxHQUFBLEVBQUEsT0FBQSxpQkFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsU0FBQSxJQUFBLFFBQUEsSUFBQSxHQUFBLEVBQUE7QUFDQSxVQUFBLFFBQUEsSUFBQSxRQUFBLENBQUEsS0FBQSxRQUFBLEVBQUE7QUFDQSxlQUFBLDZCQUFBLENBQUEsSUFBQSxRQUFBLENBQUEsRUFBQSxTQUFBO0FBQ0E7QUFDQTtBQUNBLEdBbEJBOztBQW9CQSxTQUFBLGFBQUEsR0FBQSxVQUFBLEVBQUEsRUFBQTs7QUFFQSxXQUFBLE9BQUEsR0FBQSxJQUFBO0FBQ0EsV0FBQSw2QkFBQSxDQUFBLE9BQUEsU0FBQSxFQUFBLE9BQUEsYUFBQTtBQUNBLEdBSkE7QUFNQSxDQTNmQTs7QUNEQTtBQUNBLElBQUEsVUFBQSxDQUFBLGlCQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsUUFBQSxFQUFBLFFBQUEsRUFBQSxPQUFBLEVBQUEsU0FBQSxFQUFBLGVBQUEsRUFBQSxZQUFBLEVBQUEsV0FBQSxFQUFBLGNBQUEsRUFBQSxTQUFBLEVBQUEsYUFBQSxFQUFBLE1BQUEsRUFBQSxrQkFBQSxFQUFBLGtCQUFBLEVBQUE7Ozs7Ozs7O0FBUUEsU0FBQSxNQUFBLEdBQUEsYUFBQSxFQUFBO0FBQ0EsTUFBQSxZQUFBLFNBQUEsU0FBQSxHQUFBO0FBQ0EsZ0JBQUEsZUFBQSxHQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLGFBQUEsTUFBQSxHQUFBLEtBQUEsR0FBQTtBQUNBLEtBRkE7QUFHQSxHQUpBO0FBS0E7OztBQUdBLFNBQUEsYUFBQSxHQUFBLFNBQUE7QUFDQSxTQUFBLFdBQUEsR0FBQSxVQUFBLElBQUEsRUFBQSxRQUFBLEVBQUE7QUFDQSxXQUFBLENBQUEsR0FBQSxJQUFBO0FBQ0EsV0FBQSxPQUFBLEdBQUEsWUFBQSxTQUFBLENBQUEsQ0FBQTtBQUNBLFFBQUEsSUFBQSxFQUFBO0FBQ0EsV0FBQSxNQUFBLEdBQUEsT0FBQSxNQUFBLENBQUE7QUFDQSxhQUFBLGVBQUEsT0FBQSxNQUFBLEdBQUEsR0FBQSxHQUFBLE9BQUEsTUFEQTtBQUVBLGNBQUEsRUFBQSxNQUFBLElBQUEsRUFGQTtBQUdBLGdCQUFBO0FBSEEsT0FBQSxDQUFBOztBQU1BLFdBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLGlCQUFBLFlBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxTQUFBLElBQUE7QUFDQSxpQkFBQSxhQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsTUFBQTtBQUNBLGlCQUFBLFNBQUE7QUFDQSxTQUpBO0FBS0EsT0FOQSxFQU1BLFVBQUEsUUFBQSxFQUFBO0FBQ0EsWUFBQSxTQUFBLE1BQUEsR0FBQSxDQUFBLEVBQ0EsT0FBQSxRQUFBLEdBQUEsU0FBQSxNQUFBLEdBQUEsSUFBQSxHQUFBLFNBQUEsSUFBQTtBQUNBLE9BVEEsRUFTQSxVQUFBLEdBQUEsRUFBQTtBQUNBLGFBQUEsUUFBQSxHQUFBLEtBQUEsR0FBQSxDQUFBLEdBQUEsRUFBQSxTQUFBLFFBQ0EsSUFBQSxNQURBLEdBQ0EsSUFBQSxLQURBLENBQUEsQ0FBQTtBQUVBLE9BWkE7QUFhQTtBQUNBLEdBeEJBOzs7QUE0QkEsU0FBQSxTQUFBLEdBQUEsWUFBQTtBQUNBLFFBQUEsZUFBQSxFQUFBO0FBQ0EsV0FBQSxhQUFBLENBQUEsT0FBQSxDQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsVUFBQSxLQUFBLEtBQUEsQ0FBQSxLQUFBLElBQUEsRUFBQSxDQUFBLENBQUEsRUFBQTtBQUNBLFlBQUEsV0FBQSxLQUFBLEtBQUEsQ0FBQSxLQUFBLElBQUEsRUFBQSxDQUFBLENBQUE7QUFDQSxZQUFBLFVBQUEsT0FBQSxJQUFBLENBQUEsUUFBQSxDQUFBO0FBQ0EscUJBQUEsS0FBQSxHQUFBLElBQUEsT0FBQTtBQUNBLE9BSkEsTUFJQTtBQUNBLHFCQUFBLEtBQUEsR0FBQSxJQUFBLENBQUEsZ0JBQUEsQ0FBQTtBQUNBO0FBQ0EsS0FSQTtBQVNBLFdBQUEsV0FBQSxHQUFBLFlBQUE7QUFDQSxHQVpBOztBQWNBLFNBQUEsVUFBQSxHQUFBLFVBQUEsTUFBQSxFQUFBLFdBQUEsRUFBQTtBQUNBLFFBQUEsT0FBQTtBQUNBLFFBQUEsTUFBQSxFQUFBO0FBQ0EsZ0JBQUEsWUFBQSxNQUFBLENBQUE7QUFDQTtBQUNBLFdBQUEsT0FBQTtBQUNBLEdBTkE7O0FBU0EsU0FBQSxTQUFBOztBQUVBLFNBQUEsYUFBQSxHQUFBLEVBQUE7QUFDQSxTQUFBLFlBQUEsR0FBQSxFQUFBO0FBQ0EsU0FBQSxlQUFBLEdBQUEsRUFBQSxDO0FBQ0EsU0FBQSx1QkFBQSxHQUFBLEVBQUE7QUFDQSxTQUFBLGlCQUFBLEdBQUEsRUFBQSxDO0FBQ0EsU0FBQSxtQkFBQSxHQUFBLEVBQUEsQztBQUNBLFNBQUEsMEJBQUEsR0FBQSxFQUFBO0FBQ0EsU0FBQSxVQUFBLEdBQUEsRUFBQTtBQUNBLFNBQUEsZ0JBQUEsR0FBQSxHQUFBO0FBQ0EsU0FBQSxhQUFBLEdBQUEsV0FBQTs7QUFFQSxTQUFBLHFCQUFBLEdBQUEsQ0FBQSxFQUFBLFNBQUEsR0FBQSxFQUFBLEVBQUEsRUFBQSxTQUFBLEdBQUEsRUFBQSxFQUFBLEVBQUEsU0FBQSxHQUFBLEVBQUEsRUFBQSxFQUFBLFNBQUEsR0FBQSxFQUFBLEVBQUEsRUFBQSxTQUFBLEdBQUEsRUFBQSxFQUFBLEVBQUEsU0FBQSxHQUFBLEVBQUEsRUFBQSxFQUFBLFNBQUEsR0FBQSxFQUFBLEVBQUEsRUFBQSxTQUFBLEdBQUEsRUFBQSxFQUFBLEVBQUEsU0FBQSxHQUFBLEVBQUEsRUFBQSxFQUFBLFNBQUEsSUFBQSxFQUFBLEVBQUEsRUFBQSxTQUFBLElBQUEsRUFBQSxFQUFBLEVBQUEsU0FBQSxJQUFBLEVBQUEsQ0FBQTtBQUNBLFNBQUEsbUJBQUEsR0FBQSxDQUFBLEVBQUEsUUFBQSxNQUFBLEVBQUEsRUFBQSxFQUFBLFFBQUEsT0FBQSxFQUFBLENBQUE7QUFDQSxTQUFBLGdCQUFBLEdBQUEsRUFBQTtBQUNBLFNBQUEsUUFBQSxHQUFBLEdBQUE7QUFDQSxTQUFBLE9BQUEsR0FBQSxHQUFBO0FBQ0EsU0FBQSxVQUFBLEdBQUEsR0FBQTtBQUNBLFNBQUEsWUFBQSxHQUFBLENBQUE7O0FBRUEsa0JBQUEsTUFBQSxHQUNBLElBREEsQ0FDQSxVQUFBLElBQUEsRUFBQTtBQUNBLFdBQUEsWUFBQSxHQUFBLEtBQUEsSUFBQTtBQUNBLEdBSEE7OztBQU1BLFNBQUEsZ0JBQUEsR0FBQTtBQUNBLGtCQUFBLElBREE7QUFFQSx1QkFBQSxRQUZBO0FBR0EsdUJBQUEsU0FIQTtBQUlBLDZCQUFBO0FBQ0EsZ0JBQUEsc0JBREE7QUFFQSxxQkFBQSxFQUZBO0FBR0EseUJBQUE7QUFIQTtBQUpBLEdBQUE7O0FBV0EsU0FBQSxlQUFBLEdBQUE7QUFDQSxrQkFBQSxJQURBO0FBRUEsdUJBQUEsUUFGQTtBQUdBLHVCQUFBLFFBSEE7QUFJQSw2QkFBQTtBQUNBLGdCQUFBLHNCQURBO0FBRUEsZUFBQSxFQUZBO0FBR0EsZUFBQSxFQUhBO0FBSUEsMkJBQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxJQUFBLEVBQUEsUUFBQSxNQUFBLEVBQUEsY0FBQSxPQUFBLEVBQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxJQUFBLEVBQUEsUUFBQSxNQUFBLEVBQUEsY0FBQSxRQUFBLEVBQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxJQUFBLEVBQUEsUUFBQSxNQUFBLEVBQUEsY0FBQSxRQUFBLEVBQUEsRUFBQSxNQUFBLEVBQUEsV0FBQSxJQUFBLEVBQUEsUUFBQSxNQUFBLEVBQUEsY0FBQSxTQUFBLEVBQUE7QUFKQTtBQUpBLEdBQUE7O0FBWUEsU0FBQSxrQkFBQSxHQUFBO0FBQ0Esa0JBQUEsSUFEQTtBQUVBLHVCQUFBLFFBRkE7QUFHQSx1QkFBQSxRQUhBO0FBSUEsNkJBQUE7QUFDQSxnQkFBQSxzQkFEQTtBQUVBLGFBQUEsRUFGQTtBQUdBLGFBQUEsRUFIQTtBQUlBLDJCQUFBLEVBQUEsTUFBQSxFQUFBLFdBQUEsSUFBQSxFQUFBLFFBQUEsTUFBQSxFQUFBLGNBQUEsT0FBQSxFQUFBLEVBQUEsTUFBQSxFQUFBLFdBQUEsSUFBQSxFQUFBLFFBQUEsTUFBQSxFQUFBLGNBQUEsUUFBQSxFQUFBLEVBQUEsTUFBQSxFQUFBLFdBQUEsSUFBQSxFQUFBLFFBQUEsTUFBQSxFQUFBLGNBQUEsUUFBQSxFQUFBLEVBQUEsTUFBQSxFQUFBLFdBQUEsSUFBQSxFQUFBLFFBQUEsTUFBQSxFQUFBLGNBQUEsU0FBQSxFQUFBLEVBSkE7QUFLQSw0QkFBQSxFQUFBLE1BQUEsRUFBQSxXQUFBLElBQUEsRUFBQSxjQUFBLE9BQUEsRUFBQSxRQUFBLElBQUEsRUFBQSxFQUFBLE1BQUEsRUFBQSxXQUFBLElBQUEsRUFBQSxjQUFBLFFBQUEsRUFBQSxRQUFBLElBQUEsRUFBQSxFQUFBLE1BQUEsRUFBQSxXQUFBLElBQUEsRUFBQSxjQUFBLFFBQUEsRUFBQSxRQUFBLEdBQUEsRUFBQSxFQUFBLE1BQUEsRUFBQSxXQUFBLElBQUEsRUFBQSxjQUFBLFNBQUEsRUFBQSxRQUFBLEdBQUEsRUFBQTs7QUFMQSxLQUpBO0FBWUEsZ0JBQUE7QUFaQSxHQUFBOztBQWVBLFNBQUEsZ0JBQUEsQ0FBQSxDQUFBLElBQUEsT0FBQSxnQkFBQTtBQUNBLFNBQUEsZ0JBQUEsQ0FBQSxDQUFBLElBQUEsT0FBQSxlQUFBOzs7QUFHQSxTQUFBLG1CQUFBLEdBQUEsVUFBQSxJQUFBLEVBQUEsR0FBQSxFQUFBLE1BQUEsRUFBQSxhQUFBLEVBQUE7QUFDQSxRQUFBLGFBQUEsRUFBQTtBQUNBLGFBQUEsT0FBQSxTQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsSUFBQSxFQUFBLE1BQUEsRUFBQSxTQUFBLEdBQUEsRUFBQSxNQUFBLEVBQUEsU0FBQSxNQUFBLEVBQUEsWUFBQSxDQUFBO0FBQ0EsS0FGQSxNQUVBLElBQUEsTUFBQSxFQUFBO0FBQ0EsYUFBQSxPQUFBLFNBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxJQUFBLEVBQUEsTUFBQSxFQUFBLFNBQUEsR0FBQSxFQUFBLE1BQUEsRUFBQSxTQUFBLE1BQUEsQ0FBQTtBQUNBLEtBRkEsTUFFQSxJQUFBLEdBQUEsRUFBQTtBQUNBLGFBQUEsT0FBQSxTQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsSUFBQSxFQUFBLE1BQUEsRUFBQSxTQUFBLEdBQUEsQ0FBQTtBQUNBLEtBRkEsTUFFQSxJQUFBLElBQUEsRUFBQTtBQUNBLGFBQUEsT0FBQSxTQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsSUFBQSxDQUFBO0FBQ0E7QUFDQSxHQVZBOztBQVlBLFNBQUEsc0JBQUEsR0FBQSxVQUFBLElBQUEsRUFBQSxHQUFBLEVBQUEsTUFBQSxFQUFBLGFBQUEsRUFBQTtBQUNBLFFBQUEsYUFBQSxFQUFBO0FBQ0EsYUFBQSxPQUFBLFNBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxJQUFBLEVBQUEsTUFBQSxFQUFBLFNBQUEsR0FBQSxFQUFBLE1BQUEsRUFBQSxTQUFBLE1BQUEsRUFBQSxZQUFBLENBQUE7QUFDQSxLQUZBLE1BRUEsSUFBQSxNQUFBLEVBQUE7QUFDQSxhQUFBLE9BQUEsU0FBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQSxNQUFBLEVBQUEsU0FBQSxHQUFBLEVBQUEsTUFBQSxFQUFBLFNBQUEsTUFBQSxDQUFBO0FBQ0EsS0FGQSxNQUVBLElBQUEsR0FBQSxFQUFBO0FBQ0EsYUFBQSxPQUFBLFNBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxJQUFBLEVBQUEsTUFBQSxFQUFBLFNBQUEsR0FBQSxDQUFBO0FBQ0EsS0FGQSxNQUVBLElBQUEsSUFBQSxFQUFBO0FBQ0EsYUFBQSxPQUFBLFNBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxJQUFBLENBQUE7QUFDQTtBQUNBLEdBVkE7O0FBWUEsU0FBQSxXQUFBLEdBQUEsWUFBQTtBQUNBLFFBQUE7QUFDQSxhQUFBLFFBQUEsR0FBQSxDQUFBO0FBQ0EsV0FBQSxJQUFBLEdBQUEsSUFBQSxPQUFBLFNBQUEsQ0FBQSxLQUFBLEVBQUE7QUFDQSxlQUFBLFFBQUE7QUFDQTtBQUNBLGFBQUEsT0FBQSxRQUFBO0FBQ0EsS0FOQSxDQU1BLE9BQUEsQ0FBQSxFQUFBLENBQUE7QUFFQSxHQVRBOzs7QUFZQSxTQUFBLFVBQUEsR0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLFFBQUEsU0FBQSxDQUFBO0FBQ0EsUUFBQSxPQUFBLENBQUEsRUFBQTtBQUFBLGVBQUEsSUFBQTtBQUFBLEtBQUEsTUFBQTtBQUFBLGVBQUEsT0FBQSxXQUFBLEVBQUE7QUFBQTtBQUNBLFFBQUE7QUFDQSxhQUFBLE9BQUEsR0FBQSxDQUFBO0FBQ0EsV0FBQSxJQUFBLEdBQUEsSUFBQSxPQUFBLFNBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxNQUFBLEVBQUEsSUFBQSxFQUFBO0FBQ0EsZUFBQSxPQUFBO0FBQ0E7QUFDQSxhQUFBLE9BQUEsT0FBQTtBQUNBLEtBTkEsQ0FNQSxPQUFBLENBQUEsRUFBQSxDQUFBO0FBQ0EsR0FWQTs7O0FBYUEsU0FBQSxhQUFBLEdBQUEsVUFBQSxJQUFBLEVBQUEsR0FBQSxFQUFBO0FBQ0EsUUFBQSxTQUFBLENBQUE7QUFDQSxRQUFBLFFBQUEsQ0FBQTtBQUNBLFFBQUEsT0FBQSxDQUFBLEVBQUE7QUFBQSxlQUFBLElBQUE7QUFBQSxLQUFBLE1BQUE7QUFBQSxlQUFBLE9BQUEsV0FBQSxFQUFBO0FBQUE7QUFDQSxRQUFBLE1BQUEsQ0FBQSxFQUFBO0FBQUEsY0FBQSxHQUFBO0FBQUEsS0FBQSxNQUFBO0FBQUEsY0FBQSxPQUFBLFVBQUEsQ0FBQSxNQUFBLENBQUE7QUFBQTtBQUNBLFdBQUEsVUFBQSxHQUFBLENBQUE7QUFDQSxTQUFBLElBQUEsR0FBQSxJQUFBLE9BQUEsU0FBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLE1BQUEsRUFBQSxJQUFBLENBQUEsU0FBQSxLQUFBLEVBQUEsTUFBQSxDQUFBLEVBQUE7QUFDQSxhQUFBLFVBQUE7QUFDQTtBQUNBLFdBQUEsT0FBQSxVQUFBO0FBQ0EsR0FWQTs7OztBQWNBLFNBQUEsc0JBQUEsR0FBQSxVQUFBLFlBQUEsRUFBQTtBQUNBLFdBQUEsMEJBQUEsR0FBQSxZQUFBLEM7QUFDQSxZQUFBLElBQUEsQ0FBQSxZQUFBLEVBQUEsT0FBQSxpQkFBQTtBQUNBLEdBSEE7OztBQU1BLFNBQUEsUUFBQSxHQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0EsWUFBQSxJQUFBLENBQUEsT0FBQSxpQkFBQSxFQUFBLE9BQUEsMEJBQUE7QUFDQSxXQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxDQUFBLEtBQUEsU0FBQSxDQUFBLE9BQUEsU0FBQSxDQUFBO0FBQ0EsUUFBQSxPQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQSxHQUFBLE9BQUEsWUFBQSxFQUFBO0FBQ0EsYUFBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsQ0FBQSxPQUFBLFlBQUEsRUFBQSxPQUFBLE9BQUEsQ0FBQSxNQUFBLENBQUEsTUFBQTtBQUNBO0FBQ0EsbUJBQUEsTUFBQSxDQUFBLE9BQUEsT0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLE1BQUEsRUFBQTs7Ozs7OztBQU9BLEtBUkE7QUFTQSxRQUFBLFdBQUEsV0FBQSxFQUFBO0FBQUEsYUFBQSxTQUFBO0FBQUE7QUFDQSxHQWhCQTs7QUFrQkEsU0FBQSxpQkFBQSxHQUFBLFVBQUEsTUFBQSxFQUFBO0FBQ0EsV0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE9BQUEsQ0FBQSxLQUFBLFNBQUEsQ0FBQSxPQUFBLFNBQUEsQ0FBQTtBQUNBLFFBQUEsT0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUEsR0FBQSxPQUFBLFlBQUEsRUFBQTtBQUNBLGFBQUEsT0FBQSxDQUFBLE1BQUEsQ0FBQSxNQUFBLENBQUEsT0FBQSxZQUFBLEVBQUEsT0FBQSxPQUFBLENBQUEsTUFBQSxDQUFBLE1BQUE7QUFDQTtBQUNBLG1CQUFBLE1BQUEsQ0FBQSxPQUFBLE9BQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxNQUFBLEVBQUEsQ0FDQSxDQUZBO0FBR0EsUUFBQSxXQUFBLFdBQUEsRUFBQTtBQUFBLGFBQUEsU0FBQTtBQUFBO0FBQ0EsR0FUQSxDOztBQVdBLFNBQUEsU0FBQSxHQUFBLFlBQUE7QUFDQSxhQUFBLFlBQUE7QUFBQSxhQUFBLGlCQUFBLEdBQUEsRUFBQTtBQUFBLEtBQUEsRUFBQSxHQUFBO0FBQ0EsV0FBQSxPQUFBLEdBQUEsS0FBQTtBQUNBLFdBQUEsTUFBQSxHQUFBLEtBQUE7QUFDQSxHQUpBOztBQU1BLFNBQUEsYUFBQSxHQUFBLFlBQUE7QUFDQSxZQUFBLEdBQUEsQ0FBQSxPQUFBLGlCQUFBO0FBQ0EsV0FBQSxzQkFBQSxDQUFBLE9BQUEsaUJBQUEsQ0FBQSxpQkFBQSxFQUFBLE9BQUEsaUJBQUEsQ0FBQSxnQkFBQSxFQUFBLE9BQUEsaUJBQUEsQ0FBQSxnQkFBQTtBQUNBLFdBQUEsT0FBQSxDQUFBLE1BQUEs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VUFBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLFlBQUEsUUFBQTtBQUNBLDBCQUFBLENBREE7QUFFQSx5QkFBQSxDQUZBO0FBR0EseUJBQUE7QUFIQSxTQUFBO0FBS0E7O0FBRUEsVUFBQSxJQUFBLGlCQUFBLEtBQUEsUUFBQSxJQUFBLElBQUEsbUJBQUEsTUFBQSxTQUFBLEVBQUE7QUFDQSxjQUFBLGNBQUE7QUFDQSxjQUFBLGFBQUEsR0FBQSxDQUFBO0FBQ0EsZ0JBQUEsR0FBQSxDQUFBLFlBQUEsTUFBQSxjQUFBO0FBQ0EsWUFBQSxpQkFBQSxHQUFBLE1BQUEsY0FBQTtBQUNBLFlBQUEsZ0JBQUEsR0FBQSxFQUFBO0FBQ0EsWUFBQSxnQkFBQSxHQUFBLEVBQUE7QUFDQTs7QUFFQSxVQUFBLElBQUEsaUJBQUEsS0FBQSxRQUFBLElBQUEsSUFBQSxtQkFBQSxNQUFBLFFBQUEsRUFBQTtBQUNBLGNBQUEsYUFBQTtBQUNBLGNBQUEsYUFBQSxHQUFBLENBQUE7QUFDQSxnQkFBQSxHQUFBLENBQUEsV0FBQSxNQUFBLGFBQUE7QUFDQSxZQUFBLGlCQUFBLEdBQUEsTUFBQSxjQUFBO0FBQ0EsWUFBQSxnQkFBQSxHQUFBLE1BQUEsYUFBQTtBQUNBLFlBQUEsZ0JBQUEsR0FBQSxFQUFBO0FBQ0EsWUFBQSxVQUFBLENBQUE7QUFDQSxZQUFBLFdBQUEsRUFBQTtBQUNBLFlBQUEsVUFBQSxFQUFBO0FBQ0EsYUFBQSxJQUFBLEdBQUEsSUFBQSxJQUFBLE1BQUEsQ0FBQSxFQUFBO0FBQUEsbUJBQUEsSUFBQSxDQUFBLElBQUEsTUFBQSxFQUFBLEdBQUEsQ0FBQTtBQUFBO0FBQ0EsWUFBQSxNQUFBLElBQUEsRUFBQTtBQUNBLGFBQUEsSUFBQSxJQUFBLENBQUEsRUFBQSxJQUFBLFNBQUEsTUFBQSxFQUFBLEdBQUEsRUFBQTtBQUNBLGtCQUFBLFVBQUEsSUFBQSxDQUFBLENBQUEsSUFBQSxTQUFBLENBQUEsQ0FBQTtBQUNBO0FBQ0EsWUFBQSxNQUFBLElBQUEsT0FBQTtBQUNBOztBQUVBLFVBQUEsSUFBQSxpQkFBQSxLQUFB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LEtBQUEsR0FBQSxJQUFBLGtCQUFBLENBQUEsR0FBQSxTQUFBO0FBQ0EsZ0JBQUEsT0FBQSxDQUFBLFNBQUEsYUFBQSxDQUFBLE9BQUEsWUFBQSxDQUFBLEVBQUEsTUFBQSxDQUFBLFNBQUEsZ0JBQUEsSUFBQSxtQkFBQSxDQUFBLEdBQUEsS0FBQSxHQUFBLElBQUEsa0JBQUEsQ0FBQSxHQUFBLEtBQUEsR0FBQSxJQUFBLGtCQUFBLENBQUEsR0FBQSxXQUFBLEdBQUEsT0FBQSxxQkFBQSxDQUFBLElBQUEseUJBQUEsQ0FBQSxDQUFBLEdBQUEsMkNBQUEsR0FBQSxJQUFBLG1CQUFBLENBQUEsR0FBQSxLQUFBLEdBQUEsSUFBQSxrQkFBQSxDQUFBLEdBQUEsS0FBQSxHQUFBLElBQUEsa0JBQUEsQ0FBQSxHQUFBLG1EQUFBLEdBQUEsSUFBQSxtQkFBQSxDQUFBLEdBQUEsS0FBQSxHQUFBLElBQUEsa0JBQUEsQ0FBQSxHQUFBLEtBQUEsR0FBQSxJQUFBLGtCQUFBLENBQUEsR0FBQSxrREFBQSxHQUFBLElBQUEsbUJBQUEsQ0FBQSxHQUFBLEtBQUEsR0FBQSxJQUFBLGtCQUFBLENBQUEsR0FBQSwrSkFBQSxHQUFBLElBQUEsbUJBQUEsQ0FBQSxHQUFBLEtBQUEsR0FBQSxJQUFBLGtCQUFBLENBQUEsR0FBQSxLQUFBLEdBQUEsSUFBQSxrQkFBQSxDQUFBLEdBQUEsb0NBQUEsRUFBQSxNQUFBLENBQUE7QUFDQTtBQUNBO0FBQ0EsU0FBQSxJQUFBLFFBQUEsSUFBQSxHQUFBLEVBQUE7QUFDQSxVQUFBLFFBQUEsSUFBQSxRQUFBLENBQUEsS0FBQSxRQUFBLEVBQUE7QUFDQSxlQUFBLHlCQUFBLENBQUEsSUFBQSxRQUFBLENBQUE7QUFDQTtBQUNBO0FBQ0EsR0FaQTs7QUFjQSxTQUFBLDhCQUFBLEdBQUEsVUFBQSxHQUFBLEVBQUE7QUFDQSxRQUFBLElBQUEsY0FBQSxDQUFBLGNBQUEsQ0FBQSxFQUFBO0FBQ0EsVUFBQSxJQUFBLG1CQUFBLE1BQUEsUUFBQSxJQUFBLElBQUEsbUJBQUEsTUFBQSxRQUFBLEVBQUE7QUFDQSxlQUFBLFlBQUEsR0FBQSxRQUFBLElBQUEsbUJBQUEsQ0FBQSxHQUFBLEtBQUEsR0FBQSxJQUFBLGtCQUFBLENBQUEsR0FBQSxTQUFBO0FBQ0EsZ0JBQUEsT0FBQSxDQUFBLFNBQUEsYUFBQSxDQUFBLE9BQUEsWUFBQSxDQUFBLEVBQUEsTUFBQSxDQUFBLFNBQUEsOEJBQUEsRUFBQSxNQUFBLENBQUE7QUFDQTtBQUNBO0FBQ0EsU0FBQSxJQUFBLFFBQUEsSUFBQSxHQUFBLEVBQUE7QUFDQSxVQUFBLFFBQUEsSUFBQSxRQUFBLENBQUEsS0FBQSxRQUFBLEVBQUE7QUFDQSxlQUFBLDhCQUFBLENBQUEsSUFBQSxRQUFBLENBQUE7QUFDQTtBQUNBO0FBQ0EsR0FaQTs7OztBQWdCQSxTQUFBLCtCQUFBLEdBQUEsVUFBQSxHQUFBLEVBQUE7QUFDQSxRQUFBLElBQUEsY0FBQSxDQUFBLGNBQUEsQ0FBQSxFQUFBO0FBQ0EsVUFBQSxJQUFBLG1CQUFBLE1BQUEsU0FBQSxFQUFBO0FBQ0EsZUFBQSxZQUFBLEdBQUEsUUFBQSxJQUFBLG1CQUFBLENBQUEsR0FBQSxLQUFBLEdBQUEsSUFBQSxrQkFBQSxDQUFBLEdBQUEsS0FBQSxHQUFBLElBQUEsa0JBQUEsQ0FBQSxHQUFBLFNBQUE7QUFDQSxnQkFBQSxPQUFBLENBQUEsU0FBQSxhQUFBLENBQUEsT0FBQSxZQUFBLENBQUEsRUFBQSxNQUFBLENBQUEsU0FBQSx1RUFBQSxJQUFBLG1CQUFBLENBQUEsR0FBQSxTQUFBLEdBQUEsSUFBQSxtQkFBQSxDQUFBLEdBQUEsS0FBQSxHQUFBLElBQUEsa0JBQUEsQ0FBQSxHQUFBLEtBQUEsR0FBQSxJQUFBLGtCQUFBLENBQUEsR0FBQSxJQUFBLEdBQUEsT0FBQSxxQkFBQSxDQUFBLElBQUEseUJBQUEsQ0FBQSxDQUFBLEdBQUEsK0JBQUEsR0FBQSxJQUFBLG1CQUFBLENBQUEsR0FBQSxTQUFBLEVBQUEsTUFBQSxDQUFBO0FBQ0E7QUFDQTtBQUNBLFNBQUEsSUFBQSxRQUFBLElBQUEsR0FBQSxFQUFBO0FBQ0EsVUFBQSxRQUFBLElBQUEsUUFBQSxDQUFBLEtBQUEsUUFBQSxFQUFBO0FBQ0EsZUFBQSwrQkFBQSxDQUFBLElBQUEsUUFBQSxDQUFBO0FBQ0E7QUFDQTtBQUNBLEdBWkE7OztBQWVBLFNBQUEsaUJBQUEsR0FBQSxVQUFBLE1BQUEsRUFBQSxHQUFBLEVBQUE7O0FBRUEsWUFBQSxJQUFBLENBQUEsR0FBQSxFQUFBLE1BQUE7QUFDQSxHQUhBOztBQUtBLFNBQUEsZ0JBQUEsR0FBQSxVQUFBLE1BQUEsRUFBQSxVQUFBLEVBQUEsQ0FFQSxDQUZBOzs7QUFLQSxTQUFBLGtCQUFBLEdBQUEsVUFBQSxNQUFBLEVBQUEsVUFBQSxFQUFBLEdBQUEsRUFBQTtBQUNBLFdBQUEsVUFBQSxJQUFBLEdBQUE7QUFDQSxHQUZBOzs7QUFLQSxTQUFBLGtCQUFBLEdBQUEsVUFBQSxNQUFBLEVBQUEsVUFBQSxFQUFBO0FBQ0EsV0FBQSxPQUFBLFVBQUEsQ0FBQTtBQUNBLEdBRkE7OztBQUtBLFNBQUEsY0FBQSxHQUFBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsUUFBQSxNQUFBO0FBQ0EsV0FBQSxNQUFBO0FBQ0EsR0FIQTs7O0FBTUEsU0FBQSxrQkFBQSxHQUFBLFVBQUEsSUFBQSxFQUFBLEdBQUEsRUFBQTtBQUNBLFFBQUEsTUFBQTtBQUNBLFdBQUEsTUFBQTtBQUNBLEdBSEE7OztBQU1BLFNBQUEsZ0JBQUEsR0FBQSxVQUFBLElBQUEsRUFBQSxHQUFBLEVBQUEsTUFBQSxFQUFBLGFBQUEsRUFBQTtBQUNBLFFBQUEsYUFBQSxFQUFBO0FBQ0EsVUFBQSxPQUFBLFNBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxJQUFBLEVBQUEsTUFBQSxFQUFBLFNBQUEsR0FBQSxFQUFBLE1BQUEsRUFBQSxjQUFBLENBQUEsU0FBQSxNQUFBLENBQUEsRUFBQTtBQUNBLGVBQUEsT0FBQSxTQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsSUFBQSxFQUFBLE1BQUEsRUFBQSxTQUFBLEdBQUEsRUFBQSxNQUFBLEVBQUEsU0FBQSxNQUFBLEVBQUEsWUFBQSxJQUFBLEVBQUE7QUFDQTtBQUNBLEtBSkEsTUFJQSxJQUFBLE1BQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxPQUFBLFNBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxJQUFBLEVBQUEsTUFBQSxFQUFBLFNBQUEsR0FBQSxFQUFBLGNBQUEsQ0FBQSxNQUFBLENBQUEsRUFBQTtBQUFBLGVBQUEsU0FBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQSxNQUFBLEVBQUEsU0FBQSxHQUFBLEVBQUEsTUFBQSxJQUFBLEVBQUE7QUFBQTtBQUNBLGFBQUEsT0FBQSxTQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsSUFBQSxFQUFBLE1BQUEsRUFBQSxTQUFBLEdBQUEsRUFBQSxNQUFBLEVBQUEsU0FBQSxNQUFBLElBQUEsRUFBQTtBQUNBLEtBSEEsTUFHQSxJQUFBLEdBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxPQUFBLFNBQUEsQ0FBQSxLQUFBLENBQUEsVUFBQSxJQUFBLEVBQUEsY0FBQSxDQUFBLE1BQUEsQ0FBQSxFQUFBO0FBQUEsZUFBQSxTQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsSUFBQSxFQUFBLE1BQUEsSUFBQSxFQUFBO0FBQUE7QUFDQSxhQUFBLE9BQUEsU0FBQSxDQUFBLEtBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQSxNQUFBLEVBQUEsU0FBQSxHQUFBLElBQUEsRUFBQTtBQUNBLEtBSEEsTUFHQSxJQUFBLElBQUEsRUFBQTtBQUNBLFVBQUEsQ0FBQSxPQUFBLFNBQUEsQ0FBQSxLQUFBLENBQUEsY0FBQSxDQUFBLE9BQUEsQ0FBQSxFQUFBO0FBQUEsZUFBQSxTQUFBLENBQUEsS0FBQSxHQUFBLEVBQUE7QUFBQTtBQUNBLGFBQUEsT0FBQSxTQUFBLENBQUEsS0FBQSxDQUFBLFVBQUEsSUFBQSxJQUFBLEVBQUE7QUFDQTtBQUNBLEdBZkE7O0FBaUJBLFNBQUEsb0JBQUEsR0FBQSxVQUFBLE1BQUEsRUFBQSxJQUFBLEVBQUEsR0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLFdBQUEsaUJBQUEsR0FBQSxJQUFBO0FBQ0EsV0FBQSxnQkFBQSxHQUFBLEdBQUE7QUFDQSxXQUFBLGdCQUFBLEdBQUEsTUFBQTtBQUNBLEdBSkE7O0FBTUEsU0FBQSxlQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUE7QUFDQSxZQUFBLEdBQUEsQ0FBQSxTQUFBO0FBQ0EsUUFBQSxPQUFBLGlCQUFBLENBQUEsZ0JBQUEsR0FBQSxDQUFBLEdBQUEsQ0FBQSxJQUFBLGNBQUEsTUFBQSxFQUFBO0FBQUE7QUFBQSxLQUFBLE1BQUE7QUFBQSxVQUFBLG9CQUFBLE9BQUEsaUJBQUEsQ0FBQSxnQkFBQSxHQUFBLENBQUE7QUFBQTtBQUNBLFFBQUEsY0FBQSxPQUFBLEVBQUE7QUFBQSxVQUFBLG9CQUFBLE9BQUEsaUJBQUEsQ0FBQSxnQkFBQSxHQUFBLENBQUE7QUFBQTtBQUNBLFFBQUEsZUFBQSxPQUFBLG1CQUFBLENBQUEsT0FBQSxpQkFBQSxDQUFBLGlCQUFBLEVBQUEsT0FBQSxpQkFBQSxDQUFBLGdCQUFBLEVBQUEsaUJBQUEsQ0FBQTtBQUNBLFFBQUEsaUJBQUEsU0FBQSxFQUFBO0FBQUE7QUFBQTtBQUNBLFlBQUEsR0FBQSxDQUFBLFlBQUE7OztBQUdBLFlBQUEsSUFBQSxDQUFBLFlBQUEsRUFBQSxPQUFBLDBCQUFBOzs7QUFHQSxXQUFBLG9CQUFBLENBQUEsT0FBQSwwQkFBQSxFQUFBLE9BQUEsaUJBQUEsQ0FBQSxpQkFBQSxFQUFBLE9BQUEsaUJBQUEsQ0FBQSxnQkFBQSxFQUFBLE9BQUEsaUJBQUEsQ0FBQSxnQkFBQTtBQUNBLFdBQUEsb0JBQUEsQ0FBQSxPQUFBLDBCQUFBLENBQUEsVUFBQSxFQUFBLE9BQUEsaUJBQUEsQ0FBQSxpQkFBQSxFQUFBLE9BQUEsaUJBQUEsQ0FBQSxnQkFBQSxFQUFBLE9BQUEsaUJBQUEsQ0FBQSxnQkFBQTs7QUFFQSxXQUFBLG9CQUFBLENBQUEsT0FBQSxpQkFBQSxFQUFBLE9BQUEsaUJBQUEsQ0FBQSxpQkFBQSxFQUFBLE9BQUEsaUJBQUEsQ0FBQSxnQkFBQSxFQUFBLGlCQUFBO0FBQ0EsV0FBQSxvQkFBQSxDQUFBLE9BQUEsaUJBQUEsQ0FBQSxVQUFBLEVBQUEsT0FBQSxpQkFBQSxDQUFBLGlCQUFBLEVBQUEsT0FBQSxpQkFBQSxDQUFBLGdCQUFBLEVBQUEsT0FBQSxpQkFBQSxDQUFBLGdCQUFBOztBQUVBLFlBQUEsSUFBQSxDQUFBLE9BQUEsaUJBQUEsRUFBQSxZQUFBO0FBQ0EsV0FBQSxpQkFBQTtBQUNBLEdBcEJBOztBQXNCQSxTQUFBLGVBQUEsR0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLFFBQUEsb0JBQUEsQ0FBQTtBQUNBLFFBQUEsT0FBQSxpQkFBQSxDQUFBLGdCQUFBLEdBQUEsQ0FBQSxHQUFBLENBQUEsSUFBQSxjQUFBLElBQUEsRUFBQTtBQUFBO0FBQUEsS0FBQSxNQUFBO0FBQUEsVUFBQSxvQkFBQSxPQUFBLGlCQUFBLENBQUEsZ0JBQUEsR0FBQSxDQUFBO0FBQUE7QUFDQSxRQUFBLGNBQUEsTUFBQSxFQUFBO0FBQUEsMEJBQUEsT0FBQSxpQkFBQSxDQUFBLGdCQUFBLEdBQUEsQ0FBQTtBQUFBO0FBQ0EsUUFBQSxlQUFBLE9BQUEsZ0JBQUEsQ0FBQSxPQUFBLGlCQUFBLENBQUEsaUJBQUEsRUFBQSxpQkFBQSxFQUFBLE9BQUEsYUFBQSxDQUFBLE9BQUEsaUJBQUEsQ0FBQSxpQkFBQSxFQUFBLGlCQUFBLElBQUEsQ0FBQSxDQUFBO0FBQ0EsUUFBQSxpQkFBQSxTQUFBLEVBQUE7QUFBQTtBQUFBOztBQUVBLFlBQUEsSUFBQSxDQUFBLE9BQUEsaUJBQUEsRUFBQSxZQUFBO0FBQ0EsV0FBQSxvQkFBQSxDQUFBLFlBQUEsRUFBQSxPQUFBLGlCQUFBLENBQUEsaUJBQUEsRUFBQSxpQkFBQSxFQUFBLE9BQUEsYUFBQSxDQUFBLE9BQUEsaUJBQUEsQ0FBQSxpQkFBQSxFQUFBLGlCQUFBLENBQUE7QUFDQSxXQUFBLG9CQUFBLENBQUEsYUFBQSxVQUFBLEVBQUEsT0FBQSxpQkFBQSxDQUFBLGlCQUFBLEVBQUEsaUJBQUEsRUFBQSxPQUFBLGFBQUEsQ0FBQSxPQUFBLGlCQUFBLENBQUEsaUJBQUEsRUFBQSxpQkFBQSxDQUFBO0FBQ0EsWUFBQSxJQUFBLENBQUEsRUFBQSxFQUFBLE9BQUEsMEJBQUE7QUFDQSxXQUFBLGlCQUFBO0FBRUEsR0FiQTs7O0FBaUJBLFNBQUEsVUFBQSxHQUFBLFVBQUEsSUFBQSxFQUFBLFFBQUEsRUFBQTs7O0FBR0EsV0FBQSxZQUFBLEdBQUEsT0FBQSxnQkFBQSxDQUFBLENBQUEsQ0FBQTs7Ozs7QUFLQSxXQUFBLGlCQUFBLENBQUEsT0FBQSxZQUFBLEVBQUEsT0FBQSxtQkFBQSxDQUFBLElBQUEsRUFBQSxFQUFBLEVBQUEsRUFBQSxFQUFBLFFBQUEsQ0FBQTtBQUNBLEdBVEE7O0FBV0EsU0FBQSxTQUFBLEdBQUEsVUFBQSxJQUFBLEVBQUEsR0FBQSxFQUFBLFFBQUEsRUFBQTs7QUFFQSxXQUFBLFlBQUEsR0FBQSxPQUFBLGdCQUFBLENBQUEsSUFBQSxFQUFBLEdBQUEsQ0FBQTs7Ozs7O0FBTUEsV0FBQSxpQkFBQSxDQUFBLE9BQUEsWUFBQSxFQUFBLE9BQUEsbUJBQUEsQ0FBQSxJQUFBLEVBQUEsR0FBQSxFQUFBLEVBQUEsRUFBQSxRQUFBLENBQUE7QUFDQSxHQVRBO0FBVUEsU0FBQSxZQUFBLEdBQUEsVUFBQSxJQUFBLEVBQUEsR0FBQSxFQUFBLE1BQUEsRUFBQSxRQUFBLEVBQUE7OztBQUdBLFdBQUEsWUFBQSxHQUFBLE9BQUEsZ0JBQUEsQ0FBQSxJQUFBLEVBQUEsR0FBQSxFQUFBLE1BQUEsQ0FBQTs7Ozs7QUFLQSxXQUFBLGlCQUFBLENBQUEsT0FBQSxZQUFBLEVBQUEsT0FBQSxtQkFBQSxDQUFBLElBQUEsRUFBQSxHQUFBLEVBQUEsTUFBQSxFQUFBLFFBQUEsQ0FBQTtBQUNBLEdBVEE7O0FBV0EsU0FBQSxlQUFBLEdBQUEsVUFBQSxJQUFBLEVBQUEsR0FBQSxFQUFBLE1BQUEsRUFBQSxRQUFBLEVBQUE7OztBQUdBLFdBQUEsWUFBQSxHQUFBLE9BQUEsZ0JBQUEsQ0FBQSxJQUFBLEVBQUEsR0FBQSxFQUFBLE1BQUEsRUFBQSxNQUFBLENBQUE7Ozs7O0FBS0EsV0FBQSxpQkFBQSxDQUFBLE9BQUEsWUFBQSxFQUFBLE9BQUEsbUJBQUEsQ0FBQSxJQUFBLEVBQUEsR0FBQSxFQUFBLE1BQUEsRUFBQSxRQUFBLENBQUE7QUFDQSxXQUFBLHNCQUFBLENBQUEsT0FBQSxZQUFBO0FBQ0EsR0FWQTs7QUFZQSxTQUFBLFNBQUEsR0FBQSxVQUFBLFFBQUEsRUFBQTs7QUFFQSxZQUFBLEdBQUEsQ0FBQSxhQUFBLEVBQUEsUUFBQTs7QUFFQSxRQUFBLFNBQUEsaUJBQUEsS0FBQSxRQUFBLEVBQUE7QUFDQSxVQUFBLFNBQUEsaUJBQUEsS0FBQSxTQUFBLEVBQUE7QUFDQSxlQUFBLFVBQUEsQ0FBQSxPQUFBLFFBQUEsR0FBQSxDQUFBLEVBQUEsUUFBQTtBQUNBLE9BRkEsTUFFQSxJQUFBLFNBQUEsaUJBQUEsS0FBQSxRQUFBLEVBQUE7QUFDQSxlQUFBLFNBQUEsQ0FBQSxPQUFBLFFBQUEsRUFBQSxPQUFBLE9BQUEsR0FBQSxDQUFBLEVBQUEsUUFBQTtBQUNBLE9BRkEsTUFFQSxJQUFBLFNBQUEsaUJBQUEsS0FBQSxRQUFBLEVBQUE7QUFDQSxlQUFBLFlBQUEsQ0FBQSxPQUFBLFFBQUEsRUFBQSxPQUFBLE9BQUEsRUFBQSxPQUFBLFVBQUEsR0FBQSxDQUFBLEVBQUEsUUFBQTtBQUNBO0FBQ0EsS0FSQSxNQVFBO0FBQ0EsYUFBQSxZQUFBLENBQUEsT0FBQSxRQUFBLEVBQUEsT0FBQSxPQUFBLEVBQUEsT0FBQSxVQUFBLEdBQUEsQ0FBQSxFQUFBLE9BQUEsa0JBQUE7QUFDQSxlQUFBLFlBQUE7QUFDQSxlQUFBLGVBQUEsQ0FBQSxPQUFBLFFBQUEsRUFBQSxPQUFBLE9BQUEsRUFBQSxPQUFBLFVBQUEsRUFBQSxRQUFBO0FBQ0EsZUFBQSxnQkFBQSxDQUFBLE9BQUEsT0FBQSxRQUFBLEdBQUEsS0FBQSxHQUFBLE9BQUEsT0FBQSxHQUFBLEtBQUEsR0FBQSxPQUFBLFVBQUEsR0FBQSxTQUFBO0FBQ0EsZUFBQSxhQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsS0FBQTtBQUNBLGVBQUEsUUFBQSxDQUFBLFdBQUE7QUFFQSxPQVBB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QUEsRUFBQTtBQUNBLGVBQUEsQ0FBQSxFQUFBLEtBQUEsRUFBQTtBQUNBO0FBQ0EsUUFBQSxRQUFBLEtBQUEsS0FBQSxDQUFBLFdBQUEsR0FBQSxDQUFBO0FBQ0EsUUFBQSxTQUFBLEVBQUEsRUFBQSxRQUFBLEVBQUE7QUFDQSxRQUFBLE9BQUEsS0FBQSxLQUFBLENBQUEsV0FBQSxFQUFBLENBQUE7QUFDQSxRQUFBLFFBQUEsUUFBQSxNQUFBLEdBQUEsU0FBQSxJQUFBLEdBQUEsU0FBQSxJQUFBO0FBQ0EsUUFBQSxRQUFBLENBQUE7QUFDQSxRQUFBLFFBQUEsTUFBQSxFQUFBO0FBQ0EsV0FBQSxJQUFBLElBQUEsTUFBQSxFQUFBLElBQUEsS0FBQSxFQUFBLEtBQUEsSUFBQSxFQUFBO0FBQ0EsbUJBQUEsd0JBQUEsS0FBQSxHQUFBLEdBQUEsRUFBQSxRQUFBLEtBQUE7QUFDQSxpQkFBQSxJQUFBLENBQUEsSUFBQSxRQUFBLEtBQUEsRUFBQSxRQUFBLEtBQUEsQ0FBQTtBQUNBLE9BQUE7QUFDQTtBQUNBLFNBQUEsSUFBQSxJQUFBLE1BQUEsRUFBQSxJQUFBLEtBQUEsRUFBQSxLQUFBLElBQUEsRUFBQTtBQUNBLGlCQUFBLHdCQUFBLEtBQUEsR0FBQSxHQUFBLEVBQUEsUUFBQSxLQUFBO0FBQ0EsZUFBQSxJQUFBLENBQUEsSUFBQSxRQUFBLEtBQUEsRUFBQSxRQUFBLEtBQUEsQ0FBQTtBQUNBOztBQUVBLGFBQUEsZ0JBQUEsR0FBQTs7QUFFQSxVQUFBLEtBQUEsV0FBQSxFQUFBLE9BQUEsS0FBQSxXQUFBOztBQUVBLFVBQUEsU0FBQSxlQUFBLElBQUEsU0FBQSxlQUFBLENBQUEsU0FBQSxFQUNBLE9BQUEsU0FBQSxlQUFBLENBQUEsU0FBQTs7QUFFQSxVQUFBLFNBQUEsSUFBQSxDQUFBLFNBQUEsRUFBQSxPQUFBLFNBQUEsSUFBQSxDQUFBLFNBQUE7QUFDQSxhQUFBLENBQUE7QUFDQTs7QUFFQSxhQUFBLFlBQUEsQ0FBQSxHQUFBLEVBQUE7QUFDQSxVQUFBLE1BQUEsU0FBQSxjQUFBLENBQUEsR0FBQSxD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SUFBQSxDQUFBLFlBQUEsRUFBQSxJQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsYUFBQSxTQUFBLElBQUE7QUFDQSxLQUhBLENBQUE7QUFJQSxHQUxBOztBQU9BLFNBQUEsVUFBQTtBQUNBLENBVkE7Ozs7Ozs7O0FDUUEsSUFBQSxTQUFBLENBQUEsVUFBQSxFQUFBLFlBQUE7QUFDQSxTQUFBO0FBQ0EsY0FBQSxHQURBO0FBRUEsaUJBQUE7QUFGQSxHQUFBO0FBSUEsQ0FMQTtBQ1JBLElBQUEsU0FBQSxDQUFBLGNBQUEsRUFBQSxZQUFBOztBQUVBLFNBQUE7QUFDQSxjQUFBLEdBREE7QUFFQSxXQUFBLElBRkE7QUFHQSxpQkFBQSx1REFIQTtBQUlBLGdCQUFBLG9CQUFBLE1BQUEsRUFBQSxNQUFBLEVBQUEsUUFBQSxFQUFBO0FBQ0EsYUFBQSxXQUFBLEdBQUEsVUFBQSxJQUFBLEVBQUEsUUFBQSxFQUFBO0FBQ0EsZUFBQSxDQUFBLEdBQUEsSUFBQTtBQUNBLGVBQUEsT0FBQSxHQUFBLFlBQUEsU0FBQSxDQUFBLENBQUE7QUFDQSxZQUFBLElBQUEsRUFBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLE9BQUEsTUFBQSxDQUFBO0FBQ0EsaUJBQUEsZUFBQSxPQUFBLE1BQUEsR0FBQSxHQUFBLEdBQUEsT0FBQSxNQURBO0FBRUEsa0JBQUEsRUFBQSxNQUFBLElBQUEsRUFGQTtBQUdBLG9CQUFBO0FBSEEsV0FBQSxDQUFBOztBQU1BLGVBQUEsTUFBQSxDQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLHFCQUFBLFlBQUE7QUFDQSxtQkFBQSxNQUFBLEdBQUEsU0FBQSxJQUFBO0FBQ0EsYUFGQTtBQUdBLFdBSkEsRUFJQSxVQUFBLFFBQUEsRUFBQTtBQUNBLGdCQUFBLFNBQUEsTUFBQSxHQUFBLENBQUEsRUFDQSxPQUFBLFFBQUEsR0FBQSxTQUFBLE1BQUEsR0FBQSxJQUFBLEdBQUEsU0FBQSxJQUFBO0FBQ0EsV0FQQSxFQU9BLFVBQUEsR0FBQSxFQUFBO0FBQ0EsaUJBQUEsUUFB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QUEsb0JBQUEsRUFBQSxNQUFBLENBQUEsS0FBQSxFQUNBLElBREEsQ0FDQSxPQURBLEVBQ0EsS0FEQSxFQUVBLElBRkEsQ0FFQSxRQUZBLEVBRUEsTUFGQSxFQUdBLEtBSEEsQ0FHQSxZQUhBLEVBR0EsTUFIQSxDQUFBOztBQUtBLGNBQUEsR0FBQSxDQUFBLENBQUEsbUJBQUEsV0FBQSxDQUFBLEtBQUEsZ0JBQUEsRUFBQSxNQUFBLENBQUEsRUFBQSxtQkFBQSxXQUFBLENBQUEsS0FBQSxnQkFBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBLEVBQ0EsTUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBLFFBQUEsRUFBQTtBQUNBLFlBQUEsU0FBQSxRQUFBO0FBQ0EsWUFBQSxTQUFBLFFBQUE7O0FBR0EsY0FDQSxLQURBLENBQ0EsTUFEQSxFQUVBLEtBRkEsQ0FFQSxNQUZBLEVBR0EsS0FIQTs7QUFLQSxZQUFBLE9BQUEsSUFBQSxTQUFBLENBQUEsT0FBQSxFQUNBLElBREEsQ0FDQSxNQURBLEVBRUEsS0FGQSxHQUVBLE1BRkEsQ0FFQSxNQUZBLEVBR0EsSUFIQSxDQUdBLE9BSEEsRUFHQSxNQUhBLEVBSUEsS0FKQSxDQUlBLGNBSkEsRUFJQSxVQUFBLENBQUEsRUFBQTtBQUNBLGlCQUFBLEtBQUEsSUFBQSxDQUFBLEVBQUEsS0FBQSxDQUFBO0FBQ0EsU0FOQSxDQUFBOztBQVFBLFlBQUEsT0FBQSxJQUFBLFNBQUEsQ0FBQSxPQUFBLEVBQ0EsSUFEQSxDQUNBLE1BREEsRUFFQSxLQUZBLEdBRUEsTUFGQSxDQUVBLEdBRkEsRUFHQSxJQUhBLENBR0EsT0FIQSxFQUdBLE1BSEEsRUFJQSxJQUpBLENBSUEsTUFBQSxJQUpBLENBQUE7O0FBTUEsYUFBQSxNQUFBLENBQUEsT0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLENBQUEsRUFBQTtBQUNBLGlCQUFBLEVBQUEsSUFBQTtBQUNBLFNBSEEsRTs7Ozs7Ozs7QUFZQSxhQUFBLE1BQUEsQ0FBQSxPQUFBLEVBQ0EsSUFEQSxDQUNBLFlBREEsRUFDQSxVQUFBLENBQUEsRUFBQTtB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QSxvQkFBQSxJQUFBLENBQUE7QUFDQSx3QkFBQSxNQUFBLENBQUEsQ0FEQTtBQUVBLHdCQUFBLE1BQUEsTUFBQSxDQUFBLEVBQUEsTUFBQSxDQUFBLENBQUEsQ0FBQTtBQUZBLGVBQUE7QUFJQTtBQUNBO0FBQ0E7O0FBR0EsWUFBQSxVQUFBLEdBQUEsTUFBQSxDQUFBLG9CQUFBLEVBQ0EsTUFEQSxDQUNBLEtBREEsRUFFQSxJQUZBLENBRUEsT0FGQSxFQUVBLENBRkEsRUFHQSxJQUhBLENBR0EsUUFIQSxFQUdBLENBSEEsQ0FBQTs7QUFLQSxZQUFBLFFBQUEsR0FBQSxNQUFBLENBQUEsS0FBQSxHQUNBLEtBREEsQ0FDQSxLQURBLEVBRUEsS0FGQSxDQUVBLEVBRkEsRUFHQSxPQUhBLENBR0EsR0FIQSxFQUlBLE1BSkEsQ0FJQSxDQUFBLElBSkEsRUFLQSxJQUxBLENBS0EsQ0FBQSxDQUFBLEVBQUEsQ0FBQSxDQUxBLENBQUE7O0FBT0EsWUFBQSxPQUFBLFFBQUEsU0FBQSxDQUFBLE1BQUEsRUFDQSxJQURBLENBQ0EsS0FEQSxFQUNBLEtBREEsR0FDQSxNQURBLENBQ0EsTUFEQSxFQUVBLElBRkEsQ0FFQSxRQUZBLEVBRUEsT0FBQSxJQUZBLENBQUE7O0FBSUEsWUFBQSxPQUFBLFFBQUEsU0FBQSxDQUFBLFFBQUEsRUFDQSxJQURBLENBQ0EsS0FEQSxFQUNBLEtBREEsR0FFQSxNQUZBLENBRUEsR0FGQSxFQUdBLElBSEEsQ0FHQSxNQUFBLElBSEEsQ0FBQTs7QUFLQSxhQUFBLE1BQUEsQ0FBQSxRQUFBLEVBQ0EsSUFEQSxDQUNBLElBREEsRUFDQSxVQUFBLENBQUEsRUFBQTtBQUFBLGlCQUFBLEVBQUEsQ0FBQTtBQUFBLFNBREEsRUFFQSxJQUZBLENBRUEsSUFGQSxFQUVBLFVBQUEsQ0FBQSxFQUFBO0FBQUEsaUJBQUEsRUFBQSxDQUFBO0FBQUEsU0FGQSxFQUdBLElBSEEsQ0FHQSxHQUhBLEVBR0EsU0FIQSxFQUlBLElBSkEsQ0FJQSxNQUpBLEVBSUEsVUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBO0FBQ0EsY0FBQSxJQUFBLENBQUEsRUFBQTs7QUFDQSxtQkFBQSxPQUFBLElBQUE7QUFDQSxXQUZBLE1BRUE7QUFDQSxtQkFBQSxPQUFBLElBQUE7QUFDQTtBQUNBLFNBVkE7O0FBWUEsYUFBQSxNQUFBLENBQUEsTUFBQSxFQUNBLElBREEsQ0FDQSxVQUFBLENBQUEsRUFBQTtBQUFBLGtCQUFBLEdBQUEsQ0FBQSxFQUFBLElBQUEsRUFBQSxPQUFBLEVBQUEsSUFBQTtBQUFBLFNBREEsRUFFQSxJQUZBLENBRUEsYUFGQSxFQUVBLGFBRkEsRUFHQSxJQUhBLENBR0EsTUFIQSxFQUdBLFVBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQTtBQUNBLGNBQUEsSUFBQSxDQUFBLEVBQUE7O0FBQ0EsbUJBQUEsT0FBQSxVQUFBO0FBQ0EsV0FGQSxNQUVBO0FBQ0EsbUJBQUEsT0FBQSxRQUFBO0FBQ0E7QUFDQSxTQVRBLEVBVUEsSUFWQSxDQVVBLFdBVkEsRUFVQSxVQUFBLENBQUEsRUFBQSxDQUFBLEVBQUE7QUFDQSxjQUFBLElBQUEsQ0FBQSxFQUFBOztBQUNBLG1CQUFBLEtBQUE7QUFDQSxXQUZBLE1BRUE7QUFDQSxtQkFBQSxPQUFBO0FBQ0E7QUFDQSxTQWhCQTs7QUFrQkEsY0FBQSxFQUFBLENBQUEsTUFBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQ0EsZUFBQSxJQUFBLENBQUEsV0FBQSxFQUFBLFVBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQTtBQUNBLG1CQUFBLGVBQUEsRUFBQSxDQUFBLEdBQUEsR0FBQSxHQUFBLEVBQUEsQ0FBQSxHQUFBLEdBQUE7QUFDQSxXQUZBOztBQUlBLGVBQ0EsSUFEQSxDQUNBLElBREEsRUFDQSxVQUFBLENBQUEsRUFBQTtBQUFBLG1CQUFBLEVBQUEsTUFBQSxDQUFBLENBQUE7QUFBQSxXQURBLEVBRUEsSUFGQSxDQUVBLElBRkEsRUFFQSxVQUFBLENBQUEsRUFBQTtBQUFBLG1CQUFBLEVBQUEsTUFBQSxDQUFBLENBQUE7QUFBQSxXQUZBLEVBR0EsSUFIQSxDQUdBLElBSEEsRUFHQSxVQUFB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LElBQUE7QUFDQSxTQUhBLEU7O0FBS0EsWUFBQSxlQUFBLE1BQUEsRUFBQTtBQUNBLGtCQUFBLEdBQUEsQ0FBQSxrQkFBQTtBQUNBLGNBQUEsUUFBQSxJQUFBLFNBQUEsQ0FBQSxRQUFBLEVBQ0EsSUFEQSxDQUNBLE1BREEsRUFFQSxLQUZBLEdBRUEsTUFGQSxDQUVBLEdBRkEsRUFHQSxJQUhBLENBR0EsT0FIQSxFQUdBLE9BSEEsRUFJQSxJQUpBLENBSUEsTUFBQSxJQUpBLENBQUE7O0FBTUEsZ0JBQUEsTUFBQSxDQUFBLE1BQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxDQUFBLEVBQUE7QUFBQSxtQkFBQSxFQUFBLElBQUE7QUFBQSxXQURBO0FBRUE7O0FBRUEsY0FBQSxFQUFBLENBQUEsTUFBQSxFQUFBLFlBQUE7QUFDQSxlQUFBLElBQUEsQ0FBQSxJQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxtQkFBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsV0FGQSxFQUdBLElBSEEsQ0FHQSxJQUhBLEVBR0EsVUFBQSxDQUFBLEVBQUE7QUFDQSxtQkFBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsV0FMQSxFQU1BLElBTkEsQ0FNQSxJQU5BLEVBTUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxtQkFBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsV0FSQSxFQVNBLElBVEEsQ0FTQSxJQVRBLEVBU0EsVUFBQSxDQUFBLEVBQUE7QUFDQSxtQkFBQSxFQUFBLE1BQUEsQ0FBQSxDQUFBO0FBQ0EsV0FYQTs7QUFhQSxlQUFBLElBQUEsQ0FBQSxJQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxtQkFBQSxFQUFBLENBQUE7QUFDQSxXQUZBLEVBR0EsSUFIQSxDQUdBLElBSEEsRUFHQSxVQUFBLENBQUEsRUFBQTtBQUNBLG1CQUFBLEVBQUEsQ0FBQTtBQUNBLFdBTEE7O0FBT0EsY0FBQSxlQUFBLE1BQUEsRUFBQTtBQUNBLGtCQUFBLElBQUEsQ0FBQSxXQUFBLEVBQUEsVUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBO0FBQ0EscUJBQUEsZUFBQSxFQUFBLENBQUEsR0FBQSxHQUFBLEdBQUEsRUFBQSxDQUFBLEdBQUEsR0FBQTtBQUNBLGFBRkE7QUFHQTtBQUVBLFNBM0JBLEU7QUE0QkEsT0F6RUEsRTtBQTBFQSxLO0FBN0dBLEdBQUEsQztBQStHQSxDQWhIQTtBQ0RBO0FBQ0EsSUFBQSxTQUFBLENBQUEsaUJBQUEsRUFBQSxVQUFBLE9BQUEsRUFBQSxrQkFBQSxFQUFBO0FBQ0EsU0FBQTtBQUNBLGNBQUEsSUFEQTtBQUVBLFdBQUE7QUFDQSxlQUFBLEdBREE7QUFFQSxvQkFBQSxHQUZBO0FBR0EsZUFBQSxHQUhBO0FBSUEsZ0JBQUE7QUFKQSxLQUZBO0FBUUEsaUJBQUEsdURBUkE7QUFTQSxVQUFBLGNBQUEsS0FBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUE7QUFDQSxVQUFBLEtBQUEsUUFBQSxFQUFBOztBQUVBLGNBQUEsR0FBQSxDQUFBLEtBQUEsWUFBQSxFOztBQUVBLHlCQUFBLFdBQUEsQ0FBQSxLQUFBLFlBQUEsRUFBQSxNQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsY0FBQSxJQUFBLEdBQUEsS0FBQTtBQUNBLGdCQUFBLEdBQUEsQ0FBQSxjQUFBLEtBQUE7QUFDQSxlQUFBLEtBQUE7QUFDQSxPQUxBLEVBS0EsSUFMQSxDQUtBLFVBQUEsS0FBQSxFQUFBOztBQUVBLFlBQUEsU0FBQSxFQUFBLEtBQUEsRUFBQSxFQUFBLE9BQUEsRUFBQSxFQUFBLFFBQUEsRUFBQSxFQUFBLE1BQUEsRUFBQSxFQUFBO0FBQUEsWUFDQSxRQUFBLEtBQUEsT0FBQSxHQUFBLEVBQUEsR0FBQSxPQUFBLEtBQUEsR0FBQSxPQUFBLElBREE7QUFBQSxZQUVBLFNBQUEsS0FBQSxRQUFBLEdBQUEsT0FBQSxHQUFBLEdBQUEsT0FBQSxNQUZBOztBQUlBLFlBQUEsSUFBQSxDQUFBO0FBQUEsWUFDQSxXQUFBLEdBREE7QUFBQSxZQUVBLElBRkE7O0FBSUEsWUFBQSxPQUFBLEdBQUEsTUFBQSxDQUFBLElBQUEsR0FDQSxJQURBLENBQ0EsQ0FBQSxNQUFBLEVBQUEsS0FBQSxDQURBLENBQUE7O0FBR0EsWUFBQSxXQUFBLEdBQUEsR0FBQSxDQUFBLFFBQUEsR0FDQSxVQURBLENBQ0EsVUFBQSxDQUFBLEVBQUE7QUFBQSxpQkFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBLEVBQUEsQ0FBQSxDQUFBO0FBQUEsU0FEQSxDQUFBOztBQUdBLFlBQUEsTUFBQSxHQUFBLE1BQUEsQ0FBQSxVQUFBLEVBQUEsTUFBQSxDQUFBLEtBQUEsRUFDQSxJQURBLENBQ0EsT0FEQSxFQUNBLFFBQUEsT0FBQSxLQUFBLEdBQUEsT0FBQSxJQURBLEVBRUEsSUFGQSxDQUVBLFFBRkEsRUFFQSxTQUFBLE9BQUEsR0FBQSxHQUFBLE9BQUEsTUFGQSxFQUdBLE1BSEEsQ0FHQSxHQUhBLEVBSUEsSUFKQSxDQUlBLFdBSkEsRUFJQSxlQUFBLE9BQUEsSUFBQSxHQUFBLEdBQUEsR0FBQSxPQUFBLEdBQUEsR0FBQSxHQUpBLENBQUE7O0FBT0EsZUFBQSxLQUFBO0FBQ0EsYUFBQSxFQUFBLEdBQUEsUUFBQSxDQUFBO0FBQ0EsYUFBQSxFQUFBLEdBQUEsQ0FBQTs7QUFFQSxpQkFBQSxRQUFBLENBQUEsQ0FBQSxFQUFBO0FBQ0EsY0FBQSxFQUFBLFFBQUEsRUFBQTtBQUNBLGNBQUEsU0FBQSxHQUFBLEVBQUEsUUFBQTtBQUNBLGNBQUEsU0FBQSxDQUFBLE9BQUEsQ0FBQSxRQUFBO0FBQ0EsY0FBQSxRQUFBLEdBQUEsSUFBQTtBQUNBO0FBQ0E7O0FBRUEsYUFBQSxRQUFBLENBQUEsT0FBQSxDQUFBLFFBQUE7QUFDQSxlQUFBLElBQUE7O0FBR0EsV0FBQSxNQUFBLENBQUEsS0FBQSxZQUFBLEVBQUEsS0FBQSxDQUFBLFFBQUEsRUFBQSxRQUFBOztBQUVBLGlCQUFBLE1BQUEsQ0FBQSxNQUFBLEVBQUE7OztBQUdBLGNBQUEsUUFBQSxLQUFBLEtBQUEsQ0FBQSxJQUFBLEVBQUEsT0FBQSxFQUFBO0FBQUEsY0FDQSxRQUFBLEtBQUEsS0FBQSxDQUFBLEtBQUEsQ0FEQTs7O0FBSUEsZ0JBQUEsT0FBQSxDQUFBLFVBQUEsQ0FBQSxFQUFBO0FBQUEsY0FBQSxDQUFBLEdBQUEsRUFBQSxLQUFBLEdBQUEsR0FBQTtBQUFBLFdBQUE7Ozs7QUFJQSxjQUFBLE9BQUEsSUFBQSxTQUFBLENBQUEsUUFBQSxFQUNBLElBREEsQ0FDQSxLQURBLEVBQ0EsVUFBQSxDQUFBLEVBQUE7QUFBQSxtQkFBQSxFQUFBLEVBQUEsS0FBQSxFQUFBLEVBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQTtBQUFBLFdBREEsQ0FBQTs7O0FBSUEsY0FBQSxZQUFBLEtBQUEsS0FBQSxHQUFBLE1BQUEsQ0FBQSxHQUFBLEVBQ0EsSUFEQSxDQUNBLE9BREEsRUFDQSxNQURBLEVBRUEsSUFGQSxDQUVBLFdBRkEsRUFFQSxVQUFBLENBQUEsRUFBQTtBQUFBLG1CQUFBLGVBQUEsT0FBQSxFQUFBLEdBQUEsR0FBQSxHQUFBLE9BQUEsRUFBQSxHQUFBLEdBQUE7QUFBQSxXQUZBLEVBR0EsRUFIQSxDQUdBLE9BSEEsRUFHQSxLQUhBLENBQUE7O0FBS0Esb0JBQUEsTUFBQSxDQUFBLFFBQUEsRUFDQSxJQURBLENBQ0EsR0FEQSxFQUNBLElBREEsRUFFQSxLQUZBLENBRUEsTUFGQSxFQUVBLFVBQUEsQ0FBQSxFQUFBO0FBQUEsbUJBQUEsRUFBQSxTQUFBLEdBQUEsZ0JBQUEsR0FBQSxNQUFBO0FBQUEsV0FGQTs7QUFJQSxvQkFBQSxNQUFBLENBQUEsTUFBQSxFQUNBLElBREEsQ0FDQSxHQURBLEVBQ0EsVUFBQSxDQUFBLEVBQUE7QUFBQSxtQkFBQSxFQUFBLFFBQUEsSUFBQSxFQUFBLFNBQUEsR0FBQSxDQUFBLEVBQUEsR0FBQSxFQUFBO0FBQUEsV0FEQSxFQUVBLElBRkEsQ0FFQSxHQUZBLEVBRUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxtQkFBQSxFQUFBLFFBQUEsSUFBQSxFQUFBLFNBQUEsR0FBQSxDQUFBLEVBQUEsR0FBQSxFQUFBO0FBQUEsV0FGQSxFQUdBLElBSEEsQ0FHQSxJQUhBLEVBR0EsT0FIQSxFQUlBLElBSkEsQ0FJQSxhQUpBLEVBSUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxtQkFBQSxFQUFBLFFBQUEsSUFBQSxFQUFBLFNBQUEsR0FBQSxLQUFBLEdBQUEsT0FBQTtBQUFBLFdBSkEsRUFLQSxJQUxBLENBS0EsVUFBQSxDQUFBLEVBQUE7QUFBQSxtQkFBQSxFQUFBLElBQUEsSUFBQSxFQUFBLFdBQUEsSUFBQSxtQkFBQSxFQUFBLFdBQUE7QUFBQSxXQUxBLEVBTUEsS0FOQSxDQU1BLGNBTkEsRUFNQSxJQU5BLEVBT0EsSUFQQSxDQU9BLE9BUEEsRUFPQSx3REFQQTs7O0FBVUEsY0FBQSxhQUFBLEtBQUEsVUFBQSxHQUNBLFFBREEsQ0FDQSxRQURBLEVBRUEsSUFGQSxDQUVBLFdBRkEsRUFFQSxVQUFBLENBQUEsRUFBQTtBQUFBLG1CQUFBLGVBQUEsRUFBQSxDQUFBLEdBQUEsR0FBQSxHQUFBLEVBQUEsQ0FBQSxHQUFBLEdBQUE7QUFBQSxXQUZBLENBQUE7O0FBSUEscUJBQUEsTUFBQSxDQUFBLFFBQUEsRUFDQSxJQURBLENBQ0EsR0FEQSxFQUNBLEdBREEsRUFFQSxLQUZBLENBRUEsTUFGQSxFQUVBLFVBQUEsQ0FBQSxFQUFBO0FBQUEsbUJBQUEsRUFBQSxTQUFBLEdBQUEsZ0JBQUEsR0FBQSxNQUFBO0FBQUEsV0FGQTs7QUFJQSxxQkFBQSxNQUFBLENBQUEsTUFBQSxFQUNBLEtBREEsQ0FDQSxjQURBLEVBQ0EsQ0FEQTs7O0FBSUEsY0FBQSxXQUFBLEtBQUEsSUFBQSxHQUFBLFVBQUEsR0FDQSxRQURBLENBQ0EsUUFEQSxFQUVBLElBRkEsQ0FFQSxXQUZBLEVBRUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxtQkFBQSxlQUFBLE9BQUEsQ0FBQSxHQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsR0FBQSxHQUFBO0FBQUEsV0FGQSxFQUdBLE1BSEEsRUFBQTs7QUFLQSxtQkFBQSxNQUFBLENBQUEsUUFBQSxFQUNBLElBREEsQ0FDQSxHQURBLEVBQ0EsSUFEQTs7QUFHQSxtQkFBQSxNQUFBLENBQUEsTUFBQSxFQUNBLEtBREEsQ0FDQSxjQURBLEVBQ0EsSUFEQTs7O0FBSUEsY0FBQSxPQUFBLElBQUEsU0FBQSxDQUFBLFdBQUEsRUFDQSxJQURBLENBQ0EsS0FEQSxFQUNBLFVBQUEsQ0FBQSxFQUFBO0FBQUEsbUJBQUEsRUFBQSxNQUFBLENBQUEsRUFBQTtBQUFBLFdBREEsQ0FBQTs7O0FBSUEsZUFBQSxLQUFBLEdBQUEsTUFBQSxDQUFBLE1BQUEsRUFBQSxHQUFBLEVBQ0EsSUFEQSxDQUNBLE9BREEsRUFDQSxNQURBLEVBRUEsSUFGQSxDQUVBLEdBRkEsRUFFQSxVQUFBLENBQUEsRUFBQTtBQUNBLGdCQUFBLElBQUEsRUFBQSxHQUFBLE9BQUEsRUFBQSxFQUFBLEdBQUEsT0FBQSxFQUFBLEVBQUE7QUFDQSxtQkFBQSxTQUFBLEVBQUEsUUFBQSxDQUFBLEVBQUEsUUFBQSxDQUFBLEVBQUEsQ0FBQTtBQUNBLFdBTEE7OztBQVFBLGVBQUEsVUFBQSxHQUNBLFFBREEsQ0FDQSxRQURBLEVBRUEsSUFGQSxDQUVBLEdBRkEsRUFFQSxRQUZBOzs7QUFLQSxlQUFBLElBQUEsR0FBQSxVQUFBLEdBQ0EsUUFEQSxDQUNBLFFBREEsRUFFQSxJQUZBLENBRUEsR0FGQSxFQUVBLFVBQUEsQ0FBQSxFQUFBO0FBQ0EsZ0JBQUEsSUFBQSxFQUFBLEdBQUEsT0FBQSxDQUFBLEVBQUEsR0FBQSxPQUFBLENBQUEsRUFBQTtBQUNBLG1CQUFBLFNBQUEsRUFBQSxRQUFBLENBQUEsRUFBQSxRQUFBLENBQUEsRUFBQSxDQUFBO0FBQ0EsV0FMQSxFQU1BLE1BTkE7OztBQVNBLGdCQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsRUFBQTtBQUNBLGNBQUEsRUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLGNBQUEsRUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFdBSEE7QUFJQTs7QUFFQSxpQkFBQSxLQUFBLENBQUEsQ0FBQSxFQUFBO0FBQ0EsY0FBQSxFQUFBLFFBQUEsRUFBQTtBQUNBLGNBQUEsU0FBQSxHQUFBLEVBQUEsUUFBQTtBQUNBLGNBQUEsUUFBQSxHQUFBLElB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QUFBO0FBQ0EsZUFBQSxHQURBO0FBRUEsb0JBQUEsR0FGQTtBQUdBLGVBQUEsR0FIQTtBQUlBLGdCQUFBO0FBSkEsS0FGQTtBQVFBLGlCQUFBLDJEQVJBO0FBU0EsVUFBQSxjQUFBLEtBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBOztBQUVBLFVBQUEsS0FBQSxRQUFBLEVBQUE7QUFDQSxVQUFBLElBQUEsS0FBQSxPQUFBO0FBQUEsVUFDQSxJQUFBLEtBQUEsUUFEQTtBQUFBLFVBRUEsSUFBQSxDQUZBO0FBQUEsVUFHQSxZQUFBLEVBSEE7QUFBQSxVQUlBLFdBQUEsSUFBQSxDQUpBO0FBQUEsVUFLQSxXQUFBLEdBTEE7QUFBQSxVQU1BLElBTkE7O0FBUUEsVUFBQSxPQUFBLEdBQUEsTUFBQSxDQUFBLElBQUEsR0FDQSxJQURBLENBQ0EsQ0FBQSxDQUFBLEVBQUEsR0FBQSxDQURBLENBQUE7O0FBR0EsVUFBQSxXQUFBLEdBQUEsR0FBQSxDQUFBLFFBQUEsR0FDQSxVQURBLENBQ0EsVUFBQSxDQUFBLEVBQUE7QUFBQSxlQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsRUFBQSxDQUFBLENBQUE7QUFBQSxPQURBLENBQUE7O0FBR0EsVUFBQSxNQUFBLEdBQUEsTUFBQSxDQUFBLFNBQUEsRUFBQSxNQUFBLENBQUEsU0FBQSxFQUNBLElBREEsQ0FDQSxPQURBLEVBQ0EsQ0FEQSxFQUVBLElBRkEsQ0FFQSxRQUZBLEVBRUEsQ0FGQSxFQUdBLE1BSEEsQ0FHQSxPQUhBLEVBSUEsSUFKQSxDQUlBLFdBSkEsRUFJQSxrQkFKQSxDQUFBOztBQU1BLGVBQUEsWUFBQSxDQUFBLElBQUEsRUFBQTtBQUNBLFlBQUEsS0FBQSxRQUFBLEVBQUE7QUFDQSxlQUFBLFFBQUEsQ0FBQSxPQUFBLENBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSx5QkFBQSxDQUFBO0FBQUEsV0FBQTtBQUNBLGVBQUEsU0FBQSxHQUFBLEtBQUEsUUFBQTtBQUNBLGVBQUEsUUFBQSxHQUFBLElBQUE7QUFDQTtBQUNBOztBQUVBLHlCQUFBLFdBQUEsQ0FBQSxLQUFBLFlBQUEsRUFBQSxNQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsZ0JBQUEsR0FBQSxDQUFBLFlBQUEsRUFBQSxLQUFBO0FBQ0EsY0FBQSxJQUFBLEdBQUEsS0FBQTtBQUNBLFlBQUEsT0FBQSxLQUFBO0FBQ0EsZUFBQSxJQUFBO0FBQ0EsT0FOQSxFQU9BLElBUEEsQ0FPQSxVQUFBLElBQUEsRUFBQTs7QUFFQSxhQUFBLEVBQUEsR0FBQSxDQUFBO0FBQ0EsYUFBQSxFQUFBLEdBQUEsQ0FBQTtBQUNBLHFCQUFBLElBQUE7QUFDQSxlQUFBLE9BQUEsSUFBQTtBQUNBLE9BYkE7O0FBZUEsZUFBQSxNQUFBLENBQUEsTUFBQSxFQUFBOzs7QUFHQSxZQUFBLFFBQUEsS0FBQSxLQUFBLENBQUEsSUFBQSxDQUFBOzs7QUFHQSxjQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsRUFBQSxDQUFBLEVBQUE7QUFDQSxZQUFBLENBQUEsR0FBQSxJQUFBLFNBQUE7QUFDQSxTQUZBOzs7QUFLQSxZQUFBLE9BQUEsSUFBQSxTQUFBLENBQUEsUUFBQSxFQUNBLElBREEsQ0FDQSxLQURBLEVBQ0EsVUFBQSxDQUFBLEVBQUE7QUFBQSxpQkFBQSxFQUFBLEVBQUEsS0FBQSxFQUFBLEVBQUEsR0FBQSxFQUFBLENBQUEsQ0FBQTtBQUFBLFNBREEsQ0FBQTs7QUFHQSxZQUFBLFlBQUEsS0FBQSxLQUFBLEdBQUEsTUFBQSxDQUFBLE9BQUEsRUFDQSxJQURBLENBQ0EsT0FEQSxFQUNBLE1BREEsRUFFQSxJQUZBLENBRUEsV0FGQSxFQUVBLFVBQUEsQ0FBQSxFQUFBO0FBQUEsaUJBQUEsZUFBQSxPQUFBLEVBQUEsR0FBQSxHQUFBLEdBQUEsT0FBQSxFQUFBLEdBQUEsR0FBQTtBQUFBLFNBRkEsRUFHQSxLQUhBLENBR0EsU0FIQSxFQUdBLElBSEEsQ0FBQTs7O0FBTUEsa0JBQUEsTUFBQSxDQUFBLFVBQUEsRUFDQSxJQURBLENBQ0EsR0FEQSxFQUNBLENBQUEsU0FBQSxHQUFBLENBREEsRUFFQSxJQUZBLENBRUEsUUFGQSxFQUVBLFNBRkEsRUFHQSxJQUhBLENBR0EsT0FIQSxFQUdBLFFBSEEsRUFJQSxLQUpBLENBSUEsTUFKQSxFQUlBLEtBSkEsRUFLQSxFQUxBLENBS0EsT0FMQSxFQUtBLEtBTEE7O0FBT0Esa0JBQUEsTUFBQSxDQUFBLFVBQUEsRUFDQSxJQURBLENBQ0EsSUFEQSxFQUNBLEdBREEsRUFFQSxJQUZBLENBRUEsSUFGQSxFQUVBLEdBRkEsRUFHQSxJQUhBLENBR0EsVUFBQSxDQUFBLEVBQUE7QUFBQSxpQkFBQSxFQUFBLElBQUE7QUFBQSxTQUhBLEVBSUEsSUFKQSxDQUlBLE9BSkEsRUFJQSx3REFKQTs7O0FBT0Esa0JBQUEsVUFBQSxHQUNBLFFBREEsQ0FDQSxRQURBLEVBRUEsSUFGQSxDQUVBLFdBRkEsRUFFQSxVQUFBLENBQUEsRUFBQTtBQUFBLGlCQUFBLGVBQUEsRUFBQSxDQUFBLEdBQUEsR0FBQSxHQUFBLEVBQUEsQ0FBQSxHQUFBLEdBQUE7QUFBQSxTQUZBLEVBR0EsS0FIQSxDQUdBLFNBSEEsRUFHQSxDQUhBOztBQUtBLGFBQUEsVUFBQSxHQUNBLFFBREEsQ0FDQSxRQURBLEVBRUEsSUFGQSxDQUVBLFdBRkEsRUFFQSxVQUFBLENBQUEsRUFBQTtBQUFBLGlCQUFBLGVBQUEsRUFBQSxDQUFBLEdBQUEsR0FBQSxHQUFBLEVBQUEsQ0FBQSxHQUFBLEdBQUE7QUFBQSxTQUZBLEVBR0EsS0FIQSxDQUdBLFNBSEEsRUFHQSxDQUhBLEVBSUEsTUFKQSxDQUlBLE1BSkEsRUFLQSxLQUxBLENBS0EsTUFMQSxFQUtBLEtBTEE7OztBQVFBLGFBQUEsSUFBQSxHQUFBLFVBQUEsR0FDQSxRQURBLENBQ0EsUUFEQSxFQUVBLElBRkEsQ0FFQSxXQUZBLEVBRUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxpQkFBQSxlQUFBLE9BQUEsQ0FBQSxHQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsR0FBQSxHQUFBO0FBQUEsU0FGQSxFQUdBLEtBSEEsQ0FHQSxTQUhBLEVBR0EsSUFIQSxFQUlBLE1BSkE7OztBQU9BLFlBQUEsT0FBQSxJQUFBLFNBQUEsQ0FBQSxXQUFBLEVBQ0EsSUFEQSxDQUNBLEtBQUEsS0FBQSxDQUFBLEtBQUEsQ0FEQSxFQUNBLFVBQUEsQ0FBQSxFQUFBO0FBQUEsaUJBQUEsRUFBQSxNQUFBLENBQUEsRUFBQTtBQUFBLFNBREEsQ0FBQTs7O0FBSUEsYUFBQSxLQUFBLEdBQUEsTUFBQSxDQUFBLFVBQUEsRUFBQSxHQUFBLEVBQ0EsSUFEQSxDQUNBLE9BREEsRUFDQSxNQURBLEVBRUEsSUFGQSxDQUVBLEdBRkEsRUFFQSxVQUFBLENBQUEsRUFBQTtBQUNBLGNBQUEsSUFBQSxFQUFBLEdBQUEsT0FBQSxFQUFBLEVBQUEsR0FBQSxPQUFBLEVBQUEsRUFBQTtBQUNBLGlCQUFBLFNBQUEsRUFBQSxRQUFBLENBQUEsRUFBQSxRQUFBLENBQUEsRUFBQSxDQUFBO0FBQ0EsU0FMQSxFQU1BLFVBTkEsR0FPQSxRQVBBLENBT0EsUUFQQSxFQVFBLElBUkEsQ0FRQSxHQVJBLEVBUUEsUUFSQTs7O0FBV0EsYUFBQSxVQUFBLEdBQ0EsUUFEQSxDQUNBLFFBREEsRUFFQSxJQUZBLENBRUEsR0FGQSxFQUVBLFFBRkE7OztBQUtBLGFBQUEsSUFBQSxHQUFBLFVBQUEsR0FDQSxRQURBLENBQ0EsUUFEQSxFQUVBLElBRkEsQ0FFQSxHQUZBLEVBRUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxjQUFBLElBQUEsRUFBQSxHQUFBLE9BQUEsQ0FBQSxFQUFBLEdBQUEsT0FBQSxDQUFBLEVBQUE7QUFDQSxpQkFBQSxTQUFBLEVBQUEsUUFBQSxDQUFBLEVBQUEsUUFBQSxDQUFBLEVBQUEsQ0FBQTtBQUNBLFNBTEEsRUFNQSxNQU5BOzs7QUFTQSxjQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsRUFBQTtBQUNBLFlBQUEsRUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFlBQUEsRUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFNBSEE7QUFJQTs7O0FBR0EsZUFBQSxLQUFBLENBQUEsQ0FBQSxFQUFBO0FBQ0EsWUFBQSxFQUFBLFFBQUEsRUFBQTtBQUNB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QSxFQU1BLEVBQUEsR0FBQSxFQU5BOztBQVNBLFVBQUEsVUFBQSxHQUFBLE1BQUEsQ0FBQSxxQkFBQSxFQUFBLE1BQUEsQ0FBQSxLQUFBLEVBQ0EsSUFEQSxDQUNBLE9BREEsRUFDQSxLQURBLEVBRUEsSUFGQSxDQUVBLFFBRkEsRUFFQSxNQUZBLEVBR0EsTUFIQSxDQUdBLEdBSEEsRUFJQSxJQUpBLENBSUEsV0FKQSxFQUlBLGdCQUFBLFFBQUEsTUFBQSxJQUFBLEdBQUEsSUFBQSxTQUFBLE1BQUEsSUFBQSxHQUpBLEVBS0EsU0FMQSxDQUtBLE1BTEEsRUFLQSxJQUxBLENBS0EsSUFBQSxPQUFBLENBTEEsQztBQUFBLE9BTUEsS0FOQSxHQU1BLE1BTkEsQ0FNQSxHQU5BLEVBT0EsSUFQQSxDQU9BLE9BUEEsRUFPQSxPQVBBLENBQUE7O0FBU0EsY0FBQSxJQUFBLENBQUEsQ0FBQTs7QUFFQSxVQUFBLFNBQUEsR0FBQSxTQUFBLENBQUEsU0FBQSxFQUNBLE1BREEsQ0FDQSxNQURBOzs7Ozs7QUFBQSxPQU9BLEtBUEEsQ0FPQSxRQVBBLEVBT0EsVUFBQSxDQUFBLEVBQUEsQ0FBQSxFQUFBO0FBQ0EsZUFBQSxPQUFBLENBQUEsQ0FBQTtBQUNBLE9BVEEsRUFVQSxLQVZBLENBVUEsTUFWQSxFQVVBLEVBQUEsR0FBQSxFQVZBLEVBWUEsSUFaQSxDQVlBLEdBWkEsRUFZQSxHQVpBLENBQUEsQzs7QUFjQSxVQUFBLE9BQUEsR0FBQSxTQUFBLENBQUEsU0FBQSxFQUNBLE1BREEsQ0FDQSxNQURBLEVBRUEsSUFGQSxDQUVBLFVBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQTs7QUFFQSxlQUFBLEVBQUEsSUFBQSxDQUFBLEtBQUE7QUFDQSxPQUxBLEVBTUEsSUFOQSxDQU1BLGFBTkEsRUFNQSxRQU5BLEVBT0EsSUFQQSxDQU9BLE1BUEEsRUFPQSxPQVBBLEVBUUEsSUFSQSxDQVFBLFdBUkEsRUFRQSxVQUFBLENBQUEsRUFBQTtBQUNBLFVBQUEsV0FBQSxHQUFBLENBQUE7QUFDQSxVQUFBLFdBQUEsR0FBQSxNQUFBO0FB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QUFBLFdBQUEsRUFBQTtBQUNBLGNBQUEsU0FBQSxLQUFBLFdBQUEsQ0FBQTtBQUNBLGNBQUEsU0FBQSxLQUFBLFdBQUEsQ0FBQTtBQUNBLGtCQUFBLElBQUEsQ0FBQSxFQUFBLFNBQUEsTUFBQSxFQUFBLFNBQUEsTUFBQSxFQUFBO0FBQ0E7QUFDQTtBQUNBLFVBQUEsTUFBQSxHQUFBLE1BQUEsQ0FBQSxHQUFBLEdBQ0EsS0FEQSxDQUNBLFVBQUEsQ0FBQSxFQUFBO0FBQ0EsZUFBQSxFQUFBLEtBQUE7QUFDQSxPQUhBLENBQUE7O0FBS0EsVUFBQSxNQUFBLEdBQUEsR0FBQSxDQUFBLEdBQUEsR0FDQSxXQURBLENBQ0EsTUFEQSxDQUFBOztBQUdBLFVBQUEsVUFBQSxHQUFBLE1BQUEsQ0FBQSxZQUFBLEVBQUEsTUFBQSxDQUFBLEtBQUEsRUFDQSxJQURBLENBQ0EsT0FEQSxFQUNBLEtBREEsRUFFQSxJQUZBLENBRUEsUUFGQSxFQUVBLE1BRkEsRUFHQSxNQUhBLENBR0EsR0FIQSxFQUlBLElBSkEsQ0FJQSxXQUpBLEVBSUEsZ0JBQUEsUUFBQSxNQUFBLElBQUEsR0FBQSxJQUFBLFNBQUEsTUFBQSxJQUFBLEdBSkEsRUFLQSxTQUxBLENBS0EsTUFMQSxFQUtBLElBTEEsQ0FLQSxJQUFBLE9BQUEsQ0FMQSxDO0FBQUEsT0FNQSxLQU5BLEdBTUEsTUFOQSxDQU1BLEdBTkEsRUFPQSxJQVBBLENBT0EsT0FQQSxFQU9BLE9BUEEsQ0FBQTs7QUFTQSxVQUFBLFNBQUEsR0FBQSxTQUFBLENBQUEsU0FBQSxFQUNBLE1BREEsQ0FDQSxNQURBLEVBRUEsSUFGQSxDQUVBLE1BRkEsRUFFQSxVQUFBLENBQUEsRUFBQSxDQUFBLEVBQUE7QUFDQSxlQUFBLE9BQUEsQ0FBQSxDQUFBO0FBQ0EsT0FKQSxFQUtBLElBTEEsQ0FLQSxHQUxBLEVBS0EsR0FMQSxDQUFBLEM7O0FBT0EsVUFBQSxPQUFBLEdBQUEsU0FBQSxDQUFBLFNBQUEsRUFDQSxNQURBLENBQ0EsTUFEQSxFQUVBLElBRkEsQ0FFQSxVQUFBLENBQUEsRUFBQSxDQUFBLEVBQUE7O0FBRUEsZUFBQSxFQUFBLElBQUEsQ0FBQSxLQUFBO0FBQ0EsT0FMQSxFQU1BLElBTkEsQ0FNQSxhQU5BLEVBTUEsUUFOQSxFQU9BLElBUEEsQ0FPQSxNQVBBLEVBT0EsT0FQQSxFQVFBLElBUkEsQ0FRQSxXQVJBLEVBUUEsVUFBQSxDQUFBLEVBQUE7QUFDQSxVQUFBLFdBQUEsR0FBQSxDQUFBO0FBQ0EsVUFBQSxXQUFBLEdBQUEsTUFBQTtBQUNBLGVBQUEsZUFBQSxJQUFBLFFBQUEsQ0FBQSxDQUFBLENBQUEsR0FBQSxHQUFBO0FBRUEsT0FiQSxDQUFBO0FBY0E7QUFqRkEsR0FBQTtBQW1GQSxDQXJGQTtBQ0ZBLElBQUEsU0FBQSxDQUFBLGVBQUEsRUFBQSxZQUFBO0FBQ0EsU0FBQTtBQUNBLGNBQUEsSUFEQTtBQUVBLFdBQUE7QUFDQSxlQUFBLEdBREE7QUFFQSxrQkFBQTtBQUZBLEtBRkE7QUFNQSxpQkFBQSxtREFOQTtBQU9BLFVBQUEsY0FBQSxLQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxDQUVBO0FBVEEsR0FBQTtBQVdBLENBWkE7OztBQ0VBLElBQUEsT0FBQSxDQUFBLG1CQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxTQUFBOzs7QUFHQSxhQUFBLGlCQUFBLGtCQUFBLEVBQUEsY0FBQSxFQUFBOztBQUVBLFVBQUEsbUJBQUEsTUFBQSxFQUFBOztBQUVBLGVBQUEsQ0FDQSxFQUFBLFdBQUEsWUFBQSxFQUFBLFVBQUEsV0FBQSxFQUFBLEtBQUEsS0FBQSxFQURBLEVBRUEsRUFBQSxXQUFBLE1BQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxLQUFBLElBQUEsRUFGQSxFQUdBLEVBQUEsV0FBQSxNQUFBLEVBQUEsVUFBQSxRQUFBLEVBQUEsS0FBQSxJQUFBLEVBSEEsRUFJQSxFQUFBLFdBQUEsUUFBQSxFQUFBLFVBQUEsT0FBQSxFQUFBLEtBQUEsTUFBQSxFQUpBLENBQUE7QUFNQSxPQVJBLE1BUUEsSUFBQSxtQkFBQSxTQUFBLEVBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLGtCQUFBLENBQUE7QUFDQTtBQUNBO0FBaEJBLEdBQUE7QUFrQkEsQ0FuQkE7O0FBcUJBLElBQUEsU0FBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLGlCQUFBLEVBQUE7QUFDQSxTQUFBO0FBQ0EsY0FBQSxJQURBO0FBRUEsV0FBQTtBQUNBLHNCQUFBLEdBREE7QUFFQSwyQkFBQSxHQUZBO0FBR0EseUJBQUE7QUFIQSxLQUZBO0FBT0EsaUJBQUEsMkNBUEE7Ozs7QUFXQSxVQUFBLGNBQUEsS0FBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUE7Ozs7O0FBS0EsWUFBQSxJQUFBLEdBQUEsa0JBQUEsT0FBQSxDQUFBLEtBQUEsbUJBQUEsRUFBQSxLQUFBLGlCQUFBLENBQUE7OztBQUdBO0FBbkJBLEdBQUE7QUFxQkEsQ0F0QkE7QUN2QkEsSUFBQSxTQUFBLENBQUEsYUFBQSxFQUFBLFlBQUE7QUFDQSxTQUFBO0FBQ0EsY0FBQSxJQURBO0FBRUEsV0FBQTtBQUNBLGdCQUFBLEdBREE7QUFFQSxlQUFBLEdBRkE7QUFHQSxnQkFBQSxHQUhBO0FBSUEsYUFBQSxHQUpBO0FBS0EsY0FBQSxHQUxBO0FBTUEsZUFBQSxHQU5BO0FBT0EsaUJBQUE7QUFQQSxLQUZBO0FBV0EsaUJBQUEsK0NBWEE7QUFZQSxVQUFBLGNBQUEsS0FBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUE7O0FBRUEsVUFBQSxRQUFBLEtBQUEsS0FBQTs7QUFFQSxZQUFBLElBQUEsR0FBQSxFQUFBOztBQUVBLFlBQUEsSUFBQSxDQUFBLEtBQUEsR0FBQTtBQUNBLGtCQUFBLEtBQUEsUUFEQTtBQUVBLGlCQUFBLEtBQUEsT0FGQTtBQUdBLGVBQUEsS0FBQTtBQUhBLE9BQUE7O0FBTUEsVUFBQSxVQUFBLE1BQUEsRUFBQTtBQUNBLGNBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxPQUFBLElBQUEsb0JBQUE7QUFDQTtBQUNBO0FBM0JBLEdBQUE7QUE2QkEsQ0E5QkE7QUNBQTtBQUNBLElBQUEsU0FBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLE9BQUEsRUFBQSxrQkFBQSxFQUFBO0FBQ0EsU0FBQTtBQUNBLGNBQUEsSUFEQTtBQUVBLFdBQUE7QUFDQSxlQUFBLEdBREE7QUFFQSxvQkFBQSxHQUZBO0FBR0EsZUFBQSxHQUhBO0FBSUEsZ0JBQUE7QUFKQSxLQUZBO0FBUUEsaUJBQUEsMkNBUkE7QUFTQSxVQUFBLGNBQUEsS0FBQSxFQUFBLElBQUEsRUFBQSxJQUFBLEVBQUE7QUFDQSxVQUFBLEtBQUEsUUFBQSxFQUFBOztBQUVBLGNBQUEsR0FBQSxDQUFBLEtBQUEsWUFBQSxFOztBQUVBLHlCQUFBLFdBQUEsQ0FBQSxLQUFBLFlBQUEsRUFBQSxNQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsZ0JBQUEsR0FBQSxDQUFBLFlBQUEsRUFBQSxLQUFBO0FBQ0EsY0FBQSxJQUFBLEdBQUEsS0FBQTs7QUFFQSxlQUFBLEtBQUE7QUFDQSxPQU5BLEVBTUEsSUFOQSxDQU1BLFVBQUEsS0FBQSxFQUFBOztBQUVBLGdCQUFBLEdBQUEsQ0FBQSxLQUFBOztBQUVBLFlBQUEsU0FBQSxFQUFBLEtBQUEsRUFBQSxFQUFBLE9BQUEsRUFBQSxFQUFBLFFBQUEsRUFBQSxFQUFBLE1BQUEsRUFBQSxFQUFBO0FBQUEsWUFDQSxRQUFBLEtBQUEsT0FBQSxHQUFBLE9BQUEsS0FBQSxHQUFBLE9BQUEsSUFEQTtBQUFBLFlBRUEsU0FBQSxLQUFBLFFBQUEsR0FBQSxPQUFBLEdBQUEsR0FBQSxPQUFBLE1BRkE7O0FBSUEsWUFBQSxJQUFBLENBQUE7QUFBQSxZQUNBLFdBQUEsR0FEQTtBQUFBLFlBRUEsSUFGQTs7QUFJQSxZQUFBLE9BQUEsR0FBQSxNQUFBLENBQUEsSUFBQSxHQUNBLElBREEsQ0FDQSxDQUFBLE1BQUEsRUFBQSxLQUFBLENBREEsQ0FBQTs7QUFHQSxZQUFBLFdBQUEsR0FBQSxHQUFBLENBQUEsUUFBQSxHQUNBLFVBREEsQ0FDQSxVQUFBLENBQUEsRUFBQTtBQUFBLGlCQUFBLENBQUEsRUFBQSxDQUFBLEVBQUEsRUFBQSxDQUFBLENBQUE7QUFBQSxTQURBLENBQUE7O0FBR0EsWUFBQSxNQUFBLEdBQUEsTUFBQSxDQUFBLFVBQUEsRUFBQSxNQUFBLENBQUEsS0FBQSxFQUNBLElBREEsQ0FDQSxPQURBLEVBQ0EsUUFBQSxPQUFBLEtBQUEsR0FBQSxPQUFBLElBREEsRUFFQSxJQUZBLENBRUEsUUFGQSxFQUVBLFNBQUEsT0FBQSxHQUFBLEdBQUEsT0FBQSxNQUZBLEVBR0EsTUFIQSxDQUdBLEdBSEEsRUFJQSxJQUpBLENBSUEsV0FKQSxFQUlBLGVBQUEsT0FBQSxJQUFBLEdBQUEsR0FBQSxHQUFBLE9BQUEsR0FBQSxHQUFBLEdBSkEsQ0FBQTs7QUFPQSxlQUFBLEtBQUE7QUFDQSxhQUFBLEVBQUEsR0FBQSxRQUFBLENBQUE7QUFDQSxhQUFBLEVBQUEsR0FBQSxDQUFBOztBQUVBLGlCQUFBLFFBQUEsQ0FBQSxDQUFBLEVBQUE7QUFDQSxjQUFBLEVBQUEsUUFBQSxFQUFBO0FBQ0EsY0FBQSxTQUFBLEdBQUEsRUFBQSxRQUFBO0FBQ0EsY0FBQSxTQUFBLENBQUEsT0FBQSxDQUFBLFFBQUE7QUFDQSxjQUFBLFFBQUEsR0FBQSxJQUFBO0FBQ0E7QUFDQTs7QUFFQSxhQUFBLFFBQUEsQ0FBQSxPQUFBLENBQUEsUUFBQTtBQUNBLGVBQUEsSUFBQTs7QUFHQSxXQUFBLE1BQUEsQ0FBQSxLQUFBLFlBQUEsRUFBQSxLQUFBLENBQUEsUUFBQSxFQUFBLFFBQUE7O0FBRUEsaUJBQUEsTUFBQSxDQUFBLE1BQUEsRUFBQTs7O0FBR0EsY0FBQSxRQUFBLEtBQUEsS0FBQSxDQUFBLElBQUEsRUFBQSxPQUFBLEVBQUE7QUFBQSxjQUNBLFFBQUEsS0FBQSxLQUFBLENBQUEsS0FBQSxDQURBOzs7QUFJQSxnQkFBQSxPQUFBLENBQUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxjQUFBLENBQUEsR0FBQSxFQUFBLEtBQUEsR0FBQSxFQUFBO0FBQUEsV0FBQTs7OztBQUlBLGNBQUEsT0FBQSxJQUFBLFNBQUEsQ0FBQSxRQUFBLEVBQ0EsSUFEQSxDQUNBLEtBREEsRUFDQSxVQUFBLENBQUEsRUFBQTtBQUFBLG1CQUFBLEVBQUEsRUFBQSxLQUFBLEVBQUEsRUFBQSxHQUFBLEVBQUEsQ0FBQSxDQUFBO0FBQUEsV0FEQSxDQUFBOzs7QUFJQSxjQUFBLFlBQUEsS0FBQSxLQUFBLEdBQUEsTUFBQSxDQUFBLEdBQUEsRUFDQSxJQURBLENBQ0EsT0FEQSxFQUNBLE1BREEsRUFFQSxJQUZBLENBRUEsV0FGQSxFQUVBLFVBQUEsQ0FBQSxFQUFBO0FBQUEsbUJBQUEsZUFBQSxPQUFBLEVBQUEsR0FBQSxHQUFBLEdBQUEsT0FBQSxFQUFBLEdBQUEsR0FBQTtBQUFBLFdBRkEsRUFHQSxFQUhBLENBR0EsT0FIQSxFQUdBLEtBSEEsQ0FBQTs7QUFLQSxvQkFBQSxNQUFBLENBQUEsUUFBQSxFQUNBLElBREEsQ0FDQSxHQURBLEVBQ0EsSUFEQSxFQUVBLEtBRkEsQ0FFQSxNQUZBLEVBRUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxtQkFBQSxFQUFBLFNBQUEsR0FBQSxnQkFBQSxHQUFBLE1BQUE7QUFBQSxXQUZBOztBQUlBLG9CQUFBLE1BQUEsQ0FBQSxNQUFBLEVBQ0EsSUFEQSxDQUNBLEdBREEsRUFDQSxVQUFBLENBQUEsRUFBQTtBQUFBLG1CQUFBLEVBQUEsUUFBQSxJQUFBLEVBQUEsU0FBQSxHQUFBLENBQUEsR0FBQSxFQUFBO0FBQUEsV0FEQSxFQUVBLElBRkEsQ0FFQSxHQUZBLEVBRUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxtQkFBQSxFQUFBLFFBQUEsSUFBQSxFQUFBLFNBQUEsR0FBQSxLQUFBLEtBQUEsQ0FBQSxLQUFBLE1BQUEsS0FBQSxDQUFBLElBQUEsQ0FBQSxHQUFBLEtBQUEsS0FBQSxDQUFBLEtBQUEsTUFBQSxLQUFBLENBQUEsSUFBQSxDQUFBO0FBQUEsV0FGQSxFQUdBLElBSEEsQ0FHQSxJQUhBLEVBR0EsT0FIQSxFQUlBLElBSkEsQ0FJQSxhQUpBLEVBSUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxtQkFBQSxFQUFBLFFBQUEsSUFBQSxFQUFBLFNBQUEsR0FBQSxLQUFBLEdBQUEsT0FBQTtBQUFBLFdBSkEsRUFLQSxJQUxBLENBS0EsVUFBQSxDQUFBLEVBQUE7QUFBQSxtQkFBQSxFQUFBLElBQUEsSUFBQSxFQUFBLFdBQUEsSUFBQSxtQkFBQSxFQUFBLFdBQUE7QUFBQSxXQUxBLEVBTUEsS0FOQSxDQU1BLGNBTkEsRUFNQSxJQU5BLEVBT0EsSUFQQSxDQU9BLE9BUEEsRUFPQSx3REFQQTs7O0FBVUEsY0FBQSxhQUFBLEtBQUEsVUFBQSxHQUNBLFFBREEsQ0FDQSxRQURBLEVBRUEsSUFGQSxDQUVBLFdBRkEsRUFFQSxVQUFBLENBQUEsRUFBQTtBQUFBLG1CQUFBLGVBQUEsRUFBQSxDQUFBLEdBQUEsR0FBQSxHQUFBLEVBQUEsQ0FBQSxHQUFBLEdBQUE7QUFBQSxXQUZBLENBQUE7O0FBSUEscUJBQUEsTUFBQSxDQUFBLFFBQUEsRUFDQSxJQURBLENBQ0EsR0FEQSxFQUNBLEdBREEsRUFFQSxLQUZBLENBRUEsTUFGQSxFQUVBLFVBQUEsQ0FBQSxFQUFBO0FBQUEsbUJBQUEsRUFBQSxTQUFBLEdBQUEsZ0JBQUEsR0FBQSxNQUFBO0FBQUEsV0FGQTs7QUFJQSxxQkFBQSxNQUFBLENBQUEsTUFBQSxFQUNBLEtBREEsQ0FDQSxjQURBLEVBQ0EsQ0FEQTs7O0FBSUEsY0FBQSxXQUFBLEtBQUEsSUFBQSxHQUFBLFVBQUEsR0FDQSxRQURBLENBQ0EsUUFEQSxFQUVBLElBRkEsQ0FFQSxXQUZBLEVBRUEsVUFBQSxDQUFBLEVBQUE7QUFBQSxtQkFBQSxlQUFBLE9BQUEsQ0FBQSxHQUFBLEdBQUEsR0FBQSxPQUFBLENBQUEsR0FBQSxHQUFBO0FBQUEsV0FGQSxFQUdBLE1BSEEsRUFBQTs7QUFLQSxtQkFBQSxNQUFBLENBQUEsUUFBQSxFQUNBLElBREEsQ0FDQSxHQURBLEVBQ0EsSUFEQTs7QUFHQSxtQkFBQSxNQUFBLENBQUEsTUFBQSxFQUNBLEtBREEsQ0FDQSxjQURBLEVBQ0EsSUFEQTs7O0FBSUEsY0FBQSxPQUFBLElBQUEsU0FBQSxDQUFBLFdBQUEsRUFDQSxJQURBLENBQ0EsS0FEQSxFQUNBLFVBQUEsQ0FBQSxFQUFBO0FBQUEsbUJBQUEsRUFBQSxNQUFBLENBQUEsRUFBQTtBQUFBLFdBREEsQ0FBQTs7O0FBSUEsZUFBQSxLQUFBLEdBQUEsTUFBQSxDQUFBLE1BQUEsRUFBQSxHQUFBLEVBQ0EsSUFEQSxDQUNBLE9BREEsRUFDQSxNQURBLEVBRUEsSUFGQSxDQUVBLEdBRkEsRUFFQSxVQUFBLENBQUEsRUFBQTtBQUNBLGdCQUFBLElBQUEsRUFBQSxHQUFBLE9BQUEsRUFBQSxFQUFBLEdBQUEsT0FBQSxFQUFBLEVBQUE7QUFDQSxtQkFBQSxTQUFBLEVBQUEsUUFBQSxDQUFBLEVBQUEsUUFBQSxDQUFBLEVBQUEsQ0FBQTtBQUNBLFdBTEE7OztBQVFBLGVBQUEsVUFBQSxHQUNBLFFBREEsQ0FDQSxRQURBLEVBRUEsSUFGQSxDQUVBLEdBRkEsRUFFQSxRQUZBOzs7QUFLQSxlQUFBLElBQUEsR0FBQSxVQUFBLEdBQ0EsUUFEQSxDQUNBLFFBREEsRUFFQSxJQUZBLENBRUEsR0FGQSxFQUVBLFVBQUEsQ0FBQSxFQUFBO0FBQ0EsZ0JBQUEsSUFBQSxFQUFBLEdBQUEsT0FBQSxDQUFBLEVBQUEsR0FBQSxPQUFBLENBQUEsRUFBQTtBQUNBLG1CQUFBLFNBQUEsRUFBQSxRQUFBLENBQUEsRUFBQSxRQUFBLENBQUEsRUFBQSxDQUFBO0FBQ0EsV0FMQSxFQU1BLE1BTkE7OztBQVNBLGdCQUFBLE9BQUEsQ0FBQSxVQUFBLENBQUEsRUFBQTtBQUNBLGNBQUEsRUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLGNBQUEsRUFBQSxHQUFBLEVBQUEsQ0FBQTtBQUNBLFdBSEE7QUFJQTs7O0FBR0EsaUJBQUEsS0FBQSxDQUFBLENBQUEsRUFBQTtBQUNBLGNBQUEsRUFBQSxRQUFBLEVBQUE7QUFDQSxjQUFBLFNBQUEsR0FBQSxFQUFBLFFBQUE7QUFDQSxjQUFBLFFBQUEsR0FBQSxJQUFBO0FBQ0EsV0FIQSxNQUdBO0FBQ0EsY0FBQSxRQUFBLEdBQUEsRUFBQSxTQUFBO0FBQ0EsY0FBQSxTQUFBLEdBQUEsSUFBQTtBQUNBO0FBQ0EsaUJBQUEsQ0FBQTtBQUNBO0FBRUEsT0F2SkEsRTtBQXdKQTtBQXRLQSxHQUFBO0FBd0tBLENBektBOztBQ0FBLElBQUEsU0FBQSxDQUFBLGFBQUEsRUFBQSxZQUFBO0FBQ0EsU0FBQTtBQUNBLGNBQUEsSUFEQTtBQUVBLFdBQUE7QUFDQSxlQUFBLEdBREE7QUFFQSxjQUFBO0FBRkEsS0FGQTtBQU1BLGlCQUFBLCtDQU5BO0FBT0EsVUFBQSxjQUFBLEtBQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBLENBRUE7QUFUQSxHQUFBO0FBV0EsQ0FaQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xuXG53aW5kb3cuYXBwID0gYW5ndWxhci5tb2R1bGUoJ0Z1bGxzdGFja0dlbmVyYXRlZEFwcCcsIFsnZnNhUHJlQnVpbHQnLCAndWkucm91dGVyJywgJ3VpLmJvb3RzdHJhcCcsICduZ0FuaW1hdGUnLCAnbnZkMycsICduZ0ZpbGVVcGxvYWQnXSk7XG5cbmFwcC5jb25maWcoZnVuY3Rpb24gKCR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcbiAgICAvLyBUaGlzIHR1cm5zIG9mZiBoYXNoYmFuZyB1cmxzICgvI2Fib3V0KSBhbmQgY2hhbmdlcyBpdCB0byBzb21ldGhpbmcgbm9ybWFsICgvYWJvdXQpXG4gICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuICAgIC8vIElmIHdlIGdvIHRvIGEgVVJMIHRoYXQgdWktcm91dGVyIGRvZXNuJ3QgaGF2ZSByZWdpc3RlcmVkLCBnbyB0byB0aGUgXCIvXCIgdXJsLlxuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcbiAgICAvLyBUcmlnZ2VyIHBhZ2UgcmVmcmVzaCB3aGVuIGFjY2Vzc2luZyBhbiBPQXV0aCByb3V0ZVxuICAgICR1cmxSb3V0ZXJQcm92aWRlci53aGVuKCcvYXV0aC86cHJvdmlkZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICB9KTtcbn0pO1xuXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGNvbnRyb2xsaW5nIGFjY2VzcyB0byBzcGVjaWZpYyBzdGF0ZXMuXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAvLyBUaGUgZ2l2ZW4gc3RhdGUgcmVxdWlyZXMgYW4gYXV0aGVudGljYXRlZCB1c2VyLlxuICAgIHZhciBkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5kYXRhICYmIHN0YXRlLmRhdGEuYXV0aGVudGljYXRlO1xuICAgIH07XG5cbiAgICAvLyAkc3RhdGVDaGFuZ2VTdGFydCBpcyBhbiBldmVudCBmaXJlZFxuICAgIC8vIHdoZW5ldmVyIHRoZSBwcm9jZXNzIG9mIGNoYW5naW5nIGEgc3RhdGUgYmVnaW5zLlxuICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uIChldmVudCwgdG9TdGF0ZSwgdG9QYXJhbXMpIHtcblxuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgodG9TdGF0ZSkpIHtcbiAgICAgICAgICAgIC8vIFRoZSBkZXN0aW5hdGlvbiBzdGF0ZSBkb2VzIG5vdCByZXF1aXJlIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgdXNlciBpcyBhdXRoZW50aWNhdGVkLlxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbmNlbCBuYXZpZ2F0aW5nIHRvIG5ldyBzdGF0ZS5cbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAvLyBJZiBhIHVzZXIgaXMgcmV0cmlldmVkLCB0aGVuIHJlbmF2aWdhdGUgdG8gdGhlIGRlc3RpbmF0aW9uXG4gICAgICAgICAgICAvLyAodGhlIHNlY29uZCB0aW1lLCBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSB3aWxsIHdvcmspXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UsIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLCBnbyB0byBcImxvZ2luXCIgc3RhdGUuXG4gICAgICAgICAgICBpZiAodXNlcikge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbyh0b1N0YXRlLm5hbWUsIHRvUGFyYW1zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIH0pO1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAvLyBSZWdpc3RlciBvdXIgKmFib3V0KiBzdGF0ZS5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnYWJvdXQnLCB7XG4gICAgICAgIHVybDogJy9hYm91dCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBYm91dENvbnRyb2xsZXInLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2Fib3V0L2Fib3V0Lmh0bWwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignQWJvdXRDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSkge1xuXG5cblxufSk7IiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnZG9jcycsIHtcbiAgICAgICAgdXJsOiAnL2RvY3MnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2RvY3MvZG9jcy5odG1sJ1xuICAgIH0pO1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uKCRzdGF0ZVByb3ZpZGVyKXtcblx0JHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2RhdGFzb3VyY2VzJywge1xuXHRcdHVybDogJy9kYXRhc291cmNlcycsXG5cdFx0dGVtcGxhdGVVcmw6ICdqcy9kYXRhc291cmNlcy9kYXRhc291cmNlcy5odG1sJyxcblx0XHRjb250cm9sbGVyOiAnRHNDb250cm9sbGVyJyxcblx0XHRyZXNvbHZlOiB7XG5cdFx0XHR1c2VyRGF0YTogZnVuY3Rpb24ocHJvamVjdERhdGFGYWN0b3J5LCBBdXRoU2VydmljZSkge1xuXHRcdFx0XHRyZXR1cm4gQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKClcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24odXNlcil7XG5cdFx0XHRcdFx0aWYgKHVzZXIpe1xuXHRcdFx0XHRcdFx0dmFyIHVzZXJJZCA9IHVzZXIuX2lkO1xuXHRcdFx0XHRcdFx0cmV0dXJuIHByb2plY3REYXRhRmFjdG9yeS5kYXRhQnlVc2VySWQodXNlcklkKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0RzQ29udHJvbGxlcicsIGZ1bmN0aW9uKCRzY29wZSwgdXNlckRhdGEsICR1aWJNb2RhbCl7XG5cdCRzY29wZS51c2VyRGF0YSA9IHVzZXJEYXRhO1xuXHQkc2NvcGUub3BlbiA9IGZ1bmN0aW9uKF9kYXRhKXtcblx0ICB2YXIgbW9kYWxJbnN0YW5jZSA9ICR1aWJNb2RhbC5vcGVuKHtcblx0ICAgIGNvbnRyb2xsZXI6ICdNb2RhbENvbnRyb2xsZXInLFxuXHQgICAgdGVtcGxhdGVVcmw6ICdqcy9kYXRhc291cmNlcy9tb2RhbENvbnRlbnQuaHRtbCcsXG5cdCAgICByZXNvbHZlOiB7XG5cdCAgICAgIGRhdGE6IGZ1bmN0aW9uKCl7XG5cdCAgICAgICAgcmV0dXJuIF9kYXRhO1xuXHQgICAgICB9XG5cdCAgICB9XG5cdCAgfSk7XG5cdH07XG59KTsiLCJhcHAuY29udHJvbGxlcignTW9kYWxDb250cm9sbGVyJywgZnVuY3Rpb24oJHNjb3BlLGRhdGEsICR1aWJNb2RhbEluc3RhbmNlKXtcblx0JHNjb3BlLmRhdGEgPSBkYXRhO1xuXG5cdCRzY29wZS5jbG9zZSA9IGZ1bmN0aW9uKCkge1xuXHRcdCR1aWJNb2RhbEluc3RhbmNlLmNsb3NlKCk7XG5cdH07XG59KTsiLCJhcHAuZGlyZWN0aXZlKCdhaURvd25sb2FkJywgWydEb3dubG9hZEZhY3RvcnknLCBmdW5jdGlvbihEb3dubG9hZEZhY3RvcnkpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHRlbXBsYXRlVXJsOiAnL2pzL2Rvd25sb2FkL2Rvd25sb2FkLmh0bWwnLFxuICAgIHNjb3BlOiAnPScsXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQpIHtcbiAgICAgIHNjb3BlLmRvd25sb2FkSHRtbCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBEb3dubG9hZEZhY3RvcnkuZ2V0SHRtbChzY29wZS5wcm9qSWQpXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24oaHRtbGZpbGUpIHtcbiAgICAgICAgICAgIHZhciBteUh0bWxGaWxlID0gbmV3IEZpbGUoW2h0bWxmaWxlLmRhdGFdLCB7IHR5cGU6ICd0ZXh0L2h0bWwnIH0pO1xuICAgICAgICAgICAgc2F2ZUFzKG15SHRtbEZpbGUsICdpbmRleC5odG1sJyk7XG4gICAgICAgICAgfSk7XG4gICAgICB9O1xuXG4gICAgICBzY29wZS5kb3dubG9hZEpzID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIERvd25sb2FkRmFjdG9yeS5nZXRKcyhzY29wZS5wcm9qSWQpXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24oanNmaWxlKSB7XG4gICAgICAgICAgICB2YXIgbXlKc0ZpbGUgPSBuZXcgRmlsZShbanNmaWxlLmRhdGFdLCB7IHR5cGU6ICdhcHBsaWNhdGlvbi9qYXZhc2NyaXB0JyB9KTtcbiAgICAgICAgICAgIHNhdmVBcyhteUpzRmlsZSwgJ3NjcmlwdC5qcycpO1xuICAgICAgICAgIH0pO1xuICAgICAgfTtcbiAgICB9XG4gIH07XG59XSk7XG5cbmFwcC5mYWN0b3J5KCdEb3dubG9hZEZhY3RvcnknLCBbJyRodHRwJywgZnVuY3Rpb24oJGh0dHApIHtcbiAgcmV0dXJuIHtcbiAgICBnZXRKczogZnVuY3Rpb24oaWQpIHtcbiAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvZ2VuZXJhdG9yL2pzLycgKyBpZCk7XG4gICAgfSxcbiAgICBnZXRIdG1sOiBmdW5jdGlvbihpZCkge1xuICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9nZW5lcmF0b3IvaHRtbC8nICsgaWQpO1xuICAgIH1cbiAgfTtcbn1dKTsiLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy8gSG9wZSB5b3UgZGlkbid0IGZvcmdldCBBbmd1bGFyISBEdWgtZG95LlxuICAgIGlmICghd2luZG93LmFuZ3VsYXIpIHRocm93IG5ldyBFcnJvcignSSBjYW5cXCd0IGZpbmQgQW5ndWxhciEnKTtcblxuICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnZnNhUHJlQnVpbHQnLCBbXSk7XG5cblxuXG4gICAgLy8gQVVUSF9FVkVOVFMgaXMgdXNlZCB0aHJvdWdob3V0IG91ciBhcHAgdG9cbiAgICAvLyBicm9hZGNhc3QgYW5kIGxpc3RlbiBmcm9tIGFuZCB0byB0aGUgJHJvb3RTY29wZVxuICAgIC8vIGZvciBpbXBvcnRhbnQgZXZlbnRzIGFib3V0IGF1dGhlbnRpY2F0aW9uIGZsb3cuXG4gICAgYXBwLmNvbnN0YW50KCdBVVRIX0VWRU5UUycsIHtcbiAgICAgICAgbG9naW5TdWNjZXNzOiAnYXV0aC1sb2dpbi1zdWNjZXNzJyxcbiAgICAgICAgbG9naW5GYWlsZWQ6ICdhdXRoLWxvZ2luLWZhaWxlZCcsXG4gICAgICAgIGxvZ291dFN1Y2Nlc3M6ICdhdXRoLWxvZ291dC1zdWNjZXNzJyxcbiAgICAgICAgc2Vzc2lvblRpbWVvdXQ6ICdhdXRoLXNlc3Npb24tdGltZW91dCcsXG4gICAgICAgIG5vdEF1dGhlbnRpY2F0ZWQ6ICdhdXRoLW5vdC1hdXRoZW50aWNhdGVkJyxcbiAgICAgICAgbm90QXV0aG9yaXplZDogJ2F1dGgtbm90LWF1dGhvcml6ZWQnXG4gICAgfSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnQXV0aEludGVyY2VwdG9yJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRxLCBBVVRIX0VWRU5UUykge1xuICAgICAgICB2YXIgc3RhdHVzRGljdCA9IHtcbiAgICAgICAgICAgIDQwMTogQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCxcbiAgICAgICAgICAgIDQwMzogQVVUSF9FVkVOVFMubm90QXV0aG9yaXplZCxcbiAgICAgICAgICAgIDQxOTogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsXG4gICAgICAgICAgICA0NDA6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXNwb25zZUVycm9yOiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3Qoc3RhdHVzRGljdFtyZXNwb25zZS5zdGF0dXNdLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcblxuICAgIGFwcC5jb25maWcoZnVuY3Rpb24gKCRodHRwUHJvdmlkZXIpIHtcbiAgICAgICAgJGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaChbXG4gICAgICAgICAgICAnJGluamVjdG9yJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uICgkaW5qZWN0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJGluamVjdG9yLmdldCgnQXV0aEludGVyY2VwdG9yJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIF0pO1xuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ0F1dGhTZXJ2aWNlJywgZnVuY3Rpb24gKCRodHRwLCBTZXNzaW9uLCAkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUywgJHEpIHtcblxuICAgICAgICBmdW5jdGlvbiBvblN1Y2Nlc3NmdWxMb2dpbihyZXNwb25zZSkge1xuICAgICAgICAgICAgdmFyIGRhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgU2Vzc2lvbi5jcmVhdGUoZGF0YS5pZCwgZGF0YS51c2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MpO1xuICAgICAgICAgICAgcmV0dXJuIGRhdGEudXNlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZXMgdGhlIHNlc3Npb24gZmFjdG9yeSB0byBzZWUgaWYgYW5cbiAgICAgICAgLy8gYXV0aGVudGljYXRlZCB1c2VyIGlzIGN1cnJlbnRseSByZWdpc3RlcmVkLlxuICAgICAgICB0aGlzLmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAhIVNlc3Npb24udXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldExvZ2dlZEluVXNlciA9IGZ1bmN0aW9uIChmcm9tU2VydmVyKSB7XG5cbiAgICAgICAgICAgIC8vIElmIGFuIGF1dGhlbnRpY2F0ZWQgc2Vzc2lvbiBleGlzdHMsIHdlXG4gICAgICAgICAgICAvLyByZXR1cm4gdGhlIHVzZXIgYXR0YWNoZWQgdG8gdGhhdCBzZXNzaW9uXG4gICAgICAgICAgICAvLyB3aXRoIGEgcHJvbWlzZS4gVGhpcyBlbnN1cmVzIHRoYXQgd2UgY2FuXG4gICAgICAgICAgICAvLyBhbHdheXMgaW50ZXJmYWNlIHdpdGggdGhpcyBtZXRob2QgYXN5bmNocm9ub3VzbHkuXG5cbiAgICAgICAgICAgIC8vIE9wdGlvbmFsbHksIGlmIHRydWUgaXMgZ2l2ZW4gYXMgdGhlIGZyb21TZXJ2ZXIgcGFyYW1ldGVyLFxuICAgICAgICAgICAgLy8gdGhlbiB0aGlzIGNhY2hlZCB2YWx1ZSB3aWxsIG5vdCBiZSB1c2VkLlxuXG4gICAgICAgICAgICBpZiAodGhpcy5pc0F1dGhlbnRpY2F0ZWQoKSAmJiBmcm9tU2VydmVyICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLndoZW4oU2Vzc2lvbi51c2VyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFrZSByZXF1ZXN0IEdFVCAvc2Vzc2lvbi5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSB1c2VyLCBjYWxsIG9uU3VjY2Vzc2Z1bExvZ2luIHdpdGggdGhlIHJlc3BvbnNlLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIDQwMSByZXNwb25zZSwgd2UgY2F0Y2ggaXQgYW5kIGluc3RlYWQgcmVzb2x2ZSB0byBudWxsLlxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL3Nlc3Npb24nKS50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9naW4gPSBmdW5jdGlvbiAoY3JlZGVudGlhbHMpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9naW4nLCBjcmVkZW50aWFscylcbiAgICAgICAgICAgICAgICAudGhlbihvblN1Y2Nlc3NmdWxMb2dpbilcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHsgbWVzc2FnZTogJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJyB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9sb2dvdXQnKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBTZXNzaW9uLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9nb3V0U3VjY2Vzcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ1Nlc3Npb24nLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMpIHtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5pZCA9IG51bGw7XG4gICAgICAgIHRoaXMudXNlciA9IG51bGw7XG5cbiAgICAgICAgdGhpcy5jcmVhdGUgPSBmdW5jdGlvbiAoc2Vzc2lvbklkLCB1c2VyKSB7XG4gICAgICAgICAgICB0aGlzLmlkID0gc2Vzc2lvbklkO1xuICAgICAgICAgICAgdGhpcy51c2VyID0gdXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmlkID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IG51bGw7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxufSkoKTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9naW4nLCB7XG4gICAgICAgIHVybDogJy9sb2dpbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vbG9naW4uaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignTG9naW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgJHNjb3BlLmxvZ2luID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICRzY29wZS5zZW5kTG9naW4gPSBmdW5jdGlvbiAobG9naW5JbmZvKSB7XG5cbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICAgICBBdXRoU2VydmljZS5sb2dpbihsb2dpbkluZm8pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxufSk7IiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaG9tZScsIHtcbiAgICAgICAgdXJsOiAnLycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvaG9tZS9ob21lLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOidIb21lQ29udHJvbCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICBwcm9qZWN0czogZnVuY3Rpb24oUHJvamVjdEZhY3RvcnksJHN0YXRlUGFyYW1zKXtcbiAgICAgICAgICAgIGlmKCRzdGF0ZVBhcmFtcy5pZCl7XG5cbiAgICAgICAgICAgICAgcmV0dXJuIFByb2plY3RGYWN0b3J5LmdldE9uZSgkc3RhdGVQYXJhbXMuaWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfSxcbiAgICAgICAgICB1c2VyRGF0YTogZnVuY3Rpb24ocHJvamVjdERhdGFGYWN0b3J5LCBBdXRoU2VydmljZSl7XG4gICAgICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuICAgICAgICAgICAgICBpZih1c2VyKXtcbiAgICAgICAgICAgICAgICB2YXIgdXNlcklkID0gdXNlci5faWRcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvamVjdERhdGFGYWN0b3J5LmRhdGFCeVVzZXJJZCh1c2VySWQpO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIHVzZXI6IGZ1bmN0aW9uKEF1dGhTZXJ2aWNlKXtcbiAgICAgICAgICAvLyAgIHJldHVybiBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKTtcbiAgICAgICAgICAvLyB9XG4gICAgICAgIH1cbiAgICB9KTtcbn0pO1xuXG5hcHAuY29udHJvbGxlcignSG9tZUNvbnRyb2wnLCBmdW5jdGlvbigkc2NvcGUscHJvamVjdHMsJHJvb3RTY29wZSxBdXRoU2VydmljZSxBVVRIX0VWRU5UUywkc3RhdGVQYXJhbXMsUHJvamVjdEZhY3RvcnksJHN0YXRlLCRsb2NhdGlvbiwgJGFuY2hvclNjcm9sbCx1c2VyRGF0YSwkdWliTW9kYWwpe1xuICAkc2NvcGUucHJvamVjdHM9cHJvamVjdHM7XG4gICRzY29wZS5oZWxsbz0kc3RhdGVQYXJhbXMuaWQ7XG5cbiAgLy8gLy9Vc2VyIGRhdGEgYW5kIE1vZGFsIEZ1bmN0aW9uYWxpdHlcbiAgLy8gJHNjb3BlLnVzZXJEYXRhID0gdXNlckRhdGE7XG4gIC8vICRzY29wZS5vcGVuID0gZnVuY3Rpb24oX2RhdGEpe1xuICAvLyAgIHZhciBtb2RhbEluc3RhbmNlID0gJHVpYk1vZGFsLm9wZW4oe1xuICAvLyAgICAgY29udHJvbGxlcjogJ01vZGFsQ29udHJvbGxlcicsXG4gIC8vICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvbW9kYWxDb250ZW50Lmh0bWwnLFxuICAvLyAgICAgcmVzb2x2ZToge1xuICAvLyAgICAgICBkYXRhOiBmdW5jdGlvbigpe1xuICAvLyAgICAgICAgIHJldHVybiBfZGF0YTtcbiAgLy8gICAgICAgfVxuICAvLyAgICAgfVxuICAvLyAgIH0pO1xuICAvLyB9O1xuXG4gICAkc2NvcGUuc2Nyb2xsVG8gPSBmdW5jdGlvbihpZCkge1xuICAgICAgJGxvY2F0aW9uLmhhc2goaWQpO1xuICAgICAgJGFuY2hvclNjcm9sbCgpO1xuICAgfVxuXG4gICAkc2NvcGUuc2lnbnVwID0gZnVuY3Rpb24oKXtcbiAgICAkc3RhdGUuZ28oJ3NpZ251cCcpO1xuICAgfVxuXG4gICRzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICAgICAgICAgIH07XG5cbiAgdmFyIGdldFVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1c2VyXG4gICAgICAgICAgICAgICAgfSkudGhlbihnZXRQcm9qZWN0cyk7XG4gICAgICAgICAgICB9O1xuICB2YXIgZ2V0UHJvamVjdHMgPSBmdW5jdGlvbiAodXNlcikge1xuXG4gICAgICAgICAgICAgIGlmKHVzZXIpe1xuICAgICAgICAgICAgICAgIFByb2plY3RGYWN0b3J5LmdldEFsbEJ5VXNlcigkc2NvcGUudXNlci5faWQpXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHByb2plY3RzKXtcbiAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUucHJvamVjdHM9cHJvamVjdHM7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgJHNjb3BlLmFkZFByb2plY3QgPSBmdW5jdGlvbigpe1xuICAgIGxldCBfdXNlcj0gbnVsbDtcblxuICAgIGlmKEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpKXtcbiAgICAgIF91c2VyPSRzY29wZS51c2VyO1xuICAgIH1cblxuICAgIHJldHVybiBQcm9qZWN0RmFjdG9yeS5hZGQoe1xuICAgICAgICBuYW1lOiRzY29wZS5wcm9qZWN0TmFtZSxcbiAgICAgICAgdXNlcjpfdXNlclxuICAgICAgfSkudGhlbihmdW5jdGlvbihuZXdQcm9qZWN0KXtcbiAgICAgICAgJHN0YXRlLmdvKCdwcm9qZWN0Jyx7aWQ6bmV3UHJvamVjdC5faWR9KTtcbiAgICAgIH0pXG4gIH07XG4gIGdldFVzZXIoKTtcbn0pOyIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcbiAgJHN0YXRlUHJvdmlkZXIuXG4gIHN0YXRlKCdwcm9qZWN0Jywge1xuICAgIHVybDogJy9wcm9qZWN0LzppZCcsXG4gICAgdGVtcGxhdGVVcmw6ICcvanMvcHJvamVjdHMvcHJvamVjdC5lZGl0Lmh0bWwnLFxuICAgIGNvbnRyb2xsZXI6J1Byb2plY3RFZGl0Q3RybCcsXG4gICAgcmVzb2x2ZToge1xuICAgICAgcHJvamVjdDogZnVuY3Rpb24oUHJvamVjdEZhY3RvcnksJHN0YXRlUGFyYW1zKSB7XG4gICAgICAgIHJldHVybiBQcm9qZWN0RmFjdG9yeS5nZXRPbmUoJHN0YXRlUGFyYW1zLmlkKTtcbiAgICAgIH0sXG4gICAgICBkYXRhRmlsZXM6IGZ1bmN0aW9uKHByb2plY3REYXRhRmFjdG9yeSwgJHN0YXRlUGFyYW1zKXtcbiAgICAgICAgcmV0dXJuIHByb2plY3REYXRhRmFjdG9yeS5kYXRhQnlQcm9qSWQoJHN0YXRlUGFyYW1zLmlkKTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufSk7IiwiXG5hcHAuY29udHJvbGxlcignUHJvamVjdEVkaXRDdHJseCcsIGZ1bmN0aW9uKCRzY29wZSwkY29tcGlsZSwkdGltZW91dCxwcm9qZWN0LGRhdGFGaWxlcyxtYW5pZmVzdEZhY3RvcnksJHN0YXRlUGFyYW1zLEF1dGhTZXJ2aWNlLFByb2plY3RGYWN0b3J5LFVwbG9hZCl7XG4vLyBURVNUIFRIRSBGT0xMT1dJTkcgRlVOQ1RJT05TXG4vLyBhZGQgYSBwYWdlXG4vLyBhZGQgYSByb3dcbi8vIGFkZCBhIGNvbHVtblxuLy8gYWRkIGEgZGlyZWN0aXZlXG5cbi8vIFByb2plY3QgSWQgJiBVc2VyIElkXG4kc2NvcGUucHJvaklkID0gJHN0YXRlUGFyYW1zLmlkO1xudmFyIGdldFVzZXJJZCA9IGZ1bmN0aW9uKCl7XG4gIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpe1xuICAgICRzY29wZS51c2VySWQgPSB1c2VyLl9pZDtcbiAgfSlcbn1cbmdldFVzZXJJZCgpO1xuXG4vL2ZpbGVVcGxvYWRlciBGdW5jdGlvbmFsaXR5XG4kc2NvcGUudXBsb2FkZWRGaWxlcyA9IGRhdGFGaWxlcztcbiRzY29wZS51cGxvYWRGaWxlcyA9IGZ1bmN0aW9uKGZpbGUsIGVyckZpbGVzKSB7XG4gICRzY29wZS5mID0gZmlsZTtcbiAgJHNjb3BlLmVyckZpbGUgPSBlcnJGaWxlcyAmJiBlcnJGaWxlc1swXTtcbiAgaWYgKGZpbGUpIHtcbiAgICBmaWxlLnVwbG9hZCA9IFVwbG9hZC51cGxvYWQoe1xuICAgICAgICB1cmw6ICcvYXBpL2RhdGEvJyArICRzY29wZS5wcm9qSWQgKyAnLycgKyAkc2NvcGUudXNlcklkLFxuICAgICAgICBkYXRhOiB7ZmlsZTogZmlsZX0sXG4gICAgICAgIG1ldGhvZDogJ1BPU1QnXG4gICAgfSk7XG5cbiAgICBmaWxlLnVwbG9hZC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmaWxlLnJlc3VsdCA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICAkc2NvcGUudXBsb2FkZWRGaWxlcy5wdXNoKGZpbGUucmVzdWx0KTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCRzY29wZS51cGxvYWRlZEZpbGVzKTtcbiAgICAgICAgfSk7XG4gICAgfSwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPiAwKVxuICAgICAgICAgICAgJHNjb3BlLmVycm9yTXNnID0gcmVzcG9uc2Uuc3RhdHVzICsgJzogJyArIHJlc3BvbnNlLmRhdGE7XG4gICAgfSwgZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICBmaWxlLnByb2dyZXNzID0gTWF0aC5taW4oMTAwLCBwYXJzZUludCgxMDAuMCAqXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldnQubG9hZGVkIC8gZXZ0LnRvdGFsKSk7XG4gICAgfSk7XG4gIH1cbn07XG5cbi8vaW5mb3NvdXJjZVxuJHNjb3BlLnNlbGVjdGVkSW5mb3NvdXJjZSA9IGZ1bmN0aW9uKCl7fVxuXG5cbi8vIHRoaXMgaXMgdGhlIGFwcCBjb25maWdcbiRzY29wZS5hbGxNYW5pZmVzdHM9e307XG4kc2NvcGUuYXBwQ29uZmlnTWFzdGVyPXt9OyAvLyB0aGlzIHRoZSB2ZXJzaW9uIHRoYXQgaXMgaW4gc3luYyB3aXRoIHRoZSBkYXRhYmFzZSAwdGggcG9zaXRpb25cbiRzY29wZS5hcHBDb25maWdMYXlvdXRFZGl0Q29weT17fVxuJHNjb3BlLmFwcENvbmZpZ0VkaXRDb3B5PXt9OyAvLyB0aGlzIGlzIHRoZSBjb3B5IG9mIG9mIG9iamVjdCBiZWluZyBlZGl0ZWQgdGhhdCBjb3BpZWQgdG8gYXBwQ29uZmlnVmlld0RyaXZlciB3aGVuO1xuJHNjb3BlLmFwcENvbmZpZ1ZpZXdEcml2ZXI9e307IC8vIHRoaXMgaXMgdGhlIGNvcHkgb2Ygb2Ygb2JqZWN0IGJlaW5nIGVkaXRlZCB0aGF0IGNvcGllZCB0byBhcHBDb25maWdWaWV3RHJpdmVyIHdoZW5cbiRzY29wZS5yZWZlcmVuY2VUb0VkaXRJbkFwcENvbmZpZz17fTtcbiRzY29wZS5hY3RpdmVFZGl0PXt9O1xuJHNjb3BlLkN1cnJlbnRWaWV3V2lkdGg9JzAnO1xuJHNjb3BlLmNvbnRhaW5lcm1vZGU9J2NvbnRhaW5lcic7XG4vLyRzY29wZS5wcm9qZWN0X2luZm9fc291cmNlcz1be1wiaWRcIjpcIjU3NjVjODdmMGM5YjM4ZWZmMGY4ZGNiN1wiLFwiZGVzY3JpcHRpb25cIjpcInRoaXMgaXMgYW4gaW5mb1wifSx7XCJpZFwiOlwiMDkzMGVqMm4zMmRqMDIzZG4yM2QwMm4zZFwiLFwiZGVzY3JpcHRpb25cIjpcInRoaXMgaXMgYWxzbyBhbiBpbmZvXCJ9XTtcbiRzY29wZS5hdmFpbGFibGVDb2x1bW5XaWR0aHM9W3snd2lkdGgnOicxJ30seyd3aWR0aCc6JzInfSx7J3dpZHRoJzonMyd9LHsnd2lkdGgnOic0J30seyd3aWR0aCc6JzUnfSx7J3dpZHRoJzonNid9LHsnd2lkdGgnOic3J30seyd3aWR0aCc6JzgnfSx7J3dpZHRoJzonOSd9LHsnd2lkdGgnOicxMCd9LHsnd2lkdGgnOicxMSd9LHsnd2lkdGgnOicxMid9XTtcbiRzY29wZS5hdmFpbGFibGVDb2x1bW5TaG93PVt7J3Nob3cnOid0cnVlJ30seydzaG93JzonZmFsc2UnfV07XG4kc2NvcGUuYnVpbHRJbk1hbmlmZXN0cz1bXTtcbiRzY29wZS5sYXN0UGFnZT0nMCc7XG4kc2NvcGUubGFzdFJvdz0nMCc7XG4kc2NvcGUubGFzdENvbHVtbj0nMCc7XG4kc2NvcGUubGV2ZWxzT2ZVbmRvPTEwO1xuLy9nZXQgYWxsIG1hbmlmZXN0c1xubWFuaWZlc3RGYWN0b3J5LmdldEFsbCgpXG4udGhlbihmdW5jdGlvbihkYXRhKXtcbiAgJHNjb3BlLmFsbE1hbmlmZXN0cz1kYXRhLmRhdGE7XG59KTtcbi8vIHRoaXMgb2JqZWN0IGdldHNcblxuJHNjb3BlLmFpX3BhZ2VfbWFuaWZlc3Q9e1xuICAgIGFpX2RpcmVjdGl2ZSA6IHRydWUsXG4gICAgYWlfZGlyZWN0aXZlX3R5cGUgOiAnbGF5b3V0JyxcbiAgICBhaV9kaXJlY3RpdmVfbmFtZSA6ICdhaV9wYWdlJyxcbiAgICBhaV9kaXJlY3RpdmVfYXR0cmlidXRlcyA6IHtcbiAgICAgICAgYWlfY2xhc3MgOiAnL2Nzcy9yb3dfYS9zdHlsZS5jc3MnLFxuICAgICAgICBhaV9wYWdlX3RpdGxlOicnLFxuICAgICAgICBhaV9wYWdlX21lbnVfdGV4dCA6JydcbiAgICB9XG59O1xuXG4kc2NvcGUuYWlfcm93X21hbmlmZXN0PXtcbiAgICBhaV9kaXJlY3RpdmUgOiB0cnVlLFxuICAgIGFpX2RpcmVjdGl2ZV90eXBlIDogJ2xheW91dCcsXG4gICAgYWlfZGlyZWN0aXZlX25hbWUgOiAnYWlfcm93JyxcbiAgICBhaV9kaXJlY3RpdmVfYXR0cmlidXRlcyA6IHtcbiAgICAgICAgYWlfY2xhc3MgOiAnL2Nzcy9yb3dfYS9zdHlsZS5jc3MnLFxuICAgICAgICAnY2xhc3MnIDogJycsXG4gICAgICAgICdzdHlsZScgOiAnJyxcbiAgICAgICAgJ2FpX2Jvb3RzdHJhcF9zaG93Jzogeyd4cyc6eydjb2xzaXplJzoneHMnLCdzaG93JzondHJ1ZScsJ2RldmljZW5hbWUnOidwaG9uZSd9LCdzbSc6eydjb2xzaXplJzonc20nLCdzaG93JzondHJ1ZScsJ2RldmljZW5hbWUnOid0YWJsZXQnfSwnbWQnOnsnY29sc2l6ZSc6J21kJywnc2hvdyc6J3RydWUnLCdkZXZpY2VuYW1lJzonbGFwdG9wJ30sJ2xnJzp7J2NvbHNpemUnOidsZycsJ3Nob3cnOid0cnVlJywnZGV2aWNlbmFtZSc6J2Rlc2t0b3AnfX1cbiAgICB9XG59O1xuXG4kc2NvcGUuYWlfY29sdW1uX21hbmlmZXN0PXtcbiAgICBhaV9kaXJlY3RpdmUgOiB0cnVlLFxuICAgIGFpX2RpcmVjdGl2ZV90eXBlIDogJ2xheW91dCcsXG4gICAgYWlfZGlyZWN0aXZlX25hbWUgOiAnYWlfY29sJyxcbiAgICBhaV9kaXJlY3RpdmVfYXR0cmlidXRlcyA6IHtcbiAgICAgICAgYWlfY2xhc3MgOiAnL2Nzcy9yb3dfYS9zdHlsZS5jc3MnLFxuICAgICAgICBjbGFzcyA6ICcnLFxuICAgICAgICBzdHlsZTonJyxcbiAgICAgICAgJ2FpX2Jvb3RzdHJhcF9zaG93Jzogeyd4cyc6eydjb2xzaXplJzoneHMnLCdzaG93JzondHJ1ZScsJ2RldmljZW5hbWUnOidwaG9uZSd9LCdzbSc6eydjb2xzaXplJzonc20nLCdzaG93JzondHJ1ZScsJ2RldmljZW5hbWUnOid0YWJsZXQnfSwnbWQnOnsnY29sc2l6ZSc6J21kJywnc2hvdyc6J3RydWUnLCdkZXZpY2VuYW1lJzonbGFwdG9wJ30sJ2xnJzp7J2NvbHNpemUnOidsZycsJ3Nob3cnOid0cnVlJywnZGV2aWNlbmFtZSc6J2Rlc2t0b3AnfX0sXG4gICAgICAgICdhaV9ib290c3RyYXBfd2lkdGgnOiB7J3hzJzp7J2NvbHNpemUnOid4cycsJ2RldmljZW5hbWUnOidwaG9uZScsJ3NpemUnOicxMid9LCdzbSc6eydjb2xzaXplJzonc20nLCdkZXZpY2VuYW1lJzondGFibGV0Jywnc2l6ZSc6JzEyJ30sJ21kJzp7J2NvbHNpemUnOidtZCcsJ2RldmljZW5hbWUnOidsYXB0b3AnLCdzaXplJzonNid9LCdsZyc6eydjb2xzaXplJzonbGcnLCdkZXZpY2VuYW1lJzonZGVza3RvcCcsJ3NpemUnOic2J319XG5cbiAgICB9LFxuICAgIGFpX2NvbnRlbnQgOiB7fVxufTtcblxuJHNjb3BlLmJ1aWx0SW5NYW5pZmVzdHNbMF09JHNjb3BlLmFpX3BhZ2VfbWFuaWZlc3Q7XG4kc2NvcGUuYnVpbHRJbk1hbmlmZXN0c1sxXT0kc2NvcGUuYWlfcm93X21hbmlmZXN0O1xuXG4vLyB0aGlzIGZ1bmN0aW9uIGdldCB0aGUgbGFzdCBwYWdlIG51bWIgaW4gY29uZmlnXG5cbiRzY29wZS5nZXRMYXN0UGFnZT1mdW5jdGlvbigpe1xuICB0cnl7XG4gICAgJHNjb3BlLmxhc3RQYWdlPTA7XG4gICAgZm9yKHZhciBrZXkgaW4gJHNjb3BlLmFwcENvbmZpZy5wYWdlcyl7XG4gICAgICAgICRzY29wZS5sYXN0UGFnZSsrO1xuICAgIH1cbiAgfWNhdGNoKGUpe31cbn07XG5cbi8vIHRoaXMgZnVuY3Rpb24gZ2V0IHRoZSBsYXN0IHJvdyBudW1iIGluIGNvbmZpZ1xuJHNjb3BlLmdldExhc3RSb3c9ZnVuY3Rpb24oKXtcbiAgdHJ5e1xuICAgICAgJHNjb3BlLmdldExhc3RQYWdlKCk7XG4gICAgICAkc2NvcGUubGFzdFJvdz0wO1xuICAgICAgZm9yKHZhciBrZXkgaW4gJHNjb3BlLmFwcENvbmZpZy5wYWdlc1sncGFnZV8nKyRzY29wZS5sYXN0UGFnZV0ucm93cyl7XG4gICAgICAgICAgJHNjb3BlLmxhc3RSb3crKztcbiAgICAgIH1cbiAgfWNhdGNoKGUpe31cbn07XG5cbi8vIHRoaXMgZnVuY3Rpb24gZ2V0IHRoZSBsYXN0IGNvbCBudW1iIGluIGNvbmZpZ1xuJHNjb3BlLmdldExhc3RDb2x1bW49ZnVuY3Rpb24oKXtcbiAgICAgICRzY29wZS5nZXRMYXN0Um93KCk7XG4gICAgICAkc2NvcGUubGFzdENvbHVtbj0wO1xuICAgICAgY29uc29sZS5sb2coJHNjb3BlLmFwcENvbmZpZy5wYWdlc1sncGFnZV8nKyRzY29wZS5sYXN0UGFnZV0ucm93c1sncm93XycrJHNjb3BlLmxhc3RSb3ddKTtcbiAgICAgIGZvcih2YXIga2V5IGluICRzY29wZS5hcHBDb25maWcucGFnZXNbJ3BhZ2VfJyskc2NvcGUubGFzdFBhZ2VdLnJvd3NbJ3Jvd18nKyRzY29wZS5sYXN0Um93XVsnY29scyddKXtcbiAgICAgICAgICAkc2NvcGUubGFzdENvbHVtbisrO1xuICAgICAgICAgIGNvbnNvbGUubG9nKGtleSk7XG4gICAgICB9XG59O1xuXG4vLyB0aGlzIGZ1bmN0aW9uIHRha2VzIGEgbWFuaWZlc3QgYW5kIHNldHMgaXQgdXAgZm9yIGJlaW5nIGluc2VydGVkIGludG8gdGhlIGFwcENvbmZpZy5cbi8vIGl0IGRvZXMgdGhpcyBidCBhZGRpbmcgdGhlIHBhZ2Uscm93LGFuZCxjb2x1bW4gcHJvcGVyaXRlcy5cbiRzY29wZS5tb3ZlQ29uZmlnT2JqZWN0VG9FZGl0PWZ1bmN0aW9uKGNvbmZpZ09iamVjdCl7XG4gICRzY29wZS5yZWZlcmVuY2VUb0VkaXRJbkFwcENvbmZpZz1jb25maWdPYmplY3Q7IC8vIHRoaXMgaXMgcmVmZXJlbmNlIHRvIHRoZSBuZWVkZWQgYXBwQ29uZmlnIG9iamVjdFxuICBhbmd1bGFyLmNvcHkoY29uZmlnT2JqZWN0LCRzY29wZS5hcHBDb25maWdFZGl0Q29weSk7XG59O1xuXG4vLyB0aGlzIGZ1bmN0aW9uIG1vdmVzIHRoZSBlZGl0IHZlcnNpb24gb2YgdGVoIGFwcGNvbmZpZyBvYmplY3QgYmVnaW5nIGVkaXQgZnJvbSBlZGl0IG9iamVjdCB0byBpdCBwbGFjZSBpbiB0ZSBhcHBDb25maWcgb2JqZWNcbiRzY29wZS5zYXZlRWRpdD1mdW5jdGlvbigpe1xuICAgIGFuZ3VsYXIuY29weSgkc2NvcGUuYXBwQ29uZmlnRWRpdENvcHksJHNjb3BlLnJlZmVyZW5jZVRvRWRpdEluQXBwQ29uZmlnKTtcbiAgICAkc2NvcGUucHJvamVjdC5jb25maWcudW5zaGlmdCgkc2NvcGUuYXBwQ29uZmlnKTtcbiAgICBpZigkc2NvcGUucHJvamVjdC5jb25maWcubGVuZ3RoID4gJHNjb3BlLmxldmVsc09mVW5kbyApe1xuICAgICAgJHNjb3BlLnByb2plY3QuY29uZmlnLnNwbGljZSgkc2NvcGUubGV2ZWxzT2ZVbmRvLCRzY29wZS5wcm9qZWN0LmNvbmZpZy5sZW5ndGgpO1xuICAgIH1cbiAgICBQcm9qZWN0RmFjdG9yeS51cGRhdGUoJHNjb3BlLnByb2plY3QpXG4gICAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcbiAgICB9KTtcbn07XG5cblxuXG4kc2NvcGUuZGVsZXRlRWxlbWVudD1mdW5jdGlvbigpe1xuICAgIGFuZ3VsYXIuY29weSh7fSwkc2NvcGUucmVmZXJlbmNlVG9FZGl0SW5BcHBDb25maWcpO1xuICAgICRzY29wZS5wcm9qZWN0LmNvbmZpZy51bnNoaWZ0KCRzY29wZS5hcHBDb25maWcpO1xuICAgIGlmKCRzY29wZS5wcm9qZWN0LmNvbmZpZy5sZW5ndGggPiAkc2NvcGUubGV2ZWxzT2ZVbmRvICl7XG4gICAgICAkc2NvcGUucHJvamVjdC5jb25maWcuc3BsaWNlKCRzY29wZS5sZXZlbHNPZlVuZG8sJHNjb3BlLnByb2plY3QuY29uZmlnLmxlbmd0aCk7XG4gICAgfVxuICAgIFByb2plY3RGYWN0b3J5LnVwZGF0ZSgkc2NvcGUucHJvamVjdClcbiAgICAudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgIH0pO1xufTtcbiRzY29wZS51bmRvRWRpdD1mdW5jdGlvbigpe1xuICAgIGFuZ3VsYXIuY29weSh7fSwkc2NvcGUucmVmZXJlbmNlVG9FZGl0SW5BcHBDb25maWcpO1xuICAgICRzY29wZS5wcm9qZWN0LmNvbmZpZy51bnNoaWZ0KCRzY29wZS5hcHBDb25maWcpO1xuICAgIGlmKCRzY29wZS5wcm9qZWN0LmNvbmZpZy5sZW5ndGggPiAkc2NvcGUubGV2ZWxzT2ZVbmRvICl7XG4gICAgICAkc2NvcGUucHJvamVjdC5jb25maWcuc3BsaWNlKCRzY29wZS5sZXZlbHNPZlVuZG8sJHNjb3BlLnByb2plY3QuY29uZmlnLmxlbmd0aCk7XG4gICAgfVxuICAgIFByb2plY3RGYWN0b3J5LnVwZGF0ZSgkc2NvcGUucHJvamVjdClcbiAgICAudGhlbihmdW5jdGlvbihyZXN1bHQpe1xuICAgIH0pO1xufTtcblxuLy8gdGhpcyBmdW5jdGlvbiB0YWtlcyB5b3VyIG1hbmlmZXN0IG9iamVjdCBhbmQgYWRkIHRoZSBhaS1wYWdlLGFpLXJvdyBhbmQgYWktY29sIGF0dHJpYnV0ZXMgbWFrZWluZyBpcyBzdWl0YWJsZSBmb3IgaW5zZXJ0aW9uIGludG8gdGhlIGFwcENvbmZpZ1xuJHNjb3BlLm1hbmlmZXN0VG9BcHBDb25maWc9ZnVuY3Rpb24ocGFnZSxyb3csY29sdW1uLG1hbmlmZXN0T2JqKXtcbiAgLy9jb25zb2xlLmxvZyhwYWdlKTtcbiAgaWYoY29sdW1uID4gMCl7XG4gICAgICBtYW5pZmVzdE9iai5haV9kaXJlY3RpdmVfcGFnZSA9IHBhZ2U7XG4gICAgICBtYW5pZmVzdE9iai5haV9kaXJlY3RpdmVfcm93ID0gcm93O1xuICAgICAgbWFuaWZlc3RPYmouYWlfZGlyZWN0aXZlX2NvbCA9IGNvbHVtbjtcbiAgICAgIHJldHVybiBtYW5pZmVzdE9iajtcbiAgfWVsc2UgaWYocm93ID4gMCl7XG4gICAgICBtYW5pZmVzdE9iai5haV9kaXJlY3RpdmVfcGFnZSA9IHBhZ2U7XG4gICAgICBtYW5pZmVzdE9iai5haV9kaXJlY3RpdmVfcm93ID0gcm93O1xuICAgICAgbWFuaWZlc3RPYmouYWlfZGlyZWN0aXZlX2NvbCA9ICcnO1xuICAgICAgcmV0dXJuIG1hbmlmZXN0T2JqO1xuICB9ZWxzZSBpZihwYWdlID4gMCl7XG4gICAgLy9jb25zb2xlLmxvZyhtYW5pZmVzdE9iaik7XG4gICAgICBtYW5pZmVzdE9iai5haV9kaXJlY3RpdmVfcGFnZSA9IHBhZ2U7XG4gICAgICBtYW5pZmVzdE9iai5haV9kaXJlY3RpdmVfcm93ID0gJyc7XG4gICAgICBtYW5pZmVzdE9iai5haV9kaXJlY3RpdmVfY29sID0gJyc7XG4gICAgICByZXR1cm4gbWFuaWZlc3RPYmo7XG4gICAgfVxufTtcblxuLy8gVGhpcyBmdW5jdGlvbiByZW5kZXJzIHRoZSBzdHJpbmcgb2YgYXR0cmlidXRlcyB0byBpbmNsdWRlIGluIHRoZSBkaXJlY3RpdmUgYmVpbmcgcmVuZGVyZWRcbiRzY29wZS5yZW5kZXJhdHRyaWJ1dGVTdHJpbmc9ZnVuY3Rpb24ob2JqKXtcbiAgICB2YXIgYXR0cmlidXRlU3RyaW5nPScnO1xuICAgIHZhciBuZ0NsYXNzU3RyaW5nPScgbmctY2xhc3M9XCJ7JztcbiAgICBmb3IodmFyIGF0dHJpYk5hbWUgaW4gb2JqKXtcbiAgICAgICAgaWYoYXR0cmliTmFtZS5pbmRleE9mKCdhaV9ib290c3RyYXBfd2lkdGgnKSA+IC0xICl7XG4gICAgICAgICAgICBmb3IodmFyIGJvb3RTaXplIGluIG9ialthdHRyaWJOYW1lXSl7XG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKGJvb3RTaXplKTtcbiAgICAgICAgICAgICBuZ0NsYXNzU3RyaW5nKz1cIidjb2wtXCIrYm9vdFNpemUrXCItXCIrb2JqW2F0dHJpYk5hbWVdW2Jvb3RTaXplXVsnc2l6ZSddK1wiXFwnOiB0cnVlLFwiO1xuICAgICAgICAgICAgIGNvbnNvbGUubG9nKG5nQ2xhc3NTdHJpbmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9ZWxzZSBpZihhdHRyaWJOYW1lLmluZGV4T2YoJ2FpX2Jvb3RzdHJhcF9zaG93JykgPiAtMSl7XG4gICAgICAgICAgIGZvcih2YXIgYm9vdFNob3cgaW4gb2JqW2F0dHJpYk5hbWVdKXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGJvb3RTaG93KTtcbiAgICAgICAgICAgICAgICBpZihvYmpbYXR0cmliTmFtZV1bYm9vdFNob3ddWydzaG93J10gPT0gJ2ZhbHNlJyl7XG4gICAgICAgICAgICAgICAgICAgIG5nQ2xhc3NTdHJpbmcrPVwiJ2hpZGRlbi1cIitib290U2hvdytcIicgOiB0cnVlLFwiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICBhdHRyaWJ1dGVTdHJpbmcrPWF0dHJpYk5hbWUrJz1cIicrb2JqW2F0dHJpYk5hbWVdKydcIiAnO1xuICAgICAgICB9XG4gICAgfVxuICAgIG5nQ2xhc3NTdHJpbmcrPVwiJ2VkaXRfcm93X3Bhc3NpdmUnIDogdHJ1ZSxcIjtcbiAgICBhdHRyaWJ1dGVTdHJpbmcrPW5nQ2xhc3NTdHJpbmc7XG4gICAgY29uc29sZS5sb2coYXR0cmlidXRlU3RyaW5nKTtcbiAgICByZXR1cm4gYXR0cmlidXRlU3RyaW5nO1xufTtcblxuLy8gdGhpcyBmdW5jdGlvbiBhcHBlbmQgYSBjb21waWxlZCBwYWdlIGludG8gdGhlIERPTVxuJHNjb3BlLnJlbmRlclBhZ2VIdG1sRnJvbUFpQ29uZmlnPWZ1bmN0aW9uKG9iaikge1xuICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eSgnYWlfZGlyZWN0aXZlJykpIHtcbiAgICAgICAgaWYoKG9iai5haV9kaXJlY3RpdmVfdHlwZSA9PT0nbGF5b3V0JykgJiYgKG9ialsnYWlfZGlyZWN0aXZlX25hbWUnXSA9PT0gJ2FpX3BhZ2UnKSl7XG4gICAgICAgICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQod29ya2FyZWEpLmFwcGVuZCgkY29tcGlsZSgnPCcrb2JqWydhaV9kaXJlY3RpdmVfbmFtZSddKycgaWQ9XCJwXycrb2JqWydhaV9kaXJlY3RpdmVfcGFnZSddKydfcl8nK29ialsnYWlfZGlyZWN0aXZlX3JvdyddKydfYWlfcm93XCIgJysgJHNjb3BlLnJlbmRlcmF0dHJpYnV0ZVN0cmluZyhvYmpbJ2FpX2RpcmVjdGl2ZV9hdHRyaWJ1dGVzJ10pKyc+PC8nK29ialsnYWlfZGlyZWN0aXZlX25hbWUnXSsnPicpKCRzY29wZSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiBvYmopIHtcbiAgICAgICAgICAgICAgICBpZih0eXBlb2Ygb2JqW3Byb3BlcnR5XSA9PSBcIm9iamVjdFwiKXtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnJlbmRlclBhZ2VIdG1sRnJvbUFpQ29uZmlnKG9ialtwcm9wZXJ0eV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgIH1cbn07XG5cbi8vIHRoaXMgZnVuY3Rpb24gYXBwZW5kIGEgY29tcGlsZWQgcm93IGludG8gdGhlIERPTVxuJHNjb3BlLnJlbmRlclJvd0h0bWxGcm9tQWlDb25maWc9ZnVuY3Rpb24ob2JqKSB7XG4gIGNvbnNvbGUubG9nKG9iailcbiAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoJ2FpX2RpcmVjdGl2ZScpKSB7XG4gICAgICAgIGlmKChvYmouYWlfZGlyZWN0aXZlX3R5cGUgPT09J2xheW91dCcpICYmIChvYmpbJ2FpX2RpcmVjdGl2ZV9uYW1lJ10gPT09ICdhaV9yb3cnKSl7XG4gICAgICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KHdvcmthcmVhKS5hcHBlbmQoJGNvbXBpbGUoJzxkaXYgICAnKyAkc2NvcGUucmVuZGVyYXR0cmlidXRlU3RyaW5nKG9ialsnYWlfZGlyZWN0aXZlX2F0dHJpYnV0ZXMnXSkrJ1xcJ2VkaXRfcm93X2FjdGl2ZVxcJzpnZXRFZGl0Q2FuZGlkYXRlKFxcJ3BfJytvYmpbJ2FpX2RpcmVjdGl2ZV9wYWdlJ10rJ19yXycrb2JqWydhaV9kaXJlY3RpdmVfcm93J10rJ19haV9yb3dcXCcpfVwiICAgbmctbW91c2VlbnRlcj1cInNldEVkaXRDYW5kaWRhdGUoXFwncF8nK29ialsnYWlfZGlyZWN0aXZlX3BhZ2UnXSsnX3JfJytvYmpbJ2FpX2RpcmVjdGl2ZV9yb3cnXSsnX2FpX3Jvd1xcJylcIiBuZy1tb3VzZWxlYXZlPVwic2V0RWRpdENhbmRpZGF0ZShcXCdcXCcpXCI+PGFpLWVkaXQtaG90LXNwb3Qgc2V0LWFjdGl2ZS1lZGl0LWVsZW1lbnQ9XCJzZXRFZGl0U2VsZWN0KClcIiBcIiBhY3RpdmUtZWRpdC1lbGVtZW50PVwiZWRpdENhbmRpZGF0ZVwiIGVkaXQtb2JqZWN0LXR5cGU9XCJyb3dcIiBhaS1lZGl0LWhvdC1zcG90LWlkPVwicF8nK29ialsnYWlfZGlyZWN0aXZlX3BhZ2UnXSsnX3JfJytvYmpbJ2FpX2RpcmVjdGl2ZV9yb3cnXSsnX2FpX3Jvd1wiPjwvYWktZWRpdC1ob3Qtc3BvdD48ZGl2IGNsYXNzPVwiY29udGFpbmVyXCIgaWQ9XCJwXycrb2JqWydhaV9kaXJlY3RpdmVfcGFnZSddKydfcl8nK29ialsnYWlfZGlyZWN0aXZlX3JvdyddKydfYWlfcm93XCI+PC9kaXY+PC9kaXY+JykoJHNjb3BlKSk7XG4gICAgICAgICAgICAgICAgICAvL2FuZ3VsYXIuZWxlbWVudCh3b3JrYXJlYSkuYXBwZW5kKCRjb21waWxlKCc8ZGl2IHN0eWxlPVwicGFkZGluZzowcHhcIiBuZy1tb3VzZWVudGVyPVwic2V0RWRpdENhbmRpZGF0ZShcXCdwXycrb2JqWydhaV9kaXJlY3RpdmVfcGFnZSddKydfcl8nK29ialsnYWlfZGlyZWN0aXZlX3JvdyddKydfYWlfcm93XFwnKVwiIG5nLW1vdXNlbGVhdmU9XCJzZXRFZGl0Q2FuZGlkYXRlKFxcJ1xcJylcIj48YWktZWRpdC1ob3Qtc3BvdCBzZXQtYWN0aXZlLWVkaXQtZWxlbWVudD1cInNldEVkaXRTZWxlY3QoKVwiIGFjdGl2ZS1lZGl0LWVsZW1lbnQ9XCJlZGl0Q2FuZGlkYXRlXCIgYWktZWRpdC1ob3Qtc3BvdC1pZD1cInBfJytvYmpbJ2FpX2RpcmVjdGl2ZV9wYWdlJ10rJ19yXycrb2JqWydhaV9kaXJlY3RpdmVfcm93J10rJ19haV9yb3dcIj48L2FpLWVkaXQtaG90LXNwb3Q+ICAgIDxkaXYgIGlkPVwicF8nK29ialsnYWlfZGlyZWN0aXZlX3BhZ2UnXSsnX3JfJytvYmpbJ2FpX2RpcmVjdGl2ZV9yb3cnXSsnX2FpX3Jvd1wiICcrICRzY29wZS5yZW5kZXJhdHRyaWJ1dGVTdHJpbmcob2JqWydhaV9kaXJlY3RpdmVfYXR0cmlidXRlcyddKSsnXFwnZWRpdF9yb3dfYWN0aXZlXFwnOmdldEVkaXRDYW5kaWRhdGUoXFwncF8nK29ialsnYWlfZGlyZWN0aXZlX3BhZ2UnXSsnX3JfJytvYmpbJ2FpX2RpcmVjdGl2ZV9yb3cnXSsnX2FpX3Jvd1xcJyl9XCI8L2Rpdj48L2Rpdj4nKSgkc2NvcGUpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZm9yICh2YXIgcHJvcGVydHkgaW4gb2JqKSB7XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIG9ialtwcm9wZXJ0eV0gPT0gXCJvYmplY3RcIil7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5yZW5kZXJSb3dIdG1sRnJvbUFpQ29uZmlnKG9ialtwcm9wZXJ0eV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgIH1cblxufTtcblxuLy8gdGhpcyBmdW5jdGlvbiBhcHBlbmQgYSBjb21waWxlZCBDb2x1bW4gaW50byB0aGUgRE9NXG4kc2NvcGUucmVuZGVyQ29sSHRtbEZyb21BaUNvbmZpZz1mdW5jdGlvbihvYmopIHtcbiAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoJ2FpX2RpcmVjdGl2ZScpKSB7XG4gICAgICAgIGlmKChvYmpbJ2FpX2RpcmVjdGl2ZV90eXBlJ10gPT09J2xheW91dCcpICYmIChvYmpbJ2FpX2RpcmVjdGl2ZV9uYW1lJ10gPT09ICdhaV9jb2wnKSl7XG4gICAgICAgICAgICAgICAgICRzY29wZS5hcHBlbmRUYXJnZXQ9JyNwXycrb2JqWydhaV9kaXJlY3RpdmVfcGFnZSddKydfcl8nK29ialsnYWlfZGlyZWN0aXZlX3JvdyddKydfYWlfcm93JztcbiAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudChkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCAkc2NvcGUuYXBwZW5kVGFyZ2V0ICkpLmFwcGVuZCgkY29tcGlsZSgnPGRpdiBpZD1cInBfJytvYmpbJ2FpX2RpcmVjdGl2ZV9wYWdlJ10rJ19yXycrb2JqWydhaV9kaXJlY3RpdmVfcm93J10rJ19jXycrb2JqWydhaV9kaXJlY3RpdmVfY29sJ10rJ19haV9jb2xcIiAnKyAkc2NvcGUucmVuZGVyYXR0cmlidXRlU3RyaW5nKG9ialsnYWlfZGlyZWN0aXZlX2F0dHJpYnV0ZXMnXSkrJ1xcJ2VkaXRfcm93X2FjdGl2ZVxcJzpnZXRFZGl0Q2FuZGlkYXRlKFxcJ3BfJytvYmpbJ2FpX2RpcmVjdGl2ZV9wYWdlJ10rJ19yXycrb2JqWydhaV9kaXJlY3RpdmVfcm93J10rJ19jXycrb2JqWydhaV9kaXJlY3RpdmVfY29sJ10rJ19haV9jb2xcXCcpfVwiIG5nLW1vdXNlZW50ZXI9XCJzZXRFZGl0Q2FuZGlkYXRlKFxcJ3BfJytvYmpbJ2FpX2RpcmVjdGl2ZV9wYWdlJ10rJ19yXycrb2JqWydhaV9kaXJlY3RpdmVfcm93J10rJ19jXycrb2JqWydhaV9kaXJlY3RpdmVfY29sJ10rJ19haV9jb2xcXCcpXCIgbmctbW91c2VsZWF2ZT1cInNldEVkaXRDYW5kaWRhdGUoXFwncF8nK29ialsnYWlfZGlyZWN0aXZlX3BhZ2UnXSsnX3JfJytvYmpbJ2FpX2RpcmVjdGl2ZV9yb3cnXSsnX2FpX3Jvd1xcJylcIj48YWktZWRpdC1ob3Qtc3BvdCBzZXQtYWN0aXZlLWVkaXQtZWxlbWVudD1cInNldEVkaXRTZWxlY3QoKVwiIGFjdGl2ZS1lZGl0LWVsZW1lbnQ9XCJlZGl0Q2FuZGlkYXRlXCIgZWRpdC1vYmplY3QtdHlwZT1cImNvbHVtblwiIGFpLWVkaXQtaG90LXNwb3QtaWQ9XCJwXycrb2JqWydhaV9kaXJlY3RpdmVfcGFnZSddKydfcl8nK29ialsnYWlfZGlyZWN0aXZlX3JvdyddKydfY18nK29ialsnYWlfZGlyZWN0aXZlX2NvbCddKydfYWlfY29sXCI+PC9haS1lZGl0LWhvdC1zcG90PjwvZGl2PicpKCRzY29wZSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiBvYmopIHtcbiAgICAgICAgICAgICAgICBpZih0eXBlb2Ygb2JqW3Byb3BlcnR5XSA9PSBcIm9iamVjdFwiKXtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnJlbmRlckNvbEh0bWxGcm9tQWlDb25maWcob2JqW3Byb3BlcnR5XSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgfVxufTtcblxuJHNjb3BlLnJlbmRlckNsZWFyZml4SHRtbEZyb21BaUNvbmZpZz1mdW5jdGlvbihvYmopIHtcbiAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoJ2FpX2RpcmVjdGl2ZScpKSB7XG4gICAgICAgIGlmKChvYmpbJ2FpX2RpcmVjdGl2ZV90eXBlJ10gPT09J2xheW91dCcpICYmIChvYmpbJ2FpX2RpcmVjdGl2ZV9uYW1lJ10gPT09ICdhaV9yb3cnKSl7XG4gICAgICAgICAgICAgICAgICRzY29wZS5hcHBlbmRUYXJnZXQ9JyNwXycrb2JqWydhaV9kaXJlY3RpdmVfcGFnZSddKydfcl8nK29ialsnYWlfZGlyZWN0aXZlX3JvdyddKydfYWlfcm93JztcbiAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudChkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCAkc2NvcGUuYXBwZW5kVGFyZ2V0ICkpLmFwcGVuZCgkY29tcGlsZSgnPGRpdiBjbGFzcz1cImNsZWFyZml4XCI+PC9kaXY+JykoJHNjb3BlKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAodmFyIHByb3BlcnR5IGluIG9iaikge1xuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvYmpbcHJvcGVydHldID09IFwib2JqZWN0XCIpe1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUucmVuZGVyQ2xlYXJmaXhIdG1sRnJvbUFpQ29uZmlnKG9ialtwcm9wZXJ0eV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgIH1cbn07XG4vLyB0aGlzIGZ1bmN0aW9uIGFwcGVuZCBhIGNvbXBpbGVkIERpcmVjdGl2ZSBpbnRvIHRoZSBET01cbi8vIGp1c3QgYSBub3RlIDogSSBkb250IGxpa2UgdGhlIGZhY3QgdGhhdCBJIGFtIHVzaW5nIHRoZSBkaXJlY3RpdmVzIElkZWEgb2Ygd2hlcmUgaXQgaXMgdG8gcmVuZGVyIGl0IEkgd291bGQgcmF0aGVyIHVzZSB0aGVcbi8vIHBvc2l0aW9uIG9mIHRoZSBsYXN0IGNvbHVtbiBpIHNhdyB3aGlsZSBpdGVyYXRpbmcuXG4kc2NvcGUucmVuZGVyRGlyZWN0aXZlSHRtbEZyb21BaUNvbmZpZz1mdW5jdGlvbihvYmopIHtcbiAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoJ2FpX2RpcmVjdGl2ZScpKSB7XG4gICAgICAgIGlmKG9ialsnYWlfZGlyZWN0aXZlX3R5cGUnXSA9PT0nY29udGVudCcpe1xuICAgICAgICAgICAgJHNjb3BlLmFwcGVuZFRhcmdldD0nI3BfJytvYmpbJ2FpX2RpcmVjdGl2ZV9wYWdlJ10rJ19yXycrb2JqWydhaV9kaXJlY3RpdmVfcm93J10rJ19jXycrb2JqWydhaV9kaXJlY3RpdmVfY29sJ10rJ19haV9jb2wnO1xuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoICRzY29wZS5hcHBlbmRUYXJnZXQgKSkuYXBwZW5kKCRjb21waWxlKCc8ZGl2IHN0eWxlPVwibWFyZ2luOjBweDtwYWRkaW5nOjEwcHhcIj48JytvYmpbJ2FpX2RpcmVjdGl2ZV9uYW1lJ10rJyBpZD1cInBfJytvYmpbJ2FpX2RpcmVjdGl2ZV9wYWdlJ10rJ19yXycrb2JqWydhaV9kaXJlY3RpdmVfcm93J10rJ19jXycrb2JqWydhaV9kaXJlY3RpdmVfY29sJ10rJ1wiICcrJHNjb3BlLnJlbmRlcmF0dHJpYnV0ZVN0cmluZyhvYmpbJ2FpX2RpcmVjdGl2ZV9hdHRyaWJ1dGVzJ10pKydcXCdkaXJlY3RpdmVTcGFjZVxcJzogdHJ1ZX1cIj48Lycrb2JqWydhaV9kaXJlY3RpdmVfbmFtZSddKyc+PC9kaXY+JykoJHNjb3BlKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAodmFyIHByb3BlcnR5IGluIG9iaikge1xuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvYmpbcHJvcGVydHldID09IFwib2JqZWN0XCIpe1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUucmVuZGVyRGlyZWN0aXZlSHRtbEZyb21BaUNvbmZpZyhvYmpbcHJvcGVydHldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICB9XG59O1xuXG4vLyB0aGlzIGZ1bmN0aW9uIGFkZHMgYSBuZXcgZWxlbWVudCB0byB0aGUgY29uZmlnIG9ialxuJHNjb3BlLmNyZWF0Q29uZmlnT2JqZWN0PWZ1bmN0aW9uKHRhcmdldCxvYmope1xuICAvL3RhcmdldD1vYmo7XG4gIGFuZ3VsYXIuY29weShvYmosdGFyZ2V0KTtcbn07XG4vLyB0aGlzIHJlYWQgYSBhcHBDb25maWcgb2JqZWN0XG4kc2NvcGUucmVhZENvbmZpZ09iamVjdD1mdW5jdGlvbih0YXJnZXQsbmV3ZWxlbWVudCl7XG5cbn07XG5cbi8vIHRoaXMgZnVuY3Rpb24gdXBkYXRlcyBhIGFwcGNvbmZpZyBvYmplY3RcbiRzY29wZS51cGRhdGVDb25maWdPYmplY3Q9ZnVuY3Rpb24odGFyZ2V0LG5ld2VsZW1lbnQsb2JqKXtcbiAgdGFyZ2V0W25ld2VsZW1lbnRdPW9iajtcbn07XG5cbi8vIHRoaXMgZnVuY3Rpb24gZGVsZXRlcyBhIG9iamVjdCBmcm9tIHRoZSBhcHBDb25maWcgb2JqZWN0XG4kc2NvcGUuZGVsZXRlY29uZmlnT2JqZWN0PWZ1bmN0aW9uKHRhcmdldCxzdWJFbGVtZW50KXtcbiAgZGVsZXRlIHRhcmdldFtzdWJFbGVtZW50XTtcbn07XG5cbi8vIHRoaXMgZnVuY3RvbiBnZXQgdGhlIG5leHQgcm93IG51bWJlciB0byBhc3NnaW4gZm9yIHRoZSBjdXJyZW50IHBhZ2VcbiRzY29wZS5nZXROZXh0Um93UGFnZT1mdW5jdGlvbihwYWdlKXtcbiAgdmFyIG5ld1JvdztcbiAgcmV0dXJuICBuZXdSb3c7XG4gfTtcblxuLy8gdGhpcyBmdW5jdG9uIGdldCB0aGUgbmV4dCByb3cgYW5kIGNvbHVtbiBudW1iZXIgdG8gYXNzZ2luIGZvciB0aGUgY3VycmVudCBwYWdlXG4kc2NvcGUuZ2V0TmV4dENvbHVtbkluUm93PWZ1bmN0aW9uKHBhZ2Uscm93KXtcbiAgdmFyIG5ld0NvbDtcbiAgcmV0dXJuICBuZXdDb2w7XG59O1xuXG4vLyB0aGlzIGZ1bmN0aW9uIHdpbGwgcmV0dXJuIGEgcmVmZXJlbmNlIHRvIHRoZSBuZWVkZWQgY29uZmlnIHRhZ2dldFxuJHNjb3BlLm1ha2VDb25maWdUYXJnZXQ9ZnVuY3Rpb24ocGFnZSxyb3csY29sdW1uLGxhbmREaXJlY3RpdmUpe1xuICBpZihsYW5kRGlyZWN0aXZlKXtcbiAgICBpZigkc2NvcGUuYXBwQ29uZmlnLnBhZ2VzWydwYWdlXycrcGFnZV1bJ3Jvd3MnXVsncm93Xycrcm93XVsnY29scyddLmhhc093blByb3BlcnR5KCdjb2xfJytjb2x1bW4pKXtcbiAgICAgIHJldHVybiAkc2NvcGUuYXBwQ29uZmlnLnBhZ2VzWydwYWdlXycrcGFnZV1bJ3Jvd3MnXVsncm93Xycrcm93XVsnY29scyddWydjb2xfJytjb2x1bW5dWydhaV9jb250ZW50J109e307XG4gICAgfVxuICB9ZWxzZSBpZihjb2x1bW4pe1xuICAgIGlmKCEkc2NvcGUuYXBwQ29uZmlnLnBhZ2VzWydwYWdlXycrcGFnZV1bJ3Jvd3MnXVsncm93Xycrcm93XS5oYXNPd25Qcm9wZXJ0eSgnY29scycpKXskc2NvcGUuYXBwQ29uZmlnLnBhZ2VzWydwYWdlXycrcGFnZV1bJ3Jvd3MnXVsncm93Xycrcm93XVsnY29scyddPXt9fTtcbiAgICAgIHJldHVybiAkc2NvcGUuYXBwQ29uZmlnLnBhZ2VzWydwYWdlXycrcGFnZV1bJ3Jvd3MnXVsncm93Xycrcm93XVsnY29scyddWydjb2xfJytjb2x1bW5dPXt9O1xuICB9ZWxzZSBpZihyb3cpe1xuICAgICAgaWYoISRzY29wZS5hcHBDb25maWcucGFnZXNbJ3BhZ2VfJytwYWdlXS5oYXNPd25Qcm9wZXJ0eSgncm93cycpKXskc2NvcGUuYXBwQ29uZmlnLnBhZ2VzWydwYWdlXycrcGFnZV1bJ3Jvd3MnXT17fX07XG4gICAgICByZXR1cm4gICRzY29wZS5hcHBDb25maWcucGFnZXNbJ3BhZ2VfJytwYWdlXVsncm93cyddWydyb3dfJytyb3ddPXt9O1xuICB9ZWxzZSBpZihwYWdlKXtcbiAgICBpZighJHNjb3BlLmFwcENvbmZpZy5wYWdlcy5oYXNPd25Qcm9wZXJ0eSgncGFnZXMnKSl7JHNjb3BlLmFwcENvbmZpZy5wYWdlcz17fTsgfVxuICAgIHJldHVybiAgJHNjb3BlLmFwcENvbmZpZy5wYWdlc1sncGFnZV8nK3BhZ2VdPXt9O1xuICB9XG59O1xuXG4vLyBhZGQgYSBwYWdlXG4kc2NvcGUuYWRkTmV3UGFnZT1mdW5jdGlvbihwYWdlLG1hbmlmZXN0KXtcbiAgLy8gZ2V0IHRoZSBuZXh0IGF2YWlsYWJsZSBwYWdlIG51bWJlclxuICAvLyBjYWxsIG1hbmlmZXN0VG9BcHBDb25maWcgb24gdGhhdCBwYWdlIG51bWJlciB0byB0aGUgY29uZmlnXG4gICRzY29wZS5jb25maWdUYXJnZXQ9JHNjb3BlLm1ha2VDb25maWdUYXJnZXQoMSk7XG4gIC8vIGNvcHkgaXQgdG8gdGhlIGVkaXQgb2JqZWN0XG4gIC8vIHNlbmQgaXQgdG8gdGhlIHNlcnZlclxuICAvLyByZXBsYWNlIHRoZSBhcHBjb25maWcgdGhlIHNlcnZlcnMgcmVwbHkgKG5vdyB0aGUgc2VydmVyIGFuZCB0aGUgcGFnZSBhcmUgaW4gc3luYylcbiAgLy8gaXQgd2lsbCB0aGVuIHRha2UgdGhhdCBwYWdlIG9iamVjdCBhbmQgYWRkIGl0XG4gIGNvbnNvbGUuZGlyKCRzY29wZS5tYW5pZmVzdFRvQXBwQ29uZmlnKDEsJycsJycsbWFuaWZlc3QpKTtcbiAgJHNjb3BlLmNyZWF0Q29uZmlnT2JqZWN0KCRzY29wZS5jb25maWdUYXJnZXQsJHNjb3BlLm1hbmlmZXN0VG9BcHBDb25maWcocGFnZSwnJywnJyxtYW5pZmVzdCkpO1xufTtcbi8vIGFkZCBhIHJvd1xuJHNjb3BlLmFkZE5ld1Jvdz1mdW5jdGlvbihwYWdlLHJvdyxtYW5pZmVzdCl7XG4gIGNvbnNvbGUubG9nKHBhZ2Uscm93KVxuICAvLyBjYWxsIG1hbmlmZXN0VG9BcHBDb25maWcgb24gdGhhdCBwYWdlIG51bWJlciB0byB0aGUgY29uZmlnXG4gICRzY29wZS5jb25maWdUYXJnZXQ9JHNjb3BlLm1ha2VDb25maWdUYXJnZXQocGFnZSxyb3cpO1xuICAvLyBjb3B5IGl0IHRvIHRoZSBlZGl0IG9iamVjdFxuICAvLyBzZW5kIGl0IHRvIHRoZSBzZXJ2ZXJcbiAgLy8gcmVwbGFjZSB0aGUgYXBwY29uZmlnIHRoZSBzZXJ2ZXJzIHJlcGx5IChub3cgdGhlIHNlcnZlciBhbmQgdGhlIHBhZ2UgYXJlIGluIHN5bmMpXG4gIC8vIGl0IHdpbGwgdGhlbiB0YWtlIHRoYXQgcGFnZSBvYmplY3QgYW5kIGFkZCBpdFxuICAvL2NvbnNvbGUubG9nKCRzY29wZS5jb25maWdUYXJnZXQpO1xuICBjb25zb2xlLmxvZygkc2NvcGUubWFuaWZlc3RUb0FwcENvbmZpZyhwYWdlLHJvdywnJyxtYW5pZmVzdCkpO1xuICAkc2NvcGUuY3JlYXRDb25maWdPYmplY3QoJHNjb3BlLmNvbmZpZ1RhcmdldCwkc2NvcGUubWFuaWZlc3RUb0FwcENvbmZpZyhwYWdlLHJvdywnJyxtYW5pZmVzdCkpO1xufTtcbiRzY29wZS5hZGROZXdDb2x1bW49ZnVuY3Rpb24ocGFnZSxyb3csY29sdW1uLG1hbmlmZXN0KXtcbiAgLy8gZ2V0IHRoZSBuZXh0IGF2YWlsYWJsZSByb3cgbnVtYmVyXG4gIC8vIGNhbGwgbWFuaWZlc3RUb0FwcENvbmZpZyBvbiB0aGF0IHBhZ2UgbnVtYmVyIHRvIHRoZSBjb25maWdcbiAgJHNjb3BlLmNvbmZpZ1RhcmdldD0kc2NvcGUubWFrZUNvbmZpZ1RhcmdldChwYWdlLHJvdyxjb2x1bW4pO1xuICAvLyBjb3B5IGl0IHRvIHRoZSBlZGl0IG9iamVjdFxuICAvLyBzZW5kIGl0IHRvIHRoZSBzZXJ2ZXJcbiAgLy8gcmVwbGFjZSB0aGUgYXBwY29uZmlnIHRoZSBzZXJ2ZXJzIHJlcGx5IChub3cgdGhlIHNlcnZlciBhbmQgdGhlIHBhZ2UgYXJlIGluIHN5bmMpXG4gIC8vIGl0IHdpbGwgdGhlbiB0YWtlIHRoYXQgcGFnZSBvYmplY3QgYW5kIGFkZCBpdFxuICBjb25zb2xlLmxvZygkc2NvcGUuY29uZmlnVGFyZ2V0KTtcbiAgJHNjb3BlLmNyZWF0Q29uZmlnT2JqZWN0KCRzY29wZS5jb25maWdUYXJnZXQsJHNjb3BlLm1hbmlmZXN0VG9BcHBDb25maWcocGFnZSxyb3csY29sdW1uLG1hbmlmZXN0KSk7XG59O1xuLy8gYWRkIG5ldyBkaXJlY3RpdmUgTk9URTogdGhlcmUgaXMgbm8gYWRkIGNvbHVtbiBiZWNhdXNlIHRoZXJlIGlzIGEgb25lIHRvIG9uZSByZWxhdGlvbnNoaW9wIGJldHdlZW4gZGlyZXN0aXZlcyBhbmQgY29sdW1uc1xuJHNjb3BlLmFkZE5ld0RpcmVjdGl2ZT1mdW5jdGlvbihwYWdlLHJvdyxjb2x1bW4sbWFuaWZlc3Qpe1xuICAvLyBnZXQgdGhlIG5leHQgYXZhaWxhYmxlIGNvbHVtbiBudW1iZXJcbiAgLy8gY2FsbCBtYW5pZmVzdFRvQXBwQ29uZmlnIG9uIHRoYXQgcGFnZSBudW1iZXIgdG8gdGhlIGNvbmZpZ1xuICAkc2NvcGUuY29uZmlnVGFyZ2V0PSRzY29wZS5tYWtlQ29uZmlnVGFyZ2V0KHBhZ2Uscm93LGNvbHVtbixjb2x1bW4pO1xuICAvLyBjb3B5IGl0IHRvIHRoZSBlZGl0IG9iamVjdFxuICAvLyBzZW5kIGl0IHRvIHRoZSBzZXJ2ZXJcbiAgLy8gcmVwbGFjZSB0aGUgYXBwY29uZmlnIHRoZSBzZXJ2ZXJzIHJlcGx5IChub3cgdGhlIHNlcnZlciBhbmQgdGhlIHBhZ2UgYXJlIGluIHN5bmMpXG4gIC8vIGl0IHdpbGwgdGhlbiB0YWtlIHRoYXQgcGFnZSBvYmplY3QgYW5kIGFkZCBpdFxuICBjb25zb2xlLmxvZygkc2NvcGUuY29uZmlnVGFyZ2V0KTtcbiAgJHNjb3BlLmNyZWF0Q29uZmlnT2JqZWN0KCRzY29wZS5jb25maWdUYXJnZXQsJHNjb3BlLm1hbmlmZXN0VG9BcHBDb25maWcocGFnZSxyb3csY29sdW1uLG1hbmlmZXN0KSk7XG4gICRzY29wZS5tb3ZlQ29uZmlnT2JqZWN0VG9FZGl0KCRzY29wZS5jb25maWdUYXJnZXQpO1xufTtcblxuJHNjb3BlLmFkZFRvUGFnZT1mdW5jdGlvbihtYW5pZmVzdCl7XG4gIGNvbnNvbGUubG9nKCdydW5uaW5nIGFkZCcsbWFuaWZlc3QpO1xuICAvL2lmIHRoZSBkaXJlY3RpdmUgaXMgYSBsYXlvdXQgdHlwZVxuICBpZihtYW5pZmVzdC5haV9kaXJlY3RpdmVfdHlwZSA9PT0gJ2xheW91dCcpe1xuICAgICAgaWYobWFuaWZlc3QuYWlfZGlyZWN0aXZlX25hbWUgPT09ICdhaV9wYWdlJyl7XG4gICAgICAgICRzY29wZS5hZGROZXdQYWdlKCRzY29wZS5sYXN0UGFnZSsxLG1hbmlmZXN0KTtcbiAgICAgIH1lbHNlIGlmKG1hbmlmZXN0LmFpX2RpcmVjdGl2ZV9uYW1lID09PSAnYWlfcm93Jyl7XG4gICAgICAgICAgJHNjb3BlLmFkZE5ld1Jvdygkc2NvcGUubGFzdFBhZ2UsJHNjb3BlLmxhc3RSb3crMSxtYW5pZmVzdCk7XG4gICAgICB9ZWxzZSBpZihtYW5pZmVzdC5haV9kaXJlY3RpdmVfbmFtZSA9PT0gJ2FpX2NvbCcpe1xuICAgICAgICAkc2NvcGUuYWRkTmV3Q29sdW1uKCRzY29wZS5sYXN0UGFnZSwkc2NvcGUubGFzdFJvdywkc2NvcGUubGFzdENvbHVtbisxLG1hbmlmZXN0KTtcbiAgICAgIH1cbiAgfWVsc2V7XG4gICAgICAkc2NvcGUuYWRkTmV3Q29sdW1uKCRzY29wZS5sYXN0UGFnZSwkc2NvcGUubGFzdFJvdywkc2NvcGUubGFzdENvbHVtbisxLCRzY29wZS5haV9jb2x1bW5fbWFuaWZlc3QpO1xuICAgICAgJHRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgJHNjb3BlLmFkZE5ld0RpcmVjdGl2ZSgkc2NvcGUubGFzdFBhZ2UsJHNjb3BlLmxhc3RSb3csJHNjb3BlLmxhc3RDb2x1bW4sbWFuaWZlc3QpO1xuICAgICAgICAkc2NvcGUuc2V0RWRpdENhbmRpZGF0ZSgncF8nKyRzY29wZS5sYXN0UGFnZSsnX3JfJyskc2NvcGUubGFzdFJvdysnX2NfJyskc2NvcGUubGFzdENvbHVtbisnX2FpX2NvbCcpO1xuICAgICAgICAkc2NvcGUuc2V0RWRpdFNlbGVjdCgpO1xuICAgICAgICAkc2NvcGUuRFNvcGVuPWZhbHNlO1xuICAgICAgfSwxMDAwKTtcbiAgfVxuICAkc2NvcGUuRFNvcGVuPWZhbHNlO1xuICAkc2NvcGUuY3Bsb3Blbj10cnVlO1xufTtcblxuJHNjb3BlLnByb2plY3Q9cHJvamVjdDsgLy9pbml0IHRoZSAkc2NvcGUucHJvamVjdCBmb3IgcmVzb2x2ZSBvZiBwcm9qZWN0IGluIHN0YXRlIG1hY2hpbmVcbiR0aW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgaWYoJHNjb3BlLnByb2plY3QuY29uZmlnWzBdID09PSB1bmRlZmluZWQpe1xuICAgICAgLy9jb25zb2xlLmxvZygnc2V0dGluZyB1cCcpO1xuICAgICAgICAkc2NvcGUuYXBwQ29uZmlnPXtcbiAgICAgICAgICAgIHByb2plY3RfbmFtZSA6ICdvdXJmaXJzdCBhcHAnLFxuICAgICAgICAgICAgcGFnZXM6e31cbiAgICAgICAgfTtcbiAgICB9ZWxzZXtcbiAgICAgICAgJHNjb3BlLmFwcENvbmZpZz17fTtcbiAgICAgICAgYW5ndWxhci5jb3B5KCRzY29wZS5wcm9qZWN0LmNvbmZpZ1swXSwkc2NvcGUuYXBwQ29uZmlnKTtcbiAgICB9XG59LDEwMCk7XG5cbi8vIHRoaXMgd2F0Y2ggYmxvY2sgcmVuZGVycyBhIHRoZSBkb20gd2hlbiB0aGUgYXBwY29uZmlnIGNoYW5nZXNcbiRzY29wZS4kd2F0Y2goJ2FwcENvbmZpZycsZnVuY3Rpb24oKXtcbiAgYW5ndWxhci5lbGVtZW50KHdvcmthcmVhKS5lbXB0eSgpO1xuICAkc2NvcGUucmVuZGVyUm93SHRtbEZyb21BaUNvbmZpZygkc2NvcGUuYXBwQ29uZmlnLCAnJyk7XG4gICR0aW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgJHNjb3BlLnJlbmRlckNvbEh0bWxGcm9tQWlDb25maWcoJHNjb3BlLmFwcENvbmZpZywgJycpO1xuICB9LDIwMCk7XG4gICR0aW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAkc2NvcGUucmVuZGVyRGlyZWN0aXZlSHRtbEZyb21BaUNvbmZpZygkc2NvcGUuYXBwQ29uZmlnLCAnJyk7XG4gICAgICAkc2NvcGUuZ2V0TGFzdENvbHVtbigpO1xuICAgICAgJHNjb3BlLnJlbmRlckNsZWFyZml4SHRtbEZyb21BaUNvbmZpZygkc2NvcGUuYXBwQ29uZmlnLCAnJyk7XG5cblxuICB9LDUwMCk7XG59LHRydWUpO1xuXG4kc2NvcGUuZ2V0RWRpdENhbmRpZGF0ZT1mdW5jdGlvbihpZCl7XG4gICAgaWYoaWQgPT09ICRzY29wZS5lZGl0Q2FuZGlkYXRlKXtcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfWVsc2V7XG4gICAgICByZXR1cm4gIGZhbHNlO1xuICAgIH1cbn1cblxuJHNjb3BlLnNldEVkaXRDYW5kaWRhdGU9ZnVuY3Rpb24oaWQpe1xuICAgICRzY29wZS5lZGl0Q2FuZGlkYXRlID0gaWRcbn1cblxuJHNjb3BlLmZpbmREaXJlY3RpdmVUb01ha2VBY3RpdmVFZGl0PWZ1bmN0aW9uKG9iaixpZFRvTWF0Y2gpIHtcbiAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoJ2FpX2RpcmVjdGl2ZScpKSB7XG4gICAgICAgIGlmKChvYmouYWlfZGlyZWN0aXZlX3R5cGUgPT09J2xheW91dCcpKXtcbiAgICAgICAgICAgICAgICAgIHZhciByb3dpZHN0cmluZz0ncF8nK29ialsnYWlfZGlyZWN0aXZlX3BhZ2UnXSsnX2FpX3BhZ2UnO1xuICAgICAgICAgICAgICAgICAgdmFyIHJvd2lkc3RyaW5nPSdwXycrb2JqWydhaV9kaXJlY3RpdmVfcGFnZSddKydfcl8nK29ialsnYWlfZGlyZWN0aXZlX3JvdyddKydfYWlfcm93JztcbiAgICAgICAgICAgICAgICAgIHZhciBjb2xpZHN0cmluZz0ncF8nK29ialsnYWlfZGlyZWN0aXZlX3BhZ2UnXSsnX3JfJytvYmpbJ2FpX2RpcmVjdGl2ZV9yb3cnXSsnX2NfJytvYmpbJ2FpX2RpcmVjdGl2ZV9jb2wnXSsnX2FpX2NvbCc7XG4gICAgICAgICAgICAgICAgaWYoKGlkVG9NYXRjaCA9PSByb3dpZHN0cmluZykgfHwgKGlkVG9NYXRjaCA9PSBjb2xpZHN0cmluZykpe1xuICAgICAgICAgICAgICAgICAgICAgICRzY29wZS5yZWZlcmVuY2VUb0VkaXRJbkFwcENvbmZpZz1vYmo7XG4gICAgICAgICAgICAgICAgICAgICAgYW5ndWxhci5jb3B5KG9iaiwkc2NvcGUuYXBwQ29uZmlnRWRpdENvcHkpO1xuICAgICAgICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZm9yICh2YXIgcHJvcGVydHkgaW4gb2JqKSB7XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIG9ialtwcm9wZXJ0eV0gPT0gXCJvYmplY3RcIil7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5maW5kRGlyZWN0aXZlVG9NYWtlQWN0aXZlRWRpdChvYmpbcHJvcGVydHldLGlkVG9NYXRjaCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgfVxufTtcblxuJHNjb3BlLnNldEVkaXRTZWxlY3Q9ZnVuY3Rpb24oaWQpe1xuICAgIC8vIFRIRSBESVJFQ1RJVkUgVEhBVCBJUyBJTiBUSEUgRURJVCBDQU5ESURBVEUgQ09MVU1OXG4gICAgJHNjb3BlLmNwbG9wZW49dHJ1ZTtcbiAgICAkc2NvcGUuZmluZERpcmVjdGl2ZVRvTWFrZUFjdGl2ZUVkaXQoJHNjb3BlLmFwcENvbmZpZywkc2NvcGUuZWRpdENhbmRpZGF0ZSk7XG59XG5cbn0pO1xuXG4iLCJcInVzZSBzdHJpY3RcIjtcbmFwcC5jb250cm9sbGVyKCdQcm9qZWN0RWRpdEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsJGNvbXBpbGUsJHRpbWVvdXQscHJvamVjdCxkYXRhRmlsZXMsbWFuaWZlc3RGYWN0b3J5LCRzdGF0ZVBhcmFtcyxBdXRoU2VydmljZSxQcm9qZWN0RmFjdG9yeSwkbG9jYXRpb24sJGFuY2hvclNjcm9sbCxVcGxvYWQscHJvamVjdERhdGFGYWN0b3J5LGFuY2hvclNtb290aFNjcm9sbCl7XG4vLyBURVNUIFRIRSBGT0xMT1dJTkcgRlVOQ1RJT05TXG4vLyBhZGQgYSBwYWdlXG4vLyBhZGQgYSByb3dcbi8vIGFkZCBhIGNvbHVtblxuLy8gYWRkIGEgZGlyZWN0aXZlXG5cbi8vIFByb2plY3QgSWQgJiBVc2VyIElkXG4kc2NvcGUucHJvaklkID0gJHN0YXRlUGFyYW1zLmlkO1xudmFyIGdldFVzZXJJZCA9IGZ1bmN0aW9uKCl7XG4gIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpe1xuICAgICRzY29wZS51c2VySWQgPSB1c2VyLl9pZDtcbiAgfSlcbn1cbmdldFVzZXJJZCgpO1xuXG4vL2ZpbGVVcGxvYWRlciBGdW5jdGlvbmFsaXR5XG4kc2NvcGUudXBsb2FkZWRGaWxlcyA9IGRhdGFGaWxlcztcbiRzY29wZS51cGxvYWRGaWxlcyA9IGZ1bmN0aW9uKGZpbGUsIGVyckZpbGVzKSB7XG4gICRzY29wZS5mID0gZmlsZTtcbiAgJHNjb3BlLmVyckZpbGUgPSBlcnJGaWxlcyAmJiBlcnJGaWxlc1swXTtcbiAgaWYgKGZpbGUpIHtcbiAgICBmaWxlLnVwbG9hZCA9IFVwbG9hZC51cGxvYWQoe1xuICAgICAgICB1cmw6ICcvYXBpL2RhdGEvJyArICRzY29wZS5wcm9qSWQgKyAnLycgKyAkc2NvcGUudXNlcklkLFxuICAgICAgICBkYXRhOiB7ZmlsZTogZmlsZX0sXG4gICAgICAgIG1ldGhvZDogJ1BPU1QnXG4gICAgfSk7XG5cbiAgICBmaWxlLnVwbG9hZC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmaWxlLnJlc3VsdCA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICAkc2NvcGUudXBsb2FkZWRGaWxlcy5wdXNoKGZpbGUucmVzdWx0KTtcbiAgICAgICAgICAgICRzY29wZS5nZXRGaWVsZHMoKTtcbiAgICAgICAgfSk7XG4gICAgfSwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPiAwKVxuICAgICAgICAgICAgJHNjb3BlLmVycm9yTXNnID0gcmVzcG9uc2Uuc3RhdHVzICsgJzogJyArIHJlc3BvbnNlLmRhdGE7XG4gICAgfSwgZnVuY3Rpb24gKGV2dCkge1xuICAgICAgICBmaWxlLnByb2dyZXNzID0gTWF0aC5taW4oMTAwLCBwYXJzZUludCgxMDAuMCAqXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBldnQubG9hZGVkIC8gZXZ0LnRvdGFsKSk7XG4gICAgfSk7XG4gIH1cbn07XG5cblxuLy90aGlzIGlzIHRvIGlzb2xhdGUgaGVhZGVycyBvbiBhbGwgZmlsZXMgaW4gdGhlIGFycmF5XG4kc2NvcGUuZ2V0RmllbGRzPSBmdW5jdGlvbigpe1xuICBsZXQgX2ZpbGVIZWFkZXJzID0ge307XG4gICAgJHNjb3BlLnVwbG9hZGVkRmlsZXMuZm9yRWFjaChmdW5jdGlvbihmaWxlKXtcbiAgICAgIGlmKEpTT04ucGFyc2UoZmlsZS5kYXRhKVswXSl7XG4gICAgICAgIGxldCBmaXJzdFJvdz1KU09OLnBhcnNlKGZpbGUuZGF0YSlbMF07XG4gICAgICAgIGxldCBoZWFkZXJzPU9iamVjdC5rZXlzKGZpcnN0Um93KTtcbiAgICAgICAgX2ZpbGVIZWFkZXJzW2ZpbGUuX2lkXT1oZWFkZXJzO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgX2ZpbGVIZWFkZXJzW2ZpbGUuX2lkXT1bJ25vdCBhcHBsaWNhYmxlJ11cbiAgICAgIH1cbiAgICB9KVxuICAgICRzY29wZS5maWxlSGVhZGVycz1fZmlsZUhlYWRlcnM7XG59XG4vL3RoaXMgZ2V0cyBoZWFkZXJzIGZvciBzcGVjaWZpYyBmaWxlIGlkXG4kc2NvcGUuZ2V0SGVhZGVycyA9IGZ1bmN0aW9uKGZpbGVJZCxmaWxlSGVhZGVycyl7XG4gIHZhciBoZWFkZXJzO1xuICBpZihmaWxlSWQpe1xuICAgIGhlYWRlcnM9ZmlsZUhlYWRlcnNbZmlsZUlkXTtcbiAgfVxuICByZXR1cm4gaGVhZGVycztcbn1cblxuXG4kc2NvcGUuZ2V0RmllbGRzKCk7XG4vLyB0aGlzIGlzIHRoZSBhcHAgY29uZmlnXG4kc2NvcGUuYXBwQ29uZmlndGVtcD17fTtcbiRzY29wZS5hbGxNYW5pZmVzdHM9e307XG4kc2NvcGUuYXBwQ29uZmlnTWFzdGVyPXt9OyAvLyB0aGlzIHRoZSB2ZXJzaW9uIHRoYXQgaXMgaW4gc3luYyB3aXRoIHRoZSBkYXRhYmFzZSAwdGggcG9zaXRpb25cbiRzY29wZS5hcHBDb25maWdMYXlvdXRFZGl0Q29weT17fVxuJHNjb3BlLmFwcENvbmZpZ0VkaXRDb3B5PXt9OyAvLyB0aGlzIGlzIHRoZSBjb3B5IG9mIG9mIG9iamVjdCBiZWluZyBlZGl0ZWQgdGhhdCBjb3BpZWQgdG8gYXBwQ29uZmlnVmlld0RyaXZlciB3aGVuO1xuJHNjb3BlLmFwcENvbmZpZ1ZpZXdEcml2ZXI9e307IC8vIHRoaXMgaXMgdGhlIGNvcHkgb2Ygb2Ygb2JqZWN0IGJlaW5nIGVkaXRlZCB0aGF0IGNvcGllZCB0byBhcHBDb25maWdWaWV3RHJpdmVyIHdoZW5cbiRzY29wZS5yZWZlcmVuY2VUb0VkaXRJbkFwcENvbmZpZz17fTtcbiRzY29wZS5hY3RpdmVFZGl0PXt9O1xuJHNjb3BlLkN1cnJlbnRWaWV3V2lkdGg9JzAnO1xuJHNjb3BlLmNvbnRhaW5lcm1vZGU9J2NvbnRhaW5lcic7XG4vLyRzY29wZS5wcm9qZWN0X2luZm9fc291cmNlcz1be1wiaWRcIjpcIjU3NjVjODdmMGM5YjM4ZWZmMGY4ZGNiN1wiLFwiZGVzY3JpcHRpb25cIjpcInRoaXMgaXMgYW4gaW5mb1wifSx7XCJpZFwiOlwiMDkzMGVqMm4zMmRqMDIzZG4yM2QwMm4zZFwiLFwiZGVzY3JpcHRpb25cIjpcInRoaXMgaXMgYWxzbyBhbiBpbmZvXCJ9XTtcbiRzY29wZS5hdmFpbGFibGVDb2x1bW5XaWR0aHM9W3snd2lkdGgnOicxJ30seyd3aWR0aCc6JzInfSx7J3dpZHRoJzonMyd9LHsnd2lkdGgnOic0J30seyd3aWR0aCc6JzUnfSx7J3dpZHRoJzonNid9LHsnd2lkdGgnOic3J30seyd3aWR0aCc6JzgnfSx7J3dpZHRoJzonOSd9LHsnd2lkdGgnOicxMCd9LHsnd2lkdGgnOicxMSd9LHsnd2lkdGgnOicxMid9XTtcbiRzY29wZS5hdmFpbGFibGVDb2x1bW5TaG93PVt7J3Nob3cnOid0cnVlJ30seydzaG93JzonZmFsc2UnfV07XG4kc2NvcGUuYnVpbHRJbk1hbmlmZXN0cz1bXTtcbiRzY29wZS5sYXN0UGFnZT0nMCc7XG4kc2NvcGUubGFzdFJvdz0nMCc7XG4kc2NvcGUubGFzdENvbHVtbj0nMCc7XG4kc2NvcGUubGV2ZWxzT2ZVbmRvPTU7XG4vL2dldCBhbGwgbWFuaWZlc3RzXG5tYW5pZmVzdEZhY3RvcnkuZ2V0QWxsKClcbi50aGVuKGZ1bmN0aW9uKGRhdGEpe1xuICAkc2NvcGUuYWxsTWFuaWZlc3RzPWRhdGEuZGF0YTtcbn0pO1xuLy8gdGhpcyBvYmplY3QgZ2V0c1xuXG4kc2NvcGUuYWlfcGFnZV9tYW5pZmVzdD17XG4gICAgYWlfZGlyZWN0aXZlIDogdHJ1ZSxcbiAgICBhaV9kaXJlY3RpdmVfdHlwZSA6ICdsYXlvdXQnLFxuICAgIGFpX2RpcmVjdGl2ZV9uYW1lIDogJ2FpX3BhZ2UnLFxuICAgIGFpX2RpcmVjdGl2ZV9hdHRyaWJ1dGVzIDoge1xuICAgICAgICBhaV9jbGFzcyA6ICcvY3NzL3Jvd19hL3N0eWxlLmNzcycsXG4gICAgICAgIGFpX3BhZ2VfdGl0bGU6JycsXG4gICAgICAgIGFpX3BhZ2VfbWVudV90ZXh0IDonJ1xuICAgIH1cbn07XG5cbiRzY29wZS5haV9yb3dfbWFuaWZlc3Q9e1xuICAgIGFpX2RpcmVjdGl2ZSA6IHRydWUsXG4gICAgYWlfZGlyZWN0aXZlX3R5cGUgOiAnbGF5b3V0JyxcbiAgICBhaV9kaXJlY3RpdmVfbmFtZSA6ICdhaV9yb3cnLFxuICAgIGFpX2RpcmVjdGl2ZV9hdHRyaWJ1dGVzIDoge1xuICAgICAgICBhaV9jbGFzcyA6ICcvY3NzL3Jvd19hL3N0eWxlLmNzcycsXG4gICAgICAgICdjbGFzcycgOiAnJyxcbiAgICAgICAgJ3N0eWxlJyA6ICcnLFxuICAgICAgICAnYWlfYm9vdHN0cmFwX3Nob3cnOiB7J3hzJzp7J2NvbHNpemUnOid4cycsJ3Nob3cnOid0cnVlJywnZGV2aWNlbmFtZSc6J3Bob25lJ30sJ3NtJzp7J2NvbHNpemUnOidzbScsJ3Nob3cnOid0cnVlJywnZGV2aWNlbmFtZSc6J3RhYmxldCd9LCdtZCc6eydjb2xzaXplJzonbWQnLCdzaG93JzondHJ1ZScsJ2RldmljZW5hbWUnOidsYXB0b3AnfSwnbGcnOnsnY29sc2l6ZSc6J2xnJywnc2hvdyc6J3RydWUnLCdkZXZpY2VuYW1lJzonZGVza3RvcCd9fVxuICAgIH1cbn07XG5cbiRzY29wZS5haV9jb2x1bW5fbWFuaWZlc3Q9e1xuICAgIGFpX2RpcmVjdGl2ZSA6IHRydWUsXG4gICAgYWlfZGlyZWN0aXZlX3R5cGUgOiAnbGF5b3V0JyxcbiAgICBhaV9kaXJlY3RpdmVfbmFtZSA6ICdhaV9jb2wnLFxuICAgIGFpX2RpcmVjdGl2ZV9hdHRyaWJ1dGVzIDoge1xuICAgICAgICBhaV9jbGFzcyA6ICcvY3NzL3Jvd19hL3N0eWxlLmNzcycsXG4gICAgICAgIGNsYXNzIDogJycsXG4gICAgICAgIHN0eWxlOicnLFxuICAgICAgICAnYWlfYm9vdHN0cmFwX3Nob3cnOiB7J3hzJzp7J2NvbHNpemUnOid4cycsJ3Nob3cnOid0cnVlJywnZGV2aWNlbmFtZSc6J3Bob25lJ30sJ3NtJzp7J2NvbHNpemUnOidzbScsJ3Nob3cnOid0cnVlJywnZGV2aWNlbmFtZSc6J3RhYmxldCd9LCdtZCc6eydjb2xzaXplJzonbWQnLCdzaG93JzondHJ1ZScsJ2RldmljZW5hbWUnOidsYXB0b3AnfSwnbGcnOnsnY29sc2l6ZSc6J2xnJywnc2hvdyc6J3RydWUnLCdkZXZpY2VuYW1lJzonZGVza3RvcCd9fSxcbiAgICAgICAgJ2FpX2Jvb3RzdHJhcF93aWR0aCc6IHsneHMnOnsnY29sc2l6ZSc6J3hzJywnZGV2aWNlbmFtZSc6J3Bob25lJywnc2l6ZSc6JzEyJ30sJ3NtJzp7J2NvbHNpemUnOidzbScsJ2RldmljZW5hbWUnOid0YWJsZXQnLCdzaXplJzonMTInfSwnbWQnOnsnY29sc2l6ZSc6J21kJywnZGV2aWNlbmFtZSc6J2xhcHRvcCcsJ3NpemUnOic2J30sJ2xnJzp7J2NvbHNpemUnOidsZycsJ2RldmljZW5hbWUnOidkZXNrdG9wJywnc2l6ZSc6JzYnfX1cblxuICAgIH0sXG4gICAgYWlfY29udGVudCA6IHt9XG59O1xuXG4kc2NvcGUuYnVpbHRJbk1hbmlmZXN0c1swXT0kc2NvcGUuYWlfcGFnZV9tYW5pZmVzdDtcbiRzY29wZS5idWlsdEluTWFuaWZlc3RzWzFdPSRzY29wZS5haV9yb3dfbWFuaWZlc3Q7XG5cbi8vIHRoaXMgZnVuY3Rpb24gZ2V0IHRoZSBsYXN0IHBhZ2UgbnVtYiBpbiBjb25maWdcbiRzY29wZS5nZXRUYXJnZXRPYmplY3RCeUlkPWZ1bmN0aW9uKHBhZ2Uscm93LGNvbHVtbixsYW5kRGlyZWN0aXZlKXtcbiAgaWYobGFuZERpcmVjdGl2ZSl7XG4gICAgICByZXR1cm4gJHNjb3BlLmFwcENvbmZpZy5wYWdlc1sncGFnZV8nK3BhZ2VdWydyb3dzJ11bJ3Jvd18nK3Jvd11bJ2NvbHMnXVsnY29sXycrY29sdW1uXVsnYWlfY29udGVudCddO1xuICB9ZWxzZSBpZihjb2x1bW4pe1xuICAgICAgcmV0dXJuICRzY29wZS5hcHBDb25maWcucGFnZXNbJ3BhZ2VfJytwYWdlXVsncm93cyddWydyb3dfJytyb3ddWydjb2xzJ11bJ2NvbF8nK2NvbHVtbl07XG4gIH1lbHNlIGlmKHJvdyl7XG4gICAgICByZXR1cm4gICRzY29wZS5hcHBDb25maWcucGFnZXNbJ3BhZ2VfJytwYWdlXVsncm93cyddWydyb3dfJytyb3ddO1xuICB9ZWxzZSBpZihwYWdlKXtcbiAgICByZXR1cm4gICRzY29wZS5hcHBDb25maWcucGFnZXNbJ3BhZ2VfJytwYWdlXTtcbiAgfVxufTtcblxuJHNjb3BlLmRlbGV0ZVRhcmdldE9iamVjdEJ5SWQ9ZnVuY3Rpb24ocGFnZSxyb3csY29sdW1uLGxhbmREaXJlY3RpdmUpe1xuICBpZihsYW5kRGlyZWN0aXZlKXtcbiAgICAgIGRlbGV0ZSAkc2NvcGUuYXBwQ29uZmlnLnBhZ2VzWydwYWdlXycrcGFnZV1bJ3Jvd3MnXVsncm93Xycrcm93XVsnY29scyddWydjb2xfJytjb2x1bW5dWydhaV9jb250ZW50J107XG4gIH1lbHNlIGlmKGNvbHVtbil7XG4gICAgICBkZWxldGUgJHNjb3BlLmFwcENvbmZpZy5wYWdlc1sncGFnZV8nK3BhZ2VdWydyb3dzJ11bJ3Jvd18nK3Jvd11bJ2NvbHMnXVsnY29sXycrY29sdW1uXTtcbiAgfWVsc2UgaWYocm93KXtcbiAgICAgIGRlbGV0ZSAgJHNjb3BlLmFwcENvbmZpZy5wYWdlc1sncGFnZV8nK3BhZ2VdWydyb3dzJ11bJ3Jvd18nK3Jvd107XG4gIH1lbHNlIGlmKHBhZ2Upe1xuICAgIGRlbGV0ZSAgJHNjb3BlLmFwcENvbmZpZy5wYWdlc1sncGFnZV8nK3BhZ2VdO1xuICB9XG59O1xuXG4kc2NvcGUuZ2V0TGFzdFBhZ2U9ZnVuY3Rpb24oKXtcbiAgdHJ5e1xuICAgICRzY29wZS5sYXN0UGFnZT0wO1xuICAgIGZvcih2YXIga2V5IGluICRzY29wZS5hcHBDb25maWcucGFnZXMpe1xuICAgICAgICAkc2NvcGUubGFzdFBhZ2UrKztcbiAgICB9XG4gICAgcmV0dXJuICRzY29wZS5sYXN0UGFnZVxuICB9Y2F0Y2goZSl7fVxuXG59O1xuXG4vLyB0aGlzIGZ1bmN0aW9uIGdldCB0aGUgbGFzdCByb3cgbnVtYiBpbiBjb25maWcgb3IgZm9yIGEgZ2l2ZW4gcGFnZVxuJHNjb3BlLmdldExhc3RSb3c9ZnVuY3Rpb24ocGFnZSl7XG4gICAgdmFyIG15UGFnZT0wO1xuICAgIGlmKCBwYWdlID4gMCApeyBteVBhZ2UgPSBwYWdlOyB9ZWxzZXsgbXlQYWdlID0gJHNjb3BlLmdldExhc3RQYWdlKCk7IH1cbiAgICB0cnl7XG4gICAgICAgICRzY29wZS5sYXN0Um93PTA7XG4gICAgICAgIGZvcih2YXIga2V5IGluICRzY29wZS5hcHBDb25maWcucGFnZXNbJ3BhZ2VfJytteVBhZ2VdLnJvd3Mpe1xuICAgICAgICAgICAgJHNjb3BlLmxhc3RSb3crKztcbiAgICAgICAgfVxuICAgICAgICAgIHJldHVybiAkc2NvcGUubGFzdFJvdztcbiAgICB9Y2F0Y2goZSl7fVxufTtcblxuLy8gdGhpcyBmdW5jdGlvbiBnZXQgdGhlIGxhc3QgY29sIG51bWIgaW4gY29uZmlnIG9yIGZvciBhIGdpdmVuIHJvd1xuJHNjb3BlLmdldExhc3RDb2x1bW49ZnVuY3Rpb24ocGFnZSxyb3cpe1xuICAgICAgdmFyIG15UGFnZT0wO1xuICAgICAgdmFyIG15Um93PTA7XG4gICAgICBpZiggcGFnZSA+IDAgKXsgbXlQYWdlPXBhZ2U7IH1lbHNleyBteVBhZ2U9JHNjb3BlLmdldExhc3RQYWdlKCk7IH1cbiAgICAgIGlmKCByb3cgPiAwICl7IG15Um93ID0gcm93OyB9ZWxzZXsgbXlSb3cgPSAkc2NvcGUuZ2V0TGFzdFJvdyhteVBhZ2UpOyB9XG4gICAgICAkc2NvcGUubGFzdENvbHVtbj0wO1xuICAgICAgZm9yKHZhciBrZXkgaW4gJHNjb3BlLmFwcENvbmZpZy5wYWdlc1sncGFnZV8nK215UGFnZV0ucm93c1sncm93XycrbXlSb3ddWydjb2xzJ10pe1xuICAgICAgICAgICRzY29wZS5sYXN0Q29sdW1uKys7XG4gICAgICB9XG4gICAgICByZXR1cm4gJHNjb3BlLmxhc3RDb2x1bW47XG59O1xuXG4vLyB0aGlzIGZ1bmN0aW9uIHRha2VzIGEgbWFuaWZlc3QgYW5kIHNldHMgaXQgdXAgZm9yIGJlaW5nIGluc2VydGVkIGludG8gdGhlIGFwcENvbmZpZy5cbi8vIGl0IGRvZXMgdGhpcyBidCBhZGRpbmcgdGhlIHBhZ2Uscm93LGFuZCxjb2x1bW4gcHJvcGVyaXRlcy5cbiRzY29wZS5tb3ZlQ29uZmlnT2JqZWN0VG9FZGl0PWZ1bmN0aW9uKGNvbmZpZ09iamVjdCl7XG4gICRzY29wZS5yZWZlcmVuY2VUb0VkaXRJbkFwcENvbmZpZz1jb25maWdPYmplY3Q7IC8vIHRoaXMgaXMgcmVmZXJlbmNlIHRvIHRoZSBuZWVkZWQgYXBwQ29uZmlnIG9iamVjdFxuICBhbmd1bGFyLmNvcHkoY29uZmlnT2JqZWN0LCRzY29wZS5hcHBDb25maWdFZGl0Q29weSk7XG59O1xuXG4vLyB0aGlzIGZ1bmN0aW9uIG1vdmVzIHRoZSBlZGl0IHZlcnNpb24gb2YgdGVoIGFwcGNvbmZpZyBvYmplY3QgYmVnaW5nIGVkaXQgZnJvbSBlZGl0IG9iamVjdCB0byBpdCBwbGFjZSBpbiB0ZSBhcHBDb25maWcgb2JqZWNcbiRzY29wZS5zYXZlRWRpdD1mdW5jdGlvbihjYWxsZXIpe1xuICAgIGFuZ3VsYXIuY29weSgkc2NvcGUuYXBwQ29uZmlnRWRpdENvcHksJHNjb3BlLnJlZmVyZW5jZVRvRWRpdEluQXBwQ29uZmlnKTtcbiAgICAkc2NvcGUucHJvamVjdC5jb25maWcudW5zaGlmdChKU09OLnN0cmluZ2lmeSgkc2NvcGUuYXBwQ29uZmlnKSk7XG4gICAgaWYoJHNjb3BlLnByb2plY3QuY29uZmlnLmxlbmd0aCA+ICRzY29wZS5sZXZlbHNPZlVuZG8gKXtcbiAgICAgICAgJHNjb3BlLnByb2plY3QuY29uZmlnLnNwbGljZSgkc2NvcGUubGV2ZWxzT2ZVbmRvLCRzY29wZS5wcm9qZWN0LmNvbmZpZy5sZW5ndGgpO1xuICAgIH1cbiAgICBQcm9qZWN0RmFjdG9yeS51cGRhdGUoJHNjb3BlLnByb2plY3QpXG4gICAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcbiAgICAvLyAgICBjb25zb2xlLmRpcihyZXN1bHQpO1xuICAgICAgLyphbmd1bGFyLmNvcHkocmVzdWx0LmNvbmZpZ1swXSwkc2NvcGUuYXBwQ29uZmlnVGVtcCk7XG4gICAgICAgICRzY29wZS5ub3JtYWxpemVJZHMoJHNjb3BlLmFwcENvbmZpZ1RlbXApOyAvLyBub3JtYWxpemUgdGhlIG9iamVjdCBiZWZvcmUgaXQgaXMgcmVuZGVyXG4gICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICBhbmd1bGFyLmNvcHkoJHNjb3BlLmFwcENvbmZpZ1RlbXAsJHNjb3BlLmFwcENvbmZpZyk7XG4gICAgICAgIH0sNTAwKTsgKi9cbiAgICB9KTtcbiAgICBpZihjYWxsZXIgIT09ICdhZGR0b1BhZ2UnKXskc2NvcGUuY2xlYXJFZGl0KCl9O1xufTtcblxuJHNjb3BlLnNhdmVFbnRpcmVQcm9qZWN0PWZ1bmN0aW9uKGNhbGxlcil7XG4gICAgJHNjb3BlLnByb2plY3QuY29uZmlnLnVuc2hpZnQoSlNPTi5zdHJpbmdpZnkoJHNjb3BlLmFwcENvbmZpZykpO1xuICAgIGlmKCRzY29wZS5wcm9qZWN0LmNvbmZpZy5sZW5ndGggPiAkc2NvcGUubGV2ZWxzT2ZVbmRvICl7XG4gICAgICAgICRzY29wZS5wcm9qZWN0LmNvbmZpZy5zcGxpY2UoJHNjb3BlLmxldmVsc09mVW5kbywkc2NvcGUucHJvamVjdC5jb25maWcubGVuZ3RoKTtcbiAgICB9XG4gICAgUHJvamVjdEZhY3RvcnkudXBkYXRlKCRzY29wZS5wcm9qZWN0KVxuICAgIC50aGVuKGZ1bmN0aW9uKHJlc3VsdCl7XG4gICAgfSk7XG4gICAgaWYoY2FsbGVyICE9PSAnYWRkdG9QYWdlJyl7JHNjb3BlLmNsZWFyRWRpdCgpfTtcbn07Ly8gY2xlYXIgdGhlIGFwcCBvdXQgb2YgZWRpdCBtb2RlXG5cbiRzY29wZS5jbGVhckVkaXQ9ZnVuY3Rpb24oKXtcbiAgICAkdGltZW91dChmdW5jdGlvbigpeyRzY29wZS5hcHBDb25maWdFZGl0Q29weT17fX0sNTAwKTtcbiAgICAkc2NvcGUuY3Bsb3Blbj1mYWxzZTtcbiAgICAkc2NvcGUuU0RvcGVuPWZhbHNlO1xufTtcblxuJHNjb3BlLmRlbGV0ZUVsZW1lbnQ9ZnVuY3Rpb24oKXtcbmNvbnNvbGUuZGlyKCRzY29wZS5hcHBDb25maWdFZGl0Q29weSk7XG4gJHNjb3BlLmRlbGV0ZVRhcmdldE9iamVjdEJ5SWQoJHNjb3BlLmFwcENvbmZpZ0VkaXRDb3B5LmFpX2RpcmVjdGl2ZV9wYWdlLCRzY29wZS5hcHBDb25maWdFZGl0Q29weS5haV9kaXJlY3RpdmVfcm93LCRzY29wZS5hcHBDb25maWdFZGl0Q29weS5haV9kaXJlY3RpdmVfY29sKTtcbiAkc2NvcGUucHJvamVjdC5jb25maWcudW5zaGlmdCgkc2NvcGUuYXBwQ29uZmlnKTtcbiAgICBpZigkc2NvcGUucHJvamVjdC5jb25maWcubGVuZ3RoID4gJHNjb3BlLmxldmVsc09mVW5kbyApe1xuICAgICAgJHNjb3BlLnByb2plY3QuY29uZmlnLnNwbGljZSgkc2NvcGUubGV2ZWxzT2ZVbmRvLCRzY29wZS5wcm9qZWN0LmNvbmZpZy5sZW5ndGgpO1xuICAgIH1cbiAgICBQcm9qZWN0RmFjdG9yeS51cGRhdGUoJHNjb3BlLnByb2plY3QpXG4gICAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcbiAgICB9KTtcbn07XG4kc2NvcGUudW5kb0VkaXQ9ZnVuY3Rpb24oKXtcbiAgICBhbmd1bGFyLmNvcHkoe30sJHNjb3BlLnJlZmVyZW5jZVRvRWRpdEluQXBwQ29uZmlnKTtcbiAgICAkc2NvcGUucHJvamVjdC5jb25maWcudW5zaGlmdCgkc2NvcGUuYXBwQ29uZmlnKTtcbiAgICBpZigkc2NvcGUucHJvamVjdC5jb25maWcubGVuZ3RoID4gJHNjb3BlLmxldmVsc09mVW5kbyApe1xuICAgICAgJHNjb3BlLnByb2plY3QuY29uZmlnLnNwbGljZSgkc2NvcGUubGV2ZWxzT2ZVbmRvLCRzY29wZS5wcm9qZWN0LmNvbmZpZy5sZW5ndGgpO1xuICAgIH1cbiAgICBQcm9qZWN0RmFjdG9yeS51cGRhdGUoJHNjb3BlLnByb2plY3QpXG4gICAgLnRoZW4oZnVuY3Rpb24ocmVzdWx0KXtcbiAgICB9KTtcbn07XG5cblxuLy8gdGhpcyBmdW5jdGlvbiB0YWtlcyB5b3VyIG1hbmlmZXN0IG9iamVjdCBhbmQgYWRkIHRoZSBhaS1wYWdlLGFpLXJvdyBhbmQgYWktY29sIGF0dHJpYnV0ZXMgbWFrZWluZyBpcyBzdWl0YWJsZSBmb3IgaW5zZXJ0aW9uIGludG8gdGhlIGFwcENvbmZpZ1xuJHNjb3BlLm1hbmlmZXN0VG9BcHBDb25maWc9ZnVuY3Rpb24ocGFnZSxyb3csY29sdW1uLG1hbmlmZXN0T2JqKXtcbiAgLy9jb25zb2xlLmxvZyhwYWdlKTtcbiAgaWYoY29sdW1uID4gMCl7XG4gICAgICBtYW5pZmVzdE9iai5haV9kaXJlY3RpdmVfcGFnZSA9IHBhZ2U7XG4gICAgICBtYW5pZmVzdE9iai5haV9kaXJlY3RpdmVfcm93ID0gcm93O1xuICAgICAgbWFuaWZlc3RPYmouYWlfZGlyZWN0aXZlX2NvbCA9IGNvbHVtbjtcbiAgICAgIHJldHVybiBtYW5pZmVzdE9iajtcbiAgfWVsc2UgaWYocm93ID4gMCl7XG4gICAgICBtYW5pZmVzdE9iai5haV9kaXJlY3RpdmVfcGFnZSA9IHBhZ2U7XG4gICAgICBtYW5pZmVzdE9iai5haV9kaXJlY3RpdmVfcm93ID0gcm93O1xuICAgICAgbWFuaWZlc3RPYmouYWlfZGlyZWN0aXZlX2NvbCA9ICcnO1xuICAgICAgcmV0dXJuIG1hbmlmZXN0T2JqO1xuICB9ZWxzZSBpZihwYWdlID4gMCl7XG4gICAgLy9jb25zb2xlLmxvZyhtYW5pZmVzdE9iaik7XG4gICAgICBtYW5pZmVzdE9iai5haV9kaXJlY3RpdmVfcGFnZSA9IHBhZ2U7XG4gICAgICBtYW5pZmVzdE9iai5haV9kaXJlY3RpdmVfcm93ID0gJyc7XG4gICAgICBtYW5pZmVzdE9iai5haV9kaXJlY3RpdmVfY29sID0gJyc7XG4gICAgICByZXR1cm4gbWFuaWZlc3RPYmo7XG4gICAgfVxufTtcblxuLy8gVGhpcyBmdW5jdGlvbiByZW5kZXJzIHRoZSBzdHJpbmcgb2YgYXR0cmlidXRlcyB0byBpbmNsdWRlIGluIHRoZSBkaXJlY3RpdmUgYmVpbmcgcmVuZGVyZWRcbiRzY29wZS5yZW5kZXJhdHRyaWJ1dGVTdHJpbmc9ZnVuY3Rpb24ob2JqKXtcbiAgICB2YXIgYXR0cmlidXRlU3RyaW5nPScnO1xuICAgIHZhciBuZ0NsYXNzU3RyaW5nPScgbmctY2xhc3M9XCJ7JztcbiAgICBmb3IodmFyIGF0dHJpYk5hbWUgaW4gb2JqKXtcbiAgICAgICAgaWYoYXR0cmliTmFtZS5pbmRleE9mKCdhaV9ib290c3RyYXBfd2lkdGgnKSA+IC0xICl7XG4gICAgICAgICAgICBmb3IodmFyIGJvb3RTaXplIGluIG9ialthdHRyaWJOYW1lXSl7XG4gICAgICAgICAgICAgbmdDbGFzc1N0cmluZys9XCInY29sLVwiK2Jvb3RTaXplK1wiLVwiK29ialthdHRyaWJOYW1lXVtib290U2l6ZV1bJ3NpemUnXStcIlxcJzogdHJ1ZSxcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfWVsc2UgaWYoYXR0cmliTmFtZS5pbmRleE9mKCdhaV9ib290c3RyYXBfc2hvdycpID4gLTEpe1xuICAgICAgICAgICBmb3IodmFyIGJvb3RTaG93IGluIG9ialthdHRyaWJOYW1lXSl7XG4gICAgICAgICAgICAgICAgaWYob2JqW2F0dHJpYk5hbWVdW2Jvb3RTaG93XVsnc2hvdyddID09ICdmYWxzZScpe1xuICAgICAgICAgICAgICAgICAgICBuZ0NsYXNzU3RyaW5nKz1cIidoaWRkZW4tXCIrYm9vdFNob3crXCInIDogdHJ1ZSxcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgYXR0cmlidXRlU3RyaW5nKz1hdHRyaWJOYW1lKyc9XCInK29ialthdHRyaWJOYW1lXSsnXCIgJztcbiAgICAgICAgfVxuICAgIH1cbiAgICBuZ0NsYXNzU3RyaW5nKz1cIidlZGl0X3Jvd19wYXNzaXZlJyA6IHRydWUsXCI7XG4gICAgYXR0cmlidXRlU3RyaW5nKz1uZ0NsYXNzU3RyaW5nO1xuICAgIHJldHVybiBhdHRyaWJ1dGVTdHJpbmc7XG59O1xuXG4kc2NvcGUubm9ybWFsaXplSWRzPWZ1bmN0aW9uKG9iaixzdGFjayl7XG5cbiAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoJ2FpX2RpcmVjdGl2ZScpKSB7XG4gICAgICAgICAgICAgIGlmIChzdGFjayA9PT0gdW5kZWZpbmVkKXtcbiAgICAgICAgICAgICAgICAgIHZhciBzdGFjaz17XG4gICAgICAgICAgICAgICAgICAgICAgbGFzdE5vcm1hbFBhZ2U6MCxcbiAgICAgICAgICAgICAgICAgICAgICBsYXN0Tm9ybWFsUm93OjAsXG4gICAgICAgICAgICAgICAgICAgICAgbGFzdE5vcm1hbENvbDowXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAvL2lmIGl0cyBhIHBhZ2VcbiAgICAgICAgICAgICBpZigob2JqLmFpX2RpcmVjdGl2ZV90eXBlID09PSdsYXlvdXQnKSAmJiAob2JqWydhaV9kaXJlY3RpdmVfbmFtZSddID09PSAnYWlfcGFnZScpKXtcbiAgICAgICAgICAgICAgICAgIHN0YWNrLmxhc3ROb3JtYWxQYWdlKys7XG4gICAgICAgICAgICAgICAgICBzdGFjay5sYXN0Tm9ybWFsUm93PTA7XG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnYWlfcGFnZScrc3RhY2subGFzdE5vcm1hbFBhZ2UpO1xuICAgICAgICAgICAgICAgICAgb2JqLmFpX2RpcmVjdGl2ZV9wYWdlPXN0YWNrLmxhc3ROb3JtYWxQYWdlO1xuICAgICAgICAgICAgICAgICAgb2JqLmFpX2RpcmVjdGl2ZV9yb3c9XCJcIjtcbiAgICAgICAgICAgICAgICAgIG9iai5haV9kaXJlY3RpdmVfY29sPVwiXCI7XG4gICAgICAgICAgICAgfVxuICAgICAgICAgICAgIC8vaWYgaXRzIGEgcm93XG4gICAgICAgICAgICAgaWYoKG9iai5haV9kaXJlY3RpdmVfdHlwZSA9PT0nbGF5b3V0JykgJiYgKG9ialsnYWlfZGlyZWN0aXZlX25hbWUnXSA9PT0gJ2FpX3JvdycpKXtcbiAgICAgICAgICAgICAgICBzdGFjay5sYXN0Tm9ybWFsUm93Kys7XG4gICAgICAgICAgICAgICAgc3RhY2subGFzdE5vcm1hbENvbD0wO1xuICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnYWlfcm93JytzdGFjay5sYXN0Tm9ybWFsUm93KTtcbiAgICAgICAgICAgICAgICAgIG9iai5haV9kaXJlY3RpdmVfcGFnZT1zdGFjay5sYXN0Tm9ybWFsUGFnZTtcbiAgICAgICAgICAgICAgICAgIG9iai5haV9kaXJlY3RpdmVfcm93PXN0YWNrLmxhc3ROb3JtYWxSb3c7XG4gICAgICAgICAgICAgICAgICBvYmouYWlfZGlyZWN0aXZlX2NvbD1cIlwiO1xuICAgICAgICAgICAgICAgICAgdmFyIGNvdW50ZXI9MDtcbiAgICAgICAgICAgICAgICAgIHZhciB0ZW1wQXJyeT1bXTtcbiAgICAgICAgICAgICAgICAgIHZhciB0ZW1wT2JqPXt9O1xuICAgICAgICAgICAgICAgICAgZm9yKHZhciBrZXkgaW4gb2JqWydjb2xzJ10peyB0ZW1wQXJyeS5wdXNoKG9ialsnY29scyddW2tleV0pOyB9XG4gICAgICAgICAgICAgICAgICAgICAgb2JqWydjb2xzJ109e307XG4gICAgICAgICAgICAgICAgICAgICAgZm9yKHZhciBpPTA7IGkgPCB0ZW1wQXJyeS5sZW5ndGg7IGkrKyl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBPYmpbJ2NvbF8nKyhpKzEpXT10ZW1wQXJyeVtpXTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgb2JqWydjb2xzJ109dGVtcE9iajtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgIC8vaWYgaXRzIGEgY29sXG4gICAgICAgICAgICAgaWYoKG9iai5haV9kaXJlY3RpdmVfdHlwZSA9PT0nbGF5b3V0JykgJiYgKG9ialsnYWlfZGlyZWN0aXZlX25hbWUnXSA9PT0gJ2FpX2NvbCcpKXtcbiAgICAgICAgICAgICAgICBzdGFjay5sYXN0Tm9ybWFsQ29sKys7XG4gICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZygnYWlfY29sJytzdGFjay5sYXN0Tm9ybWFsQ29sKTtcbiAgICAgICAgICAgICAgICAgIG9iai5haV9kaXJlY3RpdmVfcGFnZT1zdGFjay5sYXN0Tm9ybWFsUGFnZTtcbiAgICAgICAgICAgICAgICAgIG9iai5haV9kaXJlY3RpdmVfcm93PXN0YWNrLmxhc3ROb3JtYWxSb3c7XG4gICAgICAgICAgICAgICAgICBvYmouYWlfZGlyZWN0aXZlX2NvbD1zdGFjay5sYXN0Tm9ybWFsQ29sO1xuICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAvL2lmIGl0cyBhIGNvbnRlbnRcbiAgICAgICAgICAgICBpZigob2JqLmFpX2RpcmVjdGl2ZV90eXBlID09PSdjb250ZW50Jykpe1xuICAgICAgICAgICAgICAgICAgb2JqLmFpX2RpcmVjdGl2ZV9wYWdlPXN0YWNrLmxhc3ROb3JtYWxQYWdlO1xuICAgICAgICAgICAgICAgICAgb2JqLmFpX2RpcmVjdGl2ZV9yb3c9c3RhY2subGFzdE5vcm1hbFJvdztcbiAgICAgICAgICAgICAgICAgIG9iai5haV9kaXJlY3RpdmVfY29sPXN0YWNrLmxhc3ROb3JtYWxDb2w7XG4gICAgICAgICAgICAgfVxuICAgICAgfVxuICAgICAgZm9yICh2YXIgcHJvcGVydHkgaW4gb2JqKSB7XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIG9ialtwcm9wZXJ0eV0gPT0gXCJvYmplY3RcIil7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5ub3JtYWxpemVJZHMob2JqW3Byb3BlcnR5XSxzdGFjayk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgfVxufTtcblxuLy8gdGhpcyBmdW5jdGlvbiBhcHBlbmQgYSBjb21waWxlZCBwYWdlIGludG8gdGhlIERPTVxuJHNjb3BlLnJlbmRlclBhZ2VIdG1sRnJvbUFpQ29uZmlnPWZ1bmN0aW9uKG9iaikge1xuICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eSgnYWlfZGlyZWN0aXZlJykpIHtcbiAgICAgICAgaWYoKG9iai5haV9kaXJlY3RpdmVfdHlwZSA9PT0nbGF5b3V0JykgJiYgKG9ialsnYWlfZGlyZWN0aXZlX25hbWUnXSA9PT0gJ2FpX3BhZ2UnKSl7XG4gICAgICAgICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQod29ya2FyZWEpLmFwcGVuZCgkY29tcGlsZSgnPCcrb2JqWydhaV9kaXJlY3RpdmVfbmFtZSddKycgaWQ9XCJwXycrb2JqWydhaV9kaXJlY3RpdmVfcGFnZSddKydfcl8nK29ialsnYWlfZGlyZWN0aXZlX3JvdyddKydfYWlfcm93XCIgJysgJHNjb3BlLnJlbmRlcmF0dHJpYnV0ZVN0cmluZyhvYmpbJ2FpX2RpcmVjdGl2ZV9hdHRyaWJ1dGVzJ10pKyc+PC8nK29ialsnYWlfZGlyZWN0aXZlX25hbWUnXSsnPicpKCRzY29wZSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiBvYmopIHtcbiAgICAgICAgICAgICAgICBpZih0eXBlb2Ygb2JqW3Byb3BlcnR5XSA9PSBcIm9iamVjdFwiKXtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnJlbmRlclBhZ2VIdG1sRnJvbUFpQ29uZmlnKG9ialtwcm9wZXJ0eV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgIH1cbn07XG5cbi8vIHRoaXMgZnVuY3Rpb24gYXBwZW5kIGEgY29tcGlsZWQgcm93IGludG8gdGhlIERPTVxuJHNjb3BlLnJlbmRlclJvd0h0bWxGcm9tQWlDb25maWc9ZnVuY3Rpb24ob2JqKSB7XG4gICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KCdhaV9kaXJlY3RpdmUnKSkge1xuICAgICAgICBpZigob2JqLmFpX2RpcmVjdGl2ZV90eXBlID09PSdsYXlvdXQnKSAmJiAob2JqWydhaV9kaXJlY3RpdmVfbmFtZSddID09PSAnYWlfcm93Jykpe1xuICAgICAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh3b3JrYXJlYSkuYXBwZW5kKCRjb21waWxlKCc8ZGl2ICAgJysgJHNjb3BlLnJlbmRlcmF0dHJpYnV0ZVN0cmluZyhvYmpbJ2FpX2RpcmVjdGl2ZV9hdHRyaWJ1dGVzJ10pKydcXCdlZGl0X3Jvd19hY3RpdmVcXCc6Z2V0RWRpdENhbmRpZGF0ZShcXCdwXycrb2JqWydhaV9kaXJlY3RpdmVfcGFnZSddKydfcl8nK29ialsnYWlfZGlyZWN0aXZlX3JvdyddKydfYWlfcm93XFwnKX1cIiAgIG5nLW1vdXNlZW50ZXI9XCJzZXRFZGl0Q2FuZGlkYXRlKFxcJ3BfJytvYmpbJ2FpX2RpcmVjdGl2ZV9wYWdlJ10rJ19yXycrb2JqWydhaV9kaXJlY3RpdmVfcm93J10rJ19haV9yb3dcXCcpXCIgbmctbW91c2VsZWF2ZT1cInNldEVkaXRDYW5kaWRhdGUoXFwnXFwnKVwiPjxhaS1lZGl0LWhvdC1zcG90IHNldC1hY3RpdmUtZWRpdC1lbGVtZW50PVwic2V0RWRpdFNlbGVjdCgpXCIgXCIgYWN0aXZlLWVkaXQtZWxlbWVudD1cImVkaXRDYW5kaWRhdGVcIiBlZGl0LW9iamVjdC10eXBlPVwicm93XCIgYWktZWRpdC1ob3Qtc3BvdC1pZD1cInBfJytvYmpbJ2FpX2RpcmVjdGl2ZV9wYWdlJ10rJ19yXycrb2JqWydhaV9kaXJlY3RpdmVfcm93J10rJ19haV9yb3dcIj48L2FpLWVkaXQtaG90LXNwb3Q+PGRpdiBjbGFzcz1cImNvbnRhaW5lclwiIGlkPVwicF8nK29ialsnYWlfZGlyZWN0aXZlX3BhZ2UnXSsnX3JfJytvYmpbJ2FpX2RpcmVjdGl2ZV9yb3cnXSsnX2FpX3Jvd1wiPjwvZGl2PjwvZGl2PicpKCRzY29wZSkpO1xuICAgICAgICAgICAgICAgICAgLy9hbmd1bGFyLmVsZW1lbnQod29ya2FyZWEpLmFwcGVuZCgkY29tcGlsZSgnPGRpdiBzdHlsZT1cInBhZGRpbmc6MHB4XCIgbmctbW91c2VlbnRlcj1cInNldEVkaXRDYW5kaWRhdGUoXFwncF8nK29ialsnYWlfZGlyZWN0aXZlX3BhZ2UnXSsnX3JfJytvYmpbJ2FpX2RpcmVjdGl2ZV9yb3cnXSsnX2FpX3Jvd1xcJylcIiBuZy1tb3VzZWxlYXZlPVwic2V0RWRpdENhbmRpZGF0ZShcXCdcXCcpXCI+PGFpLWVkaXQtaG90LXNwb3Qgc2V0LWFjdGl2ZS1lZGl0LWVsZW1lbnQ9XCJzZXRFZGl0U2VsZWN0KClcIiBhY3RpdmUtZWRpdC1lbGVtZW50PVwiZWRpdENhbmRpZGF0ZVwiIGFpLWVkaXQtaG90LXNwb3QtaWQ9XCJwXycrb2JqWydhaV9kaXJlY3RpdmVfcGFnZSddKydfcl8nK29ialsnYWlfZGlyZWN0aXZlX3JvdyddKydfYWlfcm93XCI+PC9haS1lZGl0LWhvdC1zcG90PiAgICA8ZGl2ICBpZD1cInBfJytvYmpbJ2FpX2RpcmVjdGl2ZV9wYWdlJ10rJ19yXycrb2JqWydhaV9kaXJlY3RpdmVfcm93J10rJ19haV9yb3dcIiAnKyAkc2NvcGUucmVuZGVyYXR0cmlidXRlU3RyaW5nKG9ialsnYWlfZGlyZWN0aXZlX2F0dHJpYnV0ZXMnXSkrJ1xcJ2VkaXRfcm93X2FjdGl2ZVxcJzpnZXRFZGl0Q2FuZGlkYXRlKFxcJ3BfJytvYmpbJ2FpX2RpcmVjdGl2ZV9wYWdlJ10rJ19yXycrb2JqWydhaV9kaXJlY3RpdmVfcm93J10rJ19haV9yb3dcXCcpfVwiPC9kaXY+PC9kaXY+JykoJHNjb3BlKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAodmFyIHByb3BlcnR5IGluIG9iaikge1xuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvYmpbcHJvcGVydHldID09IFwib2JqZWN0XCIpe1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUucmVuZGVyUm93SHRtbEZyb21BaUNvbmZpZyhvYmpbcHJvcGVydHldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICB9XG5cbn07XG5cbi8vIHRoaXMgZnVuY3Rpb24gYXBwZW5kIGEgY29tcGlsZWQgQ29sdW1uIGludG8gdGhlIERPTVxuJHNjb3BlLnJlbmRlckNvbEh0bWxGcm9tQWlDb25maWc9ZnVuY3Rpb24ob2JqKSB7XG4gICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KCdhaV9kaXJlY3RpdmUnKSkge1xuICAgICAgICBpZigob2JqWydhaV9kaXJlY3RpdmVfdHlwZSddID09PSdsYXlvdXQnKSAmJiAob2JqWydhaV9kaXJlY3RpdmVfbmFtZSddID09PSAnYWlfY29sJykpe1xuICAgICAgICAgICAgICAgICAkc2NvcGUuYXBwZW5kVGFyZ2V0PScjcF8nK29ialsnYWlfZGlyZWN0aXZlX3BhZ2UnXSsnX3JfJytvYmpbJ2FpX2RpcmVjdGl2ZV9yb3cnXSsnX2FpX3Jvdyc7XG4gICAgICAgICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQoZG9jdW1lbnQucXVlcnlTZWxlY3RvciggJHNjb3BlLmFwcGVuZFRhcmdldCApKS5hcHBlbmQoJGNvbXBpbGUoJzxkaXYgaWQ9XCJwXycrb2JqWydhaV9kaXJlY3RpdmVfcGFnZSddKydfcl8nK29ialsnYWlfZGlyZWN0aXZlX3JvdyddKydfY18nK29ialsnYWlfZGlyZWN0aXZlX2NvbCddKydfYWlfY29sXCIgJysgJHNjb3BlLnJlbmRlcmF0dHJpYnV0ZVN0cmluZyhvYmpbJ2FpX2RpcmVjdGl2ZV9hdHRyaWJ1dGVzJ10pKydcXCdlZGl0X3Jvd19hY3RpdmVcXCc6Z2V0RWRpdENhbmRpZGF0ZShcXCdwXycrb2JqWydhaV9kaXJlY3RpdmVfcGFnZSddKydfcl8nK29ialsnYWlfZGlyZWN0aXZlX3JvdyddKydfY18nK29ialsnYWlfZGlyZWN0aXZlX2NvbCddKydfYWlfY29sXFwnKX1cIiBuZy1tb3VzZWVudGVyPVwic2V0RWRpdENhbmRpZGF0ZShcXCdwXycrb2JqWydhaV9kaXJlY3RpdmVfcGFnZSddKydfcl8nK29ialsnYWlfZGlyZWN0aXZlX3JvdyddKydfY18nK29ialsnYWlfZGlyZWN0aXZlX2NvbCddKydfYWlfY29sXFwnKVwiIG5nLW1vdXNlbGVhdmU9XCJzZXRFZGl0Q2FuZGlkYXRlKFxcJ3BfJytvYmpbJ2FpX2RpcmVjdGl2ZV9wYWdlJ10rJ19yXycrb2JqWydhaV9kaXJlY3RpdmVfcm93J10rJ19haV9yb3dcXCcpXCI+PGFpLWVkaXQtaG90LXNwb3Qgc2V0LWFjdGl2ZS1lZGl0LWVsZW1lbnQ9XCJzZXRFZGl0U2VsZWN0KClcIiBhY3RpdmUtZWRpdC1lbGVtZW50PVwiZWRpdENhbmRpZGF0ZVwiIGVkaXQtb2JqZWN0LXR5cGU9XCJjb2x1bW5cIiBhaS1lZGl0LWhvdC1zcG90LWlkPVwicF8nK29ialsnYWlfZGlyZWN0aXZlX3BhZ2UnXSsnX3JfJytvYmpbJ2FpX2RpcmVjdGl2ZV9yb3cnXSsnX2NfJytvYmpbJ2FpX2RpcmVjdGl2ZV9jb2wnXSsnX2FpX2NvbFwiPjwvYWktZWRpdC1ob3Qtc3BvdD48L2Rpdj4nKSgkc2NvcGUpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZm9yICh2YXIgcHJvcGVydHkgaW4gb2JqKSB7XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIG9ialtwcm9wZXJ0eV0gPT0gXCJvYmplY3RcIil7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5yZW5kZXJDb2xIdG1sRnJvbUFpQ29uZmlnKG9ialtwcm9wZXJ0eV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgIH1cbn07XG5cbiRzY29wZS5yZW5kZXJDbGVhcmZpeEh0bWxGcm9tQWlDb25maWc9ZnVuY3Rpb24ob2JqKSB7XG4gICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KCdhaV9kaXJlY3RpdmUnKSkge1xuICAgICAgICBpZigob2JqWydhaV9kaXJlY3RpdmVfdHlwZSddID09PSdsYXlvdXQnKSAmJiAob2JqWydhaV9kaXJlY3RpdmVfbmFtZSddID09PSAnYWlfcm93Jykpe1xuICAgICAgICAgICAgICAgICAkc2NvcGUuYXBwZW5kVGFyZ2V0PScjcF8nK29ialsnYWlfZGlyZWN0aXZlX3BhZ2UnXSsnX3JfJytvYmpbJ2FpX2RpcmVjdGl2ZV9yb3cnXSsnX2FpX3Jvdyc7XG4gICAgICAgICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQoZG9jdW1lbnQucXVlcnlTZWxlY3RvciggJHNjb3BlLmFwcGVuZFRhcmdldCApKS5hcHBlbmQoJGNvbXBpbGUoJzxkaXYgY2xhc3M9XCJjbGVhcmZpeFwiPjwvZGl2PicpKCRzY29wZSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiBvYmopIHtcbiAgICAgICAgICAgICAgICBpZih0eXBlb2Ygb2JqW3Byb3BlcnR5XSA9PSBcIm9iamVjdFwiKXtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnJlbmRlckNsZWFyZml4SHRtbEZyb21BaUNvbmZpZyhvYmpbcHJvcGVydHldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICB9XG59O1xuLy8gdGhpcyBmdW5jdGlvbiBhcHBlbmQgYSBjb21waWxlZCBEaXJlY3RpdmUgaW50byB0aGUgRE9NXG4vLyBqdXN0IGEgbm90ZSA6IEkgZG9udCBsaWtlIHRoZSBmYWN0IHRoYXQgSSBhbSB1c2luZyB0aGUgZGlyZWN0aXZlcyBJZGVhIG9mIHdoZXJlIGl0IGlzIHRvIHJlbmRlciBpdCBJIHdvdWxkIHJhdGhlciB1c2UgdGhlXG4vLyBwb3NpdGlvbiBvZiB0aGUgbGFzdCBjb2x1bW4gaSBzYXcgd2hpbGUgaXRlcmF0aW5nLlxuJHNjb3BlLnJlbmRlckRpcmVjdGl2ZUh0bWxGcm9tQWlDb25maWc9ZnVuY3Rpb24ob2JqKSB7XG4gICAgICBpZiAob2JqLmhhc093blByb3BlcnR5KCdhaV9kaXJlY3RpdmUnKSkge1xuICAgICAgICBpZihvYmpbJ2FpX2RpcmVjdGl2ZV90eXBlJ10gPT09ICdjb250ZW50Jyl7XG4gICAgICAgICAgICAkc2NvcGUuYXBwZW5kVGFyZ2V0PScjcF8nK29ialsnYWlfZGlyZWN0aXZlX3BhZ2UnXSsnX3JfJytvYmpbJ2FpX2RpcmVjdGl2ZV9yb3cnXSsnX2NfJytvYmpbJ2FpX2RpcmVjdGl2ZV9jb2wnXSsnX2FpX2NvbCc7XG4gICAgICAgICAgICBhbmd1bGFyLmVsZW1lbnQoZG9jdW1lbnQucXVlcnlTZWxlY3RvciggJHNjb3BlLmFwcGVuZFRhcmdldCApKS5hcHBlbmQoJGNvbXBpbGUoJzxkaXYgc3R5bGU9XCJtYXJnaW46MHB4O3BhZGRpbmc6MHB4XCIgY2xhc3M9XCJkaXJlY3RpdmVMYW5kaW5nWm9uZVwiPjwnK29ialsnYWlfZGlyZWN0aXZlX25hbWUnXSsnIGlkPVwicF8nK29ialsnYWlfZGlyZWN0aXZlX3BhZ2UnXSsnX3JfJytvYmpbJ2FpX2RpcmVjdGl2ZV9yb3cnXSsnX2NfJytvYmpbJ2FpX2RpcmVjdGl2ZV9jb2wnXSsnXCIgJyskc2NvcGUucmVuZGVyYXR0cmlidXRlU3RyaW5nKG9ialsnYWlfZGlyZWN0aXZlX2F0dHJpYnV0ZXMnXSkrJ1xcJ2RpcmVjdGl2ZVNwYWNlXFwnOiB0cnVlfVwiPjwvJytvYmpbJ2FpX2RpcmVjdGl2ZV9uYW1lJ10rJz48L2Rpdj4nKSgkc2NvcGUpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgZm9yICh2YXIgcHJvcGVydHkgaW4gb2JqKSB7XG4gICAgICAgICAgICAgICAgaWYodHlwZW9mIG9ialtwcm9wZXJ0eV0gPT0gXCJvYmplY3RcIil7XG4gICAgICAgICAgICAgICAgICAgICRzY29wZS5yZW5kZXJEaXJlY3RpdmVIdG1sRnJvbUFpQ29uZmlnKG9ialtwcm9wZXJ0eV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgIH1cbn07XG5cbi8vIHRoaXMgZnVuY3Rpb24gYWRkcyBhIG5ldyBlbGVtZW50IHRvIHRoZSBjb25maWcgb2JqXG4kc2NvcGUuY3JlYXRDb25maWdPYmplY3Q9ZnVuY3Rpb24odGFyZ2V0LG9iail7XG4gIC8vdGFyZ2V0PW9iajtcbiAgYW5ndWxhci5jb3B5KG9iaix0YXJnZXQpO1xufTtcbi8vIHRoaXMgcmVhZCBhIGFwcENvbmZpZyBvYmplY3RcbiRzY29wZS5yZWFkQ29uZmlnT2JqZWN0PWZ1bmN0aW9uKHRhcmdldCxuZXdlbGVtZW50KXtcblxufTtcblxuLy8gdGhpcyBmdW5jdGlvbiB1cGRhdGVzIGEgYXBwY29uZmlnIG9iamVjdFxuJHNjb3BlLnVwZGF0ZUNvbmZpZ09iamVjdD1mdW5jdGlvbih0YXJnZXQsbmV3ZWxlbWVudCxvYmope1xuICB0YXJnZXRbbmV3ZWxlbWVudF09b2JqO1xufTtcblxuLy8gdGhpcyBmdW5jdGlvbiBkZWxldGVzIGEgb2JqZWN0IGZyb20gdGhlIGFwcENvbmZpZyBvYmplY3RcbiRzY29wZS5kZWxldGVjb25maWdPYmplY3Q9ZnVuY3Rpb24odGFyZ2V0LHN1YkVsZW1lbnQpe1xuICBkZWxldGUgdGFyZ2V0W3N1YkVsZW1lbnRdO1xufTtcblxuLy8gdGhpcyBmdW5jdG9uIGdldCB0aGUgbmV4dCByb3cgbnVtYmVyIHRvIGFzc2dpbiBmb3IgdGhlIGN1cnJlbnQgcGFnZVxuJHNjb3BlLmdldE5leHRSb3dQYWdlPWZ1bmN0aW9uKHBhZ2Upe1xuICB2YXIgbmV3Um93O1xuICByZXR1cm4gIG5ld1JvdztcbiB9O1xuXG4vLyB0aGlzIGZ1bmN0b24gZ2V0IHRoZSBuZXh0IHJvdyBhbmQgY29sdW1uIG51bWJlciB0byBhc3NnaW4gZm9yIHRoZSBjdXJyZW50IHBhZ2VcbiRzY29wZS5nZXROZXh0Q29sdW1uSW5Sb3c9ZnVuY3Rpb24ocGFnZSxyb3cpe1xuICB2YXIgbmV3Q29sO1xuICByZXR1cm4gIG5ld0NvbDtcbn07XG5cbi8vIHRoaXMgZnVuY3Rpb24gd2lsbCBjcmVhdGUgdGhlIG5lZWRlZCB0YXJnZXQgb2JqZWN0IGFuZCByZXR1cm4gYSByZWZlcmVuY2UgdG8gdGhlICBjb25maWcgdGFyZ2V0XG4kc2NvcGUubWFrZUNvbmZpZ1RhcmdldD1mdW5jdGlvbihwYWdlLHJvdyxjb2x1bW4sbGFuZERpcmVjdGl2ZSl7XG4gIGlmKGxhbmREaXJlY3RpdmUpe1xuICAgIGlmKCRzY29wZS5hcHBDb25maWcucGFnZXNbJ3BhZ2VfJytwYWdlXVsncm93cyddWydyb3dfJytyb3ddWydjb2xzJ10uaGFzT3duUHJvcGVydHkoJ2NvbF8nK2NvbHVtbikpe1xuICAgICAgcmV0dXJuICRzY29wZS5hcHBDb25maWcucGFnZXNbJ3BhZ2VfJytwYWdlXVsncm93cyddWydyb3dfJytyb3ddWydjb2xzJ11bJ2NvbF8nK2NvbHVtbl1bJ2FpX2NvbnRlbnQnXT17fTtcbiAgICB9XG4gIH1lbHNlIGlmKGNvbHVtbil7XG4gICAgaWYoISRzY29wZS5hcHBDb25maWcucGFnZXNbJ3BhZ2VfJytwYWdlXVsncm93cyddWydyb3dfJytyb3ddLmhhc093blByb3BlcnR5KCdjb2xzJykpeyRzY29wZS5hcHBDb25maWcucGFnZXNbJ3BhZ2VfJytwYWdlXVsncm93cyddWydyb3dfJytyb3ddWydjb2xzJ109e319O1xuICAgICAgcmV0dXJuICRzY29wZS5hcHBDb25maWcucGFnZXNbJ3BhZ2VfJytwYWdlXVsncm93cyddWydyb3dfJytyb3ddWydjb2xzJ11bJ2NvbF8nK2NvbHVtbl09e307XG4gIH1lbHNlIGlmKHJvdyl7XG4gICAgICBpZighJHNjb3BlLmFwcENvbmZpZy5wYWdlc1sncGFnZV8nK3BhZ2VdLmhhc093blByb3BlcnR5KCdyb3dzJykpeyRzY29wZS5hcHBDb25maWcucGFnZXNbJ3BhZ2VfJytwYWdlXVsncm93cyddPXt9fTtcbiAgICAgIHJldHVybiAgJHNjb3BlLmFwcENvbmZpZy5wYWdlc1sncGFnZV8nK3BhZ2VdWydyb3dzJ11bJ3Jvd18nK3Jvd109e307XG4gIH1lbHNlIGlmKHBhZ2Upe1xuICAgIGlmKCEkc2NvcGUuYXBwQ29uZmlnLnBhZ2VzLmhhc093blByb3BlcnR5KCdwYWdlcycpKXskc2NvcGUuYXBwQ29uZmlnLnBhZ2VzPXt9OyB9XG4gICAgcmV0dXJuICAkc2NvcGUuYXBwQ29uZmlnLnBhZ2VzWydwYWdlXycrcGFnZV09e307XG4gIH1cbn07XG5cbiRzY29wZS5zZXRQb3N0aW9uUHJvcGVydGllcz1mdW5jdGlvbihvYmplY3QscGFnZSxyb3csY29sdW1uKXtcbiAgICAgIG9iamVjdC5haV9kaXJlY3RpdmVfcGFnZT1wYWdlO1xuICAgICAgb2JqZWN0LmFpX2RpcmVjdGl2ZV9yb3c9cm93O1xuICAgICAgb2JqZWN0LmFpX2RpcmVjdGl2ZV9jb2w9Y29sdW1uO1xufVxuXG4kc2NvcGUubW92ZUVsZW1lbnRIb3J6PWZ1bmN0aW9uKGRpcmVjdGlvbil7XG4gIGNvbnNvbGUubG9nKGRpcmVjdGlvbik7XG4gICBpZigoJHNjb3BlLmFwcENvbmZpZ0VkaXRDb3B5LmFpX2RpcmVjdGl2ZV9jb2wtMSA8IDEpICYmIChkaXJlY3Rpb24gPT09ICdsZWZ0Jykpe3JldHVybn1lbHNle3ZhciB0YXJnZXRDb2xQb3NpdGlvbj0kc2NvcGUuYXBwQ29uZmlnRWRpdENvcHkuYWlfZGlyZWN0aXZlX2NvbC0xfTtcbiAgIGlmKGRpcmVjdGlvbiA9PT0gJ3JpZ2h0Jyl7dmFyIHRhcmdldENvbFBvc2l0aW9uPSRzY29wZS5hcHBDb25maWdFZGl0Q29weS5haV9kaXJlY3RpdmVfY29sKzF9O1xuICAgIHZhciBjb25maWdUYXJnZXQ9JHNjb3BlLmdldFRhcmdldE9iamVjdEJ5SWQoJHNjb3BlLmFwcENvbmZpZ0VkaXRDb3B5LmFpX2RpcmVjdGl2ZV9wYWdlLCRzY29wZS5hcHBDb25maWdFZGl0Q29weS5haV9kaXJlY3RpdmVfcm93LHRhcmdldENvbFBvc2l0aW9uKTtcbiAgICBpZigoY29uZmlnVGFyZ2V0ID09PSB1bmRlZmluZWQpKXtyZXR1cm59O1xuICAgIGNvbnNvbGUubG9nKGNvbmZpZ1RhcmdldCk7XG5cbiAgICAvLyBtb3ZlIHRoZSBlbGVtZW50IHRvIHRoZSBsZWZ0L3JpZ2h0IGludG8gdGhlIGFjdGl2ZSBlbGVtZW50cyBwb3NpdGlvblxuICAgIGFuZ3VsYXIuY29weShjb25maWdUYXJnZXQsJHNjb3BlLnJlZmVyZW5jZVRvRWRpdEluQXBwQ29uZmlnKTtcbiAgICAvL2NvcnJlY3QgdGhlIHBvc2l0aW9uIGxhYmVsc1xuXG4gICAgJHNjb3BlLnNldFBvc3Rpb25Qcm9wZXJ0aWVzKCRzY29wZS5yZWZlcmVuY2VUb0VkaXRJbkFwcENvbmZpZywkc2NvcGUuYXBwQ29uZmlnRWRpdENvcHkuYWlfZGlyZWN0aXZlX3BhZ2UsJHNjb3BlLmFwcENvbmZpZ0VkaXRDb3B5LmFpX2RpcmVjdGl2ZV9yb3csJHNjb3BlLmFwcENvbmZpZ0VkaXRDb3B5LmFpX2RpcmVjdGl2ZV9jb2wpO1xuICAgICRzY29wZS5zZXRQb3N0aW9uUHJvcGVydGllcygkc2NvcGUucmVmZXJlbmNlVG9FZGl0SW5BcHBDb25maWcuYWlfY29udGVudCwkc2NvcGUuYXBwQ29uZmlnRWRpdENvcHkuYWlfZGlyZWN0aXZlX3BhZ2UsJHNjb3BlLmFwcENvbmZpZ0VkaXRDb3B5LmFpX2RpcmVjdGl2ZV9yb3csJHNjb3BlLmFwcENvbmZpZ0VkaXRDb3B5LmFpX2RpcmVjdGl2ZV9jb2wpO1xuICAgIC8vY29ycmVjdCB0aGUgcG9zaXRpb24gbGFiZWxzIGluIHRoZSBlZGl0IGNvcHlcbiAgICAkc2NvcGUuc2V0UG9zdGlvblByb3BlcnRpZXMoJHNjb3BlLmFwcENvbmZpZ0VkaXRDb3B5LCRzY29wZS5hcHBDb25maWdFZGl0Q29weS5haV9kaXJlY3RpdmVfcGFnZSwkc2NvcGUuYXBwQ29uZmlnRWRpdENvcHkuYWlfZGlyZWN0aXZlX3Jvdyx0YXJnZXRDb2xQb3NpdGlvbik7XG4gICAgJHNjb3BlLnNldFBvc3Rpb25Qcm9wZXJ0aWVzKCRzY29wZS5hcHBDb25maWdFZGl0Q29weS5haV9jb250ZW50LCRzY29wZS5hcHBDb25maWdFZGl0Q29weS5haV9kaXJlY3RpdmVfcGFnZSwkc2NvcGUuYXBwQ29uZmlnRWRpdENvcHkuYWlfZGlyZWN0aXZlX3Jvdywkc2NvcGUuYXBwQ29uZmlnRWRpdENvcHkuYWlfZGlyZWN0aXZlX2NvbCk7XG4gICAgLy8gbW92ZSBlZGl0IGNvcHkgY29udGVudCBpbnRvIGxlZnQgZWxlbWVudFxuICAgIGFuZ3VsYXIuY29weSgkc2NvcGUuYXBwQ29uZmlnRWRpdENvcHksY29uZmlnVGFyZ2V0KTtcbiAgICAkc2NvcGUuc2F2ZUVudGlyZVByb2plY3QoKTtcbn1cblxuJHNjb3BlLm1vdmVFbGVtZW50VmVydD1mdW5jdGlvbihkaXJlY3Rpb24pe1xuICAgIHZhciB0YXJnZXRSb3dQb3NpdGlvbj0wO1xuICAgIGlmKCgkc2NvcGUuYXBwQ29uZmlnRWRpdENvcHkuYWlfZGlyZWN0aXZlX3Jvdy0xIDwgMSkgJiYgKGRpcmVjdGlvbiA9PT0gJ3VwJykpe3JldHVybn1lbHNle3ZhciB0YXJnZXRSb3dQb3NpdGlvbj0kc2NvcGUuYXBwQ29uZmlnRWRpdENvcHkuYWlfZGlyZWN0aXZlX3Jvdy0xfTtcbiAgICBpZihkaXJlY3Rpb24gPT09ICdkb3duJyl7dGFyZ2V0Um93UG9zaXRpb249JHNjb3BlLmFwcENvbmZpZ0VkaXRDb3B5LmFpX2RpcmVjdGl2ZV9yb3crMX07XG4gICAgdmFyIGNvbmZpZ1RhcmdldD0kc2NvcGUubWFrZUNvbmZpZ1RhcmdldCgkc2NvcGUuYXBwQ29uZmlnRWRpdENvcHkuYWlfZGlyZWN0aXZlX3BhZ2UsdGFyZ2V0Um93UG9zaXRpb24sJHNjb3BlLmdldExhc3RDb2x1bW4oJHNjb3BlLmFwcENvbmZpZ0VkaXRDb3B5LmFpX2RpcmVjdGl2ZV9wYWdlLHRhcmdldFJvd1Bvc2l0aW9uKSsxKTtcbiAgICBpZigoY29uZmlnVGFyZ2V0ID09PSB1bmRlZmluZWQpKXtyZXR1cm59O1xuICAgIC8vIG1vdmUgdGhlIGVsZW1lbnQgdG8gdGhlIGludG8gdGhlIGFjdGl2ZSBlbGVtZW50cyBwb3NpdGlvblxuICAgIGFuZ3VsYXIuY29weSgkc2NvcGUuYXBwQ29uZmlnRWRpdENvcHksY29uZmlnVGFyZ2V0KTtcbiAgICAkc2NvcGUuc2V0UG9zdGlvblByb3BlcnRpZXMoY29uZmlnVGFyZ2V0LCRzY29wZS5hcHBDb25maWdFZGl0Q29weS5haV9kaXJlY3RpdmVfcGFnZSx0YXJnZXRSb3dQb3NpdGlvbiwkc2NvcGUuZ2V0TGFzdENvbHVtbigkc2NvcGUuYXBwQ29uZmlnRWRpdENvcHkuYWlfZGlyZWN0aXZlX3BhZ2UsdGFyZ2V0Um93UG9zaXRpb24pKVxuICAgICRzY29wZS5zZXRQb3N0aW9uUHJvcGVydGllcyhjb25maWdUYXJnZXQuYWlfY29udGVudCwkc2NvcGUuYXBwQ29uZmlnRWRpdENvcHkuYWlfZGlyZWN0aXZlX3BhZ2UsdGFyZ2V0Um93UG9zaXRpb24sJHNjb3BlLmdldExhc3RDb2x1bW4oJHNjb3BlLmFwcENvbmZpZ0VkaXRDb3B5LmFpX2RpcmVjdGl2ZV9wYWdlLHRhcmdldFJvd1Bvc2l0aW9uKSlcbiAgICBhbmd1bGFyLmNvcHkoe30sJHNjb3BlLnJlZmVyZW5jZVRvRWRpdEluQXBwQ29uZmlnKTtcbiAgICAkc2NvcGUuc2F2ZUVudGlyZVByb2plY3QoKTtcblxufVxuXG5cbi8vIGFkZCBhIHBhZ2VcbiRzY29wZS5hZGROZXdQYWdlPWZ1bmN0aW9uKHBhZ2UsbWFuaWZlc3Qpe1xuICAvLyBnZXQgdGhlIG5leHQgYXZhaWxhYmxlIHBhZ2UgbnVtYmVyXG4gIC8vIGNhbGwgbWFuaWZlc3RUb0FwcENvbmZpZyBvbiB0aGF0IHBhZ2UgbnVtYmVyIHRvIHRoZSBjb25maWdcbiAgJHNjb3BlLmNvbmZpZ1RhcmdldD0kc2NvcGUubWFrZUNvbmZpZ1RhcmdldCgxKTtcbiAgLy8gY29weSBpdCB0byB0aGUgZWRpdCBvYmplY3RcbiAgLy8gc2VuZCBpdCB0byB0aGUgc2VydmVyXG4gIC8vIHJlcGxhY2UgdGhlIGFwcGNvbmZpZyB0aGUgc2VydmVycyByZXBseSAobm93IHRoZSBzZXJ2ZXIgYW5kIHRoZSBwYWdlIGFyZSBpbiBzeW5jKVxuICAvLyBpdCB3aWxsIHRoZW4gdGFrZSB0aGF0IHBhZ2Ugb2JqZWN0IGFuZCBhZGQgaXRcbiAgJHNjb3BlLmNyZWF0Q29uZmlnT2JqZWN0KCRzY29wZS5jb25maWdUYXJnZXQsJHNjb3BlLm1hbmlmZXN0VG9BcHBDb25maWcocGFnZSwnJywnJyxtYW5pZmVzdCkpO1xufTtcbi8vIGFkZCBhIHJvd1xuJHNjb3BlLmFkZE5ld1Jvdz1mdW5jdGlvbihwYWdlLHJvdyxtYW5pZmVzdCl7XG4gIC8vIGNhbGwgbWFuaWZlc3RUb0FwcENvbmZpZyBvbiB0aGF0IHBhZ2UgbnVtYmVyIHRvIHRoZSBjb25maWdcbiAgJHNjb3BlLmNvbmZpZ1RhcmdldD0kc2NvcGUubWFrZUNvbmZpZ1RhcmdldChwYWdlLHJvdyk7XG4gIC8vIGNvcHkgaXQgdG8gdGhlIGVkaXQgb2JqZWN0XG4gIC8vIHNlbmQgaXQgdG8gdGhlIHNlcnZlclxuICAvLyByZXBsYWNlIHRoZSBhcHBjb25maWcgdGhlIHNlcnZlcnMgcmVwbHkgKG5vdyB0aGUgc2VydmVyIGFuZCB0aGUgcGFnZSBhcmUgaW4gc3luYylcbiAgLy8gaXQgd2lsbCB0aGVuIHRha2UgdGhhdCBwYWdlIG9iamVjdCBhbmQgYWRkIGl0XG4gIC8vY29uc29sZS5sb2coJHNjb3BlLmNvbmZpZ1RhcmdldCk7XG4gICRzY29wZS5jcmVhdENvbmZpZ09iamVjdCgkc2NvcGUuY29uZmlnVGFyZ2V0LCRzY29wZS5tYW5pZmVzdFRvQXBwQ29uZmlnKHBhZ2Uscm93LCcnLG1hbmlmZXN0KSk7XG59O1xuJHNjb3BlLmFkZE5ld0NvbHVtbj1mdW5jdGlvbihwYWdlLHJvdyxjb2x1bW4sbWFuaWZlc3Qpe1xuICAvLyBnZXQgdGhlIG5leHQgYXZhaWxhYmxlIHJvdyBudW1iZXJcbiAgLy8gY2FsbCBtYW5pZmVzdFRvQXBwQ29uZmlnIG9uIHRoYXQgcGFnZSBudW1iZXIgdG8gdGhlIGNvbmZpZ1xuICAkc2NvcGUuY29uZmlnVGFyZ2V0PSRzY29wZS5tYWtlQ29uZmlnVGFyZ2V0KHBhZ2Uscm93LGNvbHVtbik7XG4gIC8vIGNvcHkgaXQgdG8gdGhlIGVkaXQgb2JqZWN0XG4gIC8vIHNlbmQgaXQgdG8gdGhlIHNlcnZlclxuICAvLyByZXBsYWNlIHRoZSBhcHBjb25maWcgdGhlIHNlcnZlcnMgcmVwbHkgKG5vdyB0aGUgc2VydmVyIGFuZCB0aGUgcGFnZSBhcmUgaW4gc3luYylcbiAgLy8gaXQgd2lsbCB0aGVuIHRha2UgdGhhdCBwYWdlIG9iamVjdCBhbmQgYWRkIGl0XG4gICRzY29wZS5jcmVhdENvbmZpZ09iamVjdCgkc2NvcGUuY29uZmlnVGFyZ2V0LCRzY29wZS5tYW5pZmVzdFRvQXBwQ29uZmlnKHBhZ2Uscm93LGNvbHVtbixtYW5pZmVzdCkpO1xufTtcbi8vIGFkZCBuZXcgZGlyZWN0aXZlIE5PVEU6IHRoZXJlIGlzIG5vIGFkZCBjb2x1bW4gYmVjYXVzZSB0aGVyZSBpcyBhIG9uZSB0byBvbmUgcmVsYXRpb25zaGlvcCBiZXR3ZWVuIGRpcmVzdGl2ZXMgYW5kIGNvbHVtbnNcbiRzY29wZS5hZGROZXdEaXJlY3RpdmU9ZnVuY3Rpb24ocGFnZSxyb3csY29sdW1uLG1hbmlmZXN0KXtcbiAgLy8gZ2V0IHRoZSBuZXh0IGF2YWlsYWJsZSBjb2x1bW4gbnVtYmVyXG4gIC8vIGNhbGwgbWFuaWZlc3RUb0FwcENvbmZpZyBvbiB0aGF0IHBhZ2UgbnVtYmVyIHRvIHRoZSBjb25maWdcbiAgJHNjb3BlLmNvbmZpZ1RhcmdldD0kc2NvcGUubWFrZUNvbmZpZ1RhcmdldChwYWdlLHJvdyxjb2x1bW4sY29sdW1uKTtcbiAgLy8gY29weSBpdCB0byB0aGUgZWRpdCBvYmplY3RcbiAgLy8gc2VuZCBpdCB0byB0aGUgc2VydmVyXG4gIC8vIHJlcGxhY2UgdGhlIGFwcGNvbmZpZyB0aGUgc2VydmVycyByZXBseSAobm93IHRoZSBzZXJ2ZXIgYW5kIHRoZSBwYWdlIGFyZSBpbiBzeW5jKVxuICAvLyBpdCB3aWxsIHRoZW4gdGFrZSB0aGF0IHBhZ2Ugb2JqZWN0IGFuZCBhZGQgaXRcbiAgJHNjb3BlLmNyZWF0Q29uZmlnT2JqZWN0KCRzY29wZS5jb25maWdUYXJnZXQsJHNjb3BlLm1hbmlmZXN0VG9BcHBDb25maWcocGFnZSxyb3csY29sdW1uLG1hbmlmZXN0KSk7XG4gICRzY29wZS5tb3ZlQ29uZmlnT2JqZWN0VG9FZGl0KCRzY29wZS5jb25maWdUYXJnZXQpO1xufTtcblxuJHNjb3BlLmFkZFRvUGFnZT1mdW5jdGlvbihtYW5pZmVzdCl7XG5cbiAgY29uc29sZS5sb2coJ3J1bm5pbmcgYWRkJyxtYW5pZmVzdCk7XG4gIC8vaWYgdGhlIGRpcmVjdGl2ZSBpcyBhIGxheW91dCB0eXBlXG4gIGlmKG1hbmlmZXN0LmFpX2RpcmVjdGl2ZV90eXBlID09PSAnbGF5b3V0Jyl7XG4gICAgICBpZihtYW5pZmVzdC5haV9kaXJlY3RpdmVfbmFtZSA9PT0gJ2FpX3BhZ2UnKXtcbiAgICAgICAgJHNjb3BlLmFkZE5ld1BhZ2UoJHNjb3BlLmxhc3RQYWdlKzEsbWFuaWZlc3QpO1xuICAgICAgfWVsc2UgaWYobWFuaWZlc3QuYWlfZGlyZWN0aXZlX25hbWUgPT09ICdhaV9yb3cnKXtcbiAgICAgICAgICAkc2NvcGUuYWRkTmV3Um93KCRzY29wZS5sYXN0UGFnZSwkc2NvcGUubGFzdFJvdysxLG1hbmlmZXN0KTtcbiAgICAgIH1lbHNlIGlmKG1hbmlmZXN0LmFpX2RpcmVjdGl2ZV9uYW1lID09PSAnYWlfY29sJyl7XG4gICAgICAgICRzY29wZS5hZGROZXdDb2x1bW4oJHNjb3BlLmxhc3RQYWdlLCRzY29wZS5sYXN0Um93LCRzY29wZS5sYXN0Q29sdW1uKzEsbWFuaWZlc3QpO1xuICAgICAgfVxuICB9ZWxzZXtcbiAgICAgICRzY29wZS5hZGROZXdDb2x1bW4oJHNjb3BlLmxhc3RQYWdlLCRzY29wZS5sYXN0Um93LCRzY29wZS5sYXN0Q29sdW1uKzEsJHNjb3BlLmFpX2NvbHVtbl9tYW5pZmVzdCk7XG4gICAgICAkdGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAkc2NvcGUuYWRkTmV3RGlyZWN0aXZlKCRzY29wZS5sYXN0UGFnZSwkc2NvcGUubGFzdFJvdywkc2NvcGUubGFzdENvbHVtbixtYW5pZmVzdCk7XG4gICAgICAgICRzY29wZS5zZXRFZGl0Q2FuZGlkYXRlKCdwXycrJHNjb3BlLmxhc3RQYWdlKydfcl8nKyRzY29wZS5sYXN0Um93KydfY18nKyRzY29wZS5sYXN0Q29sdW1uKydfYWlfY29sJyk7XG4gICAgICAgICRzY29wZS5zZXRFZGl0U2VsZWN0KCk7XG4gICAgICAgICRzY29wZS5EU29wZW49ZmFsc2U7XG4gICAgICAgICRzY29wZS5zYXZlRWRpdCgnYWRkdG9QYWdlJyk7XG5cbiAgICAgIH0sMTAwMCk7XG4gIH1cbiAgJHNjb3BlLkRTb3Blbj1mYWxzZTtcbiAgJHRpbWVvdXQoZnVuY3Rpb24oKXskc2NvcGUuY3Bsb3Blbj10cnVlfSwxNTAwKTtcblxuICBcblxufTtcblxuJHNjb3BlLnByb2plY3Q9cHJvamVjdDsgLy9pbml0IHRoZSAkc2NvcGUucHJvamVjdCBmb3IgcmVzb2x2ZSBvZiBwcm9qZWN0IGluIHN0YXRlIG1hY2hpbmVcbiR0aW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgaWYoJHNjb3BlLnByb2plY3QuY29uZmlnWzBdID09PSB1bmRlZmluZWQpe1xuICAgICAgLy9jb25zb2xlLmxvZygnc2V0dGluZyB1cCcpO1xuICAgICAgICAkc2NvcGUuYXBwQ29uZmlnPXtcbiAgICAgICAgICAgIHByb2plY3RfbmFtZSA6ICdvdXJmaXJzdCBhcHAnLFxuICAgICAgICAgICAgcGFnZXM6e31cbiAgICAgICAgfTtcbiAgICB9ZWxzZXtcbiAgICAgICAgJHNjb3BlLmFwcENvbmZpZz17fTtcbiAgICAgICAgJHNjb3BlLmFwcENvbmZpZ1RlbXA9e307XG4gICAgICAgIGFuZ3VsYXIuY29weShKU09OLnBhcnNlKCRzY29wZS5wcm9qZWN0LmNvbmZpZ1swXSksJHNjb3BlLmFwcENvbmZpZ1RlbXApO1xuICAgICAgICAkc2NvcGUubm9ybWFsaXplSWRzKCRzY29wZS5hcHBDb25maWdUZW1wKTsgLy8gbm9ybWFsaXplIHRoZSBvYmplY3QgYmVmb3JlIGl0IGlzIHJlbmRlclxuICAgICAgICAkdGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgYW5ndWxhci5jb3B5KCRzY29wZS5hcHBDb25maWdUZW1wLCRzY29wZS5hcHBDb25maWcpO1xuICAgICAgICAgICAgY29uc29sZS5kaXIoJHNjb3BlLmFwcENvbmZpZyk7XG4gICAgICAgIH0sNTAwKTtcbiAgICB9XG4gICAvLyBhbmd1bGFyLmNvcHkoJHNjb3BlLmFwcENvbmZpZ3RlbXAsJHNjb3BlLmFwcENvbmZpZyk7XG59LDEwMCk7XG4vLyB0aGlzIHdhdGNoIGJsb2NrIHJlbmRlcnMgYSB0aGUgZG9tIHdoZW4gdGhlIGFwcGNvbmZpZyBjaGFuZ2VzXG4kc2NvcGUuJHdhdGNoKCdhcHBDb25maWcnLGZ1bmN0aW9uKCl7XG4gIGFuZ3VsYXIuZWxlbWVudCh3b3JrYXJlYSkuZW1wdHkoKTtcbiAgJHNjb3BlLnJlbmRlclJvd0h0bWxGcm9tQWlDb25maWcoJHNjb3BlLmFwcENvbmZpZywgJycpO1xuICAkdGltZW91dChmdW5jdGlvbigpe1xuICAgICRzY29wZS5yZW5kZXJDb2xIdG1sRnJvbUFpQ29uZmlnKCRzY29wZS5hcHBDb25maWcsICcnKTtcbiAgfSwyMDApO1xuICAkdGltZW91dChmdW5jdGlvbigpe1xuICAgICAgJHNjb3BlLnJlbmRlckRpcmVjdGl2ZUh0bWxGcm9tQWlDb25maWcoJHNjb3BlLmFwcENvbmZpZywgJycpO1xuICAgICAgJHNjb3BlLmdldExhc3RDb2x1bW4oKTtcbiAgICAgICRzY29wZS5yZW5kZXJDbGVhcmZpeEh0bWxGcm9tQWlDb25maWcoJHNjb3BlLmFwcENvbmZpZywgJycpO1xuICAgICAgJHNjb3BlLmdvdG9FbGVtZW50KCRzY29wZS5lZGl0Q2FuZGlkYXRlKTtcbiAgfSw1MDApO1xufSx0cnVlKTtcblxuJHNjb3BlLmdldEVkaXRDYW5kaWRhdGU9ZnVuY3Rpb24oaWQpe1xuICAgIGlmKGlkID09PSAkc2NvcGUuZWRpdENhbmRpZGF0ZSl7XG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1lbHNle1xuICAgICAgcmV0dXJuICBmYWxzZTtcbiAgICB9XG59XG5cbiRzY29wZS5zZXRFZGl0Q2FuZGlkYXRlPWZ1bmN0aW9uKGlkKXtcbiAgICAkc2NvcGUuZWRpdENhbmRpZGF0ZSA9IGlkO1xufVxuXG4kc2NvcGUuZmluZERpcmVjdGl2ZVRvTWFrZUFjdGl2ZUVkaXQ9ZnVuY3Rpb24ob2JqLGlkVG9NYXRjaCkge1xuICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eSgnYWlfZGlyZWN0aXZlJykpIHtcbiAgICAgICAgaWYoKG9iai5haV9kaXJlY3RpdmVfdHlwZSA9PT0nbGF5b3V0Jykpe1xuICAgICAgICAgICAgICAgICAgdmFyIHJvd2lkc3RyaW5nPSdwXycrb2JqWydhaV9kaXJlY3RpdmVfcGFnZSddKydfYWlfcGFnZSc7XG4gICAgICAgICAgICAgICAgICB2YXIgcm93aWRzdHJpbmc9J3BfJytvYmpbJ2FpX2RpcmVjdGl2ZV9wYWdlJ10rJ19yXycrb2JqWydhaV9kaXJlY3RpdmVfcm93J10rJ19haV9yb3cnO1xuICAgICAgICAgICAgICAgICAgdmFyIGNvbGlkc3RyaW5nPSdwXycrb2JqWydhaV9kaXJlY3RpdmVfcGFnZSddKydfcl8nK29ialsnYWlfZGlyZWN0aXZlX3JvdyddKydfY18nK29ialsnYWlfZGlyZWN0aXZlX2NvbCddKydfYWlfY29sJztcbiAgICAgICAgICAgICAgICBpZigoaWRUb01hdGNoID09IHJvd2lkc3RyaW5nKSB8fCAoaWRUb01hdGNoID09IGNvbGlkc3RyaW5nKSl7XG4gICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnJlZmVyZW5jZVRvRWRpdEluQXBwQ29uZmlnPW9iajtcbiAgICAgICAgICAgICAgICAgICAgICBhbmd1bGFyLmNvcHkob2JqLCRzY29wZS5hcHBDb25maWdFZGl0Q29weSk7XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiBvYmopIHtcbiAgICAgICAgICAgICAgICBpZih0eXBlb2Ygb2JqW3Byb3BlcnR5XSA9PSBcIm9iamVjdFwiKXtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLmZpbmREaXJlY3RpdmVUb01ha2VBY3RpdmVFZGl0KG9ialtwcm9wZXJ0eV0saWRUb01hdGNoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICB9XG59O1xuXG4kc2NvcGUuZ290b0VsZW1lbnQgPSBmdW5jdGlvbiAoZUlEKXtcbiAgLy8gc2V0IHRoZSBsb2NhdGlvbi5oYXNoIHRvIHRoZSBpZCBvZlxuICAvLyB0aGUgZWxlbWVudCB5b3Ugd2lzaCB0byBzY3JvbGwgdG8uXG4gICRsb2NhdGlvbi5oYXNoKGVJRCk7XG4gIC8vIGNhbGwgJGFuY2hvclNjcm9sbCgpXG4gIGFuY2hvclNtb290aFNjcm9sbC5zY3JvbGxUbyhlSUQpO1xufTtcblxuJHNjb3BlLnNldEVkaXRTZWxlY3Q9ZnVuY3Rpb24oaWQpe1xuICAgIC8vIFRIRSBESVJFQ1RJVkUgVEhBVCBJUyBJTiBUSEUgRURJVCBDQU5ESURBVEUgQ09MVU1OXG4gICAgJHNjb3BlLmNwbG9wZW49dHJ1ZTtcbiAgICAkc2NvcGUuRFNvcGVuPWZhbHNlO1xuICAgICRzY29wZS5maW5kRGlyZWN0aXZlVG9NYWtlQWN0aXZlRWRpdCgkc2NvcGUuYXBwQ29uZmlnLCRzY29wZS5lZGl0Q2FuZGlkYXRlKTtcbiAgICAkc2NvcGUuZ290b0VsZW1lbnQoJHNjb3BlLmVkaXRDYW5kaWRhdGUpO1xufVxuJHRpbWVvdXQoZnVuY3Rpb24oKXtcbmlmKCRzY29wZS5hcHBDb25maWcucGFnZXMucGFnZV8xID09PSB1bmRlZmluZWQpeyRzY29wZS5hZGRUb1BhZ2UoJHNjb3BlLmJ1aWx0SW5NYW5pZmVzdHNbMF0pfTtcbmlmKCRzY29wZS5hcHBDb25maWcucGFnZXMucGFnZV8xLnJvd3Mucm93XzEgPT09IHVuZGVmaW5lZCl7JHNjb3BlLmFkZFRvUGFnZSgkc2NvcGUuYnVpbHRJbk1hbmlmZXN0c1sxXSl9O1xufSwxMDAwKTtcbiR0aW1lb3V0KGZ1bmN0aW9uKCl7XG5pZigkc2NvcGUuYXBwQ29uZmlnLnBhZ2VzLnBhZ2VfMS5yb3dzID09PSB1bmRlZmluZWQpeyRzY29wZS5hZGRUb1BhZ2UoJHNjb3BlLmJ1aWx0SW5NYW5pZmVzdHNbMV0pfTtcbn0sNTAwMCk7XG59KTtcblxuIiwiYXBwLnNlcnZpY2UoJ2FuY2hvclNtb290aFNjcm9sbCcsIGZ1bmN0aW9uKCl7XG4gICAgXG4gICAgdGhpcy5zY3JvbGxUbyA9IGZ1bmN0aW9uKGVJRCkge1xuXG4gICAgICAgIC8vIFRoaXMgc2Nyb2xsaW5nIGZ1bmN0aW9uIFxuICAgICAgICAvLyBpcyBmcm9tIGh0dHA6Ly93d3cuaXRuZXdiLmNvbS90dXRvcmlhbC9DcmVhdGluZy10aGUtU21vb3RoLVNjcm9sbC1FZmZlY3Qtd2l0aC1KYXZhU2NyaXB0XG4gICAgICAgIFxuICAgICAgICB2YXIgc3RhcnRZID0gY3VycmVudFlQb3NpdGlvbigpO1xuICAgICAgICB2YXIgc3RvcFkgPSBlbG1ZUG9zaXRpb24oZUlEKTtcbiAgICAgICAgdmFyIGRpc3RhbmNlID0gc3RvcFkgPiBzdGFydFkgPyBzdG9wWSAtIHN0YXJ0WSA6IHN0YXJ0WSAtIHN0b3BZO1xuICAgICAgICBpZiAoZGlzdGFuY2UgPCAxMDApIHtcbiAgICAgICAgICAgIHNjcm9sbFRvKDAsIHN0b3BZKTsgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzcGVlZCA9IE1hdGgucm91bmQoZGlzdGFuY2UgLyAxMDApO1xuICAgICAgICBpZiAoc3BlZWQgPj0gMjApIHNwZWVkID0gMjA7XG4gICAgICAgIHZhciBzdGVwID0gTWF0aC5yb3VuZChkaXN0YW5jZSAvIDI1KTtcbiAgICAgICAgdmFyIGxlYXBZID0gc3RvcFkgPiBzdGFydFkgPyBzdGFydFkgKyBzdGVwIDogc3RhcnRZIC0gc3RlcDtcbiAgICAgICAgdmFyIHRpbWVyID0gMDtcbiAgICAgICAgaWYgKHN0b3BZID4gc3RhcnRZKSB7XG4gICAgICAgICAgICBmb3IgKCB2YXIgaT1zdGFydFk7IGk8c3RvcFk7IGkrPXN0ZXAgKSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChcIndpbmRvdy5zY3JvbGxUbygwLCBcIitsZWFwWStcIilcIiwgdGltZXIgKiBzcGVlZCk7XG4gICAgICAgICAgICAgICAgbGVhcFkgKz0gc3RlcDsgaWYgKGxlYXBZID4gc3RvcFkpIGxlYXBZID0gc3RvcFk7IHRpbWVyKys7XG4gICAgICAgICAgICB9IHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKCB2YXIgaT1zdGFydFk7IGk+c3RvcFk7IGktPXN0ZXAgKSB7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KFwid2luZG93LnNjcm9sbFRvKDAsIFwiK2xlYXBZK1wiKVwiLCB0aW1lciAqIHNwZWVkKTtcbiAgICAgICAgICAgIGxlYXBZIC09IHN0ZXA7IGlmIChsZWFwWSA8IHN0b3BZKSBsZWFwWSA9IHN0b3BZOyB0aW1lcisrO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBmdW5jdGlvbiBjdXJyZW50WVBvc2l0aW9uKCkge1xuICAgICAgICAgICAgLy8gRmlyZWZveCwgQ2hyb21lLCBPcGVyYSwgU2FmYXJpXG4gICAgICAgICAgICBpZiAoc2VsZi5wYWdlWU9mZnNldCkgcmV0dXJuIHNlbGYucGFnZVlPZmZzZXQ7XG4gICAgICAgICAgICAvLyBJbnRlcm5ldCBFeHBsb3JlciA2IC0gc3RhbmRhcmRzIG1vZGVcbiAgICAgICAgICAgIGlmIChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQgJiYgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcClcbiAgICAgICAgICAgICAgICByZXR1cm4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcDtcbiAgICAgICAgICAgIC8vIEludGVybmV0IEV4cGxvcmVyIDYsIDcgYW5kIDhcbiAgICAgICAgICAgIGlmIChkb2N1bWVudC5ib2R5LnNjcm9sbFRvcCkgcmV0dXJuIGRvY3VtZW50LmJvZHkuc2Nyb2xsVG9wO1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGZ1bmN0aW9uIGVsbVlQb3NpdGlvbihlSUQpIHtcbiAgICAgICAgICAgIHZhciBlbG0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlSUQpO1xuICAgICAgICAgICAgdmFyIHkgPSBlbG0ub2Zmc2V0VG9wO1xuICAgICAgICAgICAgdmFyIG5vZGUgPSBlbG07XG4gICAgICAgICAgICB3aGlsZSAobm9kZS5vZmZzZXRQYXJlbnQgJiYgbm9kZS5vZmZzZXRQYXJlbnQgIT0gZG9jdW1lbnQuYm9keSkge1xuICAgICAgICAgICAgICAgIG5vZGUgPSBub2RlLm9mZnNldFBhcmVudDtcbiAgICAgICAgICAgICAgICB5ICs9IG5vZGUub2Zmc2V0VG9wO1xuICAgICAgICAgICAgfSByZXR1cm4geTtcbiAgICAgICAgfVxuXG4gICAgfTtcbiAgICBcbn0pO1xuXG5hcHAuZmFjdG9yeSgnbWFuaWZlc3RGYWN0b3J5U3RhdGljJyxmdW5jdGlvbigpe1xuICByZXR1cm4gW3tcbiAgICAgICAgICBhaV9kaXJlY3RpdmUgOiB0cnVlLFxuICAgICAgICAgIGFpX2RpcmVjdGl2ZV90eXBlIDogJ2NvbnRlbnQnLFxuICAgICAgICAgIGFpX2RpcmVjdGl2ZV9uYW1lIDogJ3NvbG9fdGFibGUnLFxuICAgICAgICAgIGFpX2RpcmVjdGl2ZV9hdHRyaWJ1dGVzIDoge1xuICAgICAgICAgICAgICBzb2xvX3RhYmxlX3RpdGxlOiAndGl0bGUnLFxuICAgICAgICAgICAgICBzb2xvX3RhYmxlX2NsYXNzIDogJ215Y2xhc3MnLFxuICAgICAgICAgICAgICBzb2xvX3RhYmxlX2luZm9fc291cmNlIDogJ215Y2xhc3MnLFxuICAgICAgICAgICAgICBzb2xvX3RhYmxlX2luZm9fdHlwZSA6ICdmaWxlJ1xuICAgICAgICAgIH1cbiAgICAgIH0se1xuICAgICAgICAgIGFpX2RpcmVjdGl2ZSA6IHRydWUsXG4gICAgICAgICAgYWlfZGlyZWN0aXZlX3R5cGUgOiAnY29udGVudCcsXG4gICAgICAgICAgYWlfZGlyZWN0aXZlX25hbWUgOiAnc29sb190YWJsZScsXG4gICAgICAgICAgYWlfZGlyZWN0aXZlX2F0dHJpYnV0ZXMgOiB7XG4gICAgICAgICAgICAgIHNvbG9fdGFibGVfdGl0bGU6ICd0aXRsZScsXG4gICAgICAgICAgICAgIHNvbG9fdGFibGVfY2xhc3MgOiAnbXljbGFzcycsXG4gICAgICAgICAgICAgIHNvbG9fdGFibGVfaW5mb19zb3VyY2UgOiAnbXljbGFzcycsXG4gICAgICAgICAgICAgIHNvbG9fdGFibGVfaW5mb190eXBlIDogJ2ZpbGUnXG4gICAgICAgICAgfVxuICAgICAgfSx7XG4gICAgICAgICAgYWlfZGlyZWN0aXZlIDogdHJ1ZSxcbiAgICAgICAgICBhaV9kaXJlY3RpdmVfdHlwZSA6ICdjb250ZW50JyxcbiAgICAgICAgICBhaV9kaXJlY3RpdmVfbmFtZSA6ICdzb2xvX3RhYmxlJyxcbiAgICAgICAgICBhaV9kaXJlY3RpdmVfYXR0cmlidXRlcyA6IHtcbiAgICAgICAgICAgICAgc29sb190YWJsZV90aXRsZTogJ3RpdGxlJyxcbiAgICAgICAgICAgICAgc29sb190YWJsZV9jbGFzcyA6ICdteWNsYXNzJyxcbiAgICAgICAgICAgICAgc29sb190YWJsZV9pbmZvX3NvdXJjZSA6ICdteWNsYXNzJyxcbiAgICAgICAgICAgICAgc29sb190YWJsZV9pbmZvX3R5cGUgOiAnZmlsZSdcbiAgICAgICAgICB9XG4gICAgICB9XTtcbn0pO1xuXG5hcHAuZGlyZWN0aXZlKCdhaVBhZ2UnLGZ1bmN0aW9uKCl7XG4gIHJldHVybntcbiAgICB0cmFuc2NsdWRlIDogdHJ1ZSxcbiAgICByZXN0cmljdCA6ICdFQScsXG4gICAgc2NvcGUgOiB7XG4gICAgICBhaUNsYXNzIDogJy9jc3Mvcm93X2Evc3R5bGUuY3NzJyxcbiAgICAgIGFpUGFnZVRpdGxlOicnLFxuICAgICAgYWlQYWdlTWVudVRleHQgOicnXG4gICAgfSxcbiAgICB0ZW1wbGF0ZSA6ICAnJ1xuICB9O1xufSk7XG5hcHAuZGlyZWN0aXZlKCdhaVJvdycsZnVuY3Rpb24oKXtcbiAgcmV0dXJue1xuICAgIHRyYW5zY2x1ZGUgOiB0cnVlLFxuICAgIHJlc3RyaWN0IDogJ0VBJyxcbiAgICBzY29wZSA6IHtcbiAgICAgIGluY2VwdFJvd09yZGVyIDogJ0AnLFxuICAgICAgaW5jZXB0Um93QmdDb2xvciA6ICAnQCcsXG4gICAgICBpbmNlcHRSb3dCZ0ltYWdlIDogICdAJyxcbiAgICB9LFxuICAgIHRlbXBsYXRlIDogICcnXG4gIH07XG59KTtcblxuYXBwLmRpcmVjdGl2ZSgnYWlDb2wnLGZ1bmN0aW9uKCl7XG4gIHJldHVybntcbiAgICB0cmFuc2NsdWRlIDogdHJ1ZSxcbiAgICByZXN0cmljdCA6ICdFJyxcbiAgICBzY29wZSA6IHtcbiAgICAgIGluY2VwdGlvbkNvbElkIDogJ0AnLFxuICAgICAgaW5jZXB0aW9uQ29sV2lkdGggOiAnQCcsXG4gICAgICBpbmNlcHRpb25Sb3dJZCA6ICdAJyxcbiAgICAgIGluY2VwdGlvbkNvbE9yZGVySW5Sb3cgOiAnQCdcbiAgICB9LFxuICAgIHRlbXBsYXRlIDogICcnXG4gIH07XG59KTtcblxuYXBwLmRpcmVjdGl2ZSgnZGlyZWN0aXZlU2hvcENhcmQnLGZ1bmN0aW9uKCl7XG4gIHJldHVybntcbiAgICByZXN0cmljdCA6IFwiRUFcIixcbiAgICBzY29wZSA6IHtcbiAgICAgIG1hbmlmZXN0IDogJz0nXG4gICAgfSxcbiAgICB0ZW1wbGF0ZVVybCA6ICAnZGlyZWN0aXZlU3RvcmUvZGlyZWN0aXZlU3RvcmVDYXJkL2NhcmQuaHRtbCcsXG4gIH07XG59KTtcblxuYXBwLmRpcmVjdGl2ZSgnYWlFZGl0SG90U3BvdCcsZnVuY3Rpb24oKXtcbiAgcmV0dXJue1xuICAgIHRyYW5zY2x1ZGUgOiB0cnVlLFxuICAgIHJlc3RyaWN0IDogJ0VBJyxcbiAgICBzY29wZSA6IHtcbiAgICAgIGFpRWRpdEhvdFNwb3RJZCA6ICdAJyxcbiAgICAgIGVkaXRPYmplY3RUeXBlIDogJ0AnLFxuICAgICAgYWN0aXZlRWRpdEVsZW1lbnQgOiAnPScsXG4gICAgc2V0QWN0aXZlRWRpdEVsZW1lbnQgOiAnJidcbiAgICB9LFxuICAgIHRlbXBsYXRlVXJsIDogJ2pzL3Byb2plY3RzL2VkaXRob3RzcG90Lmh0bWwnXG4gIH07XG59KTtcblxuYXBwLmZhY3RvcnkoJ21hbmlmZXN0RmFjdG9yeScsIGZ1bmN0aW9uKCRodHRwKSB7XG5cdHJldHVybiB7XG5cdCAgICBnZXRBbGw6IGZ1bmN0aW9uKCkge1xuXHQgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL21hbmlmZXN0cy8nKVxuXHQgICAgICAgIC50aGVuKGZ1bmN0aW9uKG1hbmlmZXN0cykge1xuXHQgICAgICAgICAgY29uc29sZS5sb2cobWFuaWZlc3RzLmRhdGEpO1xuXHQgICAgICAgICAgcmV0dXJuIG1hbmlmZXN0cztcblx0ICAgICAgICB9KTtcblx0ICAgIH1cblx0fTtcbn0pO1xuXG5hcHAuZmFjdG9yeSgnUHJvamVjdEZhY3RvcnknLCBmdW5jdGlvbigkaHR0cCkge1xuICB2YXIgcHJvamVjdE9iajtcbiAgdmFyIF9wcm9qZWN0Q2FjaGUgPSBbXTtcblxuICBwcm9qZWN0T2JqID0ge1xuICAgIGdldEFsbDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3Byb2plY3RzJylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocHJvamVjdHMpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhwcm9qZWN0cyk7XG4gICAgICAgICAgYW5ndWxhci5jb3B5KHByb2plY3RzLmRhdGEsIF9wcm9qZWN0Q2FjaGUpO1xuICAgICAgICAgIHJldHVybiBfcHJvamVjdENhY2hlO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgZ2V0QWxsQnlVc2VyOiBmdW5jdGlvbih1c2VySWQpe1xuICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9wcm9qZWN0cy91c2VyLycgKyB1c2VySWQpXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocHJvamVjdHMpe1xuICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhwcm9qZWN0cyk7XG4gICAgICAgICAgICBhbmd1bGFyLmNvcHkocHJvamVjdHMuZGF0YSwgX3Byb2plY3RDYWNoZSk7XG4gICAgICAgICAgICByZXR1cm4gX3Byb2plY3RDYWNoZTtcbiAgICAgICAgICB9KVxuICAgIH0sXG5cbiAgICBnZXRPbmU6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3Byb2plY3RzLycgKyBpZClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocHJvamVjdCkge1xuICAgICAgICAgIHJldHVybiBwcm9qZWN0LmRhdGE7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBhZGQ6IGZ1bmN0aW9uKHByb2plY3QpIHtcbiAgICAgIHJldHVybiAkaHR0cCh7XG4gICAgICAgICAgICB1cmw6ICcvYXBpL3Byb2plY3RzLycsXG4gICAgICAgICAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgICAgICAgICAgZGF0YTogcHJvamVjdFxuICAgICAgfSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oX3Byb2plY3QpIHtcbiAgICAgICAgICByZXR1cm4gX3Byb2plY3QuZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIGRlbGV0ZTogZnVuY3Rpb24oaWQpe1xuICAgICAgcmV0dXJuICRodHRwLmRlbGV0ZSgnL2FwaS9wcm9qZWN0cy8nICsgaWQpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHByb2plY3QpIHtcbiAgICAgICAgICByZXR1cm4gcHJvamVjdC5kYXRhO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgdXBkYXRlOiBmdW5jdGlvbihwcm9qZWN0KSB7XG4gICAgICByZXR1cm4gJGh0dHAoe1xuICAgICAgICAgICAgdXJsOiAnL2FwaS9wcm9qZWN0cy8nICsgcHJvamVjdC5faWQsXG4gICAgICAgICAgICBtZXRob2Q6IFwiUFVUXCIsXG4gICAgICAgICAgICBkYXRhOiBwcm9qZWN0XG4gICAgICB9KVxuICAgICAgICAudGhlbihmdW5jdGlvbihfcHJvamVjdCkge1xuICAgICAgICAgIHJldHVybiBfcHJvamVjdC5kYXRhO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgZ2V0RGF0YVNldHM6IGZ1bmN0aW9uKHByb2R1Y3RJZCl7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgfTtcblxuICByZXR1cm4gcHJvamVjdE9iajtcbn0pOyIsImFwcC5jb25maWcoZnVuY3Rpb24oJHN0YXRlUHJvdmlkZXIpIHtcbiAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3NpZ251cCcsIHtcbiAgICB1cmw6ICcvc2lnbnVwJyxcbiAgICB0ZW1wbGF0ZVVybDogJ2pzL3NpZ251cC9zaWdudXAuaHRtbCcsXG4gICAgY29udHJvbGxlcjogJ1NpZ251cEN0cmwnXG4gIH0pO1xufSk7XG5cbmFwcC5jb250cm9sbGVyKCdTaWdudXBDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGUsIEF1dGhTZXJ2aWNlLCBTZXNzaW9uLCBVc2VyRmFjdG9yeSkge1xuICAkc2NvcGUuY2hlY2tVc2VyID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKFNlc3Npb24udXNlcilcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIGVsc2VcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gICRzY29wZS5jaGFuZ2VWYWx1ZSA9IGZ1bmN0aW9uKCkge1xuICAgICRzY29wZS5OZXdVc2VyRm9ybS4kc2V0VW50b3VjaGVkKCk7XG4gIH07XG5cbiAgJHNjb3BlLmNyZWF0ZVVzZXIgPSBmdW5jdGlvbigpIHtcbiAgICBVc2VyRmFjdG9yeS5jcmVhdGUoJHNjb3BlLm5ld1VzZXIpXG4gICAgICAudGhlbihmdW5jdGlvbih1c2VyKSB7XG4gICAgICAgIHJldHVybiBBdXRoU2VydmljZS5sb2dpbigkc2NvcGUubmV3VXNlcik7XG4gICAgICB9KVxuICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgfSk7XG4gIH07XG59KTsiLCJcInVzZSBzdHJpY3RcIjtcbmFwcC5mYWN0b3J5KCdwcm9qZWN0RGF0YUZhY3RvcnknLCBmdW5jdGlvbigkaHR0cCkge1xuICByZXR1cm4ge1xuICAgIGdldEludGVybmFsOiBmdW5jdGlvbihkYXRhSWQsdHlwZSkge1xuICAgICAgY29uc29sZS5sb2coJ2dldHRpbicsIGRhdGFJZCk7XG4gICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL2RhdGEvJyArIGRhdGFJZClcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YU9iamVjdCkge1xuICAgICAgICAgIGNvbnNvbGUuZGlyKGRhdGFPYmplY3QpO1xuICAgICAgICAgIGlmKHR5cGU9PT0nanNvbicpe1xuICAgICAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoZGF0YU9iamVjdC5kYXRhLmRhdGEpO1xuICAgICAgICAgIH0gZWxzZSBpZiAodHlwZT09PSd0ZXh0Jyl7XG4gICAgICAgICAgICByZXR1cm4gZGF0YU9iamVjdC5kYXRhLmRhdGFcbiAgICAgICAgICB9XG5cbiAgICAgICAgfSk7XG4gICAgfSwvLyBnZXQgaW50ZXJuYWxcbiAgICBkYXRhQnlQcm9qSWQ6IGZ1bmN0aW9uKHByb2pJZCkge1xuICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9kYXRhL2RhdGFzb3VyY2VzcHJvai8nICsgcHJvaklkKVxuICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhT2JqZWN0KSB7XG4gICAgICAgICAgLy9jb25zb2xlLmxvZygnZGF0YU9iamVjdCBpcyAnKTtcbiAgICAgICAgICAvL2NvbnNvbGUubG9nKGRhdGFPYmplY3QuZGF0YSlcbiAgICAgICAgICByZXR1cm4gZGF0YU9iamVjdC5kYXRhO1xuICAgICAgICB9KTtcbiAgICB9LFxuICBkYXRhQnlVc2VySWQ6IGZ1bmN0aW9uKHVzZXJJZCl7XG4gICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9kYXRhL2RhdGFzb3VyY2VzdXNlci8nICsgdXNlcklkKVxuICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YU9iamVjdCl7XG4gICAgICAgIHJldHVybiBkYXRhT2JqZWN0LmRhdGE7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn0pOyIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3ZpZXdlcicsIHtcbiAgICAgICAgdXJsOiAnL3ZpZXdlcicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvdmlld2VyL3ZpZXcuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6J3ZpZXdlckNvbnRyb2wnXG4gICAgICAgIC8vIHJlc29sdmU6IHtcbiAgICAgICAgLy8gICBwcm9qZWN0czogZnVuY3Rpb24oUHJvamVjdEZhY3RvcnksJHN0YXRlUGFyYW1zKXtcbiAgICAgICAgLy8gICAgIGlmKCRzdGF0ZVBhcmFtcy5pZCl7XG5cbiAgICAgICAgLy8gICAgICAgcmV0dXJuIFByb2plY3RGYWN0b3J5LmdldE9uZSgkc3RhdGVQYXJhbXMuaWQpO1xuICAgICAgICAvLyAgICAgfVxuICAgICAgICAvLyAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIC8vICAgfSxcbiAgICAgICAgICAvLyB1c2VyOiBmdW5jdGlvbihBdXRoU2VydmljZSl7XG4gICAgICAgICAgLy8gICByZXR1cm4gQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCk7XG4gICAgICAgICAgLy8gfVxuICAgICAgICAvL31cbiAgICB9KTtcbn0pO1xuXG5cbmFwcC5jb250cm9sbGVyKCd2aWV3ZXJDb250cm9sJywgZnVuY3Rpb24oJHNjb3BlLCRsb2NhdGlvbiwgJGFuY2hvclNjcm9sbCl7XG4gICAgJHNjb3BlLnNjcm9sbFRvID0gZnVuY3Rpb24oaWQpIHtcbiAgICAgICRsb2NhdGlvbi5oYXNoKGlkKTtcbiAgICAgICRhbmNob3JTY3JvbGwoKTtcbiAgIH1cblxufSkiLCJhcHAuZmFjdG9yeSgnUmFuZG9tR3JlZXRpbmdzJywgZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIGdldFJhbmRvbUZyb21BcnJheSA9IGZ1bmN0aW9uIChhcnIpIHtcbiAgICAgICAgcmV0dXJuIGFycltNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBhcnIubGVuZ3RoKV07XG4gICAgfTtcblxuICAgIHZhciBncmVldGluZ3MgPSBbXG4gICAgICAgICdIZWxsbywgd29ybGQhJyxcbiAgICAgICAgJ0F0IGxvbmcgbGFzdCwgSSBsaXZlIScsXG4gICAgICAgICdIZWxsbywgc2ltcGxlIGh1bWFuLicsXG4gICAgICAgICdXaGF0IGEgYmVhdXRpZnVsIGRheSEnLFxuICAgICAgICAnSVxcJ20gbGlrZSBhbnkgb3RoZXIgcHJvamVjdCwgZXhjZXB0IHRoYXQgSSBhbSB5b3Vycy4gOiknLFxuICAgICAgICAnVGhpcyBlbXB0eSBzdHJpbmcgaXMgZm9yIExpbmRzYXkgTGV2aW5lLicsXG4gICAgICAgICfjgZPjgpPjgavjgaHjga/jgIHjg6bjg7zjgrbjg7zmp5jjgIInLFxuICAgICAgICAnV2VsY29tZS4gVG8uIFdFQlNJVEUuJyxcbiAgICAgICAgJzpEJyxcbiAgICAgICAgJ1llcywgSSB0aGluayB3ZVxcJ3ZlIG1ldCBiZWZvcmUuJyxcbiAgICAgICAgJ0dpbW1lIDMgbWlucy4uLiBJIGp1c3QgZ3JhYmJlZCB0aGlzIHJlYWxseSBkb3BlIGZyaXR0YXRhJyxcbiAgICAgICAgJ0lmIENvb3BlciBjb3VsZCBvZmZlciBvbmx5IG9uZSBwaWVjZSBvZiBhZHZpY2UsIGl0IHdvdWxkIGJlIHRvIG5ldlNRVUlSUkVMIScsXG4gICAgXTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGdyZWV0aW5nczogZ3JlZXRpbmdzLFxuICAgICAgICBnZXRSYW5kb21HcmVldGluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGdldFJhbmRvbUZyb21BcnJheShncmVldGluZ3MpO1xuICAgICAgICB9XG4gICAgfTtcblxufSk7XG4iLCJhcHAuZmFjdG9yeSgnRGF0YUZhY3RvcnknLCBmdW5jdGlvbigkaHR0cCwgVXBsb2FkLCAkdGltZW91dCl7XG5cdHZhciBEYXRhRmFjdG9yeSA9IHt9O1xuXG5cdERhdGFGYWN0b3J5LmdldERhdGFCeUlkID0gZnVuY3Rpb24oaWQpe1xuXHRcdHJldHVybiAkaHR0cC5nZXQoJy9hcGkvZGF0YS8nICsgaWQpXG5cdFx0LnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuXHRcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGE7XG5cdFx0fSk7XG5cdH1cblxuXHREYXRhRmFjdG9yeS5nZXRBbGxEYXRhID0gZnVuY3Rpb24oKXtcblx0XHRyZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL2RhdGEvJylcblx0XHQudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG5cdFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YTtcblx0XHR9KTtcblx0fVxuXG5cdHJldHVybiBEYXRhRmFjdG9yeTtcbn0pIiwiYXBwLmZhY3RvcnkoJ1VzZXJGYWN0b3J5JywgZnVuY3Rpb24oJGh0dHApe1xuXHR2YXIgRmFjdG9yeU9iaiA9IHt9O1xuXHRGYWN0b3J5T2JqLmNyZWF0ZSA9IGZ1bmN0aW9uKGRhdGEpe1xuXHRcdHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL3VzZXJzJywgZGF0YSlcblx0XHQudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG5cdFx0XHRyZXR1cm4gcmVzcG9uc2UuZGF0YTtcblx0XHR9KTtcblx0fTtcblxuXHRyZXR1cm4gRmFjdG9yeU9iajtcbn0pOyIsIi8vIGFwcC5kaXJlY3RpdmUoJ2FpRWRpdG9yJywgZnVuY3Rpb24oKSB7XG4vLyAgIHJldHVybiB7XG4vLyAgICAgcmVzdHJpY3Q6ICdFJyxcbi8vICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2VkaXRvcl8yL2VkaXRvci5odG1sJ1xuLy8gICB9O1xuLy8gfSk7XG5cblxuYXBwLmRpcmVjdGl2ZSgnYWlFZGl0b3InLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZWRpdG9yXzIvZWRpdG9yLmh0bWwnXG4gIH07XG59KTsiLCJhcHAuZGlyZWN0aXZlKCdmaWxlVXBsb2FkZXInLCBmdW5jdGlvbigpIHtcblxuXHRyZXR1cm4ge1xuXHRcdHJlc3RyaWN0OiAnRScsXG5cdFx0c2NvcGU6IHRydWUsXG5cdFx0dGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9maWxlLXVwbG9hZGVyL2ZpbGUtdXBsb2FkZXIuaHRtbCcsXG5cdFx0Y29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCBVcGxvYWQsICR0aW1lb3V0KXtcblx0XHRcdCRzY29wZS51cGxvYWRGaWxlcyA9IGZ1bmN0aW9uKGZpbGUsIGVyckZpbGVzKSB7XG5cdCAgICAgICRzY29wZS5mID0gZmlsZTtcblx0ICAgICAgJHNjb3BlLmVyckZpbGUgPSBlcnJGaWxlcyAmJiBlcnJGaWxlc1swXTtcblx0ICAgICAgaWYgKGZpbGUpIHtcblx0ICAgICAgICBmaWxlLnVwbG9hZCA9IFVwbG9hZC51cGxvYWQoe1xuXHQgICAgICAgICAgICB1cmw6ICcvYXBpL2RhdGEvJyArICRzY29wZS5wcm9qSWQgKyAnLycgKyAkc2NvcGUudXNlcklkLFxuXHQgICAgICAgICAgICBkYXRhOiB7ZmlsZTogZmlsZX0sXG5cdCAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnXG5cdCAgICAgICAgfSk7XG5cblx0ICAgICAgICBmaWxlLnVwbG9hZC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xuXHQgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XG5cdCAgICAgICAgICAgICAgICBmaWxlLnJlc3VsdCA9IHJlc3BvbnNlLmRhdGE7XG5cdCAgICAgICAgICAgIH0pO1xuXHQgICAgICAgIH0sIGZ1bmN0aW9uIChyZXNwb25zZSkge1xuXHQgICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID4gMClcblx0ICAgICAgICAgICAgICAgICRzY29wZS5lcnJvck1zZyA9IHJlc3BvbnNlLnN0YXR1cyArICc6ICcgKyByZXNwb25zZS5kYXRhO1xuXHQgICAgICAgIH0sIGZ1bmN0aW9uIChldnQpIHtcblx0ICAgICAgICAgICAgZmlsZS5wcm9ncmVzcyA9IE1hdGgubWluKDEwMCwgcGFyc2VJbnQoMTAwLjAgKiBcblx0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2dC5sb2FkZWQgLyBldnQudG90YWwpKTtcblx0ICAgICAgICB9KTtcblx0ICAgICAgfSAgIFxuXHQgICAgfVxuXG5cdFx0fVxuXHR9XG5cbn0pIiwiYXBwLmRpcmVjdGl2ZSgnZmlsZVVwbG9hZGVyMicsIGZ1bmN0aW9uKCkge1xuXG5cdHJldHVybiB7XG5cdFx0cmVzdHJpY3Q6ICdFJyxcblx0XHRzY29wZTogdHJ1ZSxcblx0XHR0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2ZpbGUtdXBsb2FkZXJfYW0vZmlsZS11cGxvYWRlci5odG1sJyxcblx0XHRjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsIFVwbG9hZCwgJHRpbWVvdXQpe1xuXHRcdFx0JHNjb3BlLnVwbG9hZD0gZnVuY3Rpb24oKXtcblx0XHRcdFx0Y29uc29sZS5sb2codXNlckZpbGUpO1xuXG5cdFx0XHR9XG5cblx0XHR9XG5cdH1cblxufSkiLCJhcHAuZGlyZWN0aXZlKCdmdWxsc3RhY2tMb2dvJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uaHRtbCdcbiAgICB9O1xufSk7IiwiYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlLCBQcm9qZWN0RmFjdG9yeSkge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgc2NvcGU6IHt9LFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL25hdmJhci9uYXZiYXIuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuXG4gICAgICAgICAgICBzY29wZS5pdGVtcyA9IFtcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnSG9tZScsIHN0YXRlOiAnaG9tZScgfSxcbiAgICAgICAgICAgICAgICAvLyB7IGxhYmVsOiAnQWJvdXQnLCBzdGF0ZTogJ2Fib3V0JyB9LFxuXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0Jyb3dzZScsIHN0YXRlOid2aWV3ZXInfVxuICAgICAgICAgICAgICAgIC8vIHsgbGFiZWw6ICdNZW1iZXJzIE9ubHknLCBzdGF0ZTogJ21lbWJlcnNPbmx5JywgYXV0aDogdHJ1ZSB9XG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcbiAgICAgICAgICAgIHNjb3BlLnByb2pCYWRnZSA9IG51bGw7XG5cbiAgICAgICAgICAgIHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmxvZ291dCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHNldFVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICAgICAgICAgICAgaWYodXNlcil7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnLHtpZDp1c2VyLl9pZH0pO1xuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgcmVtb3ZlVXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNldFVzZXIoKTtcblxuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzLCBzZXRVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHJlbW92ZVVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIHJlbW92ZVVzZXIpO1xuICAgICAgICB9XG5cbiAgICB9O1xuXG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ3JhbmRvR3JlZXRpbmcnLCBmdW5jdGlvbiAoUmFuZG9tR3JlZXRpbmdzKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3JhbmRvLWdyZWV0aW5nL3JhbmRvLWdyZWV0aW5nLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcbiAgICAgICAgICAgIHNjb3BlLmdyZWV0aW5nID0gUmFuZG9tR3JlZXRpbmdzLmdldFJhbmRvbUdyZWV0aW5nKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG59KTsiLCJhcHAuZGlyZWN0aXZlKCdhaUJsb2NrcXVvdGUnLGZ1bmN0aW9uKCl7XG4gIHJldHVybntcbiAgICByZXN0cmljdCA6ICdFQScsXG4gICAgc2NvcGUgOiB7XG4gICAgICBhaVF1b3RlICA6ICdAJyxcbiAgICAgIGFpUGVyc29uIDogJ0AnXG4gICAgfSxcbiAgICB0ZW1wbGF0ZVVybCA6ICAnZGlyZWN0aXZlU3RvcmUvYWlfYmxvY2txdW90ZS9haV9ibG9ja3F1b3RlLmh0bWwnLFxuICAgIGxpbmsgOiBmdW5jdGlvbihzY29wZSxlbGVtLGF0dHIpe1xuXG4gICAgICAgfSxcbiAgICB9XG59KTsiLCJhcHAuZGlyZWN0aXZlKCdhaVNvY2lhbCcsZnVuY3Rpb24oKXtcbiAgcmV0dXJue1xuICAgIHJlc3RyaWN0IDogJ0VBJyxcbiAgICBzY29wZSA6IHtcbiAgICAgIGFpSGVhZGVyICA6ICdAJyxcbiAgICAgIGFpVGV4dCA6ICdAJyxcbiAgICAgIGFpRmFjZWJvb2s6J0AnLFxuICAgICAgYWlUd2l0dGVyOidAJyxcbiAgICAgIGFpSW5zdGE6J0AnLFxuICAgICAgYWlHaXRodWI6J0AnXG4gICAgfSxcbiAgICB0ZW1wbGF0ZVVybCA6ICAnZGlyZWN0aXZlU3RvcmUvYWlfc29jaWFsL2FpX3NvY2lhbC5odG1sJyxcbiAgICBsaW5rIDogZnVuY3Rpb24oc2NvcGUsZWxlbSxhdHRyKXtcbiAgICAgICAgY29uc29sZS5sb2coYXR0ci5haUhlYWRlcik7XG4gICAgICAgICAgICBzY29wZS5saW5rcz17fTtcblxuICAgICAgICAgICAgc2NvcGUubGlua3MgPSB7XG4gICAgICAgICAgICAgIFwiZmFjZWJvb2tcIjphdHRyLmFpRmFjZWJvb2ssXG4gICAgICAgICAgICAgIFwidHdpdHRlclwiOmF0dHIuYWlUd2l0dGVyLFxuICAgICAgICAgICAgICBcImluc3RhZ3JhbVwiOmF0dHIuYWlJbnN0YSxcbiAgICAgICAgICAgICAgXCJnaXRodWJcIjphdHRyLmFpR2l0aHViXG4gICAgICAgICAgICB9O1xuICAgICAgIH0sXG4gICAgfVxufSk7IiwiYXBwLmRpcmVjdGl2ZSgnYWlDbGlja0ltZycsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0OiAnRUEnLFxuICAgIHNjb3BlOiB7XG4gICAgICBhaUhlaWdodDogJ0AnLFxuICAgICAgYWlXaWR0aDogJ0AnLFxuICAgICAgYWlMaW5rOiAnQCcsXG4gICAgICBhaUltZ1VybDogJ0AnLFxuICAgICAgYm9yZGVydHlwZTonQCcsXG4gICAgICBib3JkZXJjb2xvcjonQCcsXG4gICAgICBib3JkZXJ3ZWlnaHQ6J0AnLFxuICAgICAgY2FwdGlvbjonQCdcbiAgICB9LFxuICAgIHRlbXBsYXRlVXJsOiAnZGlyZWN0aXZlU3RvcmUvYWlfY2xpY2tfaW1nL2FpX2NsaWNrX2ltZy5odG1sJyxcbiAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbSwgYXR0cikge1xuXG4gICAgICBsZXQgd2lkdGggPSBhdHRyLmFpV2lkdGg7XG4gICAgICBsZXQgaGVpZ2h0ID0gYXR0ci5haUhlaWdodDtcbiAgICAgIGxldCBocmVmID0gYXR0ci5haUxpbms7XG4gICAgICBsZXQgaW1nVXJsID0gYXR0ci5haUltZ1VybDtcbiAgICAgIGxldCBib3JkZXJ0eXBlPWF0dHIuYm9yZGVydHlwZTtcbiAgICAgIGxldCBib3JkZXJjb2xvcj1hdHRyLmJvcmRlcmNvbG9yO1xuICAgICAgbGV0IGJvcmRlcndlaWdodD1hdHRyLmJvcmRlcndlaWdodDtcbiAgICAgIGxldCBjYXB0aW9uPWF0dHIuY2FwdGlvbjtcblxuICAgICAgc2NvcGUuaW1hZ2UgPSB7XG4gICAgICAgIFwicGFyYW1zXCI6IG51bGxcbiAgICAgIH07XG5cbiAgICAgIHNjb3BlLmltYWdlLnBhcmFtcyA9IHtcbiAgICAgICAgXCJoZWlnaHRcIjogaGVpZ2h0LFxuICAgICAgICBcIndpZHRoXCI6IHdpZHRoLFxuICAgICAgICBcInNyY1wiOiBpbWdVcmwsXG4gICAgICAgIFwiaHJlZlwiOiBocmVmLFxuICAgICAgICBcImNhcHRpb25cIjpjYXB0aW9uXG4gICAgICB9O1xuXG5cbiAgICAgIGlmKGJvcmRlcnR5cGUgJiYgYm9yZGVyd2VpZ2h0ICYmIGJvcmRlcmNvbG9yKXtcbiAgICAgICAgc2NvcGUuaW1hZ2UucGFyYW1zW1wiYm9yZGVyXCJdPVwiYm9yZGVyOiBcIitib3JkZXJ0eXBlK1wiIFwiK2JvcmRlcmNvbG9yK1wiIFwiK2JvcmRlcndlaWdodDtcbiAgICAgIH1cblxuICAgIH0sXG4gIH1cbn0pOyIsIlwidXNlIHN0cmljdFwiO1xuYXBwLmRpcmVjdGl2ZSgnZDNGb3JjZUltYWdlcycsIGZ1bmN0aW9uKCR3aW5kb3csIHByb2plY3REYXRhRmFjdG9yeSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFQScsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgYWlUaXRsZTogJ0AnLFxuICAgICAgICAgIGFpSW5mb05vZGVTb3VyY2U6ICdAJyxcbiAgICAgICAgICBhaUluZm9FZGdlU291cmNlOiAnQCcsXG4gICAgICAgICAgYWlXaWR0aDogJ0AnLFxuICAgICAgICAgIGFpSGVpZ2h0OiAnQCcsXG4gICAgICAgICAgbGFiZWxzOidAJyxcbiAgICAgICAgICBub2RlSW1hZ2U6ICdAJyxcbiAgICAgICAgICBiY29sb3I6J0AnLFxuICAgICAgICB9LFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2RpcmVjdGl2ZVN0b3JlL2QzX2ZvcmNlX2ltYWdlcy9kM19mb3JjZV9pbWFnZXMuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtLCBhdHRyKSB7XG4gICAgICAgICAgY29uc3QgZDMgPSAkd2luZG93LmQzO1xuICAgICAgICAgIC8vY29uc3QgUHJvbWlzZSA9ICR3aW5kb3cuYmx1ZWJpcmQ7XG4gICAgICAgICAgbGV0IHdpZHRoID0gYXR0ci5haVdpZHRoO1xuICAgICAgICAgIGxldCBoZWlnaHQgPSBhdHRyLmFpSGVpZ2h0O1xuICAgICAgICAgIGxldCBub2RlV2lkdGggPSBwYXJzZUludChhdHRyLm5vZGVXaWR0aCk7XG4gICAgICAgICAgbGV0IHNob3dMYWJlbHMgPSBhdHRyLmxhYmVscztcbiAgICAgICAgICB2YXIgbm9kZUltYWdlID0gYXR0ci5ub2RlSW1hZ2U7XG4gICAgICAgICAgbGV0IGJjb2xvcj1hdHRyLmJjb2xvcjtcblxuICAgICAgICAgIGNvbnNvbGUubG9nKG5vZGVJbWFnZSk7XG5cbiAgICAgICAgICB2YXIgZm9yY2UgPSBkMy5sYXlvdXQuZm9yY2UoKVxuICAgICAgICAgICAgLmNoYXJnZSgtNTAwKVxuICAgICAgICAgICAgLmxpbmtEaXN0YW5jZSgzMClcbiAgICAgICAgICAgIC5zaXplKFt3aWR0aCwgaGVpZ2h0XSk7XG5cbiAgICAgICAgICB2YXIgc3ZnID0gZDMuc2VsZWN0KCcjY2hhcnQtZm9yY2UtaW1hZ2UnKS5hcHBlbmQoXCJzdmdcIilcbiAgICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgd2lkdGgpXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBoZWlnaHQpXG4gICAgICAgICAgICAuc3R5bGUoXCJiYWNrZ3JvdW5kXCIsYmNvbG9yKTtcblxuICAgICAgICAgIFByb21pc2UuYWxsKFtwcm9qZWN0RGF0YUZhY3RvcnkuZ2V0SW50ZXJuYWwoYXR0ci5haUluZm9Ob2RlU291cmNlLCAnanNvbicpLCBwcm9qZWN0RGF0YUZhY3RvcnkuZ2V0SW50ZXJuYWwoYXR0ci5haUluZm9FZGdlU291cmNlLCAnanNvbicpXSlcbiAgICAgICAgICAgIC5zcHJlYWQoZnVuY3Rpb24obm9kZURhdGEsIGVkZ2VEYXRhKSB7XG4gICAgICAgICAgICAgICAgdmFyIF9ub2RlcyA9IG5vZGVEYXRhO1xuICAgICAgICAgICAgICAgIHZhciBfbGlua3MgPSBlZGdlRGF0YTtcblxuXG4gICAgICAgICAgICAgICAgZm9yY2VcbiAgICAgICAgICAgICAgICAgIC5ub2Rlcyhfbm9kZXMpXG4gICAgICAgICAgICAgICAgICAubGlua3MoX2xpbmtzKVxuICAgICAgICAgICAgICAgICAgLnN0YXJ0KCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgbGluayA9IHN2Zy5zZWxlY3RBbGwoXCIubGlua1wiKVxuICAgICAgICAgICAgICAgICAgLmRhdGEoX2xpbmtzKVxuICAgICAgICAgICAgICAgICAgLmVudGVyKCkuYXBwZW5kKFwibGluZVwiKVxuICAgICAgICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcImxpbmtcIilcbiAgICAgICAgICAgICAgICAgIC5zdHlsZShcInN0cm9rZS13aWR0aFwiLCBmdW5jdGlvbihkKXtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguc3FydChkLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICB2YXIgbm9kZSA9IHN2Zy5zZWxlY3RBbGwoXCIubm9kZVwiKVxuICAgICAgICAgICAgICAgICAgICAuZGF0YShfbm9kZXMpXG4gICAgICAgICAgICAgICAgICAgIC5lbnRlcigpLmFwcGVuZChcImdcIilcbiAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcIm5vZGVcIilcbiAgICAgICAgICAgICAgICAgICAgLmNhbGwoZm9yY2UuZHJhZyk7XG5cbiAgICAgICAgICAgICAgICAgbm9kZS5hcHBlbmQoXCJ0aXRsZVwiKVxuICAgICAgICAgICAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkLm5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgfSk7IC8vIGFic3RyYWN0IHRoaXNcblxuICAgICAgICAgICAgICAvLyBub2RlLmFwcGVuZCgndGV4dCcpXG4gICAgICAgICAgICAgIC8vICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLm5hbWUgfSlcbiAgICAgICAgICAgICAgLy8gICAgICAuYXR0cignZmlsbCcsJyNEMTFDMjQnKVxuICAgICAgICAgICAgICAgICAgIC8vIC5hdHRyKFwiZHhcIiwgMTIpXG4gICAgICAgICAgICAgICAgICAvLyAuYXR0cihcImR5XCIsIFwiLjM1ZW1cIilcblxuXG4gICAgICAgICAgICAgIG5vZGUuYXBwZW5kKFwiaW1hZ2VcIilcbiAgICAgICAgICAgICAgICAgIC5hdHRyKFwieGxpbms6aHJlZlwiLCBmdW5jdGlvbihkKXtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGQuc291cmNlKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gcmV0dXJuIFN0cmluZyhub2RlSW1hZ2UpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gU3RyaW5nKGQuaW1hZ2UpO1xuICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgIC5hdHRyKFwieFwiLCAtOClcbiAgICAgICAgICAgICAgICAgIC5hdHRyKFwieVwiLCAtOClcbiAgICAgICAgICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgMjUpXG4gICAgICAgICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCAyNSk7XG5cbiAgICAgICAgICAgICAgICBmb3JjZS5vbihcInRpY2tcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgbGluay5hdHRyKFwieDFcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5zb3VyY2UueDsgfSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ5MVwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnNvdXJjZS55OyB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgICAuYXR0cihcIngyXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQudGFyZ2V0Lng7IH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC5hdHRyKFwieTJcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC50YXJnZXQueTsgfSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICBub2RlLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gXCJ0cmFuc2xhdGUoXCIgKyBkLnggKyBcIixcIiArIGQueSArIFwiKVwiOyB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICB9KTsgLy9lbmQgb2YgcHJvbWlzZS5hbGxcbiAgICAgICAgICAgICAgfSAvLyBlbmQgbGlua1xuICAgICAgICAgICAgfTsgLy8gZW5kIHJldHVyblxuICAgICAgICB9KTsiLCJcInVzZSBzdHJpY3RcIjtcbmFwcC5kaXJlY3RpdmUoJ2QzRm9yY2VCYXNpYycsIGZ1bmN0aW9uKCR3aW5kb3cscHJvamVjdERhdGFGYWN0b3J5KXtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdCA6ICdFQScsXG4gICAgc2NvcGUgOiB7XG4gICAgICBhaVRpdGxlICA6ICdAJyxcbiAgICAgIGFpSW5mb1NvdXJjZSA6ICdAJyxcbiAgICAgIGFpV2lkdGg6J0AnLFxuICAgICAgYWlIZWlnaHQ6J0AnLFxuICAgICAgbm9kZVdpZHRoOidAJ1xuXG4gICAgfSxcbiAgICB0ZW1wbGF0ZVVybCA6ICAnZGlyZWN0aXZlU3RvcmUvZDNfZm9yY2VfYmFzaWMvZDNfZm9yY2VfYmFzaWMuaHRtbCcsXG4gICAgbGluayA6IGZ1bmN0aW9uKHNjb3BlLGVsZW0sYXR0cil7XG4gICAgICBjb25zdCBkMyA9ICR3aW5kb3cuZDM7XG4gICAgICBsZXQgdyA9IGF0dHIuYWlXaWR0aDtcbiAgICAgIGxldCBoID0gYXR0ci5haUhlaWdodDtcbiAgICAgIGxldCBub2RlV2lkdGg9IGF0dHIubm9kZVdpZHRoO1xuICAgICAgbGV0IGNvbG9ycyA9IHtcbiAgICAgICAgICBcImxpZ2h0Z3JheVwiOiBcIiM4MTkwOTBcIixcbiAgICAgICAgICBcImdyYXlcIjogXCIjNzA4Mjg0XCIsXG4gICAgICAgICAgXCJtZWRpdW1ncmF5XCI6IFwiIzUzNjg3MFwiLFxuICAgICAgICAgIFwiZGFya2dyYXlcIjogXCIjNDc1QjYyXCIsXG4gICAgICAgICAgXCJkYXJrYmx1ZVwiOiBcIiMwQTI5MzNcIixcbiAgICAgICAgICBcImRhcmtlcmJsdWVcIjogXCIjMDQyMDI5XCIsXG4gICAgICAgICAgXCJwYWxlcnllbGxvd1wiOiBcIiNGQ0Y0RENcIixcbiAgICAgICAgICBcInBhbGV5ZWxsb3dcIjogXCIjRUFFM0NCXCIsXG4gICAgICAgICAgXCJ5ZWxsb3dcIjogXCIjQTU3NzA2XCIsXG4gICAgICAgICAgXCJvcmFuZ2VcIjogXCIjQkQzNjEzXCIsXG4gICAgICAgICAgXCJyZWRcIjogXCIjRDExQzI0XCIsXG4gICAgICAgICAgXCJwaW5rXCI6IFwiI0M2MUM2RlwiLFxuICAgICAgICAgIFwicHVycGxlXCI6IFwiIzU5NUFCN1wiLFxuICAgICAgICAgIFwiYmx1ZVwiOiBcIiMyMTc2QzdcIixcbiAgICAgICAgICBcImdyZWVuXCI6IFwiIzI1OTI4NlwiLFxuICAgICAgICAgIFwieWVsbG93Z3JlZW5cIjogXCIjNzM4QTA1XCJcbiAgICAgICAgfTtcbiAgICAgICAgLy81NzY0NzY2Nzg5YWQ4YThhMjMwMTFkN2VcbiAgICBwcm9qZWN0RGF0YUZhY3RvcnkuZ2V0SW50ZXJuYWwoYXR0ci5haUluZm9Tb3VyY2UsJ2pzb24nKVxuICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihfZGF0YSl7XG4gICAgICAgICAgICAgICAgc2NvcGUuZGF0YT1fZGF0YTtcbiAgICAgICAgICAgICAgICByZXR1cm4gX2RhdGFcbiAgICAgICAgfSkudGhlbihmdW5jdGlvbihfZGF0YSl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhfZGF0YSlcbiAgICAgICAgICAgIGxldCBub2RlcyA9IF9kYXRhLm5vZGVzO1xuICAgICAgICAgICAgdmFyIGxpbmtzID0gW107XG5cbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHsgLy8gc3BsaXQgbm9kZXMgYW5kIGxpbmtzLi4uXG4gICAgICAgICAgICAgIGlmKG5vZGVzW2ldLnRhcmdldCAhPT0gdW5kZWZpbmVkKXtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciB4PTA7IHggPCBub2Rlc1tpXS50YXJnZXQubGVuZ3RoOyB4Kyspe1xuICAgICAgICAgICAgICAgICAgICBsaW5rcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICBzb3VyY2U6bm9kZXNbaV0sXG4gICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0Om5vZGVzW25vZGVzW2ldLnRhcmdldFt4XV1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIHZhciBteUNoYXJ0ID0gZDMuc2VsZWN0KCcjY2hhcnQtZm9yY2UtYmFzaWMnKVxuICAgICAgICAgICAgICAgIC5hcHBlbmQoJ3N2ZycpXG4gICAgICAgICAgICAgICAgLmF0dHIoJ3dpZHRoJyx3KVxuICAgICAgICAgICAgICAgIC5hdHRyKCdoZWlnaHQnLGgpXG5cbiAgICAgICAgICAgIHZhciBmb3JjZSA9IGQzLmxheW91dC5mb3JjZSgpXG4gICAgICAgICAgICAgICAgLm5vZGVzKG5vZGVzKVxuICAgICAgICAgICAgICAgIC5saW5rcyhbXSlcbiAgICAgICAgICAgICAgICAuZ3Jhdml0eSgwLjMpXG4gICAgICAgICAgICAgICAgLmNoYXJnZSgtMTAwMClcbiAgICAgICAgICAgICAgICAuc2l6ZShbdyxoXSlcblxuICAgICAgICAgICAgdmFyIGxpbmsgPSBteUNoYXJ0LnNlbGVjdEFsbCgnbGluZScpXG4gICAgICAgICAgICAgICAgLmRhdGEobGlua3MpLmVudGVyKCkuYXBwZW5kKCdsaW5lJylcbiAgICAgICAgICAgICAgICAuYXR0cignc3Ryb2tlJywgY29sb3JzLmdyYXkpXG5cbiAgICAgICAgICAgIHZhciBub2RlID0gbXlDaGFydC5zZWxlY3RBbGwoJ2NpcmNsZScpXG4gICAgICAgICAgICAgICAgLmRhdGEobm9kZXMpLmVudGVyKClcbiAgICAgICAgICAgICAgICAuYXBwZW5kKCdnJylcbiAgICAgICAgICAgICAgICAuY2FsbChmb3JjZS5kcmFnKVxuXG4gICAgICAgICAgICBub2RlLmFwcGVuZCgnY2lyY2xlJylcbiAgICAgICAgICAgICAgICAuYXR0cignY3gnLCBmdW5jdGlvbihkKSB7cmV0dXJuIGQueH0pXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2N5JywgZnVuY3Rpb24oZCkge3JldHVybiBkLnl9KVxuICAgICAgICAgICAgICAgIC5hdHRyKCdyJyxub2RlV2lkdGgpXG4gICAgICAgICAgICAgICAgLmF0dHIoJ2ZpbGwnLCBmdW5jdGlvbihkLGkpe1xuICAgICAgICAgICAgICAgICAgaWYgKGk+MCkgeyAvLyBjaGFuZ2UgY29sb3IgYmFzZWQgb24gbGV2ZWxcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvbG9ycy5waW5rO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvbG9ycy5ibHVlXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgbm9kZS5hcHBlbmQoJ3RleHQnKVxuICAgICAgICAgICAgICAgIC50ZXh0KChkKT0+e2NvbnNvbGUubG9nKGQubmFtZSk7IHJldHVybiBkLm5hbWV9KVxuICAgICAgICAgICAgICAgIC5hdHRyKCdmb250LWZhbWlseScsJ1JvYm90byBTbGFiJylcbiAgICAgICAgICAgICAgICAuYXR0cignZmlsbCcsIGZ1bmN0aW9uKGQsaSl7XG4gICAgICAgICAgICAgICAgICBpZiAoaT4wKSB7IC8vIGNoYW5nZSBjb2xvciBiYXNlZCBvbiBsZXZlbFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29sb3JzLm1lZGl1bWdyYXk7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY29sb3JzLmRhcmtibHVlXG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAuYXR0cignZm9udC1zaXplJyxmdW5jdGlvbihkLGkpe1xuICAgICAgICAgICAgICAgICAgaWYgKGk+MCkgeyAvLyBjaGFuZ2UgZm9udCBiYXNlZCBvbiBsZXZlbFxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJzFlbSc7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJzEuM2VtJztcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICBmb3JjZS5vbigndGljaycsIGZ1bmN0aW9uKGUpe1xuICAgICAgICAgICAgICBub2RlLmF0dHIoJ3RyYW5zZm9ybScsIGZ1bmN0aW9uKGQsaSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuICd0cmFuc2xhdGUoJysgZC54ICsnLCcrZC55ICsnKSc7XG4gICAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgIGxpbmtcbiAgICAgICAgICAgICAgICAuYXR0cigneDEnLChkKT0+IHtyZXR1cm4gZC5zb3VyY2UueH0pXG4gICAgICAgICAgICAgICAgLmF0dHIoJ3kxJywoZCk9PiB7cmV0dXJuIGQuc291cmNlLnl9KVxuICAgICAgICAgICAgICAgIC5hdHRyKCd4MicsKGQpPT4ge3JldHVybiBkLnRhcmdldC54fSlcbiAgICAgICAgICAgICAgICAuYXR0cigneTInLChkKT0+IHtyZXR1cm4gZC50YXJnZXQueX0pXG4gICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICBmb3JjZS5zdGFydCgpO1xuICAgICAgICB9KS8vIGVuZCBfZGF0YSBwcm9taXNlXG4gICB9Ly8gZW5kIGxpbmtcbiAgfTsgLy8gZW5kIHJldHVyblxufSk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5hcHAuZGlyZWN0aXZlKCdkM0Jvc3RvY2tGb3JjZScsIGZ1bmN0aW9uKCR3aW5kb3csIHByb2plY3REYXRhRmFjdG9yeSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFQScsXG4gICAgICAgIHNjb3BlOiB7XG4gICAgICAgICAgYWlUaXRsZTogJ0AnLFxuICAgICAgICAgIGFpSW5mb05vZGVTb3VyY2U6ICdAJyxcbiAgICAgICAgICBhaUluZm9FZGdlU291cmNlOiAnQCcsXG4gICAgICAgICAgYWlXaWR0aDogJ0AnLFxuICAgICAgICAgIGFpSGVpZ2h0OiAnQCcsXG4gICAgICAgICAgbGFiZWxzOidAJyxcbiAgICAgICAgICBub2RlV2lkdGg6ICdAJyxcbiAgICAgICAgICBjb2xvclNldDonQCdcbiAgICAgICAgfSxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdkaXJlY3RpdmVTdG9yZS9kM19ib3N0b2NrX2ZvcmNlL2QzX2Jvc3RvY2tfZm9yY2UuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtLCBhdHRyKSB7XG4gICAgICAgICAgY29uc3QgZDMgPSAkd2luZG93LmQzO1xuICAgICAgICAgIC8vY29uc3QgUHJvbWlzZSA9ICR3aW5kb3cuYmx1ZWJpcmQ7XG4gICAgICAgICAgbGV0IHdpZHRoID0gYXR0ci5haVdpZHRoO1xuICAgICAgICAgIGxldCBoZWlnaHQgPSBhdHRyLmFpSGVpZ2h0O1xuICAgICAgICAgIGxldCBub2RlV2lkdGggPSBwYXJzZUludChhdHRyLm5vZGVXaWR0aCk7XG4gICAgICAgICAgbGV0IHNob3dMYWJlbHMgPSBhdHRyLmxhYmVscztcbiAgICAgICAgICB2YXIgY29sb3IgPSBkMy5zY2FsZS5jYXRlZ29yeTIwKCk7IC8vIGFic3RyYWN0IHRoaXNcblxuICAgICAgICAgIGlmKGF0dHIuY29sb3JTZXQ9PT1cIjEwXCIpIHtcbiAgICAgICAgICAgIGNvbG9yID0gZDMuc2NhbGUuY2F0ZWdvcnkxMCgpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHZhciBmb3JjZSA9IGQzLmxheW91dC5mb3JjZSgpXG4gICAgICAgICAgICAuY2hhcmdlKC0xMjApXG4gICAgICAgICAgICAubGlua0Rpc3RhbmNlKDMwKVxuICAgICAgICAgICAgLnNpemUoW3dpZHRoLCBoZWlnaHRdKTtcblxuICAgICAgICAgIHZhciBzdmcgPSBkMy5zZWxlY3QoJyNjaGFydC1ib3N0b2NrLWZvcmNlLWV4YW1wbGUnKS5hcHBlbmQoXCJzdmdcIilcbiAgICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgd2lkdGgpXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBoZWlnaHQpO1xuXG4gICAgICAgICAgUHJvbWlzZS5hbGwoW3Byb2plY3REYXRhRmFjdG9yeS5nZXRJbnRlcm5hbChhdHRyLmFpSW5mb05vZGVTb3VyY2UsICdqc29uJyksIHByb2plY3REYXRhRmFjdG9yeS5nZXRJbnRlcm5hbChhdHRyLmFpSW5mb0VkZ2VTb3VyY2UsICdqc29uJyldKVxuICAgICAgICAgICAgLnNwcmVhZChmdW5jdGlvbihub2RlRGF0YSwgZWRnZURhdGEpIHtcbiAgICAgICAgICAgICAgICB2YXIgX25vZGVzID0gbm9kZURhdGE7XG4gICAgICAgICAgICAgICAgdmFyIF9saW5rcyA9IGVkZ2VEYXRhO1xuXG4gICAgICAgICAgICAgICAgZm9yY2VcbiAgICAgICAgICAgICAgICAgIC5ub2Rlcyhfbm9kZXMpXG4gICAgICAgICAgICAgICAgICAubGlua3MoX2xpbmtzKVxuICAgICAgICAgICAgICAgICAgLnN0YXJ0KCk7XG5cbiAgICAgICAgICAgICAgICB2YXIgbGluayA9IHN2Zy5zZWxlY3RBbGwoXCIubGlua1wiKVxuICAgICAgICAgICAgICAgICAgLmRhdGEoX2xpbmtzKVxuICAgICAgICAgICAgICAgICAgLmVudGVyKCkuYXBwZW5kKFwibGluZVwiKVxuICAgICAgICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcImxpbmtcIilcbiAgICAgICAgICAgICAgICAgIC5zdHlsZShcInN0cm9rZS13aWR0aFwiLCBmdW5jdGlvbihkKXtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE1hdGguc3FydChkLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgdmFyIG5vZGUgPSBzdmcuc2VsZWN0QWxsKFwiLm5vZGVcIilcbiAgICAgICAgICAgICAgICAgIC5kYXRhKF9ub2RlcylcbiAgICAgICAgICAgICAgICAgIC5lbnRlcigpLmFwcGVuZChcImNpcmNsZVwiKVxuICAgICAgICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcIm5vZGVcIilcbiAgICAgICAgICAgICAgICAgIC5hdHRyKFwiclwiLCA1KVxuICAgICAgICAgICAgICAgICAgLnN0eWxlKFwiZmlsbFwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjb2xvcihkLmdyb3VwKTtcbiAgICAgICAgICAgICAgICAgIH0pIC8vIGFic3RyYWN0IGdyb3VwXG4gICAgICAgICAgICAgICAgICAuY2FsbChmb3JjZS5kcmFnKTtcblxuICAgICAgICAgICAgICAgIG5vZGUuYXBwZW5kKFwidGl0bGVcIilcbiAgICAgICAgICAgICAgICAgIC50ZXh0KGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQubmFtZTtcbiAgICAgICAgICAgICAgICAgIH0pOyAvLyBhYnN0cmFjdCB0aGlzXG5cbiAgICAgICAgICAgICAgICBpZihzaG93TGFiZWxzPT09XCJ0cnVlXCIpe1xuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJsYWJlbHMgdHVybmVkIG9uXCIpXG4gICAgICAgICAgICAgICAgICB2YXIgbGFiZWwgPSBzdmcuc2VsZWN0QWxsKFwiLmxhYmVsXCIpXG4gICAgICAgICAgICAgICAgICAgICAgLmRhdGEoX25vZGVzKVxuICAgICAgICAgICAgICAgICAgICAgIC5lbnRlcigpLmFwcGVuZChcImdcIilcbiAgICAgICAgICAgICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwibGFiZWxcIilcbiAgICAgICAgICAgICAgICAgICAgICAuY2FsbChmb3JjZS5kcmFnKTtcblxuICAgICAgICAgICAgICAgICAgbGFiZWwuYXBwZW5kKCd0ZXh0JylcbiAgICAgICAgICAgICAgICAgICAgLnRleHQoKGQpPT57cmV0dXJuIGQubmFtZX0pXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgZm9yY2Uub24oXCJ0aWNrXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBsaW5rLmF0dHIoXCJ4MVwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC5zb3VyY2UueDtcbiAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgIC5hdHRyKFwieTFcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQuc291cmNlLnk7XG4gICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgICAuYXR0cihcIngyXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkLnRhcmdldC54O1xuICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJ5MlwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC50YXJnZXQueTtcbiAgICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgICAgICBub2RlLmF0dHIoXCJjeFwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC54O1xuICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgLmF0dHIoXCJjeVwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZC55O1xuICAgICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmKHNob3dMYWJlbHM9PT1cInRydWVcIil7XG4gICAgICAgICAgICAgICAgICAgICAgbGFiZWwuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24oZCxpKXtcbiAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ3RyYW5zbGF0ZSgnKyBkLnggKycsJytkLnkgKycpJztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB9KTsgLy8gZW5kIGZvcmNlLm9uXG4gICAgICAgICAgICAgICAgICB9KTsgLy9lbmQgb2YgcHJvbWlzZS5hbGxcbiAgICAgICAgICAgICAgfSAvLyBlbmQgbGlua1xuICAgICAgICAgICAgfTsgLy8gZW5kIHJldHVyblxuICAgICAgICB9KTsiLCJcInVzZSBzdHJpY3RcIjtcbmFwcC5kaXJlY3RpdmUoJ2hvcml6b250YWxGbGFyZScsIGZ1bmN0aW9uKCR3aW5kb3cscHJvamVjdERhdGFGYWN0b3J5KXtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdCA6ICdFQScsXG4gICAgc2NvcGUgOiB7XG4gICAgICBhaVRpdGxlICA6ICdAJyxcbiAgICAgIGFpSW5mb1NvdXJjZSA6ICdAJyxcbiAgICAgIGFpV2lkdGg6ICdAJyxcbiAgICAgIGFpSGVpZ2h0OidAJ1xuICAgIH0sXG4gICAgIHRlbXBsYXRlVXJsIDogICdkaXJlY3RpdmVTdG9yZS9ob3Jpem9udGFsX2ZsYXJlL2hvcml6b250YWxfZmxhcmUuaHRtbCcsXG4gICAgIGxpbmsgOiBmdW5jdGlvbihzY29wZSxlbGVtLGF0dHIpe1xuICAgICAgICB2YXIgZDMgPSAkd2luZG93LmQzO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKGF0dHIuYWlJbmZvU291cmNlKTsgLy8gbWF5YmUgbWFrZSB0aGUgY2hhcnQgaWQgb3V0IG9mIHRoaXM/XG5cbiAgICAgICAgcHJvamVjdERhdGFGYWN0b3J5LmdldEludGVybmFsKGF0dHIuYWlJbmZvU291cmNlLCdqc29uJylcbiAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oX2RhdGEpe1xuICAgICAgICAgICAgICAgIHNjb3BlLmRhdGE9X2RhdGE7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ19kYXRhIGlzICcgKyBfZGF0YSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF9kYXRhXG4gICAgICAgIH0pLnRoZW4oZnVuY3Rpb24oX2RhdGEpe1xuXG4gICAgICB2YXIgbWFyZ2luID0ge3RvcDogMjAsIHJpZ2h0OiAyMCwgYm90dG9tOiAyMCwgbGVmdDogMjB9LFxuICAgICAgICAgIHdpZHRoID0gYXR0ci5haVdpZHRoICsgMjAgLSBtYXJnaW4ucmlnaHQgLSBtYXJnaW4ubGVmdCxcbiAgICAgICAgICBoZWlnaHQgPSBhdHRyLmFpSGVpZ2h0IC0gbWFyZ2luLnRvcCAtIG1hcmdpbi5ib3R0b207XG5cbiAgICAgIHZhciBpID0gMCxcbiAgICAgICAgICBkdXJhdGlvbiA9IDc1MCxcbiAgICAgICAgICByb290O1xuXG4gICAgICB2YXIgdHJlZSA9IGQzLmxheW91dC50cmVlKClcbiAgICAgICAgICAuc2l6ZShbaGVpZ2h0LCB3aWR0aF0pO1xuXG4gICAgICB2YXIgZGlhZ29uYWwgPSBkMy5zdmcuZGlhZ29uYWwoKVxuICAgICAgICAgIC5wcm9qZWN0aW9uKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIFtkLnksIGQueF07IH0pO1xuXG4gICAgICB2YXIgc3ZnID0gZDMuc2VsZWN0KFwiI2NoYXJ0MTFcIikuYXBwZW5kKFwic3ZnXCIpXG4gICAgICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB3aWR0aCArIG1hcmdpbi5yaWdodCArIG1hcmdpbi5sZWZ0KVxuICAgICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGhlaWdodCArIG1hcmdpbi50b3AgKyBtYXJnaW4uYm90dG9tKVxuICAgICAgICAuYXBwZW5kKFwiZ1wiKVxuICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiICsgbWFyZ2luLmxlZnQgKyBcIixcIiArIG1hcmdpbi50b3AgKyBcIilcIik7XG5cblxuICAgICAgICByb290ID0gX2RhdGE7XG4gICAgICAgIHJvb3QueDAgPSB3aWR0aCAvIDI7XG4gICAgICAgIHJvb3QueTAgPSAwO1xuXG4gICAgICAgIGZ1bmN0aW9uIGNvbGxhcHNlKGQpIHtcbiAgICAgICAgICBpZiAoZC5jaGlsZHJlbikge1xuICAgICAgICAgICAgZC5fY2hpbGRyZW4gPSBkLmNoaWxkcmVuO1xuICAgICAgICAgICAgZC5fY2hpbGRyZW4uZm9yRWFjaChjb2xsYXBzZSk7XG4gICAgICAgICAgICBkLmNoaWxkcmVuID0gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByb290LmNoaWxkcmVuLmZvckVhY2goY29sbGFwc2UpO1xuICAgICAgICB1cGRhdGUocm9vdCk7XG5cblxuICAgICAgZDMuc2VsZWN0KHNlbGYuZnJhbWVFbGVtZW50KS5zdHlsZShcImhlaWdodFwiLCBcIjEwMDBweFwiKTtcblxuICAgICAgZnVuY3Rpb24gdXBkYXRlKHNvdXJjZSkge1xuXG4gICAgICAgIC8vIENvbXB1dGUgdGhlIG5ldyB0cmVlIGxheW91dC5cbiAgICAgICAgdmFyIG5vZGVzID0gdHJlZS5ub2Rlcyhyb290KS5yZXZlcnNlKCksXG4gICAgICAgICAgICBsaW5rcyA9IHRyZWUubGlua3Mobm9kZXMpO1xuXG4gICAgICAgIC8vIE5vcm1hbGl6ZSBmb3IgZml4ZWQtZGVwdGguXG4gICAgICAgIG5vZGVzLmZvckVhY2goZnVuY3Rpb24oZCkgeyBkLnkgPSBkLmRlcHRoICogMTAwOyB9KTtcbiAgICAgICAgLy9ub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKGQpe2QueCA9IGQueCsyMH0pO1xuXG4gICAgICAgIC8vIFVwZGF0ZSB0aGUgbm9kZXPigKZcbiAgICAgICAgdmFyIG5vZGUgPSBzdmcuc2VsZWN0QWxsKFwiZy5ub2RlXCIpXG4gICAgICAgICAgICAuZGF0YShub2RlcywgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5pZCB8fCAoZC5pZCA9ICsraSk7IH0pO1xuXG4gICAgICAgIC8vIEVudGVyIGFueSBuZXcgbm9kZXMgYXQgdGhlIHBhcmVudCdzIHByZXZpb3VzIHBvc2l0aW9uLlxuICAgICAgICB2YXIgbm9kZUVudGVyID0gbm9kZS5lbnRlcigpLmFwcGVuZChcImdcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJub2RlXCIpXG4gICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBcInRyYW5zbGF0ZShcIiArIHNvdXJjZS55MCArIFwiLFwiICsgc291cmNlLngwICsgXCIpXCI7IH0pXG4gICAgICAgICAgICAub24oXCJjbGlja1wiLCBjbGljayk7XG5cbiAgICAgICAgbm9kZUVudGVyLmFwcGVuZChcImNpcmNsZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJyXCIsIDFlLTYpXG4gICAgICAgICAgICAuc3R5bGUoXCJmaWxsXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuX2NoaWxkcmVuID8gXCJsaWdodHN0ZWVsYmx1ZVwiIDogXCIjZmZmXCI7IH0pO1xuXG4gICAgICAgIG5vZGVFbnRlci5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5jaGlsZHJlbiB8fCBkLl9jaGlsZHJlbiA/IC0xMCA6IDEwO30pXG4gICAgICAgICAgICAuYXR0cihcInlcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5jaGlsZHJlbiB8fCBkLl9jaGlsZHJlbiA/IC0xMCA6IDEwIH0pXG4gICAgICAgICAgICAuYXR0cihcImR5XCIsIFwiLjM1ZW1cIilcbiAgICAgICAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5jaGlsZHJlbiB8fCBkLl9jaGlsZHJlbiA/IFwiZW5kXCIgOiBcInN0YXJ0XCI7IH0pXG4gICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLm5hbWUgfHwgZC5zdHVkZW50bmFtZSB8fCBcInN0dWRlbnQgY29kZTogXCIgK2Quc3R1ZGVudGNvZGUgfSlcbiAgICAgICAgICAgIC5zdHlsZShcImZpbGwtb3BhY2l0eVwiLCAxZS02KVxuICAgICAgICAgICAgLmF0dHIoJ3N0eWxlJywnc3Ryb2tlOm5vbmU7Zm9udC1mYW1pbHk6IHNhbnMtc2VyaWY7bGV0dGVyLXNwYWNpbmc6IDI7Jyk7XG5cbiAgICAgICAgLy8gVHJhbnNpdGlvbiBub2RlcyB0byB0aGVpciBuZXcgcG9zaXRpb24uXG4gICAgICAgIHZhciBub2RlVXBkYXRlID0gbm9kZS50cmFuc2l0aW9uKClcbiAgICAgICAgICAgIC5kdXJhdGlvbihkdXJhdGlvbilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIFwidHJhbnNsYXRlKFwiICsgZC55ICsgXCIsXCIgKyBkLnggKyBcIilcIjsgfSk7XG5cbiAgICAgICAgbm9kZVVwZGF0ZS5zZWxlY3QoXCJjaXJjbGVcIilcbiAgICAgICAgICAgIC5hdHRyKFwiclwiLCA0LjUpXG4gICAgICAgICAgICAuc3R5bGUoXCJmaWxsXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuX2NoaWxkcmVuID8gXCJsaWdodHN0ZWVsYmx1ZVwiIDogXCIjZmZmXCI7IH0pO1xuXG4gICAgICAgIG5vZGVVcGRhdGUuc2VsZWN0KFwidGV4dFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZmlsbC1vcGFjaXR5XCIsIDEpO1xuXG4gICAgICAgIC8vIFRyYW5zaXRpb24gZXhpdGluZyBub2RlcyB0byB0aGUgcGFyZW50J3MgbmV3IHBvc2l0aW9uLlxuICAgICAgICB2YXIgbm9kZUV4aXQgPSBub2RlLmV4aXQoKS50cmFuc2l0aW9uKClcbiAgICAgICAgICAgIC5kdXJhdGlvbihkdXJhdGlvbilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIFwidHJhbnNsYXRlKFwiICsgc291cmNlLnkgKyBcIixcIiArIHNvdXJjZS54ICsgXCIpXCI7IH0pXG4gICAgICAgICAgICAucmVtb3ZlKCk7XG5cbiAgICAgICAgbm9kZUV4aXQuc2VsZWN0KFwiY2lyY2xlXCIpXG4gICAgICAgICAgICAuYXR0cihcInJcIiwgMWUtNik7XG5cbiAgICAgICAgbm9kZUV4aXQuc2VsZWN0KFwidGV4dFwiKVxuICAgICAgICAgICAgLnN0eWxlKFwiZmlsbC1vcGFjaXR5XCIsIDFlLTYpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSB0aGUgbGlua3PigKZcbiAgICAgICAgdmFyIGxpbmsgPSBzdmcuc2VsZWN0QWxsKFwicGF0aC5saW5rXCIpXG4gICAgICAgICAgICAuZGF0YShsaW5rcywgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC50YXJnZXQuaWQ7IH0pO1xuXG4gICAgICAgIC8vIEVudGVyIGFueSBuZXcgbGlua3MgYXQgdGhlIHBhcmVudCdzIHByZXZpb3VzIHBvc2l0aW9uLlxuICAgICAgICBsaW5rLmVudGVyKCkuaW5zZXJ0KFwicGF0aFwiLCBcImdcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJsaW5rXCIpXG4gICAgICAgICAgICAuYXR0cihcImRcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICB2YXIgbyA9IHt4OiBzb3VyY2UueDAsIHk6IHNvdXJjZS55MH07XG4gICAgICAgICAgICAgIHJldHVybiBkaWFnb25hbCh7c291cmNlOiBvLCB0YXJnZXQ6IG99KTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFRyYW5zaXRpb24gbGlua3MgdG8gdGhlaXIgbmV3IHBvc2l0aW9uLlxuICAgICAgICBsaW5rLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgLmR1cmF0aW9uKGR1cmF0aW9uKVxuICAgICAgICAgICAgLmF0dHIoXCJkXCIsIGRpYWdvbmFsKTtcblxuICAgICAgICAvLyBUcmFuc2l0aW9uIGV4aXRpbmcgbm9kZXMgdG8gdGhlIHBhcmVudCdzIG5ldyBwb3NpdGlvbi5cbiAgICAgICAgbGluay5leGl0KCkudHJhbnNpdGlvbigpXG4gICAgICAgICAgICAuZHVyYXRpb24oZHVyYXRpb24pXG4gICAgICAgICAgICAuYXR0cihcImRcIiwgZnVuY3Rpb24oZCkge1xuICAgICAgICAgICAgICB2YXIgbyA9IHt4OiBzb3VyY2UueCwgeTogc291cmNlLnl9O1xuICAgICAgICAgICAgICByZXR1cm4gZGlhZ29uYWwoe3NvdXJjZTogbywgdGFyZ2V0OiBvfSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLnJlbW92ZSgpO1xuXG4gICAgICAgIC8vIFN0YXNoIHRoZSBvbGQgcG9zaXRpb25zIGZvciB0cmFuc2l0aW9uLlxuICAgICAgICBub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICBkLngwID0gZC54O1xuICAgICAgICAgIGQueTAgPSBkLnk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgLy8gVG9nZ2xlIGNoaWxkcmVuIG9uIGNsaWNrLlxuICAgICAgZnVuY3Rpb24gY2xpY2soZCkge1xuICAgICAgICBpZiAoZC5jaGlsZHJlbikge1xuICAgICAgICAgIGQuX2NoaWxkcmVuID0gZC5jaGlsZHJlbjtcbiAgICAgICAgICBkLmNoaWxkcmVuID0gbnVsbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkLmNoaWxkcmVuID0gZC5fY2hpbGRyZW47XG4gICAgICAgICAgZC5fY2hpbGRyZW4gPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHVwZGF0ZShkKTtcbiAgICAgIH1cbiAgICB9KS8vIGVuZCB0aGVuXG4gICAgfVxuICB9XG59KSIsIi8vIGFwcC5mYWN0b3J5KCdqdXN0YXRhYmxlRGF0YUZhY3RvcnknLGZ1bmN0aW9uKCRodHRwKXtcbi8vICAgcmV0dXJue1xuLy8gICAgLy8gdGhpcyByZXByZXNlbnRzIHRoZSByZXN1bHQgb2Ygb3BlbmluZyBhIGNzdiBmaWxlIHR1cm5pbmcgaXQgaW50byBhIGpzb24gYXJyYXkgb2Ygb2JqZWN0c1xuLy8gICAgLy8gYWxsIGZhY3RvcnkgZnVuY3Rpb24gbXVzdCBiZSBhIHByb21pc2UgdG8gc3RhbmRhcmRpemUgdGhlIGludGVyZmFjZVxuLy8gICAgIGdldGRhdGEgOiAgZnVuY3Rpb24oZGF0YVNvdXJjZUxvY2F0aW9uLGRhdGFTb3VyY2VUeXBlKXtcbi8vICAgICAgLy8gYWxlcnQgKGRhdGFTb3VyY2VUeXBlKTtcbi8vICAgICAgIGlmKGRhdGFTb3VyY2VUeXBlID09PSAnZmlsZScpe1xuLy8gICAgICAgLy8gcHV0IG5vZGUgZnMgYXN5bmNvcGVuXG4vLyAgICAgICAgIHJldHVybiBbXG4vLyAgICAgICAgICAge2ZpcnN0bmFtZTonZmlyc3QgbmFtZScsIGxhc3RuYW1lOidsYXN0IG5hbWUnLCBhZ2UgOiAnYWdlJ30sXG4vLyAgICAgICAgICAge2ZpcnN0bmFtZTonSm9obicsIGxhc3RuYW1lOidEb2UnLCBhZ2UgOiAnMjInfSxcbi8vICAgICAgICAgICB7Zmlyc3RuYW1lOidCYXJ0JywgbGFzdG5hbWU6J1NpbXNvbicsIGFnZSA6ICcxMCd9LFxuLy8gICAgICAgICAgIHtmaXJzdG5hbWU6J0RvbmFsZCcsIGxhc3RuYW1lOidUcnVtcCcsIGFnZSA6ICdEaWNrJ31cbi8vICAgICAgICAgXTtcbi8vICAgICAgIH1lbHNlIGlmKGRhdGFTb3VyY2VUeXBlID09PSAnd2Vic2l0ZScpe1xuLy8gICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoZGF0YVNvdXJjZUxvY2F0aW9uKTtcbi8vICAgICAgIH1cbi8vICAgICB9XG4vLyAgIH07XG4vLyB9KTtcblxuYXBwLmRpcmVjdGl2ZSgnanVzdGF0YWJsZScsZnVuY3Rpb24ocHJvamVjdERhdGFGYWN0b3J5KXtcbiAgcmV0dXJue1xuICAgIHJlc3RyaWN0IDogJ0VBJyxcbiAgICBzY29wZSA6IHtcbiAgICAgIGFpVGl0bGUgIDogJ0AnLFxuICAgICAgYWlJbmZvU291cmNlIDogJ0AnLFxuICAgICAgYWlJbmZvVHlwZSA6ICdAJyxcbiAgICB9LFxuICAgIHRlbXBsYXRlVXJsIDogICdkaXJlY3RpdmVTdG9yZS9qdXN0YXRhYmxlL2p1c3RhdGFibGUuaHRtbCcsXG4gICAgLy9jb250cm9sbGVyIDogZnVuY3Rpb24oJHNjb3BlLCBkYXRhRmFjdG9yeSl7XG4gICAgLy8kc2NvcGUuZGF0YT1kYXRhRmFjdG9yeS5nZXRkYXRhKCRzY29wZS5zZWN0aW9uTG9jYXRpb24sJHNjb3BlLnNlY3Rpb25UeXBlKTtcbiAgICAvL30sXG4gICAgbGluayA6IGZ1bmN0aW9uKHNjb3BlLGVsZW0sYXR0cil7XG5cbiAgICAgICAgICBwcm9qZWN0RGF0YUZhY3RvcnkuZ2V0SW50ZXJuYWwoYXR0ci5haUluZm9Tb3VyY2UsJ2pzb24nKVxuICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh0eXBlb2YgZGF0YSk7XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZGF0YVswXSk7XG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coT2JqZWN0LmtleXMoZGF0YVswXSkpXG4gICAgICAgICAgICAgICAgLy9kZWJ1Z2dlclxuICAgICAgICAgICAgICAgIHNjb3BlLmRhdGE9ZGF0YTtcbiAgICAgICAgICAgICAgICBzY29wZS5oZWFkZXJzPU9iamVjdC5rZXlzKGRhdGFbMF0pXG4gICAgICAgICAgICAgIH0pXG5cbiAgICB9XG4gIH07XG59KTsiLCJcbmFwcC5kaXJlY3RpdmUoJ252ZDNCYXJDaGFydCcsZnVuY3Rpb24oJHdpbmRvdyxwcm9qZWN0RGF0YUZhY3Rvcnkpe1xuICByZXR1cm57XG4gICAgcmVzdHJpY3QgOiAnRUEnLFxuICAgIHNjb3BlIDoge1xuICAgICAgYWlUaXRsZSAgOiAnQCcsXG4gICAgICBhaUluZm9Tb3VyY2UgOiAnQCcsXG4gICAgICBhaUluZm9UeXBlIDogJ0AnLFxuICAgICAgYWlIZWlnaHQ6J0AnLFxuICAgICAgYWlXaWR0aDonQCcsXG4gICAgICB5dmFsdWU6ICdAJyxcbiAgICAgIGxhYmVsOidAJyxcbiAgICAgIGtleTonQCdcbiAgICB9LFxuICAgIHRlbXBsYXRlVXJsIDogICdkaXJlY3RpdmVTdG9yZS9udmQzX2Jhcl9jaGFydC9udmQzX2Jhcl9jaGFydC5odG1sJyxcbiAgICAvL2NvbnRyb2xsZXIgOiBmdW5jdGlvbigkc2NvcGUsIGRhdGFGYWN0b3J5KXtcbiAgICAvLyRzY29wZS5kYXRhPWRhdGFGYWN0b3J5LmdldGRhdGEoJHNjb3BlLnNlY3Rpb25Mb2NhdGlvbiwkc2NvcGUuc2VjdGlvblR5cGUpO1xuICAgIC8vfSxcbiAgICBsaW5rIDogZnVuY3Rpb24oc2NvcGUsZWxlbSxhdHRyKXtcbiAgICAgIGNvbnN0IGQzID0gJHdpbmRvdy5kMztcblxuICAgICAgdmFyIGNvbnZlcnRUb1hZPSBmdW5jdGlvbihfZGF0YSxfa2V5LGxhYmVsLGZpZWxkKXtcbiAgICAgICAgICAgICAgdmFyIHRyYW5zZm9ybWVkPVtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICBrZXk6X2tleSxcbiAgICAgICAgICAgICAgICAgIHZhbHVlczogW11cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgICAgX2RhdGEuZm9yRWFjaChmdW5jdGlvbihyb3cpe1xuICAgICAgICAgICAgICAgICAgbGV0IG5ld1Jvdz0ge1xuICAgICAgICAgICAgICAgICAgICBcInhcIjpyb3dbbGFiZWxdLFxuICAgICAgICAgICAgICAgICAgICBcInlcIjpyb3dbZmllbGRdXG4gICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgIHRyYW5zZm9ybWVkWzBdLnZhbHVlcy5wdXNoKG5ld1Jvdyk7XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIHJldHVybiB0cmFuc2Zvcm1lZDtcbiAgICAgICAgICB9O1xuICAgICAgICBjb25zb2xlLmxvZygnd2hhdCBpcyBhaWluZm9zb3VyY2UgJyArIGF0dHIuYWlJbmZvU291cmNlKTtcblxuICAgICAgICBwcm9qZWN0RGF0YUZhY3RvcnkuZ2V0SW50ZXJuYWwoYXR0ci5haUluZm9Tb3VyY2UsJ2pzb24nKVxuICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihfZGF0YSl7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ19kYXRhIGlzICcgKyBfZGF0YSk7XG4gICAgICAgICAgICAgICAgX2RhdGE9Y29udmVydFRvWFkoX2RhdGEsYXR0ci5rZXksYXR0ci5sYWJlbCxhdHRyLnl2YWx1ZSk7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coX2RhdGEpO1xuICAgICAgICAgICAgICAgIHNjb3BlLmRhdGE9X2RhdGE7XG5cbiAgICAgICAgICAgICAgICAvLyBjaGFydC54QXhpcy5yb3RhdGVMYWJlbHMoLTQ1KTtcbiAgICAgICAgICAgICAgfSlcblxuICAgICAgICAgIHNjb3BlLm9wdGlvbnMgPSB7XG4gICAgICAgICAgICBjaGFydDoge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdkaXNjcmV0ZUJhckNoYXJ0JyxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IGF0dHIuYWlIZWlnaHQsXG4gICAgICAgICAgICAgICAgd2lkdGg6YXR0ci5haVdpZHRoLFxuICAgICAgICAgICAgICAgIGNvbG9yOiBkMy5zY2FsZS5jYXRlZ29yeTEwKCkucmFuZ2UoKSxcbiAgICAgICAgICAgICAgICByZWR1Y2V4dGlja3M6dHJ1ZSxcbiAgICAgICAgICAgICAgICBzaG93VmFsdWVzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiAzNTAsXG4gICAgICAgICAgICAgICAgcm90YXRlTGFiZWxzOi00NVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbiAgfTtcbn0pOyIsIlwidXNlIHN0cmljdFwiO1xuYXBwLmRpcmVjdGl2ZSgnZmxhcmVMYXJza290dGhvZmYnLCBmdW5jdGlvbigkd2luZG93LHByb2plY3REYXRhRmFjdG9yeSl7XG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3QgOiAnRUEnLFxuICAgIHNjb3BlIDoge1xuICAgICAgYWlUaXRsZSAgOiAnQCcsXG4gICAgICBhaUluZm9Tb3VyY2UgOiAnQCcsXG4gICAgICBhaVdpZHRoOiAnQCcsXG4gICAgICBhaUhlaWdodDonQCdcbiAgICB9LFxuICAgIHRlbXBsYXRlVXJsIDogICdkaXJlY3RpdmVTdG9yZS9mbGFyZV9sYXJza290dGhvZmYvZmxhcmVfbGFyc2tvdHRob2ZmLmh0bWwnLFxuICAgIGxpbmsgOiBmdW5jdGlvbihzY29wZSxlbGVtLGF0dHIpe1xuXG4gICAgICB2YXIgZDMgPSAkd2luZG93LmQzO1xuICAgICAgdmFyIHcgPSBhdHRyLmFpV2lkdGgsXG4gICAgICBoID0gYXR0ci5haUhlaWdodCxcbiAgICAgIGkgPSAwLFxuICAgICAgYmFySGVpZ2h0ID0gMjAsXG4gICAgICBiYXJXaWR0aCA9IHcgKiAxLFxuICAgICAgZHVyYXRpb24gPSA0MDAsXG4gICAgICByb290O1xuXG4gICAgICB2YXIgdHJlZSA9IGQzLmxheW91dC50cmVlKClcbiAgICAgICAgICAuc2l6ZShbaCwgMTAwXSk7XG5cbiAgICAgIHZhciBkaWFnb25hbCA9IGQzLnN2Zy5kaWFnb25hbCgpXG4gICAgICAgICAgLnByb2plY3Rpb24oZnVuY3Rpb24oZCkgeyByZXR1cm4gW2QueSwgZC54XTsgfSk7XG5cbiAgICAgIHZhciB2aXMgPSBkMy5zZWxlY3QoXCIjY2hhcnQ3XCIpLmFwcGVuZChcInN2ZzpzdmdcIilcbiAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIHcpXG4gICAgICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgaClcbiAgICAgICAgLmFwcGVuZChcInN2ZzpnXCIpXG4gICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoMjAsMzApXCIpO1xuXG4gICAgICBmdW5jdGlvbiBtb3ZlQ2hpbGRyZW4obm9kZSkge1xuICAgICAgICAgIGlmKG5vZGUuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgbm9kZS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGMpIHsgbW92ZUNoaWxkcmVuKGMpOyB9KTtcbiAgICAgICAgICAgICAgbm9kZS5fY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuO1xuICAgICAgICAgICAgICBub2RlLmNoaWxkcmVuID0gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHByb2plY3REYXRhRmFjdG9yeS5nZXRJbnRlcm5hbChhdHRyLmFpSW5mb1NvdXJjZSwnanNvbicpXG4gICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKF9kYXRhKXtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnZmxhcmUgZGF0YScsX2RhdGEpO1xuICAgICAgICAgICAgICAgIHNjb3BlLmRhdGE9X2RhdGE7XG4gICAgICAgICAgICAgICAgdmFyIGpzb249X2RhdGE7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGpzb247XG4gICAgfSlcbiAgICAudGhlbihmdW5jdGlvbihqc29uKXtcblxuICAgICAgICBqc29uLngwID0gMDtcbiAgICAgICAganNvbi55MCA9IDA7XG4gICAgICAgIG1vdmVDaGlsZHJlbihqc29uKTtcbiAgICAgICAgdXBkYXRlKHJvb3QgPSBqc29uKTtcbiAgICAgIH0pO1xuXG4gICAgICBmdW5jdGlvbiB1cGRhdGUoc291cmNlKSB7XG5cbiAgICAgICAgLy8gQ29tcHV0ZSB0aGUgZmxhdHRlbmVkIG5vZGUgbGlzdC4gVE9ETyB1c2UgZDMubGF5b3V0LmhpZXJhcmNoeS5cbiAgICAgICAgdmFyIG5vZGVzID0gdHJlZS5ub2Rlcyhyb290KTtcblxuICAgICAgICAvLyBDb21wdXRlIHRoZSBcImxheW91dFwiLlxuICAgICAgICBub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKG4sIGkpIHtcbiAgICAgICAgICBuLnggPSBpICogYmFySGVpZ2h0O1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBVcGRhdGUgdGhlIG5vZGVz4oCmXG4gICAgICAgIHZhciBub2RlID0gdmlzLnNlbGVjdEFsbChcImcubm9kZVwiKVxuICAgICAgICAgICAgLmRhdGEobm9kZXMsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuaWQgfHwgKGQuaWQgPSArK2kpOyB9KTtcblxuICAgICAgICB2YXIgbm9kZUVudGVyID0gbm9kZS5lbnRlcigpLmFwcGVuZChcInN2ZzpnXCIpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwibm9kZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gXCJ0cmFuc2xhdGUoXCIgKyBzb3VyY2UueTAgKyBcIixcIiArIHNvdXJjZS54MCArIFwiKVwiOyB9KVxuICAgICAgICAgICAgLnN0eWxlKFwib3BhY2l0eVwiLCAxZS02KTtcblxuICAgICAgICAvLyBFbnRlciBhbnkgbmV3IG5vZGVzIGF0IHRoZSBwYXJlbnQncyBwcmV2aW91cyBwb3NpdGlvbi5cbiAgICAgICAgbm9kZUVudGVyLmFwcGVuZChcInN2ZzpyZWN0XCIpXG4gICAgICAgICAgICAuYXR0cihcInlcIiwgLWJhckhlaWdodCAvIDIpXG4gICAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBiYXJIZWlnaHQpXG4gICAgICAgICAgICAuYXR0cihcIndpZHRoXCIsIGJhcldpZHRoKVxuICAgICAgICAgICAgLnN0eWxlKFwiZmlsbFwiLCBjb2xvcilcbiAgICAgICAgICAgIC5vbihcImNsaWNrXCIsIGNsaWNrKTtcblxuICAgICAgICBub2RlRW50ZXIuYXBwZW5kKFwic3ZnOnRleHRcIilcbiAgICAgICAgICAgIC5hdHRyKFwiZHlcIiwgMy41KVxuICAgICAgICAgICAgLmF0dHIoXCJkeFwiLCA1LjUpXG4gICAgICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLm5hbWU7IH0pXG4gICAgICAgICAgICAuYXR0cignc3R5bGUnLCdzdHJva2U6bm9uZTtmb250LWZhbWlseTogc2Fucy1zZXJpZjtsZXR0ZXItc3BhY2luZzogMjsnKTtcblxuICAgICAgICAvLyBUcmFuc2l0aW9uIG5vZGVzIHRvIHRoZWlyIG5ldyBwb3NpdGlvbi5cbiAgICAgICAgbm9kZUVudGVyLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgLmR1cmF0aW9uKGR1cmF0aW9uKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gXCJ0cmFuc2xhdGUoXCIgKyBkLnkgKyBcIixcIiArIGQueCArIFwiKVwiOyB9KVxuICAgICAgICAgICAgLnN0eWxlKFwib3BhY2l0eVwiLCAxKTtcblxuICAgICAgICBub2RlLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgLmR1cmF0aW9uKGR1cmF0aW9uKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gXCJ0cmFuc2xhdGUoXCIgKyBkLnkgKyBcIixcIiArIGQueCArIFwiKVwiOyB9KVxuICAgICAgICAgICAgLnN0eWxlKFwib3BhY2l0eVwiLCAxKVxuICAgICAgICAgIC5zZWxlY3QoXCJyZWN0XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJmaWxsXCIsIGNvbG9yKTtcblxuICAgICAgICAvLyBUcmFuc2l0aW9uIGV4aXRpbmcgbm9kZXMgdG8gdGhlIHBhcmVudCdzIG5ldyBwb3NpdGlvbi5cbiAgICAgICAgbm9kZS5leGl0KCkudHJhbnNpdGlvbigpXG4gICAgICAgICAgICAuZHVyYXRpb24oZHVyYXRpb24pXG4gICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBcInRyYW5zbGF0ZShcIiArIHNvdXJjZS55ICsgXCIsXCIgKyBzb3VyY2UueCArIFwiKVwiOyB9KVxuICAgICAgICAgICAgLnN0eWxlKFwib3BhY2l0eVwiLCAxZS02KVxuICAgICAgICAgICAgLnJlbW92ZSgpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSB0aGUgbGlua3PigKZcbiAgICAgICAgdmFyIGxpbmsgPSB2aXMuc2VsZWN0QWxsKFwicGF0aC5saW5rXCIpXG4gICAgICAgICAgICAuZGF0YSh0cmVlLmxpbmtzKG5vZGVzKSwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC50YXJnZXQuaWQ7IH0pO1xuXG4gICAgICAgIC8vIEVudGVyIGFueSBuZXcgbGlua3MgYXQgdGhlIHBhcmVudCdzIHByZXZpb3VzIHBvc2l0aW9uLlxuICAgICAgICBsaW5rLmVudGVyKCkuaW5zZXJ0KFwic3ZnOnBhdGhcIiwgXCJnXCIpXG4gICAgICAgICAgICAuYXR0cihcImNsYXNzXCIsIFwibGlua1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJkXCIsIGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICAgICAgdmFyIG8gPSB7eDogc291cmNlLngwLCB5OiBzb3VyY2UueTB9O1xuICAgICAgICAgICAgICByZXR1cm4gZGlhZ29uYWwoe3NvdXJjZTogbywgdGFyZ2V0OiBvfSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgIC50cmFuc2l0aW9uKClcbiAgICAgICAgICAgIC5kdXJhdGlvbihkdXJhdGlvbilcbiAgICAgICAgICAgIC5hdHRyKFwiZFwiLCBkaWFnb25hbCk7XG5cbiAgICAgICAgLy8gVHJhbnNpdGlvbiBsaW5rcyB0byB0aGVpciBuZXcgcG9zaXRpb24uXG4gICAgICAgIGxpbmsudHJhbnNpdGlvbigpXG4gICAgICAgICAgICAuZHVyYXRpb24oZHVyYXRpb24pXG4gICAgICAgICAgICAuYXR0cihcImRcIiwgZGlhZ29uYWwpO1xuXG4gICAgICAgIC8vIFRyYW5zaXRpb24gZXhpdGluZyBub2RlcyB0byB0aGUgcGFyZW50J3MgbmV3IHBvc2l0aW9uLlxuICAgICAgICBsaW5rLmV4aXQoKS50cmFuc2l0aW9uKClcbiAgICAgICAgICAgIC5kdXJhdGlvbihkdXJhdGlvbilcbiAgICAgICAgICAgIC5hdHRyKFwiZFwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgIHZhciBvID0ge3g6IHNvdXJjZS54LCB5OiBzb3VyY2UueX07XG4gICAgICAgICAgICAgIHJldHVybiBkaWFnb25hbCh7c291cmNlOiBvLCB0YXJnZXQ6IG99KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAucmVtb3ZlKCk7XG5cbiAgICAgICAgLy8gU3Rhc2ggdGhlIG9sZCBwb3NpdGlvbnMgZm9yIHRyYW5zaXRpb24uXG4gICAgICAgIG5vZGVzLmZvckVhY2goZnVuY3Rpb24oZCkge1xuICAgICAgICAgIGQueDAgPSBkLng7XG4gICAgICAgICAgZC55MCA9IGQueTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFRvZ2dsZSBjaGlsZHJlbiBvbiBjbGljay5cbiAgICAgIGZ1bmN0aW9uIGNsaWNrKGQpIHtcbiAgICAgICAgaWYgKGQuY2hpbGRyZW4pIHtcbiAgICAgICAgICBkLl9jaGlsZHJlbiA9IGQuY2hpbGRyZW47XG4gICAgICAgICAgZC5jaGlsZHJlbiA9IG51bGw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZC5jaGlsZHJlbiA9IGQuX2NoaWxkcmVuO1xuICAgICAgICAgIGQuX2NoaWxkcmVuID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB1cGRhdGUoZCk7XG4gICAgICB9XG5cbiAgICAgIGZ1bmN0aW9uIGNvbG9yKGQpIHtcbiAgICAgICAgcmV0dXJuIGQuX2NoaWxkcmVuID8gXCIjMzE4MmJkXCIgOiBkLmNoaWxkcmVuID8gXCIjYzZkYmVmXCIgOiBcIiNmZDhkM2NcIjtcbiAgICAgIH1cbiAgIH1cbiAgfTtcbn0pOyIsIlxuXG5hcHAuZGlyZWN0aXZlKCdwaWVHcmFwaFRleHR1cmVzJywgZnVuY3Rpb24oJHdpbmRvdykge1xuXG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6ICdFJyxcbiAgICB0ZW1wbGF0ZVVybDogJ2RpcmVjdGl2ZVN0b3JlL3BpZV9ncmFwaF90ZXh0dXJlcy9waWVfZ3JhcGhfdGV4dHVyZXMuaHRtbCcsXG4gICAgc2NvcGU6IHtcbiAgICAgIGFpVGl0bGUgIDogJ0AnLFxuICAgICAgYWlXaWR0aDonQCcsXG4gICAgICBhaUhlaWdodDonQCcsXG4gICAgICBhaVJhZGl1czonQCcsXG4gICAgICBsYWJlbDE6J0AnLFxuICAgICAgdmFsdWUxOidAJyxcbiAgICAgIGxhYmVsMjonQCcsXG4gICAgICB2YWx1ZTI6J0AnLFxuICAgICAgbGFiZWwzOidAJyxcbiAgICAgIHZhbHVlMzonQCcsXG4gICAgICBsYWJlbDQ6J0AnLFxuICAgICAgdmFsdWU0OidAJyxcbiAgICAgIGxhYmVsNTonQCcsXG4gICAgICB2YWx1ZTU6J0AnLFxuICAgICAgbGFiZWw2OidAJyxcbiAgICAgIHZhbHVlNjonQCdcblxuICAgIH0sXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW0sIGF0dHIpIHtcbiAgICAgIHZhciBkMyA9ICR3aW5kb3cuZDM7XG4gICAgICB2YXIgd2lkdGggPSBhdHRyLmFpV2lkdGggfHwgNDAwO1xuICAgICAgdmFyIGhlaWdodCA9IGF0dHIuYWlIZWlnaHQgfHwgNDAwO1xuICAgICAgdmFyIHJhZGl1cyA9IGF0dHIuYWlSYWRpdXMgfHwgMjAwO1xuICAgICAgdmFyIGNvbG9ycyA9IGF0dHIuY29sb3JzIHx8IGQzLnNjYWxlLmNhdGVnb3J5MTAoKTsgLy8gY29tZSBiYWNrIHRvIHRoaXMhXG4gICAgICB2YXIgcGllZGF0YSA9W107XG5cbiAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgOTsgaSsrKSB7XG4gICAgICAgIGxldCBsYWJlbFN0cmluZz0gXCJsYWJlbFwiK2k7XG4gICAgICAgIGxldCB2YWx1ZVN0cmluZyA9IFwidmFsdWVcIitpO1xuICAgICAgICBpZihhdHRyW2xhYmVsU3RyaW5nXSAmJiBhdHRyW3ZhbHVlU3RyaW5nXSAmJiBhdHRyW2xhYmVsU3RyaW5nXSE9XCJ1bmRlZmluZWRcIiAmJiBhdHRyW3ZhbHVlU3RyaW5nXSE9XCJ1bmRlZmluZWRcIil7XG4gICAgICAgICAgbGV0IF9sYWJlbD1hdHRyW2xhYmVsU3RyaW5nXTtcbiAgICAgICAgICBsZXQgX3ZhbHVlPWF0dHJbdmFsdWVTdHJpbmddO1xuICAgICAgICAgIHBpZWRhdGEucHVzaCh7XCJsYWJlbFwiOl9sYWJlbCxcInZhbHVlXCI6X3ZhbHVlfSlcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIHZhciBwaWUgPSBkMy5sYXlvdXQucGllKClcbiAgICAgICAgLnZhbHVlKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICByZXR1cm4gZC52YWx1ZTtcbiAgICAgICAgfSlcblxuICAgICAgdmFyIGFyYyA9IGQzLnN2Zy5hcmMoKVxuICAgICAgICAub3V0ZXJSYWRpdXMocmFkaXVzKVxuXG4gICAgLy92YXIgdCA9IHRleHR1cmVzLmNpcmNsZXMoKTtcblxuICAgIHZhciBzdmcgPSBkMy5zZWxlY3QoXCIjaGVsbG9cIilcbiAgICAgIC5hcHBlbmQoXCJzdmdcIilcbiAgICAgIC5hdHRyKFwid2lkdGhcIiwyMDApXG4gICAgICAuYXR0cihcImhlaWdodFwiLDIwMClcblxuICAgIHZhciB0ID0gdGV4dHVyZXMuY2lyY2xlcygpXG4gICAgICAgICAgICAucmFkaXVzKDQpXG4gICAgICAgICAgICAuZmlsbChcInRyYW5zcGFyZW50XCIpXG4gICAgICAgICAgICAuc3Ryb2tlV2lkdGgoMik7XG5cbiAgICBzdmcuY2FsbCh0KTtcblxuICAgIHN2Zy5hcHBlbmQoXCJyZWN0XCIpXG4gICAgICAgIC5hdHRyKCd5Jyw1MClcbiAgICAgICAgLmF0dHIoJ3gnLDUwKVxuICAgICAgICAuYXR0cignd2lkdGgnLDUwKVxuICAgICAgICAuYXR0cignaGVpZ2h0JywyMClcbiAgICAgICAgLnN0eWxlKFwic3Ryb2tlXCIsIFwiYmx1ZVwiKVxuICAgICAgLnN0eWxlKFwiZmlsbFwiLCB0LnVybCgpKTtcblxuXG4gICAgICB2YXIgbXlDaGFydCA9IGQzLnNlbGVjdCgnI3BpZS1jaGFydC10ZXh0dXJlcycpLmFwcGVuZCgnc3ZnJylcbiAgICAgICAgLmF0dHIoJ3dpZHRoJywgd2lkdGgpXG4gICAgICAgIC5hdHRyKCdoZWlnaHQnLCBoZWlnaHQpXG4gICAgICAgIC5hcHBlbmQoJ2cnKVxuICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgKHdpZHRoIC0gcmFkaXVzKSArICcsJyArIChoZWlnaHQgLSByYWRpdXMpICsgJyknKVxuICAgICAgICAuc2VsZWN0QWxsKCdwYXRoJykuZGF0YShwaWUocGllZGF0YSkpIC8vcmV0dXJucyBhbiBhcnJheSBvZiBhcmNzXG4gICAgICAgIC5lbnRlcigpLmFwcGVuZCgnZycpXG4gICAgICAgIC5hdHRyKCdjbGFzcycsICdzbGljZScpXG5cbiAgICAgICAgbXlDaGFydC5jYWxsKHQpO1xuXG4gICAgICB2YXIgc2xpY2VzID0gZDMuc2VsZWN0QWxsKCdnLnNsaWNlJylcbiAgICAgICAgLmFwcGVuZCgncGF0aCcpXG4gICAgICAgIC8vIC5hdHRyKCdmaWxsJywgZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICAvLyAgIGxldCBjPWNvbG9ycyhpKVxuICAgICAgICAvLyAgIGNvbnNvbGUubG9nKGMpO1xuICAgICAgICAvLyAgIHJldHVybiB0LnN0cm9rZShjKTtcbiAgICAgICAgLy8gfSlcbiAgICAgICAgLnN0eWxlKCdzdHJva2UnLCBmdW5jdGlvbihkLGkpe1xuICAgICAgICAgIHJldHVybiBjb2xvcnMoaSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5zdHlsZShcImZpbGxcIiwgdC51cmwoKSlcblxuICAgICAgICAuYXR0cignZCcsIGFyYykgLy8gcGFzc2luZyBpbiB0aGUgYXJjIGZ1bmN0aW9uXG5cbiAgICAgIHZhciB0ZXh0ID0gZDMuc2VsZWN0QWxsKCdnLnNsaWNlJylcbiAgICAgICAgLmFwcGVuZCgndGV4dCcpXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgICAvL2RhdGEgb2JqZWN0Li5cbiAgICAgICAgICByZXR1cm4gZC5kYXRhLmxhYmVsO1xuICAgICAgICB9KVxuICAgICAgICAuYXR0cigndGV4dC1hbmNob3InLCAnbWlkZGxlJylcbiAgICAgICAgLmF0dHIoJ2ZpbGwnLCAnYmxhY2snKVxuICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24oZCkge1xuICAgICAgICAgIGQuaW5uZXJSYWRpdXMgPSAwO1xuICAgICAgICAgIGQub3V0ZXJSYWRpdXMgPSByYWRpdXM7XG4gICAgICAgICAgcmV0dXJuICd0cmFuc2xhdGUoJyArIGFyYy5jZW50cm9pZChkKSArICcpJ1xuXG4gICAgICAgIH0pXG4gICAgfVxuICB9XG59KTsiLCJcbmFwcC5kaXJlY3RpdmUoJ252ZDNTY2F0dGVyQ2hhcnQnLGZ1bmN0aW9uKHByb2plY3REYXRhRmFjdG9yeSl7XG4gIHJldHVybntcbiAgICByZXN0cmljdCA6ICdFQScsXG4gICAgc2NvcGUgOiB7XG4gICAgICBhaVRpdGxlICA6ICdAJyxcbiAgICAgIGFpSW5mb1NvdXJjZSA6ICdAJyxcbiAgICAgIGFpSW5mb1R5cGUgOiAnQCcsXG4gICAgICBhaUhlaWdodDonQCcsXG4gICAgICB4dmFsdWU6ICdAJyxcbiAgICAgIHl2YWx1ZTonQCcsXG4gICAgICBzaXplOidAJyxcbiAgICAgIGxhYmVsOidAJ1xuICAgIH0sXG4gICAgdGVtcGxhdGVVcmwgOiAgJ2RpcmVjdGl2ZVN0b3JlL252ZDNfc2NhdHRlcl9jaGFydC9udmQzX3NjYXR0ZXJfY2hhcnQuaHRtbCcsXG4gICAgLy9jb250cm9sbGVyIDogZnVuY3Rpb24oJHNjb3BlLCBkYXRhRmFjdG9yeSl7XG4gICAgLy8kc2NvcGUuZGF0YT1kYXRhRmFjdG9yeS5nZXRkYXRhKCRzY29wZS5zZWN0aW9uTG9jYXRpb24sJHNjb3BlLnNlY3Rpb25UeXBlKTtcbiAgICAvL30sXG4gICAgbGluayA6IGZ1bmN0aW9uKHNjb3BlLGVsZW0sYXR0cil7XG5cbiAgICAgICAgICB2YXIgY29udmVydFRvWFk9IGZ1bmN0aW9uKF9kYXRhLHhfdmFsdWUseV92YWx1ZSxzaXplLGdyb3VwX2ZpZWxkKXtcbiAgICAgICAgICAgICAgdmFyIHRyYW5zZm9ybWVkPVtdO1xuICAgICAgICAgICAgICB2YXIgdW5pcXVlX2dyb3Vwcz1bXTtcblxuICAgICAgICAgICAgICBfZGF0YS5mb3JFYWNoKGZ1bmN0aW9uKHJvdyl7XG4gICAgICAgICAgICAgICAgICBsZXQgbmV3Um93PSB7XG4gICAgICAgICAgICAgICAgICAgIFwieFwiOnJvd1t4X3ZhbHVlXSxcbiAgICAgICAgICAgICAgICAgICAgXCJ5XCI6cm93W3lfdmFsdWVdLFxuICAgICAgICAgICAgICAgICAgICBcInNpemVcIjpyb3dbc2l6ZV1cbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGxldCBncm91cEluZGV4PXVuaXF1ZV9ncm91cHMuaW5kZXhPZihyb3dbZ3JvdXBfZmllbGRdKTtcblxuICAgICAgICAgICAgICAgICAgaWYoIGdyb3VwSW5kZXggPT09LTEgKXtcbiAgICAgICAgICAgICAgICAgICAgdW5pcXVlX2dyb3Vwcy5wdXNoKHJvd1tncm91cF9maWVsZF0pO1xuXG4gICAgICAgICAgICAgICAgICAgIHRyYW5zZm9ybWVkLnB1c2goXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICBcImtleVwiOnJvd1tncm91cF9maWVsZF0sXG4gICAgICAgICAgICAgICAgICAgICAgXCJ2YWx1ZXNcIjpbbmV3Um93XVxuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChncm91cEluZGV4ID4gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtZWRbZ3JvdXBJbmRleF0udmFsdWVzLnB1c2gobmV3Um93KVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICByZXR1cm4gdHJhbnNmb3JtZWQ7XG4gICAgICAgICAgfTtcblxuICAgICAgICBwcm9qZWN0RGF0YUZhY3RvcnkuZ2V0SW50ZXJuYWwoYXR0ci5haUluZm9Tb3VyY2UsJ2pzb24nKVxuICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgICAgICAgICBzY29wZS5kYXRhPWNvbnZlcnRUb1hZKGRhdGEsYXR0ci54dmFsdWUsYXR0ci55dmFsdWUsYXR0ci5zaXplLGF0dHIubGFiZWwpO1xuICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgc2NvcGUub3B0aW9ucyA9IHtcbiAgICAgICAgICAgIGNoYXJ0OiB7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3NjYXR0ZXJDaGFydCcsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBhdHRyLmFpSGVpZ2h0LFxuICAgICAgICAgICAgICAgIGNvbG9yOiBkMy5zY2FsZS5jYXRlZ29yeTEwKCkucmFuZ2UoKSxcbiAgICAgICAgICAgICAgICBzY2F0dGVyOiB7XG4gICAgICAgICAgICAgICAgICAgIG9ubHlDaXJjbGVzOiB0cnVlXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBzaG93RGlzdFg6IHRydWUsXG4gICAgICAgICAgICAgICAgc2hvd0Rpc3RZOiB0cnVlLFxuICAgICAgICAgICAgICAgIHRvb2x0aXBDb250ZW50OiBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICc8aDM+JyArIGtleSArICc8L2gzPic7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogMzUwLFxuICAgICAgICAgICAgICAgIHhBeGlzOiB7XG4gICAgICAgICAgICAgICAgICAgIGF4aXNMYWJlbDogYXR0ci54dmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHRpY2tGb3JtYXQ6IGZ1bmN0aW9uKGQpe1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGQzLmZvcm1hdCgnLjAyZicpKGQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB5QXhpczoge1xuICAgICAgICAgICAgICAgICAgICBheGlzTGFiZWw6IGF0dHIueXZhbHVlLFxuICAgICAgICAgICAgICAgICAgICB0aWNrRm9ybWF0OiBmdW5jdGlvbihkKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkMy5mb3JtYXQoJy4wMmYnKShkKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgYXhpc0xhYmVsRGlzdGFuY2U6IC01XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB6b29tOiB7XG4gICAgICAgICAgICAgICAgICAgIC8vTk9URTogQWxsIGF0dHJpYnV0ZXMgYmVsb3cgYXJlIG9wdGlvbmFsXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBzY2FsZUV4dGVudDogWzEsIDEwXSxcbiAgICAgICAgICAgICAgICAgICAgdXNlRml4ZWREb21haW46IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB1c2VOaWNlU2NhbGU6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBob3Jpem9udGFsT2ZmOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgdmVydGljYWxPZmY6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICB1bnpvb21FdmVudFR5cGU6ICdkYmxjbGljay56b29tJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG4gIH07XG59KTsiLCJcblxuYXBwLmRpcmVjdGl2ZSgncGllR3JhcGhVc2VySW5wdXQnLCBmdW5jdGlvbigkd2luZG93KSB7XG5cbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHRlbXBsYXRlVXJsOiAnZGlyZWN0aXZlU3RvcmUvcGllX2dyYXBoX3VzZXJfaW5wdXQvcGllX2dyYXBoX3VzZXJfaW5wdXQuaHRtbCcsXG4gICAgc2NvcGU6IHtcbiAgICAgIGFpVGl0bGUgIDogJ0AnLFxuICAgICAgYWlXaWR0aDonQCcsXG4gICAgICBhaUhlaWdodDonQCcsXG4gICAgICBhaVJhZGl1czonQCcsXG4gICAgICBsYWJlbDE6J0AnLFxuICAgICAgdmFsdWUxOidAJyxcbiAgICAgIGxhYmVsMjonQCcsXG4gICAgICB2YWx1ZTI6J0AnLFxuICAgICAgbGFiZWwzOidAJyxcbiAgICAgIHZhbHVlMzonQCcsXG4gICAgICBsYWJlbDQ6J0AnLFxuICAgICAgdmFsdWU0OidAJyxcbiAgICAgIGxhYmVsNTonQCcsXG4gICAgICB2YWx1ZTU6J0AnLFxuICAgICAgbGFiZWw2OidAJyxcbiAgICAgIHZhbHVlNjonQCcsXG4gICAgICBsYWJlbDc6J0AnLFxuICAgICAgdmFsdWU3OidAJyxcbiAgICAgIGxhYmVsODonQCcsXG4gICAgICB2YWx1ZTg6J0AnXG5cbiAgICB9LFxuICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtLCBhdHRyKSB7XG4gICAgICB2YXIgZDMgPSAkd2luZG93LmQzO1xuICAgICAgdmFyIHdpZHRoID0gYXR0ci5haVdpZHRoIHx8IDQwMDtcbiAgICAgIHZhciBoZWlnaHQgPSBhdHRyLmFpSGVpZ2h0IHx8IDQwMDtcbiAgICAgIHZhciByYWRpdXMgPSBhdHRyLmFpUmFkaXVzIHx8IDIwMDtcbiAgICAgIHZhciBjb2xvcnMgPSBhdHRyLmNvbG9ycyB8fCBkMy5zY2FsZS5jYXRlZ29yeTEwKCk7IC8vIGNvbWUgYmFjayB0byB0aGlzIVxuICAgICAgdmFyIHBpZWRhdGEgPVtdO1xuXG4gICAgICBmb3IgKHZhciBpID0gMTsgaSA8IDk7IGkrKykge1xuICAgICAgICBsZXQgbGFiZWxTdHJpbmc9IFwibGFiZWxcIitpO1xuICAgICAgICBsZXQgdmFsdWVTdHJpbmcgPSBcInZhbHVlXCIraTtcbiAgICAgICAgaWYoYXR0cltsYWJlbFN0cmluZ10gJiYgYXR0clt2YWx1ZVN0cmluZ10gJiYgYXR0cltsYWJlbFN0cmluZ10hPVwidW5kZWZpbmVkXCIgJiYgYXR0clt2YWx1ZVN0cmluZ10hPVwidW5kZWZpbmVkXCIpe1xuICAgICAgICAgIGxldCBfbGFiZWw9YXR0cltsYWJlbFN0cmluZ107XG4gICAgICAgICAgbGV0IF92YWx1ZT1hdHRyW3ZhbHVlU3RyaW5nXTtcbiAgICAgICAgICBwaWVkYXRhLnB1c2goe1wibGFiZWxcIjpfbGFiZWwsXCJ2YWx1ZVwiOl92YWx1ZX0pXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICB2YXIgcGllID0gZDMubGF5b3V0LnBpZSgpXG4gICAgICAgIC52YWx1ZShmdW5jdGlvbihkKSB7XG4gICAgICAgICAgcmV0dXJuIGQudmFsdWU7XG4gICAgICAgIH0pXG5cbiAgICAgIHZhciBhcmMgPSBkMy5zdmcuYXJjKClcbiAgICAgICAgLm91dGVyUmFkaXVzKHJhZGl1cylcblxuICAgICAgdmFyIG15Q2hhcnQgPSBkMy5zZWxlY3QoJyNwaWUtY2hhcnQnKS5hcHBlbmQoJ3N2ZycpXG4gICAgICAgIC5hdHRyKCd3aWR0aCcsIHdpZHRoKVxuICAgICAgICAuYXR0cignaGVpZ2h0JywgaGVpZ2h0KVxuICAgICAgICAuYXBwZW5kKCdnJylcbiAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArICh3aWR0aCAtIHJhZGl1cykgKyAnLCcgKyAoaGVpZ2h0IC0gcmFkaXVzKSArICcpJylcbiAgICAgICAgLnNlbGVjdEFsbCgncGF0aCcpLmRhdGEocGllKHBpZWRhdGEpKSAvL3JldHVybnMgYW4gYXJyYXkgb2YgYXJjc1xuICAgICAgICAuZW50ZXIoKS5hcHBlbmQoJ2cnKVxuICAgICAgICAuYXR0cignY2xhc3MnLCAnc2xpY2UnKVxuXG4gICAgICB2YXIgc2xpY2VzID0gZDMuc2VsZWN0QWxsKCdnLnNsaWNlJylcbiAgICAgICAgLmFwcGVuZCgncGF0aCcpXG4gICAgICAgIC5hdHRyKCdmaWxsJywgZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICAgIHJldHVybiBjb2xvcnMoaSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5hdHRyKCdkJywgYXJjKSAvLyBwYXNzaW5nIGluIHRoZSBhcmMgZnVuY3Rpb25cblxuICAgICAgdmFyIHRleHQgPSBkMy5zZWxlY3RBbGwoJ2cuc2xpY2UnKVxuICAgICAgICAuYXBwZW5kKCd0ZXh0JylcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICAgIC8vZGF0YSBvYmplY3QuLlxuICAgICAgICAgIHJldHVybiBkLmRhdGEubGFiZWw7XG4gICAgICAgIH0pXG4gICAgICAgIC5hdHRyKCd0ZXh0LWFuY2hvcicsICdtaWRkbGUnKVxuICAgICAgICAuYXR0cignZmlsbCcsICd3aGl0ZScpXG4gICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgZC5pbm5lclJhZGl1cyA9IDA7XG4gICAgICAgICAgZC5vdXRlclJhZGl1cyA9IHJhZGl1cztcbiAgICAgICAgICByZXR1cm4gJ3RyYW5zbGF0ZSgnICsgYXJjLmNlbnRyb2lkKGQpICsgJyknXG5cbiAgICAgICAgfSlcbiAgICB9XG4gIH1cbn0pOyIsImFwcC5kaXJlY3RpdmUoJ3RpdGxlU3VidGl0bGUnLGZ1bmN0aW9uKCl7XG4gIHJldHVybntcbiAgICByZXN0cmljdCA6ICdFQScsXG4gICAgc2NvcGUgOiB7XG4gICAgICBhaVRpdGxlICA6ICdAJyxcbiAgICAgIGFpU3VidGl0bGUgOiAnQCdcbiAgICB9LFxuICAgIHRlbXBsYXRlVXJsIDogICdkaXJlY3RpdmVTdG9yZS90aXRsZV9zdWJ0aXRsZS90aXRsZV9zdWJ0aXRsZS5odG1sJyxcbiAgICBsaW5rIDogZnVuY3Rpb24oc2NvcGUsZWxlbSxhdHRyKXtcblxuICAgICAgIH0sXG4gICAgfVxufSk7IiwiXG4vLyB0aGUgZmFjdG9yeSBtdXN0IGJlIG5hbWVkIGxpa2UgdGhpcyBkaXJlY3RpdmVOYW1lX0ZhY3RvcnlcbmFwcC5mYWN0b3J5KCdzb2xvVGFibGVfRmFjdG9yeScsZnVuY3Rpb24oJGh0dHApe1xuICByZXR1cm57XG4gICAvLyB0aGlzIHJlcHJlc2VudHMgdGhlIHJlc3VsdCBvZiBvcGVuaW5nIGEgY3N2IGZpbGUgdHVybmluZyBpdCBpbnRvIGEganNvbiBhcnJheSBvZiBvYmplY3RzXG4gICAvLyBhbGwgZmFjdG9yeSBmdW5jdGlvbiBtdXN0IGJlIGEgcHJvbWlzZSB0byBzdGFuZGFyZGl6ZSB0aGUgaW50ZXJmYWNlXG4gICAgZ2V0ZGF0YSA6ICBmdW5jdGlvbihkYXRhU291cmNlTG9jYXRpb24sZGF0YVNvdXJjZVR5cGUpe1xuICAgICAvLyBhbGVydCAoZGF0YVNvdXJjZVR5cGUpO1xuICAgICAgaWYoZGF0YVNvdXJjZVR5cGUgPT09ICdmaWxlJyl7XG4gICAgICAvLyBwdXQgbm9kZSBmcyBhc3luY29wZW5cbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICB7Zmlyc3RuYW1lOidmaXJzdCBuYW1lJywgbGFzdG5hbWU6J2xhc3QgbmFtZScsIGFnZSA6ICdhZ2UnfSxcbiAgICAgICAgICB7Zmlyc3RuYW1lOidKb2huJywgbGFzdG5hbWU6J0RvZScsIGFnZSA6ICcyMid9LFxuICAgICAgICAgIHtmaXJzdG5hbWU6J0JhcnQnLCBsYXN0bmFtZTonU2ltc29uJywgYWdlIDogJzEwJ30sXG4gICAgICAgICAge2ZpcnN0bmFtZTonRG9uYWxkJywgbGFzdG5hbWU6J1RydW1wJywgYWdlIDogJ0RpY2snfVxuICAgICAgICBdO1xuICAgICAgfWVsc2UgaWYoZGF0YVNvdXJjZVR5cGUgPT09ICd3ZWJzaXRlJyl7XG4gICAgICAgICAgcmV0dXJuICRodHRwLmdldChkYXRhU291cmNlTG9jYXRpb24pO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbn0pO1xuLy8geW91IG11c3QgYXBwbHkgZm9yIGEgZGlyZWN0aXZlbmFtZSAoaXQgY291bGQgYmUgaW4gdXNlKVxuYXBwLmRpcmVjdGl2ZSgnc29sb1RhYmxlJyxmdW5jdGlvbihzb2xvVGFibGVfRmFjdG9yeSl7XG4gIHJldHVybntcbiAgICByZXN0cmljdCA6ICdFQScsXG4gICAgc2NvcGUgOiB7XG4gICAgICBzb2xvVGFibGVUaXRsZSAgOiAnQCcsXG4gICAgICBzb2xvVGFibGVJbmZvU291cmNlIDogJ0AnLFxuICAgICAgc29sb1RhYmxlSW5mb1R5cGUgOiAnQCcsXG4gICAgfSxcbiAgICB0ZW1wbGF0ZVVybCA6ICAnZGlyZWN0aXZlU3RvcmUvc29sb190YWJsZS9zb2xvX3RhYmxlLmh0bWwnLFxuICAgIC8vY29udHJvbGxlciA6IGZ1bmN0aW9uKCRzY29wZSwgZGF0YUZhY3Rvcnkpe1xuICAgIC8vJHNjb3BlLmRhdGE9ZGF0YUZhY3RvcnkuZ2V0ZGF0YSgkc2NvcGUuc2VjdGlvbkxvY2F0aW9uLCRzY29wZS5zZWN0aW9uVHlwZSk7XG4gICAgLy99LFxuICAgIGxpbmsgOiBmdW5jdGlvbihzY29wZSxlbGVtLGF0dHIpe1xuICAgICAgLy8gdGhlIGxpbmsgZnVuY3Rpb24gaXMgZ29pbmcgdG8gdGFrZSBhbGwgZGF0YSByZXF1ZXN0cyBhbmQgcHV0IHRoZW0gaW4gYW4gYXJyYXkgb2YgcHJvbWlzc2VzXG4gICAgICAvLyAgZm9yKHZhciBpPTA7aTwgYS5sZW5ndGg7aSsrOyl7XG4gICAgICAgICAgLy9pZihhW2ldLmluZGV4T2Yoc2VjdGlvbkxvY2F0aW9uKSlcbiAgICAgICAgIC8vIHNjb3BlLmFpVGl0bGU9YXR0ci5haUluZm9UeXBlXG4gICAgICAgICAgc2NvcGUuZGF0YT1zb2xvVGFibGVfRmFjdG9yeS5nZXRkYXRhKGF0dHIuc29sb1RhYmxlSW5mb1NvdXJjZSxhdHRyLnNvbG9UYWJsZUluZm9UeXBlKTtcblxuICAgICAgLy8gIH1cbiAgICB9XG4gIH07XG59KTsiLCJhcHAuZGlyZWN0aXZlKCd1c2VyUHJvZmlsZScsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0OiAnRUEnLFxuICAgIHNjb3BlOiB7XG4gICAgICBhaUhlaWdodDogJ0AnLFxuICAgICAgYWlXaWR0aDogJ0AnLFxuICAgICAgYWlJbWdVcmw6ICdAJyxcbiAgICAgIHJvdW5kOidAJyxcbiAgICAgIGFpTmFtZTonQCcsXG4gICAgICBhaVRpdGxlOidAJyxcbiAgICAgIGFpUHJvZmlsZTonQCdcbiAgICB9LFxuICAgIHRlbXBsYXRlVXJsOiAnZGlyZWN0aXZlU3RvcmUvdXNlcl9wcm9maWxlL3VzZXJfcHJvZmlsZS5odG1sJyxcbiAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbSwgYXR0cikge1xuXG4gICAgICBsZXQgcm91bmQ9YXR0ci5yb3VuZDtcblxuICAgICAgc2NvcGUucHJvZiA9IHt9O1xuXG4gICAgICBzY29wZS5wcm9mLmltYWdlID0ge1xuICAgICAgICBcImhlaWdodFwiOiBhdHRyLmFpSGVpZ2h0LFxuICAgICAgICBcIndpZHRoXCI6IGF0dHIuYWlXaWR0aCxcbiAgICAgICAgXCJzcmNcIjogYXR0ci5haUltZ1VybFxuICAgICAgfTtcblxuICAgICAgaWYocm91bmQ9PT1cInRydWVcIil7XG4gICAgICAgIHNjb3BlLnByb2YuaW1hZ2VbXCJyb3VuZFwiXT1cImJvcmRlci1yYWRpdXM6MTAwJVwiO1xuICAgICAgfTtcbiAgICB9LFxuICB9XG59KTsiLCJcInVzZSBzdHJpY3RcIjtcbmFwcC5kaXJlY3RpdmUoJ3ZlcnRGbGFyZScsIGZ1bmN0aW9uKCR3aW5kb3cscHJvamVjdERhdGFGYWN0b3J5KXtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdCA6ICdFQScsXG4gICAgc2NvcGUgOiB7XG4gICAgICBhaVRpdGxlICA6ICdAJyxcbiAgICAgIGFpSW5mb1NvdXJjZSA6ICdAJyxcbiAgICAgIGFpV2lkdGg6ICdAJyxcbiAgICAgIGFpSGVpZ2h0OidAJ1xuICAgIH0sXG4gICAgIHRlbXBsYXRlVXJsIDogICdkaXJlY3RpdmVTdG9yZS92ZXJ0X2ZsYXJlL3ZlcnRfZmxhcmUuaHRtbCcsXG4gICAgIGxpbmsgOiBmdW5jdGlvbihzY29wZSxlbGVtLGF0dHIpe1xuICAgICAgICB2YXIgZDMgPSAkd2luZG93LmQzO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKGF0dHIuYWlJbmZvU291cmNlKTsgLy8gbWF5YmUgbWFrZSB0aGUgY2hhcnQgaWQgb3V0IG9mIHRoaXM/XG5cbiAgICAgICAgcHJvamVjdERhdGFGYWN0b3J5LmdldEludGVybmFsKGF0dHIuYWlJbmZvU291cmNlLCdqc29uJylcbiAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24oX2RhdGEpe1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdmbGFyZSBkYXRhJyxfZGF0YSk7XG4gICAgICAgICAgICAgICAgc2NvcGUuZGF0YT1fZGF0YTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBfZGF0YVxuICAgICAgICB9KS50aGVuKGZ1bmN0aW9uKF9kYXRhKXtcblxuICAgICAgICAgIGNvbnNvbGUubG9nKF9kYXRhKVxuXG4gICAgICB2YXIgbWFyZ2luID0ge3RvcDogMjAsIHJpZ2h0OiAyMCwgYm90dG9tOiAyMCwgbGVmdDogMjB9LFxuICAgICAgICAgIHdpZHRoID0gYXR0ci5haVdpZHRoIC0gbWFyZ2luLnJpZ2h0IC0gbWFyZ2luLmxlZnQsXG4gICAgICAgICAgaGVpZ2h0ID0gYXR0ci5haUhlaWdodCAtIG1hcmdpbi50b3AgLSBtYXJnaW4uYm90dG9tO1xuXG4gICAgICB2YXIgaSA9IDAsXG4gICAgICAgICAgZHVyYXRpb24gPSA3NTAsXG4gICAgICAgICAgcm9vdDtcblxuICAgICAgdmFyIHRyZWUgPSBkMy5sYXlvdXQudHJlZSgpXG4gICAgICAgICAgLnNpemUoW2hlaWdodCwgd2lkdGhdKTtcblxuICAgICAgdmFyIGRpYWdvbmFsID0gZDMuc3ZnLmRpYWdvbmFsKClcbiAgICAgICAgICAucHJvamVjdGlvbihmdW5jdGlvbihkKSB7IHJldHVybiBbZC54LCBkLnldOyB9KTtcblxuICAgICAgdmFyIHN2ZyA9IGQzLnNlbGVjdChcIiNjaGFydDEwXCIpLmFwcGVuZChcInN2Z1wiKVxuICAgICAgICAgIC5hdHRyKFwid2lkdGhcIiwgd2lkdGggKyBtYXJnaW4ucmlnaHQgKyBtYXJnaW4ubGVmdClcbiAgICAgICAgICAuYXR0cihcImhlaWdodFwiLCBoZWlnaHQgKyBtYXJnaW4udG9wICsgbWFyZ2luLmJvdHRvbSlcbiAgICAgICAgLmFwcGVuZChcImdcIilcbiAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIiArIG1hcmdpbi5sZWZ0ICsgXCIsXCIgKyBtYXJnaW4udG9wICsgXCIpXCIpO1xuXG5cbiAgICAgICAgcm9vdCA9IF9kYXRhO1xuICAgICAgICByb290LngwID0gd2lkdGggLyAyO1xuICAgICAgICByb290LnkwID0gMDtcblxuICAgICAgICBmdW5jdGlvbiBjb2xsYXBzZShkKSB7XG4gICAgICAgICAgaWYgKGQuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgIGQuX2NoaWxkcmVuID0gZC5jaGlsZHJlbjtcbiAgICAgICAgICAgIGQuX2NoaWxkcmVuLmZvckVhY2goY29sbGFwc2UpO1xuICAgICAgICAgICAgZC5jaGlsZHJlbiA9IG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcm9vdC5jaGlsZHJlbi5mb3JFYWNoKGNvbGxhcHNlKTtcbiAgICAgICAgdXBkYXRlKHJvb3QpO1xuXG5cbiAgICAgIGQzLnNlbGVjdChzZWxmLmZyYW1lRWxlbWVudCkuc3R5bGUoXCJoZWlnaHRcIiwgXCIxMDAwcHhcIik7XG5cbiAgICAgIGZ1bmN0aW9uIHVwZGF0ZShzb3VyY2UpIHtcblxuICAgICAgICAvLyBDb21wdXRlIHRoZSBuZXcgdHJlZSBsYXlvdXQuXG4gICAgICAgIHZhciBub2RlcyA9IHRyZWUubm9kZXMocm9vdCkucmV2ZXJzZSgpLFxuICAgICAgICAgICAgbGlua3MgPSB0cmVlLmxpbmtzKG5vZGVzKTtcblxuICAgICAgICAvLyBOb3JtYWxpemUgZm9yIGZpeGVkLWRlcHRoLlxuICAgICAgICBub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKGQpIHsgZC55ID0gZC5kZXB0aCAqIDgwOyB9KTtcbiAgICAgICAgLy9ub2Rlcy5mb3JFYWNoKGZ1bmN0aW9uKGQpe2QueCA9IGQueCsyMH0pO1xuXG4gICAgICAgIC8vIFVwZGF0ZSB0aGUgbm9kZXPigKZcbiAgICAgICAgdmFyIG5vZGUgPSBzdmcuc2VsZWN0QWxsKFwiZy5ub2RlXCIpXG4gICAgICAgICAgICAuZGF0YShub2RlcywgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5pZCB8fCAoZC5pZCA9ICsraSk7IH0pO1xuXG4gICAgICAgIC8vIEVudGVyIGFueSBuZXcgbm9kZXMgYXQgdGhlIHBhcmVudCdzIHByZXZpb3VzIHBvc2l0aW9uLlxuICAgICAgICB2YXIgbm9kZUVudGVyID0gbm9kZS5lbnRlcigpLmFwcGVuZChcImdcIilcbiAgICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJub2RlXCIpXG4gICAgICAgICAgICAuYXR0cihcInRyYW5zZm9ybVwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBcInRyYW5zbGF0ZShcIiArIHNvdXJjZS54MCArIFwiLFwiICsgc291cmNlLnkwICsgXCIpXCI7IH0pXG4gICAgICAgICAgICAub24oXCJjbGlja1wiLCBjbGljayk7XG5cbiAgICAgICAgbm9kZUVudGVyLmFwcGVuZChcImNpcmNsZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJyXCIsIDFlLTYpXG4gICAgICAgICAgICAuc3R5bGUoXCJmaWxsXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuX2NoaWxkcmVuID8gXCJsaWdodHN0ZWVsYmx1ZVwiIDogXCIjZmZmXCI7IH0pO1xuXG4gICAgICAgIG5vZGVFbnRlci5hcHBlbmQoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuYXR0cihcInhcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5jaGlsZHJlbiB8fCBkLl9jaGlsZHJlbiA/IDAgOiAxMDsgfSlcbiAgICAgICAgICAgIC5hdHRyKFwieVwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLmNoaWxkcmVuIHx8IGQuX2NoaWxkcmVuID8gKE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSooNCkpKjcpIDogKE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSooNikpKjcpOyB9KVxuICAgICAgICAgICAgLmF0dHIoXCJkeVwiLCBcIi4zNWVtXCIpXG4gICAgICAgICAgICAuYXR0cihcInRleHQtYW5jaG9yXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQuY2hpbGRyZW4gfHwgZC5fY2hpbGRyZW4gPyBcImVuZFwiIDogXCJzdGFydFwiOyB9KVxuICAgICAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5uYW1lIHx8IGQuc3R1ZGVudG5hbWUgfHwgXCJzdHVkZW50IGNvZGU6IFwiICtkLnN0dWRlbnRjb2RlIH0pXG4gICAgICAgICAgICAuc3R5bGUoXCJmaWxsLW9wYWNpdHlcIiwgMWUtNilcbiAgICAgICAgICAgLmF0dHIoJ3N0eWxlJywnc3Ryb2tlOm5vbmU7Zm9udC1mYW1pbHk6IHNhbnMtc2VyaWY7bGV0dGVyLXNwYWNpbmc6IDI7Jyk7XG5cbiAgICAgICAgLy8gVHJhbnNpdGlvbiBub2RlcyB0byB0aGVpciBuZXcgcG9zaXRpb24uXG4gICAgICAgIHZhciBub2RlVXBkYXRlID0gbm9kZS50cmFuc2l0aW9uKClcbiAgICAgICAgICAgIC5kdXJhdGlvbihkdXJhdGlvbilcbiAgICAgICAgICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIGZ1bmN0aW9uKGQpIHsgcmV0dXJuIFwidHJhbnNsYXRlKFwiICsgKGQueCkgKyBcIixcIiArIGQueSArIFwiKVwiOyB9KTtcblxuICAgICAgICBub2RlVXBkYXRlLnNlbGVjdChcImNpcmNsZVwiKVxuICAgICAgICAgICAgLmF0dHIoXCJyXCIsIDQuNSlcbiAgICAgICAgICAgIC5zdHlsZShcImZpbGxcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5fY2hpbGRyZW4gPyBcImxpZ2h0c3RlZWxibHVlXCIgOiBcIiNmZmZcIjsgfSk7XG5cbiAgICAgICAgbm9kZVVwZGF0ZS5zZWxlY3QoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJmaWxsLW9wYWNpdHlcIiwgMSk7XG5cbiAgICAgICAgLy8gVHJhbnNpdGlvbiBleGl0aW5nIG5vZGVzIHRvIHRoZSBwYXJlbnQncyBuZXcgcG9zaXRpb24uXG4gICAgICAgIHZhciBub2RlRXhpdCA9IG5vZGUuZXhpdCgpLnRyYW5zaXRpb24oKVxuICAgICAgICAgICAgLmR1cmF0aW9uKGR1cmF0aW9uKVxuICAgICAgICAgICAgLmF0dHIoXCJ0cmFuc2Zvcm1cIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gXCJ0cmFuc2xhdGUoXCIgKyBzb3VyY2UueCArIFwiLFwiICsgc291cmNlLnkgKyBcIilcIjsgfSlcbiAgICAgICAgICAgIC5yZW1vdmUoKTtcblxuICAgICAgICBub2RlRXhpdC5zZWxlY3QoXCJjaXJjbGVcIilcbiAgICAgICAgICAgIC5hdHRyKFwiclwiLCAxZS02KTtcblxuICAgICAgICBub2RlRXhpdC5zZWxlY3QoXCJ0ZXh0XCIpXG4gICAgICAgICAgICAuc3R5bGUoXCJmaWxsLW9wYWNpdHlcIiwgMWUtNik7XG5cbiAgICAgICAgLy8gVXBkYXRlIHRoZSBsaW5rc+KAplxuICAgICAgICB2YXIgbGluayA9IHN2Zy5zZWxlY3RBbGwoXCJwYXRoLmxpbmtcIilcbiAgICAgICAgICAgIC5kYXRhKGxpbmtzLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLnRhcmdldC5pZDsgfSk7XG5cbiAgICAgICAgLy8gRW50ZXIgYW55IG5ldyBsaW5rcyBhdCB0aGUgcGFyZW50J3MgcHJldmlvdXMgcG9zaXRpb24uXG4gICAgICAgIGxpbmsuZW50ZXIoKS5pbnNlcnQoXCJwYXRoXCIsIFwiZ1wiKVxuICAgICAgICAgICAgLmF0dHIoXCJjbGFzc1wiLCBcImxpbmtcIilcbiAgICAgICAgICAgIC5hdHRyKFwiZFwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgIHZhciBvID0ge3g6IHNvdXJjZS54MCwgeTogc291cmNlLnkwfTtcbiAgICAgICAgICAgICAgcmV0dXJuIGRpYWdvbmFsKHtzb3VyY2U6IG8sIHRhcmdldDogb30pO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVHJhbnNpdGlvbiBsaW5rcyB0byB0aGVpciBuZXcgcG9zaXRpb24uXG4gICAgICAgIGxpbmsudHJhbnNpdGlvbigpXG4gICAgICAgICAgICAuZHVyYXRpb24oZHVyYXRpb24pXG4gICAgICAgICAgICAuYXR0cihcImRcIiwgZGlhZ29uYWwpO1xuXG4gICAgICAgIC8vIFRyYW5zaXRpb24gZXhpdGluZyBub2RlcyB0byB0aGUgcGFyZW50J3MgbmV3IHBvc2l0aW9uLlxuICAgICAgICBsaW5rLmV4aXQoKS50cmFuc2l0aW9uKClcbiAgICAgICAgICAgIC5kdXJhdGlvbihkdXJhdGlvbilcbiAgICAgICAgICAgIC5hdHRyKFwiZFwiLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgICAgIHZhciBvID0ge3g6IHNvdXJjZS54LCB5OiBzb3VyY2UueX07XG4gICAgICAgICAgICAgIHJldHVybiBkaWFnb25hbCh7c291cmNlOiBvLCB0YXJnZXQ6IG99KTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAucmVtb3ZlKCk7XG5cbiAgICAgICAgLy8gU3Rhc2ggdGhlIG9sZCBwb3NpdGlvbnMgZm9yIHRyYW5zaXRpb24uXG4gICAgICAgIG5vZGVzLmZvckVhY2goZnVuY3Rpb24oZCkge1xuICAgICAgICAgIGQueDAgPSBkLng7XG4gICAgICAgICAgZC55MCA9IGQueTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIFRvZ2dsZSBjaGlsZHJlbiBvbiBjbGljay5cbiAgICAgIGZ1bmN0aW9uIGNsaWNrKGQpIHtcbiAgICAgICAgaWYgKGQuY2hpbGRyZW4pIHtcbiAgICAgICAgICBkLl9jaGlsZHJlbiA9IGQuY2hpbGRyZW47XG4gICAgICAgICAgZC5jaGlsZHJlbiA9IG51bGw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZC5jaGlsZHJlbiA9IGQuX2NoaWxkcmVuO1xuICAgICAgICAgIGQuX2NoaWxkcmVuID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB1cGRhdGUoZCk7XG4gICAgICB9XG5cbiAgICB9KS8vIGVuZCB0aGVuXG4gICAgfVxuICB9XG59KSIsIlxuYXBwLmRpcmVjdGl2ZSgnc2VjdGlvblRleHQnLGZ1bmN0aW9uKCl7XG4gIHJldHVybntcbiAgICByZXN0cmljdCA6ICdFQScsXG4gICAgc2NvcGUgOiB7XG4gICAgICBhaVRpdGxlICA6ICdAJyxcbiAgICAgIGFpVGV4dCA6ICdAJ1xuICAgIH0sXG4gICAgdGVtcGxhdGVVcmwgOiAgJ2RpcmVjdGl2ZVN0b3JlL3NlY3Rpb25fdGV4dC9zZWN0aW9uX3RleHQuaHRtbCcsXG4gICAgbGluayA6IGZ1bmN0aW9uKHNjb3BlLGVsZW0sYXR0cil7XG5cbiAgICB9XG4gIH07XG59KTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
