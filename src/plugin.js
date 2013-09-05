(function($, Handlebars, undefined) {
	'use strict';
	var templates = Handlebars.templates = Handlebars.templates || {};

	var defaultSettings = {
		templatePath: '',
		templateExtension: 'handlebars',
		partialPath: '',
		partialExtension: 'partial'
	};

	var settings = $.extend({}, defaultSettings);

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
		options = $.extend({}, options, this.data());
		console.log(options);

		// check for template exsistance or load it
		if (options.template === undefined) {
			return; // Template is undefined
		}
		if (!templates || !templates[options.template]) {
			// TODO: Add support for runtime only environment
			var self = this;

			// Attempt to fetch the template and compile it into handlebars
			$.ajax({
				dataType: 'text',
				success: function(template) {
					var template = templates[options.template] = Handlebars.compile(template);
					self.html(template(options.data)).trigger('render.handlebars', options);
				},
				url: resolveTemplatePath(options.template)
			});
		} else {
			var template = templates[options.template];
			this.html(template(options.data)).trigger('render.handlebars', options);
		}
		return this;
	};
})(jQuery, Handlebars);