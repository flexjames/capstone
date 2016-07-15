app.controller('ModalController', function($scope,data, $uibModalInstance){
	$scope.data = data;

	$scope.close = function() {
		$uibModalInstance.close();
	};
});