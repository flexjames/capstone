'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

window.app = angular.module('FullstackGeneratedApp', ['fsaPreBuilt', 'ui.router', 'ui.bootstrap', 'ngAnimate', 'schemaForm']);

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
      }
    }
  });
});

// user: function(AuthService){
//   return AuthService.getLoggedInUser();
// }
app.controller('HomeControl', function ($scope, projects, $rootScope, AuthService, AUTH_EVENTS, $stateParams, ProjectFactory, $state) {
  $scope.projects = projects;
  $scope.hello = $stateParams.id;

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

app.controller('viewerControl', function ($scope) {});
app.config(function ($stateProvider) {
  $stateProvider.state('project', {
    url: '/project/:id',
    templateUrl: '/js/projects/project.edit.html',
    controller: 'ProjectEditCtrl',
    resolve: {
      project: function project(ProjectFactory, $stateParams) {
        return ProjectFactory.getOne($stateParams.id);
      }
    }
  });
});

app.controller('ProjectEditCtrl', function ($scope, $compile, $timeout) {
  //$scope.project=project;
  //$scope.rows=project.config[0].pages.page_1.rows
  // this is the app config

  $scope.appConfigMaster = {}; // this the version that is in sync with the database 0th position
  $scope.appConfigEditCopy = {}; // this is the copy of of object being edited that copied to appConfigViewDriver when;
  $scope.appConfigViewDriver = {}; // this is the copy of of object being edited that copied to appConfigViewDriver when

  $scope.schema = {
    'type': 'object',
    'title': 'Solo Table',
    'properties': {
      'class': {
        'title': 'Class',
        'type': 'string'
      },
      'info_source': {
        'title': 'Info Source',
        'type': 'string'
      },
      'info_type': {
        'title': 'Info Type',
        'type': 'string',
        'enum': ['json', 'csv']
      }
    }
  };

  $scope.model = {
    'info_source': 'Jonah'
  };

  $scope.form = ["*", {
    type: "submit",
    title: "Save"
  }];

  $scope.appConfig = {
    project_name: 'ourfirst app',
    pages: {
      page_1: {
        ai_directive: true,
        ai_directive_type: 'layout',
        ai_directive_name: 'ai_page',
        ai_directive_page: '1',
        ai_directive_row: '',
        ai_directive_col: '',
        ai_directive_attributes: {
          ai_class: '/css/row_a/style.css',
          ai_page_title: '',
          ai_page_menu_text: ''
        },
        rows: {
          row_1: {
            ai_directive: true,
            ai_directive_type: 'layout',
            ai_directive_name: 'ai_row',
            ai_directive_page: '1',
            ai_directive_row: '1',
            ai_directive_col: '',
            ai_directive_attributes: {
              ai_class: '/css/row_a/style.css'
            },
            cols: {
              col_1: {
                ai_directive: true,
                ai_directive_type: 'layout',
                ai_directive_name: 'ai_col',
                ai_directive_page: '1',
                ai_directive_row: '1',
                ai_directive_col: '1',
                ai_directive_attributes: {
                  ai_class: '/css/row_a/style.css',
                  class: 'col-md-6'
                },
                ai_content: {
                  ai_directive: true,
                  ai_directive_type: 'content',
                  ai_directive_name: 'solo_table',
                  ai_directive_page: '1',
                  ai_directive_row: '1',
                  ai_directive_col: '1',
                  ai_directive_attributes: {
                    ai_title: 'title',
                    ai_class: 'myclass',
                    ai_info_source: 'myclass',
                    ai_info_type: 'file'
                  }
                }
              }, col_2: {
                ai_directive: true,
                ai_directive_type: 'layout',
                ai_directive_name: 'ai_col',
                ai_directive_page: '1',
                ai_directive_row: '1',
                ai_directive_col: '2',
                ai_directive_attributes: {
                  ai_class: 'myclass',
                  class: 'col-md-6'
                },
                ai_content: {
                  ai_directive: true,
                  ai_directive_type: 'content',
                  ai_directive_name: 'solo_table',
                  ai_directive_page: '1',
                  ai_directive_row: '1',
                  ai_directive_col: '2',
                  ai_directive_attributes: {
                    ai_title: 'title',
                    ai_class: 'myclass',
                    ai_info_source: 'myclass',
                    ai_info_type: 'file'
                  }
                }
              }
            }
          },
          row_2: {
            ai_directive: true,
            ai_directive_type: 'layout',
            ai_directive_name: 'ai_row',
            ai_directive_page: '1',
            ai_directive_row: '2',
            ai_directive_col: '',
            ai_directive_attributes: {
              ai_class: '/css/row_a/style.css'
            },
            cols: {
              col_1: {
                ai_directive: true,
                ai_directive_type: 'layout',
                ai_directive_name: 'ai_col',
                ai_directive_page: '1',
                ai_directive_row: '2',
                ai_directive_col: '1',
                ai_directive_attributes: {
                  ai_class: '/css/row_a/style.css',
                  class: 'col-md-6'
                },
                ai_content: {
                  ai_directive: true,
                  ai_directive_type: 'content',
                  ai_directive_name: 'solo_table',
                  ai_directive_page: '1',
                  ai_directive_row: '2',
                  ai_directive_col: '1',
                  ai_directive_attributes: {
                    ai_title: 'title',
                    ai_class: 'myclass',
                    ai_info_source: 'myclass',
                    ai_info_type: 'file'
                  }
                }
              }
            }
          }
        }
      }
    }
  };

  $scope.renderattributeString = function (obj) {
    var attributeString = '';
    for (var keys in obj) {
      attributeString += keys + '="' + obj[keys] + '" ';
    }
    return attributeString;
  };

  $scope.renderRowHtmlFromAiConfig = function (obj) {
    if (obj.hasOwnProperty('ai_directive')) {
      if (obj.ai_directive_type === 'layout' && obj['ai_directive_name'] === 'ai_row') {
        angular.element(workarea).append($compile('<' + obj['ai_directive_name'] + ' id="p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_ai_row" ' + $scope.renderattributeString(obj['ai_directive_attributes']) + '></' + obj['ai_directive_name'] + '>')($scope));
      }
    }
    for (var property in obj) {
      if (_typeof(obj[property]) == "object") {
        $scope.renderRowHtmlFromAiConfig(obj[property]);
      }
    }
  };
  $scope.renderColHtmlFromAiConfig = function (obj) {
    if (obj.hasOwnProperty('ai_directive')) {
      if (obj['ai_directive_type'] === 'layout' && obj['ai_directive_name'] === 'ai_col') {
        $scope.appendTarget = '#p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_ai_row';
        // console.log(obj);
        angular.element(document.querySelector($scope.appendTarget)).append($compile('<' + obj['ai_directive_name'] + ' id="p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_c_' + obj['ai_directive_col'] + '_ai_col" ' + $scope.renderattributeString(obj['ai_directive_attributes']) + '></' + obj['ai_directive_name'] + '>')($scope));
      }
    }
    for (var property in obj) {
      if (_typeof(obj[property]) == "object") {
        $scope.renderColHtmlFromAiConfig(obj[property]);
      }
    }
  };

  $scope.renderDirectiveHtmlFromAiConfig = function (obj) {
    // console.log(obj);
    // the cuurent object is a directive
    // if the current object is not a a directive obj then call with to the next sub-object
    if (obj.hasOwnProperty('ai_directive')) {
      if (obj['ai_directive_type'] === 'content') {
        $scope.appendTarget = '#p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_c_' + obj['ai_directive_col'] + '_ai_col';
        //          console.log('>>>>>>>>'+ $scope.appendTarget);
        angular.element(document.querySelector($scope.appendTarget)).append($compile('<' + obj['ai_directive_name'] + ' id="p_' + obj['ai_directive_page'] + '_r_' + obj['ai_directive_row'] + '_c_' + obj['ai_directive_col'] + '" ' + $scope.renderattributeString(obj['ai_directive_attributes']) + '></' + obj['ai_directive_name'] + '>')($scope));
      }
    }
    for (var property in obj) {
      if (_typeof(obj[property]) == "object") {
        $scope.renderDirectiveHtmlFromAiConfig(obj[property]);
      }
    }
  };
  $scope.$watch('appConfig', function () {
    alert('running');
    angular.element(workarea).empty();
    $scope.renderRowHtmlFromAiConfig($scope.appConfig, '');
    $timeout(function () {
      $scope.renderColHtmlFromAiConfig($scope.appConfig, '');
    }, 100);
    $timeout(function () {
      $scope.renderDirectiveHtmlFromAiConfig($scope.appConfig, '');
    }, 500);
  }, true);

  $scope.editTestObject = {
    ai_directive: true,
    ai_directive_type: 'layout',
    ai_directive_name: 'ai_col',
    ai_directive_page: '1',
    ai_directive_row: '2',
    ai_directive_col: '2',
    ai_directive_attributes: {
      ai_class: '/css/row_a/style.css',
      class: 'col-md-6'
    },
    ai_content: {
      ai_directive: true,
      ai_directive_type: 'content',
      ai_directive_name: 'solo_table',
      ai_directive_page: '1',
      ai_directive_row: '2',
      ai_directive_col: '2',
      ai_directive_attributes: {
        ai_title: 'title',
        ai_class: 'myclass',
        ai_info_source: 'myclass',
        ai_info_type: 'file'
      }
    }
  };
  $scope.editTestObject2 = {
    ai_directive: true,
    ai_directive_type: 'layout',
    ai_directive_name: 'ai_col',
    ai_directive_page: '1',
    ai_directive_row: '2',
    ai_directive_col: '2',
    ai_directive_attributes: {
      ai_class: '/css/row_a/style.css',
      class: 'col-md-6'
    },
    ai_content: {
      ai_directive: true,
      ai_directive_type: 'content',
      ai_directive_name: 'solo_table',
      ai_directive_page: '1',
      ai_directive_row: '2',
      ai_directive_col: '2',
      ai_directive_attributes: {
        ai_title: 'My New Title',
        ai_class: 'myclass',
        ai_info_source: 'myclass',
        ai_info_type: 'file'
      }
    }
  };
  //$scope.appConfig.pages.page_1.rows.row_2.cols.col_2={};

  $scope.creatConfigObject = function (target, newelement, obj) {
    //console.log(typeof target);
    target[newelement] = obj;
    //  $scope.appConfig.pages.page_1.rows.row_2.cols.col_2=obj; 
  };
  $scope.readConfigObject = function (target, newelement) {
    //console.log(typeof target);
    target[newelement] = obj;
    //  $scope.appConfig.pages.page_1.rows.row_2.cols.col_2=obj; 
  };
  $scope.updateConfigObject = function (target, newelement, obj) {
    //console.log(typeof target);
    target[newelement] = obj;
    //  $scope.appConfig.pages.page_1.rows.row_2.cols.col_2=obj; 
  };

  $scope.deleteconfigObject = function (target, newelement) {
    //console.log(typeof target);
    delete target[newelement];
    //  $scope.appConfig.pages.page_1.rows.row_2.cols.col_2=obj; 
  };

  $scope.getNextRowPage = function (page) {
    var newRow;
    return newRow;
  };
  $scope.getNextColumnInRow = function (page, row) {
    var newCol;
    return newCol;
  };

  $timeout(function () {
    $scope.creatConfigObject($scope.appConfig.pages.page_1.rows.row_2.cols, 'col_2', $scope.editTestObject);
  }, 3000);
  /*
  $timeout(function(){
       $scope.readConfigObject($scope.appConfig.pages.page_1.rows.row_2.cols,'col_2',$scope.editTestObject);
  },3000);
  */
  $timeout(function () {
    $scope.updateConfigObject($scope.appConfig.pages.page_1.rows.row_2.cols, 'col_2', $scope.editTestObject2);
  }, 6000);
  /*
  $timeout(function(){
       $scope.deleteconfigObject($scope.appConfig.pages.page_1.rows.row_2.cols,'col_2');
  },9000);
  */
  app.controller('ProjectEditCtrl', function ($scope) {

    $scope.schema = {
      'type': 'object',
      'title': 'Solo Table',
      'properties': {
        'class': {
          'title': 'Class',
          'type': 'string'
        },
        'info_source': {
          'title': 'Info Source',
          'type': 'string'
        },
        'info_type': {
          'title': 'Info Type',
          'type': 'string',
          'enum': ['json', 'csv']
        }
      }
    };

    $scope.model = {
      'info_source': 'Jonah'
    };

    $scope.form = ["*", {
      type: "submit",
      title: "Save"
    }];
  });
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
        console.log(projects);
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

app.factory('dataFactory', function () {
  return {

    getPiedata: function getPiedata(source_location, source_type) {
      return [{
        label: "Steve",
        value: 40
      }, {
        label: "Bob",
        value: 60
      }, {
        label: "Jen",
        value: 35
      }, {
        label: "Amy",
        value: 15
      }];
    }
  };
});

app.directive('barGraph', function ($window, dataFactory) {
  return {
    restrict: 'E',
    templateUrl: 'js/catalog/d3-bar-graph-1/bar-graph.html',
    link: function link(scope, elem, attrs) {
      var d3 = $window.d3;
      var width = 400;
      var height = 400;
      var radius = 200;
      var colors = d3.scale.category10();

      var piedata = dataFactory.getPiedata();

      var pie = d3.layout.pie().value(function (d) {
        return d.value;
      });

      var arc = d3.svg.arc().outerRadius(radius);

      var myChart = d3.select('#chart').append('svg').attr('width', width).attr('height', height).append('g').attr('transform', 'translate(' + (width - radius) + ',' + (height - radius) + ')').selectAll('path').data(pie(piedata)) //returns an array of arcs
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
app.directive('fullstackLogo', function () {
  return {
    restrict: 'E',
    templateUrl: 'js/common/directives/fullstack-logo/fullstack-logo.html'
  };
});
app.directive('navbar', function ($rootScope, AuthService, AUTH_EVENTS, $state) {

  return {
    restrict: 'E',
    scope: {},
    templateUrl: 'js/common/directives/navbar/navbar.html',
    link: function link(scope) {

      scope.items = [{ label: 'Home', state: 'home' }, { label: 'About', state: 'about' }, { label: 'Documentation', state: 'docs' }
      // { label: 'Members Only', state: 'membersOnly', auth: true }
      ];

      scope.user = null;

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
/*
ai_manifest{
    schema :{
            'type': 'object',
            'title': 'Solo Table',
            'properties': {
                  'ai_title': {
                    'title': 'table title',
                    'type': 'string'
                  },
                  'ai_info_source': {
                    'title': 'Info Source',
                    'type': 'string'
                  },
                  'ai_info_type': {
                    'title': 'Info Type',
                    'type': 'string',
                    'enum': ['json', 'csv']
                  }
            }
          },
        scopemodel : {
            'info_source': 'Jonah'
          },
        form : [
            "*", {
              type: "submit",
              title: "Save"
            }
        ]
};
*/
app.factory('dataFactory', function ($http) {
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
app.directive('soloTable', function (dataFactory) {
  return {
    restrict: 'EA',
    scope: {
      aiTitle: '@',
      aiInfoSource: '@',
      aiInfoType: '@'
    },
    templateUrl: 'directiveStore/solotable/solo_table.html',
    //controller : function($scope, dataFactory){
    //$scope.data=dataFactory.getdata($scope.sectionLocation,$scope.sectionType);
    //},
    link: function link(scope, elem, attr) {
      // the link function is going to take all data requests and put them in an array of promisses
      //  for(var i=0;i< a.length;i++;){
      //if(a[i].indexOf(sectionLocation))
      // scope.aiTitle=attr.aiInfoType
      scope.data = dataFactory.getdata(attr.aiInfoSource, attr.aiInfoType);

      //  }
    }
  };
});

app.factory('dataFactory', function () {
  return {

    getPiedata: function getPiedata(source_location, source_type) {
      return [{
        label: "Steve",
        value: 40
      }, {
        label: "Bob",
        value: 60
      }, {
        label: "Jen",
        value: 35
      }, {
        label: "Amy",
        value: 15
      }];
    }
  };
});

app.directive('barGraph', function ($window, dataFactory) {
  return {
    restrict: 'E',
    templateUrl: 'js/directiveStore/d3-bar-graph-1/bar-graph.html',
    link: function link(scope, elem, attrs) {
      var d3 = $window.d3;
      var width = 400;
      var height = 400;
      var radius = 200;
      var colors = d3.scale.category10();

      var piedata = dataFactory.getPiedata();

      var pie = d3.layout.pie().value(function (d) {
        return d.value;
      });

      var arc = d3.svg.arc().outerRadius(radius);

      var myChart = d3.select('#chart').append('svg').attr('width', width).attr('height', height).append('g').attr('transform', 'translate(' + (width - radius) + ',' + (height - radius) + ')').selectAll('path').data(pie(piedata)) //returns an array of arcs
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiZG9jcy9kb2NzLmpzIiwiaG9tZS9ob21lLmpzIiwibG9naW4vbG9naW4uanMiLCJmc2EvZnNhLXByZS1idWlsdC5qcyIsInZpZXdlci92aWV3ZXIuanMiLCJwcm9qZWN0cy9wcm9qZWN0cy5jb25maWcuanMiLCJwcm9qZWN0cy9wcm9qZWN0cy5jb250cm9sbGVyLmpzIiwiY2F0YWxvZy9kMy1iYXItZ3JhcGgtMS9kMy1iYXItZ3JhcGgtMS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvUmFuZG9tR3JlZXRpbmdzLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZWRpdG9yXzIvZWRpdG9yLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uanMiLCJjb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tZ3JlZXRpbmcvcmFuZG8tZ3JlZXRpbmcuanMiLCJzb2xvdGFibGUvc29sb190YWJsZS5kaXJlY3RpdmUuanMiLCJkMy1iYXItZ3JhcGgtMS9kMy1iYXItZ3JhcGgtMS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OztBQUNBLE9BQUEsR0FBQSxHQUFBLFFBQUEsTUFBQSxDQUFBLHVCQUFBLEVBQUEsQ0FBQSxhQUFBLEVBQUEsV0FBQSxFQUFBLGNBQUEsRUFBQSxXQUFBLEVBQUEsWUFBQSxDQUFBLENBQUE7O0FBRUEsSUFBQSxNQUFBLENBQUEsVUFBQSxrQkFBQSxFQUFBLGlCQUFBLEVBQUE7O0FBRUEsb0JBQUEsU0FBQSxDQUFBLElBQUE7O0FBRUEscUJBQUEsU0FBQSxDQUFBLEdBQUE7O0FBRUEscUJBQUEsSUFBQSxDQUFBLGlCQUFBLEVBQUEsWUFBQTtBQUNBLFdBQUEsUUFBQSxDQUFBLE1BQUE7QUFDQSxHQUZBO0FBR0EsQ0FUQTs7O0FBWUEsSUFBQSxHQUFBLENBQUEsVUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLE1BQUEsRUFBQTs7O0FBR0EsTUFBQSwrQkFBQSxTQUFBLDRCQUFBLENBQUEsS0FBQSxFQUFBO0FBQ0EsV0FBQSxNQUFBLElBQUEsSUFBQSxNQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0EsR0FGQTs7OztBQU1BLGFBQUEsR0FBQSxDQUFBLG1CQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBLFFBQUEsRUFBQTs7QUFFQSxRQUFBLENBQUEsNkJBQUEsT0FBQSxDQUFBLEVBQUE7OztBQUdBO0FBQ0E7O0FBRUEsUUFBQSxZQUFBLGVBQUEsRUFBQSxFQUFBOzs7QUFHQTtBQUNBOzs7QUFHQSxVQUFBLGNBQUE7O0FBRUEsZ0JBQUEsZUFBQSxHQUFBLElBQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTs7OztBQUlBLFVBQUEsSUFBQSxFQUFBO0FBQ0EsZUFBQSxFQUFBLENBQUEsUUFBQSxJQUFBLEVBQUEsUUFBQTtBQUNBLE9BRkEsTUFFQTtBQUNBLGVBQUEsRUFBQSxDQUFBLE9BQUE7QUFDQTtBQUNBLEtBVEE7QUFXQSxHQTVCQTtBQThCQSxDQXZDQTs7QUNmQSxJQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTs7O0FBR0EsaUJBQUEsS0FBQSxDQUFBLE9BQUEsRUFBQTtBQUNBLFNBQUEsUUFEQTtBQUVBLGdCQUFBLGlCQUZBO0FBR0EsaUJBQUE7QUFIQSxHQUFBO0FBTUEsQ0FUQTs7QUFXQSxJQUFBLFVBQUEsQ0FBQSxpQkFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLENBSUEsQ0FKQTtBQ1hBLElBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0EsaUJBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLFNBQUEsT0FEQTtBQUVBLGlCQUFBO0FBRkEsR0FBQTtBQUlBLENBTEE7O0FDQUEsSUFBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7QUFDQSxpQkFBQSxLQUFBLENBQUEsTUFBQSxFQUFBO0FBQ0EsU0FBQSxHQURBO0FBRUEsaUJBQUEsbUJBRkE7QUFHQSxnQkFBQSxhQUhBO0FBSUEsYUFBQTtBQUNBLGdCQUFBLGtCQUFBLGNBQUEsRUFBQSxZQUFBLEVBQUE7QUFDQSxZQUFBLGFBQUEsRUFBQSxFQUFBOztBQUVBLGlCQUFBLGVBQUEsTUFBQSxDQUFBLGFBQUEsRUFBQSxDQUFBO0FBQ0E7QUFDQSxlQUFBLElBQUE7QUFDQTtBQVBBO0FBSkEsR0FBQTtBQWlCQSxDQWxCQTs7Ozs7QUFvQkEsSUFBQSxVQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFFBQUEsRUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLFdBQUEsRUFBQSxZQUFBLEVBQUEsY0FBQSxFQUFBLE1BQUEsRUFBQTtBQUNBLFNBQUEsUUFBQSxHQUFBLFFBQUE7QUFDQSxTQUFBLEtBQUEsR0FBQSxhQUFBLEVBQUE7O0FBRUEsU0FBQSxVQUFBLEdBQUEsWUFBQTtBQUNBLFdBQUEsWUFBQSxlQUFBLEVBQUE7QUFDQSxHQUZBOztBQUlBLE1BQUEsVUFBQSxTQUFBLE9BQUEsR0FBQTtBQUNBLGdCQUFBLGVBQUEsR0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxhQUFBLElBQUEsR0FBQSxJQUFBO0FBQ0EsYUFBQSxJQUFBO0FBQ0EsS0FIQSxFQUdBLElBSEEsQ0FHQSxXQUhBO0FBSUEsR0FMQTtBQU1BLE1BQUEsY0FBQSxTQUFBLFdBQUEsQ0FBQSxJQUFBLEVBQUE7O0FBRUEsUUFBQSxJQUFBLEVBQUE7QUFDQSxxQkFBQSxZQUFBLENBQUEsT0FBQSxJQUFBLENBQUEsR0FBQSxFQUNBLElBREEsQ0FDQSxVQUFBLFFBQUEsRUFBQTtBQUNBLGVBQUEsUUFBQSxHQUFBLFFBQUE7QUFDQSxPQUhBO0FBSUE7QUFDQSxHQVJBOztBQVVBLFNBQUEsVUFBQSxHQUFBLFlBQUE7QUFDQSxRQUFBLFFBQUEsSUFBQTs7QUFFQSxRQUFBLFlBQUEsZUFBQSxFQUFBLEVBQUE7QUFDQSxjQUFBLE9BQUEsSUFBQTtBQUNBOztBQUVBLFdBQUEsZUFBQSxHQUFBLENBQUE7QUFDQSxZQUFBLE9BQUEsV0FEQTtBQUVBLFlBQUE7QUFGQSxLQUFBLEVBR0EsSUFIQSxDQUdBLFVBQUEsVUFBQSxFQUFBO0FBQ0EsYUFBQSxFQUFBLENBQUEsU0FBQSxFQUFBLEVBQUEsSUFBQSxXQUFBLEdBQUEsRUFBQTtBQUNBLEtBTEEsQ0FBQTtBQU1BLEdBYkE7O0FBZUE7QUFHQSxDQTFDQTtBQ3BCQSxJQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTs7QUFFQSxpQkFBQSxLQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsU0FBQSxRQURBO0FBRUEsaUJBQUEscUJBRkE7QUFHQSxnQkFBQTtBQUhBLEdBQUE7QUFNQSxDQVJBOztBQVVBLElBQUEsVUFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLFNBQUEsS0FBQSxHQUFBLEVBQUE7QUFDQSxTQUFBLEtBQUEsR0FBQSxJQUFBOztBQUVBLFNBQUEsU0FBQSxHQUFBLFVBQUEsU0FBQSxFQUFBOztBQUVBLFdBQUEsS0FBQSxHQUFBLElBQUE7O0FBRUEsZ0JBQUEsS0FBQSxDQUFBLFNBQUEsRUFBQSxJQUFBLENBQUEsWUFBQTtBQUNBLGFBQUEsRUFBQSxDQUFBLE1BQUE7QUFDQSxLQUZBLEVBRUEsS0FGQSxDQUVBLFlBQUE7QUFDQSxhQUFBLEtBQUEsR0FBQSw0QkFBQTtBQUNBLEtBSkE7QUFNQSxHQVZBO0FBWUEsQ0FqQkE7QUNWQSxDQUFBLFlBQUE7O0FBRUE7Ozs7QUFHQSxNQUFBLENBQUEsT0FBQSxPQUFBLEVBQUEsTUFBQSxJQUFBLEtBQUEsQ0FBQSx3QkFBQSxDQUFBOztBQUVBLE1BQUEsTUFBQSxRQUFBLE1BQUEsQ0FBQSxhQUFBLEVBQUEsRUFBQSxDQUFBOzs7OztBQU9BLE1BQUEsUUFBQSxDQUFBLGFBQUEsRUFBQTtBQUNBLGtCQUFBLG9CQURBO0FBRUEsaUJBQUEsbUJBRkE7QUFHQSxtQkFBQSxxQkFIQTtBQUlBLG9CQUFBLHNCQUpBO0FBS0Esc0JBQUEsd0JBTEE7QUFNQSxtQkFBQTtBQU5BLEdBQUE7O0FBU0EsTUFBQSxPQUFBLENBQUEsaUJBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxFQUFBLEVBQUEsV0FBQSxFQUFBO0FBQ0EsUUFBQSxhQUFBO0FBQ0EsV0FBQSxZQUFBLGdCQURBO0FBRUEsV0FBQSxZQUFBLGFBRkE7QUFHQSxXQUFBLFlBQUEsY0FIQTtBQUlBLFdBQUEsWUFBQTtBQUpBLEtBQUE7QUFNQSxXQUFBO0FBQ0EscUJBQUEsdUJBQUEsUUFBQSxFQUFBO0FBQ0EsbUJBQUEsVUFBQSxDQUFBLFdBQUEsU0FBQSxNQUFBLENBQUEsRUFBQSxRQUFBO0FBQ0EsZUFBQSxHQUFBLE1BQUEsQ0FBQSxRQUFBLENBQUE7QUFDQTtBQUpBLEtBQUE7QUFNQSxHQWJBOztBQWVBLE1BQUEsTUFBQSxDQUFBLFVBQUEsYUFBQSxFQUFBO0FBQ0Esa0JBQUEsWUFBQSxDQUFBLElBQUEsQ0FBQSxDQUNBLFdBREEsRUFFQSxVQUFBLFNBQUEsRUFBQTtBQUNBLGFBQUEsVUFBQSxHQUFBLENBQUEsaUJBQUEsQ0FBQTtBQUNBLEtBSkEsQ0FBQTtBQU1BLEdBUEE7O0FBU0EsTUFBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLEVBQUEsRUFBQTs7QUFFQSxhQUFBLGlCQUFBLENBQUEsUUFBQSxFQUFBO0FBQ0EsVUFBQSxPQUFBLFNBQUEsSUFBQTtBQUNBLGNBQUEsTUFBQSxDQUFBLEtBQUEsRUFBQSxFQUFBLEtBQUEsSUFBQTtBQUNBLGlCQUFBLFVBQUEsQ0FBQSxZQUFBLFlBQUE7QUFDQSxhQUFBLEtBQUEsSUFBQTtBQUNBOzs7O0FBSUEsU0FBQSxlQUFBLEdBQUEsWUFBQTtBQUNBLGFBQUEsQ0FBQSxDQUFBLFFBQUEsSUFBQTtBQUNBLEtBRkE7O0FBSUEsU0FBQSxlQUFBLEdBQUEsVUFBQSxVQUFBLEVBQUE7Ozs7Ozs7Ozs7QUFVQSxVQUFBLEtBQUEsZUFBQSxNQUFBLGVBQUEsSUFBQSxFQUFBO0FBQ0EsZUFBQSxHQUFBLElBQUEsQ0FBQSxRQUFBLElBQUEsQ0FBQTtBQUNBOzs7OztBQUtBLGFBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxFQUFBLElBQUEsQ0FBQSxpQkFBQSxFQUFBLEtBQUEsQ0FBQSxZQUFBO0FBQ0EsZUFBQSxJQUFBO0FBQ0EsT0FGQSxDQUFBO0FBSUEsS0FyQkE7O0FBdUJBLFNBQUEsS0FBQSxHQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsYUFBQSxNQUFBLElBQUEsQ0FBQSxRQUFBLEVBQUEsV0FBQSxFQUNBLElBREEsQ0FDQSxpQkFEQSxFQUVBLEtBRkEsQ0FFQSxZQUFBO0FBQ0EsZUFBQSxHQUFBLE1BQUEsQ0FBQSxFQUFBLFNBQUEsNEJBQUEsRUFBQSxDQUFBO0FBQ0EsT0FKQSxDQUFBO0FBS0EsS0FOQTs7QUFRQSxTQUFBLE1BQUEsR0FBQSxZQUFBO0FBQ0EsYUFBQSxNQUFBLEdBQUEsQ0FBQSxTQUFBLEVBQUEsSUFBQSxDQUFBLFlBQUE7QUFDQSxnQkFBQSxPQUFBO0FBQ0EsbUJBQUEsVUFBQSxDQUFBLFlBQUEsYUFBQTtBQUNBLE9BSEEsQ0FBQTtBQUlBLEtBTEE7QUFPQSxHQXJEQTs7QUF1REEsTUFBQSxPQUFBLENBQUEsU0FBQSxFQUFBLFVBQUEsVUFBQSxFQUFBLFdBQUEsRUFBQTs7QUFFQSxRQUFBLE9BQUEsSUFBQTs7QUFFQSxlQUFBLEdBQUEsQ0FBQSxZQUFBLGdCQUFBLEVBQUEsWUFBQTtBQUNBLFdBQUEsT0FBQTtBQUNBLEtBRkE7O0FBSUEsZUFBQSxHQUFBLENBQUEsWUFBQSxjQUFBLEVBQUEsWUFBQTtBQUNBLFdBQUEsT0FBQTtBQUNBLEtBRkE7O0FBSUEsU0FBQSxFQUFBLEdBQUEsSUFBQTtBQUNBLFNBQUEsSUFBQSxHQUFBLElBQUE7O0FBRUEsU0FBQSxNQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUEsSUFBQSxFQUFBO0FBQ0EsV0FBQSxFQUFBLEdBQUEsU0FBQTtBQUNBLFdBQUEsSUFBQSxHQUFBLElBQUE7QUFDQSxLQUhBOztBQUtBLFNBQUEsT0FBQSxHQUFBLFlBQUE7QUFDQSxXQUFBLEVBQUEsR0FBQSxJQUFBO0FBQ0EsV0FBQSxJQUFBLEdBQUEsSUFBQTtBQUNBLEtBSEE7QUFLQSxHQXpCQTtBQTJCQSxDQWpJQTs7QUNBQSxJQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTtBQUNBLGlCQUFBLEtBQUEsQ0FBQSxRQUFBLEVBQUE7QUFDQSxTQUFBLFNBREE7QUFFQSxpQkFBQSxxQkFGQTtBQUdBLGdCQUFBOzs7Ozs7Ozs7Ozs7O0FBSEEsR0FBQTtBQWlCQSxDQWxCQTs7QUFxQkEsSUFBQSxVQUFBLENBQUEsZUFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLENBR0EsQ0FIQTtBQ3JCQSxJQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTtBQUNBLGlCQUNBLEtBREEsQ0FDQSxTQURBLEVBQ0E7QUFDQSxTQUFBLGNBREE7QUFFQSxpQkFBQSxnQ0FGQTtBQUdBLGdCQUFBLGlCQUhBO0FBSUEsYUFBQTtBQUNBLGVBQUEsaUJBQUEsY0FBQSxFQUFBLFlBQUEsRUFBQTtBQUNBLGVBQUEsZUFBQSxNQUFBLENBQUEsYUFBQSxFQUFBLENBQUE7QUFDQTtBQUhBO0FBSkEsR0FEQTtBQVdBLENBWkE7O0FDQ0EsSUFBQSxVQUFBLENBQUEsaUJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxRQUFBLEVBQUEsUUFBQSxFQUFBOzs7OztBQUtBLFNBQUEsZUFBQSxHQUFBLEVBQUEsQztBQUNBLFNBQUEsaUJBQUEsR0FBQSxFQUFBLEM7QUFDQSxTQUFBLG1CQUFBLEdBQUEsRUFBQSxDOztBQUVBLFNBQUEsTUFBQSxHQUFBO0FBQ0EsWUFBQSxRQURBO0FBRUEsYUFBQSxZQUZBO0FBR0Esa0JBQUE7QUFDQSxlQUFBO0FBQ0EsaUJBQUEsT0FEQTtBQUVBLGdCQUFBO0FBRkEsT0FEQTtBQUtBLHFCQUFBO0FBQ0EsaUJBQUEsYUFEQTtBQUVBLGdCQUFBO0FBRkEsT0FMQTtBQVNBLG1CQUFBO0FBQ0EsaUJBQUEsV0FEQTtBQUVBLGdCQUFBLFFBRkE7QUFHQSxnQkFBQSxDQUFBLE1BQUEsRUFBQSxLQUFBO0FBSEE7QUFUQTtBQUhBLEdBQUE7O0FBb0JBLFNBQUEsS0FBQSxHQUFBO0FBQ0EsbUJBQUE7QUFEQSxHQUFBOztBQUlBLFNBQUEsSUFBQSxHQUFBLENBQ0EsR0FEQSxFQUNBO0FBQ0EsVUFBQSxRQURBO0FBRUEsV0FBQTtBQUZBLEdBREEsQ0FBQTs7QUFPQSxTQUFBLFNBQUEsR0FBQTtBQUNBLGtCQUFBLGNBREE7QUFFQSxXQUFBO0FBQ0EsY0FBQTtBQUNBLHNCQUFBLElBREE7QUFFQSwyQkFBQSxRQUZBO0FBR0EsMkJBQUEsU0FIQTtBQUlBLDJCQUFBLEdBSkE7QUFLQSwwQkFBQSxFQUxBO0FBTUEsMEJBQUEsRUFOQTtBQU9BLGlDQUFBO0FBQ0Esb0JBQUEsc0JBREE7QUFFQSx5QkFBQSxFQUZBO0FBR0EsNkJBQUE7QUFIQSxTQVBBO0FBWUEsY0FBQTtBQUNBLGlCQUFBO0FBQ0EsMEJBQUEsSUFEQTtBQUVBLCtCQUFBLFFBRkE7QUFHQSwrQkFBQSxRQUhBO0FBSUEsK0JBQUEsR0FKQTtBQUtBLDhCQUFBLEdBTEE7QUFNQSw4QkFBQSxFQU5BO0FBT0EscUNBQUE7QUFDQSx3QkFBQTtBQURBLGFBUEE7QUFVQSxrQkFBQTtBQUNBLHFCQUFBO0FBQ0EsOEJBQUEsSUFEQTtBQUVBLG1DQUFBLFFBRkE7QUFHQSxtQ0FBQSxRQUhBO0FBSUEsbUNBQUEsR0FKQTtBQUtBLGtDQUFBLEdBTEE7QUFNQSxrQ0FBQSxHQU5BO0FBT0EseUNBQUE7QUFDQSw0QkFBQSxzQkFEQTtBQUVBLHlCQUFBO0FBRkEsaUJBUEE7QUFXQSw0QkFBQTtBQUNBLGdDQUFBLElBREE7QUFFQSxxQ0FBQSxTQUZBO0FBR0EscUNBQUEsWUFIQTtBQUlBLHFDQUFBLEdBSkE7QUFLQSxvQ0FBQSxHQUxBO0FBTUEsb0NBQUEsR0FOQTtBQU9BLDJDQUFBO0FBQ0EsOEJBQUEsT0FEQTtBQUVBLDhCQUFBLFNBRkE7QUFHQSxvQ0FBQSxTQUhBO0FBSUEsa0NBQUE7QUFKQTtBQVBBO0FBWEEsZUFEQSxFQTBCQSxPQUFBO0FBQ0EsOEJBQUEsSUFEQTtBQUVBLG1DQUFBLFFBRkE7QUFHQSxtQ0FBQSxRQUhBO0FBSUEsbUNBQUEsR0FKQTtBQUtBLGtDQUFBLEdBTEE7QUFNQSxrQ0FBQSxHQU5BO0FBT0EseUNBQUE7QUFDQSw0QkFBQSxTQURBO0FBRUEseUJBQUE7QUFGQSxpQkFQQTtBQVdBLDRCQUFBO0FBQ0EsZ0NBQUEsSUFEQTtBQUVBLHFDQUFBLFNBRkE7QUFHQSxxQ0FBQSxZQUhBO0FBSUEscUNBQUEsR0FKQTtBQUtBLG9DQUFBLEdBTEE7QUFNQSxvQ0FBQSxHQU5BO0FBT0EsMkNBQUE7QUFDQSw4QkFBQSxPQURBO0FBRUEsOEJBQUEsU0FGQTtBQUdBLG9DQUFBLFNBSEE7QUFJQSxrQ0FBQTtBQUpBO0FBUEE7QUFYQTtBQTFCQTtBQVZBLFdBREE7QUFpRUEsaUJBQUE7QUFDQSwwQkFBQSxJQURBO0FBRUEsK0JBQUEsUUFGQTtBQUdBLCtCQUFBLFFBSEE7QUFJQSwrQkFBQSxHQUpBO0FBS0EsOEJBQUEsR0FMQTtBQU1BLDhCQUFBLEVBTkE7QUFPQSxxQ0FBQTtBQUNBLHdCQUFBO0FBREEsYUFQQTtBQVVBLGtCQUFBO0FBQ0EscUJBQUE7QUFDQSw4QkFBQSxJQURBO0FBRUEsbUNBQUEsUUFGQTtBQUdBLG1DQUFBLFFBSEE7QUFJQSxtQ0FBQSxHQUpBO0FBS0Esa0NBQUEsR0FMQTtBQU1BLGtDQUFBLEdBTkE7QUFPQSx5Q0FBQTtBQUNBLDRCQUFBLHNCQURBO0FBRUEseUJBQUE7QUFGQSxpQkFQQTtBQVdBLDRCQUFBO0FBQ0EsZ0NBQUEsSUFEQTtBQUVBLHFDQUFBLFNBRkE7QUFHQSxxQ0FBQSxZQUhBO0FBSUEscUNBQUEsR0FKQTtBQUtBLG9DQUFBLEdBTEE7QUFNQSxvQ0FBQSxHQU5BO0FBT0EsMkNBQUE7QUFDQSw4QkFBQSxPQURBO0FBRUEsOEJBQUEsU0FGQTtBQUdBLG9DQUFBLFNBSEE7QUFJQSxrQ0FBQTtBQUpBO0FBUEE7QUFYQTtBQURBO0FBVkE7QUFqRUE7QUFaQTtBQURBO0FBRkEsR0FBQTs7QUE0SEEsU0FBQSxxQkFBQSxHQUFBLFVBQUEsR0FBQSxFQUFBO0FBQ0EsUUFBQSxrQkFBQSxFQUFBO0FBQ0EsU0FBQSxJQUFBLElBQUEsSUFBQSxHQUFBLEVBQUE7QUFDQSx5QkFBQSxPQUFBLElBQUEsR0FBQSxJQUFBLElBQUEsQ0FBQSxHQUFBLElBQUE7QUFDQTtBQUNBLFdBQUEsZUFBQTtBQUNBLEdBTkE7O0FBUUEsU0FBQSx5QkFBQSxHQUFBLFVBQUEsR0FBQSxFQUFBO0FBQ0EsUUFBQSxJQUFBLGNBQUEsQ0FBQSxjQUFBLENBQUEsRUFBQTtBQUNBLFVBQUEsSUFBQSxpQkFBQSxLQUFBLFFBQUEsSUFBQSxJQUFBLG1CQUFBLE1BQUEsUUFBQSxFQUFBO0FBQ0EsZ0JBQUEsT0FBQSxDQUFBLFFBQUEsRUFBQSxNQUFBLENBQUEsU0FBQSxNQUFBLElBQUEsbUJBQUEsQ0FBQSxHQUFBLFNBQUEsR0FBQSxJQUFBLG1CQUFBLENBQUEsR0FBQSxLQUFBLEdBQUEsSUFBQSxrQkFBQSxDQUFBLEdBQUEsV0FBQSxHQUFBLE9BQUEscUJBQUEsQ0FBQSxJQUFBLHlCQUFBLENBQUEsQ0FBQSxHQUFBLEtBQUEsR0FBQSxJQUFBLG1CQUFBLENBQUEsR0FBQSxHQUFBLEVBQUEsTUFBQSxDQUFBO0FBQ0E7QUFDQTtBQUNBLFNBQUEsSUFBQSxRQUFBLElBQUEsR0FBQSxFQUFBO0FBQ0EsVUFBQSxRQUFBLElBQUEsUUFBQSxDQUFBLEtBQUEsUUFBQSxFQUFBO0FBQ0EsZUFBQSx5QkFBQSxDQUFBLElBQUEsUUFBQSxDQUFBO0FBQ0E7QUFDQTtBQUNBLEdBWEE7QUFZQSxTQUFBLHlCQUFBLEdBQUEsVUFBQSxHQUFBLEVBQUE7QUFDQSxRQUFBLElBQUEsY0FBQSxDQUFBLGNBQUEsQ0FBQSxFQUFBO0FBQ0EsVUFBQSxJQUFBLG1CQUFBLE1BQUEsUUFBQSxJQUFBLElBQUEsbUJBQUEsTUFBQSxRQUFBLEVBQUE7QUFDQSxlQUFBLFlBQUEsR0FBQSxRQUFBLElBQUEsbUJBQUEsQ0FBQSxHQUFBLEtBQUEsR0FBQSxJQUFBLGtCQUFBLENBQUEsR0FBQSxTQUFBOztBQUVBLGdCQUFBLE9BQUEsQ0FBQSxTQUFBLGFBQUEsQ0FBQSxPQUFBLFlBQUEsQ0FBQSxFQUFBLE1BQUEsQ0FBQSxTQUFBLE1BQUEsSUFBQSxtQkFBQSxDQUFBLEdBQUEsU0FBQSxHQUFBLElBQUEsbUJBQUEsQ0FBQSxHQUFBLEtBQUEsR0FBQSxJQUFBLGtCQUFBLENBQUEsR0FBQSxLQUFBLEdBQUEsSUFBQSxrQkFBQSxDQUFBLEdBQUEsV0FBQSxHQUFBLE9BQUEscUJBQUEsQ0FBQSxJQUFBLHlCQUFBLENBQUEsQ0FBQSxHQUFBLEtBQUEsR0FBQSxJQUFBLG1CQUFBLENBQUEsR0FBQSxHQUFBLEVBQUEsTUFBQSxDQUFBO0FBQ0E7QUFDQTtBQUNBLFNBQUEsSUFBQSxRQUFBLElBQUEsR0FBQSxFQUFBO0FBQ0EsVUFBQSxRQUFBLElBQUEsUUFBQSxDQUFBLEtBQUEsUUFBQSxFQUFBO0FBQ0EsZUFBQSx5QkFBQSxDQUFBLElBQUEsUUFBQSxDQUFBO0FBQ0E7QUFDQTtBQUNBLEdBYkE7O0FBZUEsU0FBQSwrQkFBQSxHQUFBLFVBQUEsR0FBQSxFQUFBOzs7O0FBSUEsUUFBQSxJQUFBLGNBQUEsQ0FBQSxjQUFBLENBQUEsRUFBQTtBQUNBLFVBQUEsSUFBQSxtQkFBQSxNQUFBLFNBQUEsRUFBQTtBQUNBLGVBQUEsWUFBQSxHQUFBLFFBQUEsSUFBQSxtQkFBQSxDQUFBLEdBQUEsS0FBQSxHQUFBLElBQUEsa0JBQUEsQ0FBQSxHQUFBLEtBQUEsR0FBQSxJQUFBLGtCQUFBLENBQUEsR0FBQSxTQUFBOztBQUVBLGdCQUFBLE9BQUEsQ0FBQSxTQUFBLGFBQUEsQ0FBQSxPQUFBLFlBQUEsQ0FBQSxFQUFBLE1BQUEsQ0FBQSxTQUFBLE1BQUEsSUFBQSxtQkFBQSxDQUFBLEdBQUEsU0FBQSxHQUFBLElBQUEsbUJBQUEsQ0FBQSxHQUFBLEtBQUEsR0FBQSxJQUFBLGtCQUFBLENBQUEsR0FBQSxLQUFBLEdBQUEsSUFBQSxrQkFBQSxDQUFBLEdBQUEsSUFBQSxHQUFBLE9BQUEscUJBQUEsQ0FBQSxJQUFBLHlCQUFBLENBQUEsQ0FBQSxHQUFBLEtBQUEsR0FBQSxJQUFBLG1CQUFBLENBQUEsR0FBQSxHQUFBLEVBQUEsTUFBQSxDQUFBO0FBQ0E7QUFDQTtBQUNBLFNBQUEsSUFBQSxRQUFBLElBQUEsR0FBQSxFQUFBO0FBQ0EsVUFBQSxRQUFBLElBQUEsUUFBQSxDQUFBLEtBQUEsUUFBQSxFQUFBO0FBQ0EsZUFBQSwrQkFBQSxDQUFBLElBQUEsUUFBQSxDQUFBO0FBQ0E7QUFDQTtBQUNBLEdBaEJBO0FBaUJBLFNBQUEsTUFBQSxDQUFBLFdBQUEsRUFBQSxZQUFBO0FBQ0EsVUFBQSxTQUFBO0FBQ0EsWUFBQSxPQUFBLENBQUEsUUFBQSxFQUFBLEtBQUE7QUFDQSxXQUFBLHlCQUFBLENBQUEsT0FBQSxTQUFBLEVBQUEsRUFBQTtBQUNBLGFBQUEsWUFBQTtBQUNBLGFBQUEseUJBQUEsQ0FBQSxPQUFBLFNBQUEsRUFBQSxFQUFBO0FBQ0EsS0FGQSxFQUVBLEdBRkE7QUFHQSxhQUFBLFlBQUE7QUFDQSxhQUFBLCtCQUFBLENBQUEsT0FBQSxTQUFBLEVBQUEsRUFBQTtBQUNBLEtBRkEsRUFFQSxHQUZBO0FBR0EsR0FWQSxFQVVBLElBVkE7O0FBYUEsU0FBQSxjQUFBLEdBQUE7QUFDQSxrQkFBQSxJQURBO0FBRUEsdUJBQUEsUUFGQTtBQUdBLHVCQUFBLFFBSEE7QUFJQSx1QkFBQSxHQUpBO0FBS0Esc0JBQUEsR0FMQTtBQU1BLHNCQUFBLEdBTkE7QUFPQSw2QkFBQTtBQUNBLGdCQUFBLHNCQURBO0FBRUEsYUFBQTtBQUZBLEtBUEE7QUFXQSxnQkFBQTtBQUNBLG9CQUFBLElBREE7QUFFQSx5QkFBQSxTQUZBO0FBR0EseUJBQUEsWUFIQTtBQUlBLHlCQUFBLEdBSkE7QUFLQSx3QkFBQSxHQUxBO0FBTUEsd0JBQUEsR0FOQTtBQU9BLCtCQUFBO0FBQ0Esa0JBQUEsT0FEQTtBQUVBLGtCQUFBLFNBRkE7QUFHQSx3QkFBQSxTQUhBO0FBSUEsc0JBQUE7QUFKQTtBQVBBO0FBWEEsR0FBQTtBQTBCQSxTQUFBLGVBQUEsR0FBQTtBQUNBLGtCQUFBLElBREE7QUFFQSx1QkFBQSxRQUZBO0FBR0EsdUJBQUEsUUFIQTtBQUlBLHVCQUFBLEdBSkE7QUFLQSxzQkFBQSxHQUxBO0FBTUEsc0JBQUEsR0FOQTtBQU9BLDZCQUFBO0FBQ0EsZ0JBQUEsc0JBREE7QUFFQSxhQUFBO0FBRkEsS0FQQTtBQVdBLGdCQUFBO0FBQ0Esb0JBQUEsSUFEQTtBQUVBLHlCQUFBLFNBRkE7QUFHQSx5QkFBQSxZQUhBO0FBSUEseUJBQUEsR0FKQTtBQUtBLHdCQUFBLEdBTEE7QUFNQSx3QkFBQSxHQU5BO0FBT0EsK0JBQUE7QUFDQSxrQkFBQSxjQURBO0FBRUEsa0JBQUEsU0FGQTtBQUdBLHdCQUFBLFNBSEE7QUFJQSxzQkFBQTtBQUpBO0FBUEE7QUFYQSxHQUFBOzs7QUE0QkEsU0FBQSxpQkFBQSxHQUFBLFVBQUEsTUFBQSxFQUFBLFVBQUEsRUFBQSxHQUFBLEVBQUE7O0FBRUEsV0FBQSxVQUFBLElBQUEsR0FBQTs7QUFFQSxHQUpBO0FBS0EsU0FBQSxnQkFBQSxHQUFBLFVBQUEsTUFBQSxFQUFBLFVBQUEsRUFBQTs7QUFFQSxXQUFBLFVBQUEsSUFBQSxHQUFBOztBQUVBLEdBSkE7QUFLQSxTQUFBLGtCQUFBLEdBQUEsVUFBQSxNQUFBLEVBQUEsVUFBQSxFQUFBLEdBQUEsRUFBQTs7QUFFQSxXQUFBLFVBQUEsSUFBQSxHQUFBOztBQUVBLEdBSkE7O0FBTUEsU0FBQSxrQkFBQSxHQUFBLFVBQUEsTUFBQSxFQUFBLFVBQUEsRUFBQTs7QUFFQSxXQUFBLE9BQUEsVUFBQSxDQUFBOztBQUVBLEdBSkE7O0FBTUEsU0FBQSxjQUFBLEdBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQSxRQUFBLE1BQUE7QUFDQSxXQUFBLE1BQUE7QUFDQSxHQUhBO0FBSUEsU0FBQSxrQkFBQSxHQUFBLFVBQUEsSUFBQSxFQUFBLEdBQUEsRUFBQTtBQUNBLFFBQUEsTUFBQTtBQUNBLFdBQUEsTUFBQTtBQUNBLEdBSEE7O0FBTUEsV0FBQSxZQUFBO0FBQ0EsV0FBQSxpQkFBQSxDQUFBLE9BQUEsU0FBQSxDQUFBLEtBQUEsQ0FBQSxNQUFBLENBQUEsSUFBQSxDQUFBLEtBQUEsQ0FBQSxJQUFBLEVBQUEsT0FBQSxFQUFBLE9BQUEsY0FBQTtBQUNBLEdBRkEsRUFFQSxJQUZBOzs7Ozs7QUFRQSxXQUFBLFlBQUE7QUFDQSxXQUFBLGtCQUFBLENBQUEsT0FBQSxTQUFBLENBQUEsS0FBQSxDQUFBLE1BQUEsQ0FBQSxJQUFBLENBQUEsS0FBQSxDQUFBLElBQUEsRUFBQSxPQUFBLEVBQUEsT0FBQSxlQUFBO0FBQ0EsR0FGQSxFQUVBLElBRkE7Ozs7OztBQVFBLE1BQUEsVUFBQSxDQUFBLGlCQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUE7O0FBRUEsV0FBQSxNQUFBLEdBQUE7QUFDQSxjQUFBLFFBREE7QUFFQSxlQUFBLFlBRkE7QUFHQSxvQkFBQTtBQUNBLGlCQUFBO0FBQ0EsbUJBQUEsT0FEQTtBQUVBLGtCQUFBO0FBRkEsU0FEQTtBQUtBLHVCQUFBO0FBQ0EsbUJBQUEsYUFEQTtBQUVBLGtCQUFBO0FBRkEsU0FMQTtBQVNBLHFCQUFBO0FBQ0EsbUJBQUEsV0FEQTtBQUVBLGtCQUFBLFFBRkE7QUFHQSxrQkFBQSxDQUFBLE1BQUEsRUFBQSxLQUFBO0FBSEE7QUFUQTtBQUhBLEtBQUE7O0FBb0JBLFdBQUEsS0FBQSxHQUFBO0FBQ0EscUJBQUE7QUFEQSxLQUFBOztBQUlBLFdBQUEsSUFBQSxHQUFBLENBQ0EsR0FEQSxFQUNBO0FBQ0EsWUFBQSxRQURBO0FBRUEsYUFBQTtBQUZBLEtBREEsQ0FBQTtBQU9BLEdBakNBO0FBbUNBLENBOVdBO0FBK1dBLElBQUEsT0FBQSxDQUFBLGdCQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7QUFDQSxNQUFBLFVBQUE7QUFDQSxNQUFBLGdCQUFBLEVBQUE7O0FBRUEsZUFBQTtBQUNBLFlBQUEsa0JBQUE7QUFDQSxhQUFBLE1BQUEsR0FBQSxDQUFBLGVBQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxnQkFBQSxHQUFBLENBQUEsUUFBQTtBQUNBLGdCQUFBLElBQUEsQ0FBQSxTQUFBLElBQUEsRUFBQSxhQUFBO0FBQ0EsZUFBQSxhQUFBO0FBQ0EsT0FMQSxDQUFBO0FBTUEsS0FSQTs7QUFVQSxrQkFBQSxzQkFBQSxNQUFBLEVBQUE7QUFDQSxhQUFBLE1BQUEsR0FBQSxDQUFBLHdCQUFBLE1BQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxnQkFBQSxHQUFBLENBQUEsUUFBQTtBQUNBLGdCQUFBLElBQUEsQ0FBQSxTQUFBLElBQUEsRUFBQSxhQUFBO0FBQ0EsZUFBQSxhQUFBO0FBQ0EsT0FMQSxDQUFBO0FBTUEsS0FqQkE7O0FBbUJBLFlBQUEsZ0JBQUEsRUFBQSxFQUFBO0FBQ0EsYUFBQSxNQUFBLEdBQUEsQ0FBQSxtQkFBQSxFQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsT0FBQSxFQUFBO0FBQ0EsZUFBQSxRQUFBLElBQUE7QUFDQSxPQUhBLENBQUE7QUFJQSxLQXhCQTs7QUEwQkEsU0FBQSxhQUFBLE9BQUEsRUFBQTtBQUNBLGFBQUEsTUFBQTtBQUNBLGFBQUEsZ0JBREE7QUFFQSxnQkFBQSxNQUZBO0FBR0EsY0FBQTtBQUhBLE9BQUEsRUFLQSxJQUxBLENBS0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxlQUFBLFNBQUEsSUFBQTtBQUNBLE9BUEEsQ0FBQTtBQVFBLEtBbkNBOztBQXFDQSxZQUFBLGlCQUFBLEVBQUEsRUFBQTtBQUNBLGFBQUEsTUFBQSxNQUFBLENBQUEsbUJBQUEsRUFBQSxFQUNBLElBREEsQ0FDQSxVQUFBLE9BQUEsRUFBQTtBQUNBLGVBQUEsUUFBQSxJQUFBO0FBQ0EsT0FIQSxDQUFBO0FBSUEsS0ExQ0E7O0FBNENBLFlBQUEsZ0JBQUEsT0FBQSxFQUFBO0FBQ0EsYUFBQSxNQUFBO0FBQ0EsYUFBQSxtQkFBQSxRQUFBLEdBREE7QUFFQSxnQkFBQSxLQUZBO0FBR0EsY0FBQTtBQUhBLE9BQUEsRUFLQSxJQUxBLENBS0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxlQUFBLFNBQUEsSUFBQTtBQUNBLE9BUEEsQ0FBQTtBQVFBLEtBckRBOztBQXVEQSxpQkFBQSxxQkFBQSxTQUFBLEVBQUE7QUFDQSxhQUFBLElBQUE7QUFDQTs7QUF6REEsR0FBQTs7QUE2REEsU0FBQSxVQUFBO0FBQ0EsQ0FsRUE7O0FBcUVBLElBQUEsU0FBQSxDQUFBLE9BQUEsRUFBQSxZQUFBO0FBQ0EsU0FBQTtBQUNBLGdCQUFBLElBREE7QUFFQSxjQUFBLElBRkE7QUFHQSxXQUFBO0FBQ0Esc0JBQUEsR0FEQTtBQUVBLHdCQUFBLEdBRkE7QUFHQSx3QkFBQTtBQUhBLEtBSEE7QUFRQSxjQUFBO0FBUkEsR0FBQTtBQVVBLENBWEE7O0FBYUEsSUFBQSxTQUFBLENBQUEsT0FBQSxFQUFBLFlBQUE7QUFDQSxTQUFBO0FBQ0EsZ0JBQUEsSUFEQTtBQUVBLGNBQUEsR0FGQTtBQUdBLFdBQUE7QUFDQSxzQkFBQSxHQURBO0FBRUEseUJBQUEsR0FGQTtBQUdBLHNCQUFBLEdBSEE7QUFJQSw4QkFBQTtBQUpBLEtBSEE7QUFTQSxjQUFBO0FBVEEsR0FBQTtBQVdBLENBWkE7O0FDamNBLElBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxZQUFBO0FBQ0EsU0FBQTs7QUFFQSxnQkFBQSxvQkFBQSxlQUFBLEVBQUEsV0FBQSxFQUFBO0FBQ0EsYUFBQSxDQUFBO0FBQ0EsZUFBQSxPQURBO0FBRUEsZUFBQTtBQUZBLE9BQUEsRUFHQTtBQUNBLGVBQUEsS0FEQTtBQUVBLGVBQUE7QUFGQSxPQUhBLEVBTUE7QUFDQSxlQUFBLEtBREE7QUFFQSxlQUFBO0FBRkEsT0FOQSxFQVNBO0FBQ0EsZUFBQSxLQURBO0FBRUEsZUFBQTtBQUZBLE9BVEEsQ0FBQTtBQWFBO0FBaEJBLEdBQUE7QUFrQkEsQ0FuQkE7O0FBcUJBLElBQUEsU0FBQSxDQUFBLFVBQUEsRUFBQSxVQUFBLE9BQUEsRUFBQSxXQUFBLEVBQUE7QUFDQSxTQUFBO0FBQ0EsY0FBQSxHQURBO0FBRUEsaUJBQUEsMENBRkE7QUFHQSxVQUFBLGNBQUEsS0FBQSxFQUFBLElBQUEsRUFBQSxLQUFBLEVBQUE7QUFDQSxVQUFBLEtBQUEsUUFBQSxFQUFBO0FBQ0EsVUFBQSxRQUFBLEdBQUE7QUFDQSxVQUFBLFNBQUEsR0FBQTtBQUNBLFVBQUEsU0FBQSxHQUFBO0FBQ0EsVUFBQSxTQUFBLEdBQUEsS0FBQSxDQUFBLFVBQUEsRUFBQTs7QUFFQSxVQUFBLFVBQUEsWUFBQSxVQUFBLEVBQUE7O0FBRUEsVUFBQSxNQUFBLEdBQUEsTUFBQSxDQUFBLEdBQUEsR0FDQSxLQURBLENBQ0EsVUFBQSxDQUFBLEVBQUE7QUFDQSxlQUFBLEVBQUEsS0FBQTtBQUNBLE9BSEEsQ0FBQTs7QUFLQSxVQUFBLE1BQUEsR0FBQSxHQUFBLENBQUEsR0FBQSxHQUNBLFdBREEsQ0FDQSxNQURBLENBQUE7O0FBR0EsVUFBQSxVQUFBLEdBQUEsTUFBQSxDQUFBLFFBQUEsRUFBQSxNQUFBLENBQUEsS0FBQSxFQUNBLElBREEsQ0FDQSxPQURBLEVBQ0EsS0FEQSxFQUVBLElBRkEsQ0FFQSxRQUZBLEVBRUEsTUFGQSxFQUdBLE1BSEEsQ0FHQSxHQUhBLEVBSUEsSUFKQSxDQUlBLFdBSkEsRUFJQSxnQkFBQSxRQUFBLE1BQUEsSUFBQSxHQUFBLElBQUEsU0FBQSxNQUFBLElBQUEsR0FKQSxFQUtBLFNBTEEsQ0FLQSxNQUxBLEVBS0EsSUFMQSxDQUtBLElBQUEsT0FBQSxDQUxBLEM7QUFBQSxPQU1BLEtBTkEsR0FNQSxNQU5BLENBTUEsR0FOQSxFQU9BLElBUEEsQ0FPQSxPQVBBLEVBT0EsT0FQQSxDQUFBOztBQVNBLFVBQUEsU0FBQSxHQUFBLFNBQUEsQ0FBQSxTQUFBLEVBQ0EsTUFEQSxDQUNBLE1BREEsRUFFQSxJQUZBLENBRUEsTUFGQSxFQUVBLFVBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQTtBQUNBLGVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxPQUpBLEVBS0EsSUFMQSxDQUtBLEdBTEEsRUFLQSxHQUxBLENBQUEsQzs7QUFPQSxVQUFBLE9BQUEsR0FBQSxTQUFBLENBQUEsU0FBQSxFQUNBLE1BREEsQ0FDQSxNQURBLEVBRUEsSUFGQSxDQUVBLFVBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQTs7QUFFQSxlQUFBLEVBQUEsSUFBQSxDQUFBLEtBQUE7QUFDQSxPQUxBLEVBTUEsSUFOQSxDQU1B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QUE7QUFxQkEsQ0F0QkE7O0FDbkJBLElBQUEsT0FBQSxDQUFBLGFBQUEsRUFBQSxZQUFBO0FBQ0EsU0FBQTs7QUFFQSxnQkFBQSxvQkFBQSxlQUFBLEVBQUEsV0FBQSxFQUFBO0FBQ0EsYUFBQSxDQUFBO0FBQ0EsZUFBQSxPQURBO0FBRUEsZUFBQTtBQUZBLE9BQUEsRUFHQTtBQUNBLGVBQUEsS0FEQTtBQUVBLGVBQUE7QUFGQSxPQUhBLEVBTUE7QUFDQSxlQUFBLEtBREE7QUFFQSxlQUFBO0FBRkEsT0FOQSxFQVNBO0FBQ0EsZUFBQSxLQURBO0FBRUEsZUFBQTtBQUZBLE9BVEEsQ0FBQTtBQWFBO0FBaEJBLEdBQUE7QUFrQkEsQ0FuQkE7O0FBcUJBLElBQUEsU0FBQSxDQUFBLFVBQUEsRUFBQSxVQUFBLE9BQUEsRUFBQSxXQUFBLEVBQUE7QUFDQSxTQUFBO0FBQ0EsY0FBQSxHQURBO0FBRUEsaUJBQUEsaURBRkE7QUFHQSxVQUFBLGNBQUEsS0FBQSxFQUFBLElBQUEsRUFBQSxLQUFBLEVBQUE7QUFDQSxVQUFBLEtBQUEsUUFBQSxFQUFBO0FBQ0EsVUFBQSxRQUFBLEdBQUE7QUFDQSxVQUFBLFNBQUEsR0FBQTtBQUNBLFVBQUEsU0FBQSxHQUFBO0FBQ0EsVUFBQSxTQUFBLEdBQUEsS0FBQSxDQUFBLFVBQUEsRUFBQTs7QUFFQSxVQUFBLFVBQUEsWUFBQSxVQUFBLEVBQUE7O0FBRUEsVUFBQSxNQUFBLEdBQUEsTUFBQSxDQUFBLEdBQUEsR0FDQSxLQURBLENBQ0EsVUFBQSxDQUFBLEVBQUE7QUFDQSxlQUFBLEVBQUEsS0FBQTtBQUNBLE9BSEEsQ0FBQTs7QUFLQSxVQUFBLE1BQUEsR0FBQSxHQUFBLENBQUEsR0FBQSxHQUNBLFdBREEsQ0FDQSxNQURBLENBQUE7O0FBR0EsVUFBQSxVQUFBLEdBQUEsTUFBQSxDQUFBLFFBQUEsRUFBQSxNQUFBLENBQUEsS0FBQSxFQUNBLElBREEsQ0FDQSxPQURBLEVBQ0EsS0FEQSxFQUVBLElBRkEsQ0FFQSxRQUZBLEVBRUEsTUFGQSxFQUdBLE1BSEEsQ0FHQSxHQUhBLEVBSUEsSUFKQSxDQUlBLFdBSkEsRUFJQSxnQkFBQSxRQUFBLE1BQUEsSUFBQSxHQUFBLElBQUEsU0FBQSxNQUFBLElBQUEsR0FKQSxFQUtBLFNBTEEsQ0FLQSxNQUxBLEVBS0EsSUFMQSxDQUtBLElBQUEsT0FBQSxDQUxBLEM7QUFBQSxPQU1BLEtBTkEsR0FNQSxNQU5BLENBTUEsR0FOQSxFQU9BLElBUEEsQ0FPQSxPQVBBLEVBT0EsT0FQQSxDQUFBOztBQVNBLFVBQUEsU0FBQSxHQUFBLFNBQUEsQ0FBQSxTQUFBLEVBQ0EsTUFEQSxDQUNBLE1BREEsRUFFQSxJQUZBLENBRUEsTUFGQSxFQUVBLFVBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQTtBQUNBLGVBQUEsT0FBQSxDQUFBLENBQUE7QUFDQSxPQUpBLEVBS0EsSUFMQSxDQUtBLEdBTEEsRUFLQSxHQUxBLENBQUEsQzs7QUFPQSxVQUFBLE9BQUEsR0FBQSxTQUFBLENBQUEsU0FBQSxFQUNBLE1BREEsQ0FDQSxNQURBLEVBRUEsSUFGQSxDQUVBLFVBQUEsQ0FBQSxFQUFBLENBQUEsRUFBQTs7QUFFQSxlQUFBLEVBQUEsSUFBQSxDQUFBLEtBQUE7QUFDQSxPQUxBLEVBTUEsSUFOQSxDQU1BLGFBTkEsRUFNQSxRQU5BLEVBT0EsSUFQQSxDQU9BLE1BUEEsRUFPQSxPQVBBLEVBUUEsSUFSQSxDQVFBLFdBUkEsRUFRQSxVQUFBLENBQUEsRUFBQTtBQUNBLFVBQUEsV0FBQSxHQUFBLENBQUE7QUFDQSxVQUFBLFdBQUEsR0FBQSxNQUFBO0FBQ0EsZUFBQSxlQUFBLElBQUEsUUFBQSxDQUFBLENBQUEsQ0FBQSxHQUFBLEdBQUE7QUFFQSxPQWJBLENBQUE7QUFjQTtBQWxEQSxHQUFBO0FBb0RBLENBckRBIiwiZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG53aW5kb3cuYXBwID0gYW5ndWxhci5tb2R1bGUoJ0Z1bGxzdGFja0dlbmVyYXRlZEFwcCcsIFsnZnNhUHJlQnVpbHQnLCAndWkucm91dGVyJywgJ3VpLmJvb3RzdHJhcCcsICduZ0FuaW1hdGUnLCdzY2hlbWFGb3JtJ10pO1xuXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XG4gICAgLy8gVGhpcyB0dXJucyBvZmYgaGFzaGJhbmcgdXJscyAoLyNhYm91dCkgYW5kIGNoYW5nZXMgaXQgdG8gc29tZXRoaW5nIG5vcm1hbCAoL2Fib3V0KVxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgICAvLyBJZiB3ZSBnbyB0byBhIFVSTCB0aGF0IHVpLXJvdXRlciBkb2Vzbid0IGhhdmUgcmVnaXN0ZXJlZCwgZ28gdG8gdGhlIFwiL1wiIHVybC5cbiAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyk7XG4gICAgLy8gVHJpZ2dlciBwYWdlIHJlZnJlc2ggd2hlbiBhY2Nlc3NpbmcgYW4gT0F1dGggcm91dGVcbiAgICAkdXJsUm91dGVyUHJvdmlkZXIud2hlbignL2F1dGgvOnByb3ZpZGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgfSk7XG59KTtcblxuLy8gVGhpcyBhcHAucnVuIGlzIGZvciBjb250cm9sbGluZyBhY2Nlc3MgdG8gc3BlY2lmaWMgc3RhdGVzLlxuYXBwLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgLy8gVGhlIGdpdmVuIHN0YXRlIHJlcXVpcmVzIGFuIGF1dGhlbnRpY2F0ZWQgdXNlci5cbiAgICB2YXIgZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgICAgICByZXR1cm4gc3RhdGUuZGF0YSAmJiBzdGF0ZS5kYXRhLmF1dGhlbnRpY2F0ZTtcbiAgICB9O1xuXG4gICAgLy8gJHN0YXRlQ2hhbmdlU3RhcnQgaXMgYW4gZXZlbnQgZmlyZWRcbiAgICAvLyB3aGVuZXZlciB0aGUgcHJvY2VzcyBvZiBjaGFuZ2luZyBhIHN0YXRlIGJlZ2lucy5cbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zKSB7XG5cbiAgICAgICAgaWYgKCFkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoKHRvU3RhdGUpKSB7XG4gICAgICAgICAgICAvLyBUaGUgZGVzdGluYXRpb24gc3RhdGUgZG9lcyBub3QgcmVxdWlyZSBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSkge1xuICAgICAgICAgICAgLy8gVGhlIHVzZXIgaXMgYXV0aGVudGljYXRlZC5cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYW5jZWwgbmF2aWdhdGluZyB0byBuZXcgc3RhdGUuXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgLy8gSWYgYSB1c2VyIGlzIHJldHJpZXZlZCwgdGhlbiByZW5hdmlnYXRlIHRvIHRoZSBkZXN0aW5hdGlvblxuICAgICAgICAgICAgLy8gKHRoZSBzZWNvbmQgdGltZSwgQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkgd2lsbCB3b3JrKVxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlLCBpZiBubyB1c2VyIGlzIGxvZ2dlZCBpbiwgZ28gdG8gXCJsb2dpblwiIHN0YXRlLlxuICAgICAgICAgICAgaWYgKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28odG9TdGF0ZS5uYW1lLCB0b1BhcmFtcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICB9KTtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgLy8gUmVnaXN0ZXIgb3VyICphYm91dCogc3RhdGUuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2Fib3V0Jywge1xuICAgICAgICB1cmw6ICcvYWJvdXQnLFxuICAgICAgICBjb250cm9sbGVyOiAnQWJvdXRDb250cm9sbGVyJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9hYm91dC9hYm91dC5odG1sJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0Fib3V0Q29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUpIHtcblxuXG5cbn0pOyIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2RvY3MnLCB7XG4gICAgICAgIHVybDogJy9kb2NzJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9kb2NzL2RvY3MuaHRtbCdcbiAgICB9KTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaG9tZScsIHtcbiAgICAgICAgdXJsOiAnLycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvaG9tZS9ob21lLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOidIb21lQ29udHJvbCcsXG4gICAgICAgIHJlc29sdmU6IHtcbiAgICAgICAgICBwcm9qZWN0czogZnVuY3Rpb24oUHJvamVjdEZhY3RvcnksJHN0YXRlUGFyYW1zKXtcbiAgICAgICAgICAgIGlmKCRzdGF0ZVBhcmFtcy5pZCl7XG5cbiAgICAgICAgICAgICAgcmV0dXJuIFByb2plY3RGYWN0b3J5LmdldE9uZSgkc3RhdGVQYXJhbXMuaWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfSxcbiAgICAgICAgICAvLyB1c2VyOiBmdW5jdGlvbihBdXRoU2VydmljZSl7XG4gICAgICAgICAgLy8gICByZXR1cm4gQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCk7XG4gICAgICAgICAgLy8gfVxuICAgICAgICB9XG4gICAgfSk7XG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0hvbWVDb250cm9sJywgZnVuY3Rpb24oJHNjb3BlLHByb2plY3RzLCRyb290U2NvcGUsQXV0aFNlcnZpY2UsQVVUSF9FVkVOVFMsJHN0YXRlUGFyYW1zLFByb2plY3RGYWN0b3J5LCRzdGF0ZSl7XG4gICRzY29wZS5wcm9qZWN0cz1wcm9qZWN0cztcbiAgJHNjb3BlLmhlbGxvPSRzdGF0ZVBhcmFtcy5pZDtcblxuICAkc2NvcGUuaXNMb2dnZWRJbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XG4gICAgICAgICAgICB9O1xuXG4gIHZhciBnZXRVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdXNlclxuICAgICAgICAgICAgICAgIH0pLnRoZW4oZ2V0UHJvamVjdHMpO1xuICAgICAgICAgICAgfTtcbiAgdmFyIGdldFByb2plY3RzID0gZnVuY3Rpb24gKHVzZXIpIHtcblxuICAgICAgICAgICAgICBpZih1c2VyKXtcbiAgICAgICAgICAgICAgICBQcm9qZWN0RmFjdG9yeS5nZXRBbGxCeVVzZXIoJHNjb3BlLnVzZXIuX2lkKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbihwcm9qZWN0cyl7XG4gICAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnByb2plY3RzPXByb2plY3RzO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICRzY29wZS5hZGRQcm9qZWN0ID0gZnVuY3Rpb24oKXtcbiAgICBsZXQgX3VzZXI9IG51bGw7XG5cbiAgICBpZihBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSl7XG4gICAgICBfdXNlcj0kc2NvcGUudXNlcjtcbiAgICB9XG5cbiAgICByZXR1cm4gUHJvamVjdEZhY3RvcnkuYWRkKHtcbiAgICAgICAgbmFtZTokc2NvcGUucHJvamVjdE5hbWUsXG4gICAgICAgIHVzZXI6X3VzZXJcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24obmV3UHJvamVjdCl7XG4gICAgICAgICRzdGF0ZS5nbygncHJvamVjdCcse2lkOm5ld1Byb2plY3QuX2lkfSk7XG4gICAgICB9KVxuICB9O1xuXG4gIGdldFVzZXIoKTtcblxuXG59KTsiLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvZ2luJywge1xuICAgICAgICB1cmw6ICcvbG9naW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL2xvZ2luLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0xvZ2luQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgICRzY29wZS5sb2dpbiA9IHt9O1xuICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAkc2NvcGUuc2VuZExvZ2luID0gZnVuY3Rpb24gKGxvZ2luSW5mbykge1xuXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UubG9naW4obG9naW5JbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xuICAgICAgICB9KTtcblxuICAgIH07XG5cbn0pOyIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvLyBIb3BlIHlvdSBkaWRuJ3QgZm9yZ2V0IEFuZ3VsYXIhIER1aC1kb3kuXG4gICAgaWYgKCF3aW5kb3cuYW5ndWxhcikgdGhyb3cgbmV3IEVycm9yKCdJIGNhblxcJ3QgZmluZCBBbmd1bGFyIScpO1xuXG4gICAgdmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdmc2FQcmVCdWlsdCcsIFtdKTtcblxuXG5cbiAgICAvLyBBVVRIX0VWRU5UUyBpcyB1c2VkIHRocm91Z2hvdXQgb3VyIGFwcCB0b1xuICAgIC8vIGJyb2FkY2FzdCBhbmQgbGlzdGVuIGZyb20gYW5kIHRvIHRoZSAkcm9vdFNjb3BlXG4gICAgLy8gZm9yIGltcG9ydGFudCBldmVudHMgYWJvdXQgYXV0aGVudGljYXRpb24gZmxvdy5cbiAgICBhcHAuY29uc3RhbnQoJ0FVVEhfRVZFTlRTJywge1xuICAgICAgICBsb2dpblN1Y2Nlc3M6ICdhdXRoLWxvZ2luLXN1Y2Nlc3MnLFxuICAgICAgICBsb2dpbkZhaWxlZDogJ2F1dGgtbG9naW4tZmFpbGVkJyxcbiAgICAgICAgbG9nb3V0U3VjY2VzczogJ2F1dGgtbG9nb3V0LXN1Y2Nlc3MnLFxuICAgICAgICBzZXNzaW9uVGltZW91dDogJ2F1dGgtc2Vzc2lvbi10aW1lb3V0JyxcbiAgICAgICAgbm90QXV0aGVudGljYXRlZDogJ2F1dGgtbm90LWF1dGhlbnRpY2F0ZWQnLFxuICAgICAgICBub3RBdXRob3JpemVkOiAnYXV0aC1ub3QtYXV0aG9yaXplZCdcbiAgICB9KTtcblxuICAgIGFwcC5mYWN0b3J5KCdBdXRoSW50ZXJjZXB0b3InLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHEsIEFVVEhfRVZFTlRTKSB7XG4gICAgICAgIHZhciBzdGF0dXNEaWN0ID0ge1xuICAgICAgICAgICAgNDAxOiBBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLFxuICAgICAgICAgICAgNDAzOiBBVVRIX0VWRU5UUy5ub3RBdXRob3JpemVkLFxuICAgICAgICAgICAgNDE5OiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCxcbiAgICAgICAgICAgIDQ0MDogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXRcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3BvbnNlRXJyb3I6IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChzdGF0dXNEaWN0W3Jlc3BvbnNlLnN0YXR1c10sIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYXBwLmNvbmZpZyhmdW5jdGlvbiAoJGh0dHBQcm92aWRlcikge1xuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFtcbiAgICAgICAgICAgICckaW5qZWN0b3InLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCRpbmplY3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiAkaW5qZWN0b3IuZ2V0KCdBdXRoSW50ZXJjZXB0b3InKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSk7XG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnQXV0aFNlcnZpY2UnLCBmdW5jdGlvbiAoJGh0dHAsIFNlc3Npb24sICRyb290U2NvcGUsIEFVVEhfRVZFTlRTLCAkcSkge1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uU3VjY2Vzc2Z1bExvZ2luKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICBTZXNzaW9uLmNyZWF0ZShkYXRhLmlkLCBkYXRhLnVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcyk7XG4gICAgICAgICAgICByZXR1cm4gZGF0YS51c2VyO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlcyB0aGUgc2Vzc2lvbiBmYWN0b3J5IHRvIHNlZSBpZiBhblxuICAgICAgICAvLyBhdXRoZW50aWNhdGVkIHVzZXIgaXMgY3VycmVudGx5IHJlZ2lzdGVyZWQuXG4gICAgICAgIHRoaXMuaXNBdXRoZW50aWNhdGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICEhU2Vzc2lvbi51c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZ2V0TG9nZ2VkSW5Vc2VyID0gZnVuY3Rpb24gKGZyb21TZXJ2ZXIpIHtcblxuICAgICAgICAgICAgLy8gSWYgYW4gYXV0aGVudGljYXRlZCBzZXNzaW9uIGV4aXN0cywgd2VcbiAgICAgICAgICAgIC8vIHJldHVybiB0aGUgdXNlciBhdHRhY2hlZCB0byB0aGF0IHNlc3Npb25cbiAgICAgICAgICAgIC8vIHdpdGggYSBwcm9taXNlLiBUaGlzIGVuc3VyZXMgdGhhdCB3ZSBjYW5cbiAgICAgICAgICAgIC8vIGFsd2F5cyBpbnRlcmZhY2Ugd2l0aCB0aGlzIG1ldGhvZCBhc3luY2hyb25vdXNseS5cblxuICAgICAgICAgICAgLy8gT3B0aW9uYWxseSwgaWYgdHJ1ZSBpcyBnaXZlbiBhcyB0aGUgZnJvbVNlcnZlciBwYXJhbWV0ZXIsXG4gICAgICAgICAgICAvLyB0aGVuIHRoaXMgY2FjaGVkIHZhbHVlIHdpbGwgbm90IGJlIHVzZWQuXG5cbiAgICAgICAgICAgIGlmICh0aGlzLmlzQXV0aGVudGljYXRlZCgpICYmIGZyb21TZXJ2ZXIgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEud2hlbihTZXNzaW9uLnVzZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYWtlIHJlcXVlc3QgR0VUIC9zZXNzaW9uLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIHVzZXIsIGNhbGwgb25TdWNjZXNzZnVsTG9naW4gd2l0aCB0aGUgcmVzcG9uc2UuXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgNDAxIHJlc3BvbnNlLCB3ZSBjYXRjaCBpdCBhbmQgaW5zdGVhZCByZXNvbHZlIHRvIG51bGwuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvc2Vzc2lvbicpLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dpbiA9IGZ1bmN0aW9uIChjcmVkZW50aWFscykge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9sb2dpbicsIGNyZWRlbnRpYWxzKVxuICAgICAgICAgICAgICAgIC50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoeyBtZXNzYWdlOiAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2xvZ291dCcpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFNlc3Npb24uZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnU2Vzc2lvbicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUykge1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmlkID0gbnVsbDtcbiAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcblxuICAgICAgICB0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uIChzZXNzaW9uSWQsIHVzZXIpIHtcbiAgICAgICAgICAgIHRoaXMuaWQgPSBzZXNzaW9uSWQ7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSB1c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG59KSgpO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgndmlld2VyJywge1xuICAgICAgICB1cmw6ICcvdmlld2VyJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy92aWV3ZXIvdmlldy5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjondmlld2VyQ29udHJvbCdcbiAgICAgICAgLy8gcmVzb2x2ZToge1xuICAgICAgICAvLyAgIHByb2plY3RzOiBmdW5jdGlvbihQcm9qZWN0RmFjdG9yeSwkc3RhdGVQYXJhbXMpe1xuICAgICAgICAvLyAgICAgaWYoJHN0YXRlUGFyYW1zLmlkKXtcblxuICAgICAgICAvLyAgICAgICByZXR1cm4gUHJvamVjdEZhY3RvcnkuZ2V0T25lKCRzdGF0ZVBhcmFtcy5pZCk7XG4gICAgICAgIC8vICAgICB9XG4gICAgICAgIC8vICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgLy8gICB9LFxuICAgICAgICAgIC8vIHVzZXI6IGZ1bmN0aW9uKEF1dGhTZXJ2aWNlKXtcbiAgICAgICAgICAvLyAgIHJldHVybiBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKTtcbiAgICAgICAgICAvLyB9XG4gICAgICAgIC8vfVxuICAgIH0pO1xufSk7XG5cblxuYXBwLmNvbnRyb2xsZXIoJ3ZpZXdlckNvbnRyb2wnLCBmdW5jdGlvbigkc2NvcGUpe1xuXG5cbn0pIiwiYXBwLmNvbmZpZyhmdW5jdGlvbigkc3RhdGVQcm92aWRlcikge1xuICAkc3RhdGVQcm92aWRlci5cbiAgc3RhdGUoJ3Byb2plY3QnLCB7XG4gICAgdXJsOiAnL3Byb2plY3QvOmlkJyxcbiAgICB0ZW1wbGF0ZVVybDogJy9qcy9wcm9qZWN0cy9wcm9qZWN0LmVkaXQuaHRtbCcsXG4gICAgY29udHJvbGxlcjonUHJvamVjdEVkaXRDdHJsJyxcbiAgICByZXNvbHZlOiB7XG4gICAgICBwcm9qZWN0OiBmdW5jdGlvbihQcm9qZWN0RmFjdG9yeSwkc3RhdGVQYXJhbXMpIHtcbiAgICAgICAgcmV0dXJuIFByb2plY3RGYWN0b3J5LmdldE9uZSgkc3RhdGVQYXJhbXMuaWQpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG59KTsiLCJcbmFwcC5jb250cm9sbGVyKCdQcm9qZWN0RWRpdEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsJGNvbXBpbGUsJHRpbWVvdXQpe1xuICAvLyRzY29wZS5wcm9qZWN0PXByb2plY3Q7XG4gIC8vJHNjb3BlLnJvd3M9cHJvamVjdC5jb25maWdbMF0ucGFnZXMucGFnZV8xLnJvd3Ncbi8vIHRoaXMgaXMgdGhlIGFwcCBjb25maWcgXG5cbiRzY29wZS5hcHBDb25maWdNYXN0ZXI9e307IC8vIHRoaXMgdGhlIHZlcnNpb24gdGhhdCBpcyBpbiBzeW5jIHdpdGggdGhlIGRhdGFiYXNlIDB0aCBwb3NpdGlvblxuJHNjb3BlLmFwcENvbmZpZ0VkaXRDb3B5PXt9OyAvLyB0aGlzIGlzIHRoZSBjb3B5IG9mIG9mIG9iamVjdCBiZWluZyBlZGl0ZWQgdGhhdCBjb3BpZWQgdG8gYXBwQ29uZmlnVmlld0RyaXZlciB3aGVuO1xuJHNjb3BlLmFwcENvbmZpZ1ZpZXdEcml2ZXI9e307IC8vIHRoaXMgaXMgdGhlIGNvcHkgb2Ygb2Ygb2JqZWN0IGJlaW5nIGVkaXRlZCB0aGF0IGNvcGllZCB0byBhcHBDb25maWdWaWV3RHJpdmVyIHdoZW5cblxuJHNjb3BlLnNjaGVtYSA9IHtcbiAgICAndHlwZSc6ICdvYmplY3QnLFxuICAgICd0aXRsZSc6ICdTb2xvIFRhYmxlJyxcbiAgICAncHJvcGVydGllcyc6IHtcbiAgICAgICdjbGFzcyc6IHtcbiAgICAgICAgJ3RpdGxlJzogJ0NsYXNzJyxcbiAgICAgICAgJ3R5cGUnOiAnc3RyaW5nJ1xuICAgICAgfSxcbiAgICAgICdpbmZvX3NvdXJjZSc6IHtcbiAgICAgICAgJ3RpdGxlJzogJ0luZm8gU291cmNlJyxcbiAgICAgICAgJ3R5cGUnOiAnc3RyaW5nJ1xuICAgICAgfSxcbiAgICAgICdpbmZvX3R5cGUnOiB7XG4gICAgICAgICd0aXRsZSc6ICdJbmZvIFR5cGUnLFxuICAgICAgICAndHlwZSc6ICdzdHJpbmcnLFxuICAgICAgICAnZW51bSc6IFsnanNvbicsICdjc3YnXVxuICAgICAgfVxuICAgIH1cbiAgfTtcblxuJHNjb3BlLm1vZGVsID0ge1xuICAgICdpbmZvX3NvdXJjZSc6ICdKb25haCdcbiAgfTtcblxuJHNjb3BlLmZvcm0gPSBbXG4gICAgXCIqXCIsIHtcbiAgICAgIHR5cGU6IFwic3VibWl0XCIsXG4gICAgICB0aXRsZTogXCJTYXZlXCJcbiAgICB9XG5dO1xuXG4kc2NvcGUuYXBwQ29uZmlnPXtcbiAgICBwcm9qZWN0X25hbWUgOiAnb3VyZmlyc3QgYXBwJyxcbiAgICBwYWdlczp7XG4gICAgICAgIHBhZ2VfMTp7XG4gICAgICAgICAgYWlfZGlyZWN0aXZlIDogdHJ1ZSxcbiAgICAgICAgICBhaV9kaXJlY3RpdmVfdHlwZSA6ICdsYXlvdXQnLFxuICAgICAgICAgIGFpX2RpcmVjdGl2ZV9uYW1lIDogJ2FpX3BhZ2UnLFxuICAgICAgICAgIGFpX2RpcmVjdGl2ZV9wYWdlIDogJzEnLFxuICAgICAgICAgIGFpX2RpcmVjdGl2ZV9yb3cgOiAnJyxcbiAgICAgICAgICBhaV9kaXJlY3RpdmVfY29sIDogJycsXG4gICAgICAgICAgYWlfZGlyZWN0aXZlX2F0dHJpYnV0ZXMgOiB7ICBcbiAgICAgICAgICAgICAgYWlfY2xhc3MgOiAnL2Nzcy9yb3dfYS9zdHlsZS5jc3MnLFxuICAgICAgICAgICAgICBhaV9wYWdlX3RpdGxlOicnLFxuICAgICAgICAgICAgICBhaV9wYWdlX21lbnVfdGV4dCA6JydcbiAgICAgICAgICB9LFxuICAgICAgICAgIHJvd3M6e1xuICAgICAgICAgICAgICByb3dfMTp7XG4gICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmUgOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgYWlfZGlyZWN0aXZlX3R5cGUgOiAnbGF5b3V0JyxcbiAgICAgICAgICAgICAgICAgIGFpX2RpcmVjdGl2ZV9uYW1lIDogJ2FpX3JvdycsXG4gICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfcGFnZSA6ICcxJyxcbiAgICAgICAgICAgICAgICAgIGFpX2RpcmVjdGl2ZV9yb3cgOiAnMScsXG4gICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfY29sIDogJycsXG4gICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfYXR0cmlidXRlcyA6IHsgIFxuICAgICAgICAgICAgICAgICAgICAgIGFpX2NsYXNzIDogJy9jc3Mvcm93X2Evc3R5bGUuY3NzJyxcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICBjb2xzOntcbiAgICAgICAgICAgICAgICAgICAgICBjb2xfMTp7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFpX2RpcmVjdGl2ZSA6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFpX2RpcmVjdGl2ZV90eXBlIDogJ2xheW91dCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFpX2RpcmVjdGl2ZV9uYW1lIDogJ2FpX2NvbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFpX2RpcmVjdGl2ZV9wYWdlIDogJzEnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfcm93IDogJzEnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfY29sOiAnMScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGFpX2RpcmVjdGl2ZV9hdHRyaWJ1dGVzIDogeyAgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhaV9jbGFzcyA6ICcvY3NzL3Jvd19hL3N0eWxlLmNzcycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcyA6ICdjb2wtbWQtNidcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgYWlfY29udGVudDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmUgOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfdHlwZSA6ICdjb250ZW50JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWlfZGlyZWN0aXZlX25hbWUgOiAnc29sb190YWJsZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFpX2RpcmVjdGl2ZV9wYWdlIDogJzEnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfcm93IDogJzEnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfY29sOiAnMScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFpX2RpcmVjdGl2ZV9hdHRyaWJ1dGVzIDogeyBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFpX3RpdGxlOiAndGl0bGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWlfY2xhc3MgOiAnbXljbGFzcycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhaV9pbmZvX3NvdXJjZSA6ICdteWNsYXNzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFpX2luZm9fdHlwZSA6ICdmaWxlJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0sY29sXzI6e1xuICAgICAgICAgICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmUgOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfdHlwZSA6ICdsYXlvdXQnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfbmFtZSA6ICdhaV9jb2wnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfcGFnZSA6ICcxJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgYWlfZGlyZWN0aXZlX3JvdyA6ICcxJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgYWlfZGlyZWN0aXZlX2NvbDogJzInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfYXR0cmlidXRlcyA6IHsgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWlfY2xhc3MgOiAnbXljbGFzcycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcyA6ICdjb2wtbWQtNidcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgYWlfY29udGVudDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmUgOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfdHlwZSA6ICdjb250ZW50JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWlfZGlyZWN0aXZlX25hbWUgOiAnc29sb190YWJsZScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFpX2RpcmVjdGl2ZV9wYWdlIDogJzEnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfcm93IDogJzEnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfY29sIDogJzInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfYXR0cmlidXRlcyA6IHsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhaV90aXRsZTogJ3RpdGxlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFpX2NsYXNzIDogJ215Y2xhc3MnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWlfaW5mb19zb3VyY2UgOiAnbXljbGFzcycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhaV9pbmZvX3R5cGUgOiAnZmlsZSdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9ICBcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHJvd18yOntcbiAgICAgICAgICAgICAgICAgYWlfZGlyZWN0aXZlIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgIGFpX2RpcmVjdGl2ZV90eXBlIDogJ2xheW91dCcsXG4gICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfbmFtZSA6ICdhaV9yb3cnLFxuICAgICAgICAgICAgICAgICAgYWlfZGlyZWN0aXZlX3BhZ2UgOiAnMScsXG4gICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfcm93IDogJzInLFxuICAgICAgICAgICAgICAgICAgYWlfZGlyZWN0aXZlX2NvbCA6ICcnLCAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfYXR0cmlidXRlcyA6IHsgIFxuICAgICAgICAgICAgICAgICAgICAgIGFpX2NsYXNzIDogJy9jc3Mvcm93X2Evc3R5bGUuY3NzJyxcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgIGNvbHM6e1xuICAgICAgICAgICAgICAgICAgICAgICBjb2xfMTp7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmUgOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWlfZGlyZWN0aXZlX3R5cGUgOiAnbGF5b3V0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFpX2RpcmVjdGl2ZV9uYW1lIDogJ2FpX2NvbCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfcGFnZSA6ICcxJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFpX2RpcmVjdGl2ZV9yb3cgOiAnMicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfY29sOiAnMScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfYXR0cmlidXRlcyA6IHsgIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFpX2NsYXNzIDogJy9jc3Mvcm93X2Evc3R5bGUuY3NzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcyA6ICdjb2wtbWQtNidcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhaV9jb250ZW50OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWlfZGlyZWN0aXZlIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfdHlwZSA6ICdjb250ZW50JyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfbmFtZSA6ICdzb2xvX3RhYmxlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfcGFnZSA6ICcxJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfcm93IDogJzInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFpX2RpcmVjdGl2ZV9jb2wgOiAnMScsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWlfZGlyZWN0aXZlX2F0dHJpYnV0ZXMgOiB7IFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhaV90aXRsZTogJ3RpdGxlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWlfY2xhc3MgOiAnbXljbGFzcycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFpX2luZm9fc291cmNlIDogJ215Y2xhc3MnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhaV9pbmZvX3R5cGUgOiAnZmlsZSdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG5cbiRzY29wZS5yZW5kZXJhdHRyaWJ1dGVTdHJpbmc9ZnVuY3Rpb24ob2JqKXtcbiAgICB2YXIgYXR0cmlidXRlU3RyaW5nPScnO1xuICAgIGZvcih2YXIga2V5cyBpbiBvYmope1xuICAgICAgYXR0cmlidXRlU3RyaW5nKz1rZXlzKyc9XCInK29ialtrZXlzXSsnXCIgJztcbiAgICB9XG4gICAgcmV0dXJuIGF0dHJpYnV0ZVN0cmluZztcbn07XG5cbiRzY29wZS5yZW5kZXJSb3dIdG1sRnJvbUFpQ29uZmlnPWZ1bmN0aW9uKG9iaikge1xuICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eSgnYWlfZGlyZWN0aXZlJykpIHtcbiAgICAgICAgaWYoKG9iai5haV9kaXJlY3RpdmVfdHlwZSA9PT0nbGF5b3V0JykgJiYgKG9ialsnYWlfZGlyZWN0aXZlX25hbWUnXSA9PT0gJ2FpX3JvdycpKXtcbiAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudCh3b3JrYXJlYSkuYXBwZW5kKCRjb21waWxlKCc8JytvYmpbJ2FpX2RpcmVjdGl2ZV9uYW1lJ10rJyBpZD1cInBfJytvYmpbJ2FpX2RpcmVjdGl2ZV9wYWdlJ10rJ19yXycrb2JqWydhaV9kaXJlY3RpdmVfcm93J10rJ19haV9yb3dcIiAnKyAkc2NvcGUucmVuZGVyYXR0cmlidXRlU3RyaW5nKG9ialsnYWlfZGlyZWN0aXZlX2F0dHJpYnV0ZXMnXSkrJz48Lycrb2JqWydhaV9kaXJlY3RpdmVfbmFtZSddKyc+JykoJHNjb3BlKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAodmFyIHByb3BlcnR5IGluIG9iaikge1xuICAgICAgICAgICAgICAgIGlmKHR5cGVvZiBvYmpbcHJvcGVydHldID09IFwib2JqZWN0XCIpe1xuICAgICAgICAgICAgICAgICAgICAkc2NvcGUucmVuZGVyUm93SHRtbEZyb21BaUNvbmZpZyhvYmpbcHJvcGVydHldKTsgXG4gICAgICAgICAgICAgICAgfVxuICAgICAgfVxufTsgICAgXG4kc2NvcGUucmVuZGVyQ29sSHRtbEZyb21BaUNvbmZpZz1mdW5jdGlvbihvYmopIHtcbiAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkoJ2FpX2RpcmVjdGl2ZScpKSB7XG4gICAgICAgIGlmKChvYmpbJ2FpX2RpcmVjdGl2ZV90eXBlJ10gPT09J2xheW91dCcpICYmIChvYmpbJ2FpX2RpcmVjdGl2ZV9uYW1lJ10gPT09ICdhaV9jb2wnKSl7XG4gICAgICAgICAgICAgICAgICRzY29wZS5hcHBlbmRUYXJnZXQ9JyNwXycrb2JqWydhaV9kaXJlY3RpdmVfcGFnZSddKydfcl8nK29ialsnYWlfZGlyZWN0aXZlX3JvdyddKydfYWlfcm93JztcbiAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2cob2JqKTtcbiAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZWxlbWVudChkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCAkc2NvcGUuYXBwZW5kVGFyZ2V0ICkpLmFwcGVuZCgkY29tcGlsZSgnPCcrb2JqWydhaV9kaXJlY3RpdmVfbmFtZSddKycgaWQ9XCJwXycrb2JqWydhaV9kaXJlY3RpdmVfcGFnZSddKydfcl8nK29ialsnYWlfZGlyZWN0aXZlX3JvdyddKydfY18nK29ialsnYWlfZGlyZWN0aXZlX2NvbCddKydfYWlfY29sXCIgJysgJHNjb3BlLnJlbmRlcmF0dHJpYnV0ZVN0cmluZyhvYmpbJ2FpX2RpcmVjdGl2ZV9hdHRyaWJ1dGVzJ10pKyc+PC8nK29ialsnYWlfZGlyZWN0aXZlX25hbWUnXSsnPicpKCRzY29wZSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiBvYmopIHtcbiAgICAgICAgICAgICAgICBpZih0eXBlb2Ygb2JqW3Byb3BlcnR5XSA9PSBcIm9iamVjdFwiKXtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnJlbmRlckNvbEh0bWxGcm9tQWlDb25maWcob2JqW3Byb3BlcnR5XSk7IFxuICAgICAgICAgICAgICAgIH1cbiAgICAgIH1cbn07XG5cbiRzY29wZS5yZW5kZXJEaXJlY3RpdmVIdG1sRnJvbUFpQ29uZmlnPWZ1bmN0aW9uKG9iaikge1xuLy8gY29uc29sZS5sb2cob2JqKTtcbi8vIHRoZSBjdXVyZW50IG9iamVjdCBpcyBhIGRpcmVjdGl2ZSBcbi8vIGlmIHRoZSBjdXJyZW50IG9iamVjdCBpcyBub3QgYSBhIGRpcmVjdGl2ZSBvYmogdGhlbiBjYWxsIHdpdGggdG8gdGhlIG5leHQgc3ViLW9iamVjdFxuICAgICAgaWYgKG9iai5oYXNPd25Qcm9wZXJ0eSgnYWlfZGlyZWN0aXZlJykpIHtcbiAgICAgICAgaWYob2JqWydhaV9kaXJlY3RpdmVfdHlwZSddID09PSdjb250ZW50Jyl7XG4gICAgICAgICAgICAkc2NvcGUuYXBwZW5kVGFyZ2V0PScjcF8nK29ialsnYWlfZGlyZWN0aXZlX3BhZ2UnXSsnX3JfJytvYmpbJ2FpX2RpcmVjdGl2ZV9yb3cnXSsnX2NfJytvYmpbJ2FpX2RpcmVjdGl2ZV9jb2wnXSsnX2FpX2NvbCc7XG4gIC8vICAgICAgICAgIGNvbnNvbGUubG9nKCc+Pj4+Pj4+PicrICRzY29wZS5hcHBlbmRUYXJnZXQpO1xuICAgICAgICAgICAgYW5ndWxhci5lbGVtZW50KGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoICRzY29wZS5hcHBlbmRUYXJnZXQgKSkuYXBwZW5kKCRjb21waWxlKCc8JytvYmpbJ2FpX2RpcmVjdGl2ZV9uYW1lJ10rJyBpZD1cInBfJytvYmpbJ2FpX2RpcmVjdGl2ZV9wYWdlJ10rJ19yXycrb2JqWydhaV9kaXJlY3RpdmVfcm93J10rJ19jXycrb2JqWydhaV9kaXJlY3RpdmVfY29sJ10rJ1wiICcrJHNjb3BlLnJlbmRlcmF0dHJpYnV0ZVN0cmluZyhvYmpbJ2FpX2RpcmVjdGl2ZV9hdHRyaWJ1dGVzJ10pKyc+PC8nK29ialsnYWlfZGlyZWN0aXZlX25hbWUnXSsnPicpKCRzY29wZSkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiBvYmopIHtcbiAgICAgICAgICAgICAgICBpZih0eXBlb2Ygb2JqW3Byb3BlcnR5XSA9PSBcIm9iamVjdFwiKXtcbiAgICAgICAgICAgICAgICAgICAgJHNjb3BlLnJlbmRlckRpcmVjdGl2ZUh0bWxGcm9tQWlDb25maWcob2JqW3Byb3BlcnR5XSk7ICBcbiAgICAgICAgICAgICAgICB9XG4gICAgICB9XG59O1xuJHNjb3BlLiR3YXRjaCgnYXBwQ29uZmlnJyxmdW5jdGlvbigpe1xuICBhbGVydCgncnVubmluZycpO1xuICBhbmd1bGFyLmVsZW1lbnQod29ya2FyZWEpLmVtcHR5KCk7XG4gICRzY29wZS5yZW5kZXJSb3dIdG1sRnJvbUFpQ29uZmlnKCRzY29wZS5hcHBDb25maWcsICcnKTtcbiAgJHRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAkc2NvcGUucmVuZGVyQ29sSHRtbEZyb21BaUNvbmZpZygkc2NvcGUuYXBwQ29uZmlnLCAnJyk7XG4gIH0sMTAwKTtcbiAgJHRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgJHNjb3BlLnJlbmRlckRpcmVjdGl2ZUh0bWxGcm9tQWlDb25maWcoJHNjb3BlLmFwcENvbmZpZywgJycpO1xuICB9LDUwMCk7XG59LHRydWUpO1xuXG5cbiRzY29wZS5lZGl0VGVzdE9iamVjdD17XG4gICAgICBhaV9kaXJlY3RpdmUgOiB0cnVlLFxuICAgICAgYWlfZGlyZWN0aXZlX3R5cGUgOiAnbGF5b3V0JyxcbiAgICAgIGFpX2RpcmVjdGl2ZV9uYW1lIDogJ2FpX2NvbCcsXG4gICAgICBhaV9kaXJlY3RpdmVfcGFnZSA6ICcxJyxcbiAgICAgIGFpX2RpcmVjdGl2ZV9yb3cgOiAnMicsXG4gICAgICBhaV9kaXJlY3RpdmVfY29sOiAnMicsXG4gICAgICBhaV9kaXJlY3RpdmVfYXR0cmlidXRlcyA6IHsgIFxuICAgICAgICAgIGFpX2NsYXNzIDogJy9jc3Mvcm93X2Evc3R5bGUuY3NzJyxcbiAgICAgICAgICBjbGFzcyA6ICdjb2wtbWQtNidcbiAgICAgIH0sXG4gICAgICBhaV9jb250ZW50OiB7XG4gICAgICAgICAgICAgICAgYWlfZGlyZWN0aXZlIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfdHlwZSA6ICdjb250ZW50JyxcbiAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfbmFtZSA6ICdzb2xvX3RhYmxlJyxcbiAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfcGFnZSA6ICcxJyxcbiAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfcm93IDogJzInLFxuICAgICAgICAgICAgICAgIGFpX2RpcmVjdGl2ZV9jb2wgOiAnMicsXG4gICAgICAgICAgICAgICAgYWlfZGlyZWN0aXZlX2F0dHJpYnV0ZXMgOiB7IFxuICAgICAgICAgICAgICAgICAgICBhaV90aXRsZTogJ3RpdGxlJyxcbiAgICAgICAgICAgICAgICAgICAgYWlfY2xhc3MgOiAnbXljbGFzcycsXG4gICAgICAgICAgICAgICAgICAgIGFpX2luZm9fc291cmNlIDogJ215Y2xhc3MnLFxuICAgICAgICAgICAgICAgICAgICBhaV9pbmZvX3R5cGUgOiAnZmlsZSdcbiAgICAgICAgICAgICAgICB9XG4gICAgICB9XG59O1xuJHNjb3BlLmVkaXRUZXN0T2JqZWN0Mj17XG4gICAgICBhaV9kaXJlY3RpdmUgOiB0cnVlLFxuICAgICAgYWlfZGlyZWN0aXZlX3R5cGUgOiAnbGF5b3V0JyxcbiAgICAgIGFpX2RpcmVjdGl2ZV9uYW1lIDogJ2FpX2NvbCcsXG4gICAgICBhaV9kaXJlY3RpdmVfcGFnZSA6ICcxJyxcbiAgICAgIGFpX2RpcmVjdGl2ZV9yb3cgOiAnMicsXG4gICAgICBhaV9kaXJlY3RpdmVfY29sOiAnMicsXG4gICAgICBhaV9kaXJlY3RpdmVfYXR0cmlidXRlcyA6IHsgIFxuICAgICAgICAgIGFpX2NsYXNzIDogJy9jc3Mvcm93X2Evc3R5bGUuY3NzJyxcbiAgICAgICAgICBjbGFzcyA6ICdjb2wtbWQtNidcbiAgICAgIH0sXG4gICAgICBhaV9jb250ZW50OiB7XG4gICAgICAgICAgICAgICAgYWlfZGlyZWN0aXZlIDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfdHlwZSA6ICdjb250ZW50JyxcbiAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfbmFtZSA6ICdzb2xvX3RhYmxlJyxcbiAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfcGFnZSA6ICcxJyxcbiAgICAgICAgICAgICAgICBhaV9kaXJlY3RpdmVfcm93IDogJzInLFxuICAgICAgICAgICAgICAgIGFpX2RpcmVjdGl2ZV9jb2wgOiAnMicsXG4gICAgICAgICAgICAgICAgYWlfZGlyZWN0aXZlX2F0dHJpYnV0ZXMgOiB7IFxuICAgICAgICAgICAgICAgICAgICBhaV90aXRsZTogJ015IE5ldyBUaXRsZScsXG4gICAgICAgICAgICAgICAgICAgIGFpX2NsYXNzIDogJ215Y2xhc3MnLFxuICAgICAgICAgICAgICAgICAgICBhaV9pbmZvX3NvdXJjZSA6ICdteWNsYXNzJyxcbiAgICAgICAgICAgICAgICAgICAgYWlfaW5mb190eXBlIDogJ2ZpbGUnXG4gICAgICAgICAgICAgICAgfVxuICAgICAgfVxufTtcbi8vJHNjb3BlLmFwcENvbmZpZy5wYWdlcy5wYWdlXzEucm93cy5yb3dfMi5jb2xzLmNvbF8yPXt9O1xuXG4kc2NvcGUuY3JlYXRDb25maWdPYmplY3Q9ZnVuY3Rpb24odGFyZ2V0LG5ld2VsZW1lbnQsb2JqKXtcbiAgLy9jb25zb2xlLmxvZyh0eXBlb2YgdGFyZ2V0KTtcbiAgdGFyZ2V0W25ld2VsZW1lbnRdPW9iajtcbi8vICAkc2NvcGUuYXBwQ29uZmlnLnBhZ2VzLnBhZ2VfMS5yb3dzLnJvd18yLmNvbHMuY29sXzI9b2JqOyAgIFxufTtcbiRzY29wZS5yZWFkQ29uZmlnT2JqZWN0PWZ1bmN0aW9uKHRhcmdldCxuZXdlbGVtZW50KXtcbiAgLy9jb25zb2xlLmxvZyh0eXBlb2YgdGFyZ2V0KTtcbiAgdGFyZ2V0W25ld2VsZW1lbnRdPW9iajtcbi8vICAkc2NvcGUuYXBwQ29uZmlnLnBhZ2VzLnBhZ2VfMS5yb3dzLnJvd18yLmNvbHMuY29sXzI9b2JqOyAgIFxufTtcbiRzY29wZS51cGRhdGVDb25maWdPYmplY3Q9ZnVuY3Rpb24odGFyZ2V0LG5ld2VsZW1lbnQsb2JqKXtcbiAgLy9jb25zb2xlLmxvZyh0eXBlb2YgdGFyZ2V0KTtcbiAgdGFyZ2V0W25ld2VsZW1lbnRdPW9iajtcbi8vICAkc2NvcGUuYXBwQ29uZmlnLnBhZ2VzLnBhZ2VfMS5yb3dzLnJvd18yLmNvbHMuY29sXzI9b2JqOyAgIFxufTtcblxuJHNjb3BlLmRlbGV0ZWNvbmZpZ09iamVjdD1mdW5jdGlvbih0YXJnZXQsbmV3ZWxlbWVudCl7XG4gIC8vY29uc29sZS5sb2codHlwZW9mIHRhcmdldCk7XG4gIGRlbGV0ZSB0YXJnZXRbbmV3ZWxlbWVudF07XG4vLyAgJHNjb3BlLmFwcENvbmZpZy5wYWdlcy5wYWdlXzEucm93cy5yb3dfMi5jb2xzLmNvbF8yPW9iajsgICBcbn07XG5cbiRzY29wZS5nZXROZXh0Um93UGFnZT1mdW5jdGlvbihwYWdlKXtcbiAgdmFyIG5ld1JvdztcbiAgcmV0dXJuICBuZXdSb3c7XG4gfTtcbiRzY29wZS5nZXROZXh0Q29sdW1uSW5Sb3c9ZnVuY3Rpb24ocGFnZSxyb3cpe1xuICB2YXIgbmV3Q29sO1xuICByZXR1cm4gIG5ld0NvbDtcbn07XG5cblxuJHRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgJHNjb3BlLmNyZWF0Q29uZmlnT2JqZWN0KCRzY29wZS5hcHBDb25maWcucGFnZXMucGFnZV8xLnJvd3Mucm93XzIuY29scywnY29sXzInLCRzY29wZS5lZGl0VGVzdE9iamVjdCk7XG59LDMwMDApO1xuLypcbiR0aW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICRzY29wZS5yZWFkQ29uZmlnT2JqZWN0KCRzY29wZS5hcHBDb25maWcucGFnZXMucGFnZV8xLnJvd3Mucm93XzIuY29scywnY29sXzInLCRzY29wZS5lZGl0VGVzdE9iamVjdCk7XG59LDMwMDApO1xuKi9cbiR0aW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICRzY29wZS51cGRhdGVDb25maWdPYmplY3QoJHNjb3BlLmFwcENvbmZpZy5wYWdlcy5wYWdlXzEucm93cy5yb3dfMi5jb2xzLCdjb2xfMicsJHNjb3BlLmVkaXRUZXN0T2JqZWN0Mik7XG59LDYwMDApO1xuLypcbiR0aW1lb3V0KGZ1bmN0aW9uKCl7XG4gICAgICRzY29wZS5kZWxldGVjb25maWdPYmplY3QoJHNjb3BlLmFwcENvbmZpZy5wYWdlcy5wYWdlXzEucm93cy5yb3dfMi5jb2xzLCdjb2xfMicpO1xufSw5MDAwKTtcbiovXG5hcHAuY29udHJvbGxlcignUHJvamVjdEVkaXRDdHJsJywgZnVuY3Rpb24oJHNjb3BlKSB7XG5cbiAgJHNjb3BlLnNjaGVtYSA9IHtcbiAgICAndHlwZSc6ICdvYmplY3QnLFxuICAgICd0aXRsZSc6ICdTb2xvIFRhYmxlJyxcbiAgICAncHJvcGVydGllcyc6IHtcbiAgICAgICdjbGFzcyc6IHtcbiAgICAgICAgJ3RpdGxlJzogJ0NsYXNzJyxcbiAgICAgICAgJ3R5cGUnOiAnc3RyaW5nJ1xuICAgICAgfSxcbiAgICAgICdpbmZvX3NvdXJjZSc6IHtcbiAgICAgICAgJ3RpdGxlJzogJ0luZm8gU291cmNlJyxcbiAgICAgICAgJ3R5cGUnOiAnc3RyaW5nJ1xuICAgICAgfSxcbiAgICAgICdpbmZvX3R5cGUnOiB7XG4gICAgICAgICd0aXRsZSc6ICdJbmZvIFR5cGUnLFxuICAgICAgICAndHlwZSc6ICdzdHJpbmcnLFxuICAgICAgICAnZW51bSc6IFsnanNvbicsICdjc3YnXVxuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICAkc2NvcGUubW9kZWwgPSB7XG4gICAgJ2luZm9fc291cmNlJzogJ0pvbmFoJ1xuICB9O1xuXG4gICRzY29wZS5mb3JtID0gW1xuICAgIFwiKlwiLCB7XG4gICAgICB0eXBlOiBcInN1Ym1pdFwiLFxuICAgICAgdGl0bGU6IFwiU2F2ZVwiXG4gICAgfVxuICBdO1xuXG59KTtcblxufSk7XG5hcHAuZmFjdG9yeSgnUHJvamVjdEZhY3RvcnknLCBmdW5jdGlvbigkaHR0cCkge1xuICB2YXIgcHJvamVjdE9iajtcbiAgdmFyIF9wcm9qZWN0Q2FjaGUgPSBbXTtcblxuICBwcm9qZWN0T2JqID0ge1xuICAgIGdldEFsbDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3Byb2plY3RzJylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocHJvamVjdHMpIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhwcm9qZWN0cyk7XG4gICAgICAgICAgYW5ndWxhci5jb3B5KHByb2plY3RzLmRhdGEsIF9wcm9qZWN0Q2FjaGUpO1xuICAgICAgICAgIHJldHVybiBfcHJvamVjdENhY2hlO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgZ2V0QWxsQnlVc2VyOiBmdW5jdGlvbih1c2VySWQpe1xuICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9wcm9qZWN0cy91c2VyLycgKyB1c2VySWQpXG4gICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocHJvamVjdHMpe1xuICAgICAgICAgICAgY29uc29sZS5sb2cocHJvamVjdHMpO1xuICAgICAgICAgICAgYW5ndWxhci5jb3B5KHByb2plY3RzLmRhdGEsIF9wcm9qZWN0Q2FjaGUpO1xuICAgICAgICAgICAgcmV0dXJuIF9wcm9qZWN0Q2FjaGU7XG4gICAgICAgICAgfSlcbiAgICB9LFxuXG4gICAgZ2V0T25lOiBmdW5jdGlvbihpZCkge1xuICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9wcm9qZWN0cy8nICsgaWQpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHByb2plY3QpIHtcbiAgICAgICAgICByZXR1cm4gcHJvamVjdC5kYXRhO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgYWRkOiBmdW5jdGlvbihwcm9qZWN0KSB7XG4gICAgICByZXR1cm4gJGh0dHAoe1xuICAgICAgICAgICAgdXJsOiAnL2FwaS9wcm9qZWN0cy8nLFxuICAgICAgICAgICAgbWV0aG9kOiBcIlBPU1RcIixcbiAgICAgICAgICAgIGRhdGE6IHByb2plY3RcbiAgICAgIH0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKF9wcm9qZWN0KSB7XG4gICAgICAgICAgcmV0dXJuIF9wcm9qZWN0LmRhdGE7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBkZWxldGU6IGZ1bmN0aW9uKGlkKXtcbiAgICAgIHJldHVybiAkaHR0cC5kZWxldGUoJy9hcGkvcHJvamVjdHMvJyArIGlkKVxuICAgICAgICAudGhlbihmdW5jdGlvbihwcm9qZWN0KSB7XG4gICAgICAgICAgcmV0dXJuIHByb2plY3QuZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIHVwZGF0ZTogZnVuY3Rpb24ocHJvamVjdCkge1xuICAgICAgcmV0dXJuICRodHRwKHtcbiAgICAgICAgICAgIHVybDogJy9hcGkvcHJvamVjdHMvJyArIHByb2plY3QuX2lkLFxuICAgICAgICAgICAgbWV0aG9kOiBcIlBVVFwiLFxuICAgICAgICAgICAgZGF0YTogcHJvamVjdFxuICAgICAgfSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oX3Byb2plY3QpIHtcbiAgICAgICAgICByZXR1cm4gX3Byb2plY3QuZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIGdldERhdGFTZXRzOiBmdW5jdGlvbihwcm9kdWN0SWQpe1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gIH07XG5cbiAgcmV0dXJuIHByb2plY3RPYmo7XG59KTtcblxuXG5hcHAuZGlyZWN0aXZlKCdhaVJvdycsZnVuY3Rpb24oKXtcbiAgcmV0dXJue1xuICAgIHRyYW5zY2x1ZGUgOiB0cnVlLFxuICAgIHJlc3RyaWN0IDogJ0VBJyxcbiAgICBzY29wZSA6IHtcbiAgICAgIGluY2VwdFJvd09yZGVyIDogJ0AnLFxuICAgICAgaW5jZXB0Um93QmdDb2xvciA6ICAnQCcsXG4gICAgICBpbmNlcHRSb3dCZ0ltYWdlIDogICdAJyxcbiAgICB9LFxuICAgIHRlbXBsYXRlIDogICcnXG4gIH07XG59KTtcblxuYXBwLmRpcmVjdGl2ZSgnYWlDb2wnLGZ1bmN0aW9uKCl7XG4gIHJldHVybntcbiAgICB0cmFuc2NsdWRlIDogdHJ1ZSxcbiAgICByZXN0cmljdCA6ICdFJyxcbiAgICBzY29wZSA6IHtcbiAgICAgIGluY2VwdGlvbkNvbElkIDogJ0AnLFxuICAgICAgaW5jZXB0aW9uQ29sV2lkdGggOiAnQCcsXG4gICAgICBpbmNlcHRpb25Sb3dJZCA6ICdAJyxcbiAgICAgIGluY2VwdGlvbkNvbE9yZGVySW5Sb3cgOiAnQCdcbiAgICB9LFxuICAgIHRlbXBsYXRlIDogICcnXG4gIH07XG59KTtcblxuIiwiXG5hcHAuZmFjdG9yeSgnZGF0YUZhY3RvcnknLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHtcblxuICAgIGdldFBpZWRhdGE6IGZ1bmN0aW9uKHNvdXJjZV9sb2NhdGlvbiwgc291cmNlX3R5cGUpIHtcbiAgICAgIHJldHVybiBbe1xuICAgICAgICBsYWJlbDogXCJTdGV2ZVwiLFxuICAgICAgICB2YWx1ZTogNDBcbiAgICAgIH0sIHtcbiAgICAgICAgbGFiZWw6IFwiQm9iXCIsXG4gICAgICAgIHZhbHVlOiA2MFxuICAgICAgfSwge1xuICAgICAgICBsYWJlbDogXCJKZW5cIixcbiAgICAgICAgdmFsdWU6IDM1XG4gICAgICB9LCB7XG4gICAgICAgIGxhYmVsOiBcIkFteVwiLFxuICAgICAgICB2YWx1ZTogMTVcbiAgICAgIH1dO1xuICAgIH1cbiAgfVxufSk7XG5cbmFwcC5kaXJlY3RpdmUoJ2JhckdyYXBoJywgZnVuY3Rpb24oJHdpbmRvdywgZGF0YUZhY3RvcnkpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHRlbXBsYXRlVXJsOiAnanMvY2F0YWxvZy9kMy1iYXItZ3JhcGgtMS9iYXItZ3JhcGguaHRtbCcsXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW0sIGF0dHJzKSB7XG4gICAgICB2YXIgZDMgPSAkd2luZG93LmQzO1xuICAgICAgdmFyIHdpZHRoID0gNDAwO1xuICAgICAgdmFyIGhlaWdodCA9IDQwMDtcbiAgICAgIHZhciByYWRpdXMgPSAyMDA7XG4gICAgICB2YXIgY29sb3JzID0gZDMuc2NhbGUuY2F0ZWdvcnkxMCgpO1xuXG4gICAgICB2YXIgcGllZGF0YSA9IGRhdGFGYWN0b3J5LmdldFBpZWRhdGEoKTtcblxuICAgICAgdmFyIHBpZSA9IGQzLmxheW91dC5waWUoKVxuICAgICAgICAudmFsdWUoZnVuY3Rpb24oZCkge1xuICAgICAgICAgIHJldHVybiBkLnZhbHVlO1xuICAgICAgICB9KVxuXG4gICAgICB2YXIgYXJjID0gZDMuc3ZnLmFyYygpXG4gICAgICAgIC5vdXRlclJhZGl1cyhyYWRpdXMpXG5cbiAgICAgIHZhciBteUNoYXJ0ID0gZDMuc2VsZWN0KCcjY2hhcnQnKS5hcHBlbmQoJ3N2ZycpXG4gICAgICAgIC5hdHRyKCd3aWR0aCcsIHdpZHRoKVxuICAgICAgICAuYXR0cignaGVpZ2h0JywgaGVpZ2h0KVxuICAgICAgICAuYXBwZW5kKCdnJylcbiAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArICh3aWR0aCAtIHJhZGl1cykgKyAnLCcgKyAoaGVpZ2h0IC0gcmFkaXVzKSArICcpJylcbiAgICAgICAgLnNlbGVjdEFsbCgncGF0aCcpLmRhdGEocGllKHBpZWRhdGEpKSAvL3JldHVybnMgYW4gYXJyYXkgb2YgYXJjc1xuICAgICAgICAuZW50ZXIoKS5hcHBlbmQoJ2cnKVxuICAgICAgICAuYXR0cignY2xhc3MnLCAnc2xpY2UnKVxuXG4gICAgICB2YXIgc2xpY2VzID0gZDMuc2VsZWN0QWxsKCdnLnNsaWNlJylcbiAgICAgICAgLmFwcGVuZCgncGF0aCcpXG4gICAgICAgIC5hdHRyKCdmaWxsJywgZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICAgIHJldHVybiBjb2xvcnMoaSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5hdHRyKCdkJywgYXJjKSAvLyBwYXNzaW5nIGluIHRoZSBhcmMgZnVuY3Rpb25cblxuICAgICAgdmFyIHRleHQgPSBkMy5zZWxlY3RBbGwoJ2cuc2xpY2UnKVxuICAgICAgICAuYXBwZW5kKCd0ZXh0JylcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oZCwgaSkge1xuICAgICAgICAgIC8vZGF0YSBvYmplY3QuLlxuICAgICAgICAgIHJldHVybiBkLmRhdGEubGFiZWw7XG4gICAgICAgIH0pXG4gICAgICAgIC5hdHRyKCd0ZXh0LWFuY2hvcicsICdtaWRkbGUnKVxuICAgICAgICAuYXR0cignZmlsbCcsICd3aGl0ZScpXG4gICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCBmdW5jdGlvbihkKSB7XG4gICAgICAgICAgZC5pbm5lclJhZGl1cyA9IDA7XG4gICAgICAgICAgZC5vdXRlclJhZGl1cyA9IHJhZGl1cztcbiAgICAgICAgICByZXR1cm4gJ3RyYW5zbGF0ZSgnICsgYXJjLmNlbnRyb2lkKGQpICsgJyknXG5cbiAgICAgICAgfSlcbiAgICB9XG4gIH1cbn0pOyIsImFwcC5mYWN0b3J5KCdSYW5kb21HcmVldGluZ3MnLCBmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgZ2V0UmFuZG9tRnJvbUFycmF5ID0gZnVuY3Rpb24gKGFycikge1xuICAgICAgICByZXR1cm4gYXJyW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGFyci5sZW5ndGgpXTtcbiAgICB9O1xuXG4gICAgdmFyIGdyZWV0aW5ncyA9IFtcbiAgICAgICAgJ0hlbGxvLCB3b3JsZCEnLFxuICAgICAgICAnQXQgbG9uZyBsYXN0LCBJIGxpdmUhJyxcbiAgICAgICAgJ0hlbGxvLCBzaW1wbGUgaHVtYW4uJyxcbiAgICAgICAgJ1doYXQgYSBiZWF1dGlmdWwgZGF5IScsXG4gICAgICAgICdJXFwnbSBsaWtlIGFueSBvdGhlciBwcm9qZWN0LCBleGNlcHQgdGhhdCBJIGFtIHlvdXJzLiA6KScsXG4gICAgICAgICdUaGlzIGVtcHR5IHN0cmluZyBpcyBmb3IgTGluZHNheSBMZXZpbmUuJyxcbiAgICAgICAgJ+OBk+OCk+OBq+OBoeOBr+OAgeODpuODvOOCtuODvOanmOOAgicsXG4gICAgICAgICdXZWxjb21lLiBUby4gV0VCU0lURS4nLFxuICAgICAgICAnOkQnLFxuICAgICAgICAnWWVzLCBJIHRoaW5rIHdlXFwndmUgbWV0IGJlZm9yZS4nLFxuICAgICAgICAnR2ltbWUgMyBtaW5zLi4uIEkganVzdCBncmFiYmVkIHRoaXMgcmVhbGx5IGRvcGUgZnJpdHRhdGEnLFxuICAgICAgICAnSWYgQ29vcGVyIGNvdWxkIG9mZmVyIG9ubHkgb25lIHBpZWNlIG9mIGFkdmljZSwgaXQgd291bGQgYmUgdG8gbmV2U1FVSVJSRUwhJyxcbiAgICBdO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ3JlZXRpbmdzOiBncmVldGluZ3MsXG4gICAgICAgIGdldFJhbmRvbUdyZWV0aW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0UmFuZG9tRnJvbUFycmF5KGdyZWV0aW5ncyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG59KTtcbiIsIi8vIGFwcC5kaXJlY3RpdmUoJ2FpRWRpdG9yJywgZnVuY3Rpb24oKSB7XG4vLyAgIHJldHVybiB7XG4vLyAgICAgcmVzdHJpY3Q6ICdFJyxcbi8vICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL2VkaXRvcl8yL2VkaXRvci5odG1sJ1xuLy8gICB9O1xuLy8gfSk7XG5cblxuYXBwLmRpcmVjdGl2ZSgnYWlFZGl0b3InLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZWRpdG9yXzIvZWRpdG9yLmh0bWwnXG4gIH07XG59KTsiLCJhcHAuZGlyZWN0aXZlKCdmdWxsc3RhY2tMb2dvJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uaHRtbCdcbiAgICB9O1xufSk7IiwiYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge30sXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG5cbiAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdIb21lJywgc3RhdGU6ICdob21lJyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdBYm91dCcsIHN0YXRlOiAnYWJvdXQnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0RvY3VtZW50YXRpb24nLCBzdGF0ZTogJ2RvY3MnIH1cbiAgICAgICAgICAgICAgICAvLyB7IGxhYmVsOiAnTWVtYmVycyBPbmx5Jywgc3RhdGU6ICdtZW1iZXJzT25seScsIGF1dGg6IHRydWUgfVxuICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG5cbiAgICAgICAgICAgIHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmxvZ291dCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHNldFVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICAgICAgICAgICAgaWYodXNlcil7XG4gICAgICAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnLHtpZDp1c2VyLl9pZH0pO1xuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgcmVtb3ZlVXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNldFVzZXIoKTtcblxuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzLCBzZXRVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHJlbW92ZVVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIHJlbW92ZVVzZXIpO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgncmFuZG9HcmVldGluZycsIGZ1bmN0aW9uIChSYW5kb21HcmVldGluZ3MpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tZ3JlZXRpbmcvcmFuZG8tZ3JlZXRpbmcuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuICAgICAgICAgICAgc2NvcGUuZ3JlZXRpbmcgPSBSYW5kb21HcmVldGluZ3MuZ2V0UmFuZG9tR3JlZXRpbmcoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbn0pOyIsImFwcC5mYWN0b3J5KCdkYXRhRmFjdG9yeScsZnVuY3Rpb24oJGh0dHApe1xuICByZXR1cm57XG4gICAvLyB0aGlzIHJlcHJlc2VudHMgdGhlIHJlc3VsdCBvZiBvcGVuaW5nIGEgY3N2IGZpbGUgdHVybmluZyBpdCBpbnRvIGEganNvbiBhcnJheSBvZiBvYmplY3RzXG4gICAvLyBhbGwgZmFjdG9yeSBmdW5jdGlvbiBtdXN0IGJlIGEgcHJvbWlzZSB0byBzdGFuZGFyZGl6ZSB0aGUgaW50ZXJmYWNlXG4gICAgZ2V0ZGF0YSA6ICBmdW5jdGlvbihkYXRhU291cmNlTG9jYXRpb24sZGF0YVNvdXJjZVR5cGUpe1xuICAgICAvLyBhbGVydCAoZGF0YVNvdXJjZVR5cGUpO1xuICAgICAgaWYoZGF0YVNvdXJjZVR5cGUgPT09ICdmaWxlJyl7XG4gICAgICAvLyBwdXQgbm9kZSBmcyBhc3luY29wZW4gIFxuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgIHtmaXJzdG5hbWU6J2ZpcnN0IG5hbWUnLCBsYXN0bmFtZTonbGFzdCBuYW1lJywgYWdlIDogJ2FnZSd9LFxuICAgICAgICAgIHtmaXJzdG5hbWU6J0pvaG4nLCBsYXN0bmFtZTonRG9lJywgYWdlIDogJzIyJ30sXG4gICAgICAgICAge2ZpcnN0bmFtZTonQmFydCcsIGxhc3RuYW1lOidTaW1zb24nLCBhZ2UgOiAnMTAnfSxcbiAgICAgICAgICB7Zmlyc3RuYW1lOidEb25hbGQnLCBsYXN0bmFtZTonVHJ1bXAnLCBhZ2UgOiAnRGljayd9XG4gICAgICAgIF07XG4gICAgICB9ZWxzZSBpZihkYXRhU291cmNlVHlwZSA9PT0gJ3dlYnNpdGUnKXtcbiAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KGRhdGFTb3VyY2VMb2NhdGlvbik7XG4gICAgICB9XG4gICAgfVxuICB9O1xufSk7XG5hcHAuZGlyZWN0aXZlKCdzb2xvVGFibGUnLGZ1bmN0aW9uKGRhdGFGYWN0b3J5KXtcbiAgcmV0dXJue1xuICAgIHJlc3RyaWN0IDogJ0VBJyxcbiAgICBzY29wZSA6IHtcbiAgICAgIGFpVGl0bGUgIDogJ0AnLFxuICAgICAgYWlJbmZvU291cmNlIDogJ0AnLFxuICAgICAgYWlJbmZvVHlwZSA6ICdAJyxcbiAgICB9LFxuICAgIHRlbXBsYXRlVXJsIDogICdkaXJlY3RpdmVTdG9yZS9zb2xvdGFibGUvc29sb190YWJsZS5odG1sJyxcbiAgICAvL2NvbnRyb2xsZXIgOiBmdW5jdGlvbigkc2NvcGUsIGRhdGFGYWN0b3J5KXtcbiAgICAvLyRzY29wZS5kYXRhPWRhdGFGYWN0b3J5LmdldGRhdGEoJHNjb3BlLnNlY3Rpb25Mb2NhdGlvbiwkc2NvcGUuc2VjdGlvblR5cGUpO1xuICAgIC8vfSxcbiAgICBsaW5rIDogZnVuY3Rpb24oc2NvcGUsZWxlbSxhdHRyKXtcbiAgICAgIC8vIHRoZSBsaW5rIGZ1bmN0aW9uIGlzIGdvaW5nIHRvIHRha2UgYWxsIGRhdGEgcmVxdWVzdHMgYW5kIHB1dCB0aGVtIGluIGFuIGFycmF5IG9mIHByb21pc3Nlc1xuICAgICAgLy8gIGZvcih2YXIgaT0wO2k8IGEubGVuZ3RoO2krKzspe1xuICAgICAgICAgIC8vaWYoYVtpXS5pbmRleE9mKHNlY3Rpb25Mb2NhdGlvbikpIFxuICAgICAgICAgLy8gc2NvcGUuYWlUaXRsZT1hdHRyLmFpSW5mb1R5cGVcbiAgICAgICAgICBzY29wZS5kYXRhPWRhdGFGYWN0b3J5LmdldGRhdGEoYXR0ci5haUluZm9Tb3VyY2UsYXR0ci5haUluZm9UeXBlKTtcbiAgICAgICAgICBcbiAgICAgIC8vICB9XG4gICAgfVxuICB9O1xufSk7IiwiXG5hcHAuZmFjdG9yeSgnZGF0YUZhY3RvcnknLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHtcblxuICAgIGdldFBpZWRhdGE6IGZ1bmN0aW9uKHNvdXJjZV9sb2NhdGlvbiwgc291cmNlX3R5cGUpIHtcbiAgICAgIHJldHVybiBbe1xuICAgICAgICBsYWJlbDogXCJTdGV2ZVwiLFxuICAgICAgICB2YWx1ZTogNDBcbiAgICAgIH0sIHtcbiAgICAgICAgbGFiZWw6IFwiQm9iXCIsXG4gICAgICAgIHZhbHVlOiA2MFxuICAgICAgfSwge1xuICAgICAgICBsYWJlbDogXCJKZW5cIixcbiAgICAgICAgdmFsdWU6IDM1XG4gICAgICB9LCB7XG4gICAgICAgIGxhYmVsOiBcIkFteVwiLFxuICAgICAgICB2YWx1ZTogMTVcbiAgICAgIH1dO1xuICAgIH1cbiAgfVxufSk7XG5cbmFwcC5kaXJlY3RpdmUoJ2JhckdyYXBoJywgZnVuY3Rpb24oJHdpbmRvdywgZGF0YUZhY3RvcnkpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0UnLFxuICAgIHRlbXBsYXRlVXJsOiAnanMvZGlyZWN0aXZlU3RvcmUvZDMtYmFyLWdyYXBoLTEvYmFyLWdyYXBoLmh0bWwnLFxuICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtLCBhdHRycykge1xuICAgICAgdmFyIGQzID0gJHdpbmRvdy5kMztcbiAgICAgIHZhciB3aWR0aCA9IDQwMDtcbiAgICAgIHZhciBoZWlnaHQgPSA0MDA7XG4gICAgICB2YXIgcmFkaXVzID0gMjAwO1xuICAgICAgdmFyIGNvbG9ycyA9IGQzLnNjYWxlLmNhdGVnb3J5MTAoKTtcblxuICAgICAgdmFyIHBpZWRhdGEgPSBkYXRhRmFjdG9yeS5nZXRQaWVkYXRhKCk7XG5cbiAgICAgIHZhciBwaWUgPSBkMy5sYXlvdXQucGllKClcbiAgICAgICAgLnZhbHVlKGZ1bmN0aW9uKGQpIHtcbiAgICAgICAgICByZXR1cm4gZC52YWx1ZTtcbiAgICAgICAgfSlcblxuICAgICAgdmFyIGFyYyA9IGQzLnN2Zy5hcmMoKVxuICAgICAgICAub3V0ZXJSYWRpdXMocmFkaXVzKVxuXG4gICAgICB2YXIgbXlDaGFydCA9IGQzLnNlbGVjdCgnI2NoYXJ0JykuYXBwZW5kKCdzdmcnKVxuICAgICAgICAuYXR0cignd2lkdGgnLCB3aWR0aClcbiAgICAgICAgLmF0dHIoJ2hlaWdodCcsIGhlaWdodClcbiAgICAgICAgLmFwcGVuZCgnZycpXG4gICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyAod2lkdGggLSByYWRpdXMpICsgJywnICsgKGhlaWdodCAtIHJhZGl1cykgKyAnKScpXG4gICAgICAgIC5zZWxlY3RBbGwoJ3BhdGgnKS5kYXRhKHBpZShwaWVkYXRhKSkgLy9yZXR1cm5zIGFuIGFycmF5IG9mIGFyY3NcbiAgICAgICAgLmVudGVyKCkuYXBwZW5kKCdnJylcbiAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ3NsaWNlJylcblxuICAgICAgdmFyIHNsaWNlcyA9IGQzLnNlbGVjdEFsbCgnZy5zbGljZScpXG4gICAgICAgIC5hcHBlbmQoJ3BhdGgnKVxuICAgICAgICAuYXR0cignZmlsbCcsIGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgICByZXR1cm4gY29sb3JzKGkpO1xuICAgICAgICB9KVxuICAgICAgICAuYXR0cignZCcsIGFyYykgLy8gcGFzc2luZyBpbiB0aGUgYXJjIGZ1bmN0aW9uXG5cbiAgICAgIHZhciB0ZXh0ID0gZDMuc2VsZWN0QWxsKCdnLnNsaWNlJylcbiAgICAgICAgLmFwcGVuZCgndGV4dCcpXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uKGQsIGkpIHtcbiAgICAgICAgICAvL2RhdGEgb2JqZWN0Li5cbiAgICAgICAgICByZXR1cm4gZC5kYXRhLmxhYmVsO1xuICAgICAgICB9KVxuICAgICAgICAuYXR0cigndGV4dC1hbmNob3InLCAnbWlkZGxlJylcbiAgICAgICAgLmF0dHIoJ2ZpbGwnLCAnd2hpdGUnKVxuICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgZnVuY3Rpb24oZCkge1xuICAgICAgICAgIGQuaW5uZXJSYWRpdXMgPSAwO1xuICAgICAgICAgIGQub3V0ZXJSYWRpdXMgPSByYWRpdXM7XG4gICAgICAgICAgcmV0dXJuICd0cmFuc2xhdGUoJyArIGFyYy5jZW50cm9pZChkKSArICcpJ1xuXG4gICAgICAgIH0pXG4gICAgfVxuICB9XG59KTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
