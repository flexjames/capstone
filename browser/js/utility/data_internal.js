"use strict";
app.factory('projectDataFactory', function($http) {
  return {
    getInternal: function(dataId,type) {
      console.log('gettin', dataId);
      return $http.get('/api/data/' + dataId)
        .then(function(dataObject) {
          console.dir(dataObject);
          if(type==='json'){
            return JSON.parse(dataObject.data.data);
          } else if (type==='text'){
            return dataObject.data.data
          }

        });
    },// get internal
    dataByProjId: function(projId) {
      return $http.get('/api/data/datasourcesproj/' + projId)
        .then(function(dataObject) {
          //console.log('dataObject is ');
          //console.log(dataObject.data)
          return dataObject.data;
        });
    },
  dataByUserId: function(userId){
    return $http.get('/api/data/datasourcesuser/' + userId)
      .then(function(dataObject){
        return dataObject.data;
      });
    }
  }
});