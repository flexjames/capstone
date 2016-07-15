app.factory('UserFactory', function($http){
	var FactoryObj = {};
	FactoryObj.create = function(data){
		return $http.post('/api/users', data)
		.then(function(response){
			return response.data;
		});
	};

	return FactoryObj;
});