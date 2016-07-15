app.directive('fileUploader', function() {

	return {
		restrict: 'E',
		scope: true,
		templateUrl: 'js/common/directives/file-uploader/file-uploader.html',
		controller: function($scope, Upload, $timeout){
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
	            });
	        }, function (response) {
	            if (response.status > 0)
	                $scope.errorMsg = response.status + ': ' + response.data;
	        }, function (evt) {
	            file.progress = Math.min(100, parseInt(100.0 * 
	                                     evt.loaded / evt.total));
	        });
	      }   
	    }

		}
	}

})