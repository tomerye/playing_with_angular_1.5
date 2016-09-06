/**
 * Created by tomer on 04/09/2016.
 */
 angular.module('PlayBuzz', ['ngMaterial', 'youtube-embed', 'ngSanitize', 'angular-bind-html-compile', 'ngMessages'])
 .provider('pbSourceProviders', function () {
 	var sources = {};
 	this.registerSourceType = function(sourceType, config) {
 		sources[sourceType] = config;
 	};
 	
 	this.$get = [function () {

 		return {
 			getPreviewTemplate : function (sourceType) {
 				return sources[sourceType].previewTemplate;
 			},
 			getSourceEditorTemplate: function (sourceType) {
 				return sources[sourceType].editorTemplate;
 			}
 		};
 	}];
 })
 .provider('YouTubeQueryService', function () {
 	this.$get = ['$http', function ($http) {
 		return {
 			search: function (query) {
 				return $http.get('https://www.googleapis.com/youtube/v3/search', {
 					params: {
 						key: 'AIzaSyAA1n_xNuga76hYXnzoIRQl5j07M15KkOc', //this is my private key please dont publish
 						type: 'video',
 						maxResults: '20',
 						part: 'id,snippet',
 						fields: 'items/id,items/snippet/title,items/snippet/thumbnails/default',
 						q: query
 					}
 				}).then(function (response) {
 					 return response.data; 
 				});

 			}
 		}; 
 	}]; 
 })
 .component('pbMain', {
 	template: '<div>' +
				'<pb-source-editor></pb-source-editor>' +
			'</div>' +
			'<md-divider></md-divider>' +
			'<div style="text-align:center;">' +
				'<pb-previewer preview="preview" ng-repeat="preview in $ctrl.previews" class="preview-box"></pb-previewer>' +
			'</div>', //todo put template in html file
 	controller: ['SOURCES',  function (SOURCES) {

 		this.$onInit = function () {
 			this.selectedSource = SOURCES.YOUTUBE;//currently support only youtube
 			this.previews = [];
 		};

 		this.getSelectedSource = function () {
 			 return this.selectedSource; 
 		}

 		this.addToPreview = function(preview){
 			this.previews.push(preview);
 		}
 	}]
 })
 .component('pbSourceEditor', {
 	require: {
 		mainCtrl: '^pbMain'
 	},
 	template: '<div bind-html-compile="$ctrl.sourceEditorTemplate"></div>',
 	controller: ['pbSourceProviders', function (pbSourceProviders) {
 		 this.$onInit = function () {
 		 	 this.sourceEditorTemplate = pbSourceProviders.getSourceEditorTemplate(this.mainCtrl.getSelectedSource());
 		 } 
 	}]
 })
 .component('pbYoutubeEditor', {
 	require:{
 		mainCtrl: '^pbMain'
 	},
 	template: '<form name="youtubeEditorForm" layout="row" layout-align="center">' +
 				'<md-input-container style="margin-right: 10px;width:400px">' +
					'<label>Past source link</label>' +
					'<input name="youtubeLink" ng-model="$ctrl.url" ng-change="$ctrl.onUrlChange()" validate-youtube-link>' +
					 '<div ng-messages="youtubeEditorForm.youtubeLink.$error">' +
      					'<div ng-message="validYoutube">This is invalid YouTube link!</div>' +
    				'</div>' +
			'</md-input-container>' +
			'<md-autocomplete md-delay="500" md-selected-item="$ctrl.selectedItem" md-items="item in $ctrl.getMatches($ctrl.searchText)" md-item-text="item.snippet.title" style="width:400px;" md-floating-label="Search..." md-selected-item-change="$ctrl.onSelectedSourceChange()" md-menu-class="custom-menu" md-search-text="$ctrl.searchText">' +
				'<md-item-template>' +
					'<img src="{{item.snippet.thumbnails.default.url}}">' +
					'<span md-highlight-text="searchText">{{item.snippet.title}}</span>' +
				'</md-item-template>' +
			'</md-autocomplete>' +
			'</form>', //todo: put the template in html file
	controller: ['SOURCES', 'youtubeEmbedUtils', 'YouTubeQueryService', function (SOURCES, youtubeEmbedUtils, YouTubeQueryService) {

		var addNewPreview = function(ytId) {
			this.mainCtrl.addToPreview({
				sourceType: SOURCES.YOUTUBE,
				data: {
					ytId: ytId
				}
			});  
		}.bind(this);

		this.getMatches = function (query) {
			return YouTubeQueryService.search(query).then(function (data) {
				return data.items; 
			}); 
		}

		this.onUrlChange = function () {
			if(_.isEmpty(this.url)){
				return;
			}
			addNewPreview(youtubeEmbedUtils.getIdFromURL(this.url))
		}

		this.onSelectedSourceChange = function () {
			if(!this.selectedItem){
				return;
			}
			addNewPreview(this.selectedItem.id.videoId)
		}
	}] 
})
 .directive('validateYoutubeLink', ['youtubeEmbedUtils', function(youtubeEmbedUtils){
 	return {
 		restrict: "A",
 		require: "ngModel",
 		link: function(scope, element, attributes, ngModel) {
 			ngModel.$validators.validYoutube = function(value) {  
 				try {
 					return _.isEmpty(value) ||  youtubeEmbedUtils.getIdFromURL(value) !== value;
 				} catch(e) {
 					return false;
 				}
 			}
 		}
 	}
 }])
 .component('pbPreviewer', {
 	bindings: {
 		preview: '<'
 	},
 	template:'<div bind-html-compile="$ctrl.template"></div>',
 	controller: ['pbSourceProviders', function (pbSourceProviders) {
 		this.$onInit = function () {
 			this.template = pbSourceProviders.getPreviewTemplate(this.preview.sourceType);
 			_.assign(this, this.preview.data);
 		};
 		
 	}]
 })
 .constant('SOURCES', {
 	YOUTUBE: 'YOUTUBE'
 })
 .config(['pbSourceProvidersProvider', 'SOURCES', function (pbSourceProvidersProvider, SOURCES, youtubeEmbedUtils) {
 	pbSourceProvidersProvider.registerSourceType(SOURCES.YOUTUBE, {
 		previewTemplate:'<youtube-video video-id="$ctrl.ytId"></youtube-video>',
 		editorTemplate: '<pb-youtube-editor></pb-youtube-editor>'
 	}) 
 }]);