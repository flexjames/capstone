app.service('anchorSmoothScroll', function(){
    
    this.scrollTo = function(eID) {

        // This scrolling function 
        // is from http://www.itnewb.com/tutorial/Creating-the-Smooth-Scroll-Effect-with-JavaScript
        
        var startY = currentYPosition();
        var stopY = elmYPosition(eID);
        var distance = stopY > startY ? stopY - startY : startY - stopY;
        if (distance < 100) {
            scrollTo(0, stopY); return;
        }
        var speed = Math.round(distance / 100);
        if (speed >= 20) speed = 20;
        var step = Math.round(distance / 25);
        var leapY = stopY > startY ? startY + step : startY - step;
        var timer = 0;
        if (stopY > startY) {
            for ( var i=startY; i<stopY; i+=step ) {
                setTimeout("window.scrollTo(0, "+leapY+")", timer * speed);
                leapY += step; if (leapY > stopY) leapY = stopY; timer++;
            } return;
        }
        for ( var i=startY; i>stopY; i-=step ) {
            setTimeout("window.scrollTo(0, "+leapY+")", timer * speed);
            leapY -= step; if (leapY < stopY) leapY = stopY; timer++;
        }
        
        function currentYPosition() {
            // Firefox, Chrome, Opera, Safari
            if (self.pageYOffset) return self.pageYOffset;
            // Internet Explorer 6 - standards mode
            if (document.documentElement && document.documentElement.scrollTop)
                return document.documentElement.scrollTop;
            // Internet Explorer 6, 7 and 8
            if (document.body.scrollTop) return document.body.scrollTop;
            return 0;
        }
        
        function elmYPosition(eID) {
            var elm = document.getElementById(eID);
            var y = elm.offsetTop;
            var node = elm;
            while (node.offsetParent && node.offsetParent != document.body) {
                node = node.offsetParent;
                y += node.offsetTop;
            } return y;
        }

    };
    
});

app.factory('manifestFactoryStatic',function(){
  return [{
          ai_directive : true,
          ai_directive_type : 'content',
          ai_directive_name : 'solo_table',
          ai_directive_attributes : {
              solo_table_title: 'title',
              solo_table_class : 'myclass',
              solo_table_info_source : 'myclass',
              solo_table_info_type : 'file'
          }
      },{
          ai_directive : true,
          ai_directive_type : 'content',
          ai_directive_name : 'solo_table',
          ai_directive_attributes : {
              solo_table_title: 'title',
              solo_table_class : 'myclass',
              solo_table_info_source : 'myclass',
              solo_table_info_type : 'file'
          }
      },{
          ai_directive : true,
          ai_directive_type : 'content',
          ai_directive_name : 'solo_table',
          ai_directive_attributes : {
              solo_table_title: 'title',
              solo_table_class : 'myclass',
              solo_table_info_source : 'myclass',
              solo_table_info_type : 'file'
          }
      }];
});

app.directive('aiPage',function(){
  return{
    transclude : true,
    restrict : 'EA',
    scope : {
      aiClass : '/css/row_a/style.css',
      aiPageTitle:'',
      aiPageMenuText :''
    },
    template :  ''
  };
});
app.directive('aiRow',function(){
  return{
    transclude : true,
    restrict : 'EA',
    scope : {
      inceptRowOrder : '@',
      inceptRowBgColor :  '@',
      inceptRowBgImage :  '@',
    },
    template :  ''
  };
});

app.directive('aiCol',function(){
  return{
    transclude : true,
    restrict : 'E',
    scope : {
      inceptionColId : '@',
      inceptionColWidth : '@',
      inceptionRowId : '@',
      inceptionColOrderInRow : '@'
    },
    template :  ''
  };
});

app.directive('directiveShopCard',function(){
  return{
    restrict : "EA",
    scope : {
      manifest : '='
    },
    templateUrl :  'directiveStore/directiveStoreCard/card.html',
  };
});

app.directive('aiEditHotSpot',function(){
  return{
    transclude : true,
    restrict : 'EA',
    scope : {
      aiEditHotSpotId : '@',
      editObjectType : '@',
      activeEditElement : '=',
    setActiveEditElement : '&'
    },
    templateUrl : 'js/projects/edithotspot.html'
  };
});

app.factory('manifestFactory', function($http) {
	return {
	    getAll: function() {
	      return $http.get('/api/manifests/')
	        .then(function(manifests) {
	          console.log(manifests.data);
	          return manifests;
	        });
	    }
	};
});

app.factory('ProjectFactory', function($http) {
  var projectObj;
  var _projectCache = [];

  projectObj = {
    getAll: function() {
      return $http.get('/api/projects')
        .then(function(projects) {
          console.log(projects);
          angular.copy(projects.data, _projectCache);
          return _projectCache;
        });
    },

    getAllByUser: function(userId){
      return $http.get('/api/projects/user/' + userId)
          .then(function(projects){
            //console.log(projects);
            angular.copy(projects.data, _projectCache);
            return _projectCache;
          })
    },

    getOne: function(id) {
      return $http.get('/api/projects/' + id)
        .then(function(project) {
          return project.data;
        });
    },

    add: function(project) {
      return $http({
            url: '/api/projects/',
            method: "POST",
            data: project
      })
        .then(function(_project) {
          return _project.data;
        });
    },

    delete: function(id){
      return $http.delete('/api/projects/' + id)
        .then(function(project) {
          return project.data;
        });
    },

    update: function(project) {
      return $http({
            url: '/api/projects/' + project._id,
            method: "PUT",
            data: project
      })
        .then(function(_project) {
          return _project.data;
        });
    },

    getDataSets: function(productId){
      return null;
    }

  };

  return projectObj;
});