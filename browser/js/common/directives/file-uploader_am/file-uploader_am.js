app.directive('fileUploader2', function() {

	return {
		restrict: 'E',
		scope: true,
		templateUrl: 'js/common/directives/file-uploader_am/file-uploader.html',
		controller: function($scope, Upload, $timeout){
			$scope.upload= function(){
				console.log(userFile);

			}

		}
	}

})