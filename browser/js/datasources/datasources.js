app.config(function($stateProvider){
	$stateProvider.state('datasources', {
		url: '/datasources',
		templateUrl: 'js/datasources/datasources.html',
		controller: 'DsController',
		resolve: {
			userData: function(projectDataFactory, AuthService) {
				return AuthService.getLoggedInUser()
				.then(function(user){
					if (user){
						var userId = user._id;
						return projectDataFactory.dataByUserId(userId);
					}
				});
			}
		}
	});
});

app.controller('DsController', function($scope, userData, $uibModal){
	$scope.userData = userData;
	$scope.open = function(_data){
	  var modalInstance = $uibModal.open({
	    controller: 'ModalController',
	    templateUrl: 'js/datasources/modalContent.html',
	    resolve: {
	      data: function(){
	        return _data;
	      }
	    }
	  });
	};
});