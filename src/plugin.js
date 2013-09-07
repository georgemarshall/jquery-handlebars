(function($, Handlebars, undefined) {
	'use strict';
	var defaultSettings = {
		partialExtension: 'partial',
		partialPath: '',
		src: '',
		template: '',
		templateExtension: 'handlebars',
		templatePath: ''
	},
		settings = $.extend({}, defaultSettings),
		sources = {},
		sourcesCache = {},
		templates = Handlebars.templates = Handlebars.templates || {};


	function resolvePath(basePath, name, extension) {
		basePath = basePath.replace(/[(^\s)(\s$)]/g, '');
		if (!!basePath) {
			basePath += '/';
		}
		basePath += name + '.' + extension;
		return basePath;
	}

	function resolveTemplatePath(name) {
		return resolvePath(settings.templatePath, name, settings.templateExtension);
	}

	function resolvePartialPath(name) {
		return resolvePath(settings.partialPath, name, settings.partialExtension);
	}

	function registerPartial(name) {
		return loadPartial(name);
	}

	function registerSource(name, obj) {
		if (typeof obj === 'object') {
			obj = function() {
				var deferred = new jQuery.Deferred();
				deferred.resolve([obj]);
				return deferred;
			};
		}
		sources[name] = obj;
	}

	function loadData(name) {
		if (name === undefined) {
			return new jQuery.Deferred().reject();
		}

		if (!sourcesCache[name]) {
			if (!sources[name]) {
				sourcesCache[name] = $.ajax({url: name});
			} else {
				sourcesCache[name] = sources[name]();
			}
		}

		return sourcesCache[name];
	}

	function loadPartial(name) {
		var deferred = new jQuery.Deferred();
		if (name === undefined) {
			return deferred.reject();
		}

		if (!!Handlebars.partials[name]) {
			deferred.resolveWith({name: name}, [Handlebars.partials[name]]);
		} else {
			// Attempt to fetch the template and compile it into handlebars
			$.ajax(resolvePartialPath(name), {
				dataType: 'text'
			}).then(function(source) {
				Handlebars.partials[name] = source;
				deferred.resolveWith({name: name}, [Handlebars.partials[name]]);
			}, function() {
				deferred.rejectWith({name: name});
			});
		}

		return deferred;
	}

	function loadTemplate(name) {
		var deferred = new jQuery.Deferred();
		if (name === undefined) {
			return deferred.reject();
		}

		if (!!templates[name]) {
			deferred.resolveWith({name: name}, [templates[name]]);
		} else if (!!Handlebars.compile) {
			// Attempt to fetch the template and compile it into handlebars
			$.ajax(resolveTemplatePath(name), {
				dataType: 'text'
			}).then(function(source) {
				templates[name] = Handlebars.compile(source);
				deferred.resolveWith({name: name}, [templates[name]]);
			}, function() {
				deferred.rejectWith({name: name});
			});
		} else {
			deferred.rejectWith({name: name});
		}

		return deferred;
	}

	$.handlebars = function() {
		if (typeof arguments[0] !== 'string') {
			var options = arguments[0];
			if (options.hasOwnProperty('partials')) {
				var names;
				if (typeof options.partials !== 'string') {
					names = options.partials;
				} else {
					names = options.partials.split(/\s+/g);
				}
				for (var i = names.length - 1; i >= 0; i--) {
					registerPartial(names[i])
				};
			}
			settings = $.extend(defaultSettings, arguments[0]);
			settings.templatePath = settings.templatePath.replace(/\\\/$/, '');
			settings.partialPath = settings.partialPath.replace(/\\\/$/, '');
		} else {
			switch (arguments[0]) {
			case 'helper':
				Handlebars.registerHelper(arguments[1], arguments[2]);
				break;
			case 'partial':
				registerPartial(arguments[1]);
				break;
			case 'source':
				registerSource(arguments[1], arguments[2]);
				break;
			default:
				throw 'invalid action specified to jQuery.handlebars: ' + arguments[0];
			}
		}
	};

	$.fn.render = function(options) {
		options = $.extend({}, settings, options);

		// Load our data and templates async
		this.each(function() {
			var self = $(this),
				localOptions = $.extend({}, options, self.data());

			$.when(loadData(localOptions.src), loadTemplate(localOptions.template)).done(function(response, template) {
				var data = response[0];

				if (!!localOptions.context) {
					var paths = localOptions.context.split(' ');
					data = {};

					for (var i = 0; i < paths.length; i++) {
						var path = paths[i].split('.'),
							pointer = response[0];

						for (var j = 0; j < path.length; j++) {
							pointer = pointer[path[j]];

							if (pointer === undefined) {
								return;
							} else if (j === (path.length - 1)) {
								data[path[j]] = pointer;
							}
						};
					};
				}

				self.html(template(data)).trigger('render.handlebars', localOptions);
			});
		});

		return this;
	};
})(jQuery, Handlebars);