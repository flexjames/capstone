app.directive('aiDownload', ['DownloadFactory', function(DownloadFactory) {
  return {
    restrict: 'E',
    templateUrl: '/js/download/download.html',
    scope: '=',
    link: function(scope, element) {
      scope.downloadHtml = function() {
        DownloadFactory.getHtml(scope.projId)
          .then(function(htmlfile) {
            var myHtmlFile = new File([htmlfile.data], { type: 'text/html' });
            saveAs(myHtmlFile, 'index.html');
          });
      };

      scope.downloadJs = function() {
        DownloadFactory.getJs(scope.projId)
          .then(function(jsfile) {
            var myJsFile = new File([jsfile.data], { type: 'application/javascript' });
            saveAs(myJsFile, 'script.js');
          });
      };
    }
  };
}]);

app.factory('DownloadFactory', ['$http', function($http) {
  return {
    getJs: function(id) {
      return $http.get('/api/generator/js/' + id);
    },
    getHtml: function(id) {
      return $http.get('/api/generator/html/' + id);
    }
  };
}]);