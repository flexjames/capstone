app.config(function($stateProvider) {
  $stateProvider.
  state('project', {
    url: '/project/:id',
    templateUrl: '/js/projects/project.edit.html',
    controller:'ProjectEditCtrl',
    resolve: {
      project: function(ProjectFactory,$stateParams) {
        return ProjectFactory.getOne($stateParams.id);
      },
      dataFiles: function(projectDataFactory, $stateParams){
        return projectDataFactory.dataByProjId($stateParams.id);
      }
    }
  });
});