app.factory('DataFactory', function($http, Upload, $timeout){
	var DataFactory = {};

	DataFactory.getDataById = function(id){
		return $http.get('/api/data/' + id)
		.then(function(response){
			return response.data;
		});
	}

	DataFactory.getAllData = function(){
		return $http.get('/api/data/')
		.then(function(response){
			return response.data;
		});
	}

	return DataFactory;
})