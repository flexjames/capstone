app.config(function($stateProvider) {
  $stateProvider.state('signup', {
    url: '/signup',
    templateUrl: 'js/signup/signup.html',
    controller: 'SignupCtrl'
  });
});

app.controller('SignupCtrl', function($scope, $state, AuthService, Session, UserFactory) {
  $scope.checkUser = function() {
    if (Session.user)
      return true;
    else
      return false;
  }

  $scope.changeValue = function() {
    $scope.NewUserForm.$setUntouched();
  };

  $scope.createUser = function() {
    UserFactory.create($scope.newUser)
      .then(function(user) {
        return AuthService.login($scope.newUser);
      })
      .then(function() {
        $state.go('home');
      });
  };
});