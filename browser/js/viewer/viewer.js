app.config(function ($stateProvider) {
    $stateProvider.state('viewer', {
        url: '/viewer',
        templateUrl: 'js/viewer/view.html',
        controller:'viewerControl'
        // resolve: {
        //   projects: function(ProjectFactory,$stateParams){
        //     if($stateParams.id){

        //       return ProjectFactory.getOne($stateParams.id);
        //     }
        //     return null;
        //   },
          // user: function(AuthService){
          //   return AuthService.getLoggedInUser();
          // }
        //}
    });
});


app.controller('viewerControl', function($scope,$location, $anchorScroll){
    $scope.scrollTo = function(id) {
      $location.hash(id);
      $anchorScroll();
   }

})