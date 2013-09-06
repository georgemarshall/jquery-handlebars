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

	function registerPartial(path, name, callback) {
		$.get(resolvePartialPath(path), function (partial) {
			Handlebars.registerPartial(name, partial);
			callback();
		}, 'text');
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

	function loadTemplate(name) {
		var deferred = new jQuery.Deferred();
		if (name === undefined) {
			return deferred.reject();
		}

		if (!!templates[name]) {
			deferred.resolveWith({name: name}, [templates[name]]);
		} else {
			// Attempt to fetch the template and compile it into handlebars
			var load = $.ajax({
				dataType: 'text',
				url: resolveTemplatePath(name)
			}).then(function(source) {
				templates[name] = Handlebars.compile(source);
				deferred.resolveWith({name: name}, [templates[name]]);
			}, function() {
				deferred.rejectWith({name: name});
			});
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
				for (var i = 0; i < names.length; i++) {
					registerPartial(names[i], names[i]);
				}
			}
			settings = $.extend(defaultSettings, arguments[0]);
			settings.templatePath = settings.templatePath.replace(/\\\/$/, '');
			settings.partialPath = settings.partialPath.replace(/\\\/$/, '');
		} else {
			switch (arguments[0]) {
			case 'partial':
				if (arguments.length < 3) {
					registerPartial(arguments[1], arguments[1]);
				} else {
					registerPartial(arguments[1], arguments[2]);
				}
				break;
			case 'helper':
				Handlebars.registerHelper(arguments[1], arguments[2]);
				break;
			default:
				throw 'invalid action specified to jQuery.handlebars: ' + arguments[0];
			}
		}
	};

	$.fn.render = function(options) {
		var self = this;
		options = $.extend({}, settings, options, this.data());

		// Load our data and template async
		$.when(loadData(options.src), loadTemplate(options.template)).done(function(data, template) {
			self.html(template(data[0])).trigger('render.handlebars', options);
		});

		return this;
	};
})(jQuery, Handlebars);