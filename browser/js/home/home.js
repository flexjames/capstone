app.config(function ($stateProvider) {
    $stateProvider.state('home', {
        url: '/',
        templateUrl: 'js/home/home.html',
        controller:'HomeControl',
        resolve: {
          projects: function(ProjectFactory,$stateParams){
            if($stateParams.id){

              return ProjectFactory.getOne($stateParams.id);
            }
            return null;
          },
          userData: function(projectDataFactory, AuthService){
            return AuthService.getLoggedInUser()
            .then(function(user){
              if(user){
                var userId = user._id
                return projectDataFactory.dataByUserId(userId);
              }

            })
          }
          // user: function(AuthService){
          //   return AuthService.getLoggedInUser();
          // }
        }
    });
});

app.controller('HomeControl', function($scope,projects,$rootScope,AuthService,AUTH_EVENTS,$stateParams,ProjectFactory,$state,$location, $anchorScroll,userData,$uibModal){
  $scope.projects=projects;
  $scope.hello=$stateParams.id;

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

   $scope.scrollTo = function(id) {
      $location.hash(id);
      $anchorScroll();
   }

   $scope.signup = function(){
    $state.go('signup');
   }

  $scope.isLoggedIn = function () {
                return AuthService.isAuthenticated();
            };

  var getUser = function () {
                AuthService.getLoggedInUser().then(function (user) {
                    $scope.user = user;
                    return user
                }).then(getProjects);
            };
  var getProjects = function (user) {

              if(user){
                ProjectFactory.getAllByUser($scope.user._id)
                    .then(function(projects){
                      $scope.projects=projects;
                    })
              }
            };

  $scope.addProject = function(){
    let _user= null;

    if(AuthService.isAuthenticated()){
      _user=$scope.user;
    }

    return ProjectFactory.add({
        name:$scope.projectName,
        user:_user
      }).then(function(newProject){
        $state.go('project',{id:newProject._id});
      })
  };
  getUser();
});