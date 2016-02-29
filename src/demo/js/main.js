(function () {

	var dynamicFieldCount    = 0,
		$fieldsContainer     = $('.js-fields-container'),
		$fieldTemplate       = $('.js-field-template'),
		$deleteFieldTemplate = $('<button>')
			.text('remove')
			.addClass('js-remove subtle-button block');

	$(document)
		.on('click', '.js-add-field', function () {

			var fieldId  = 'dynamic-field-' + dynamicFieldCount++,
				$wrapper = $fieldTemplate.clone().removeClass('js-field-template');

			// Label actions
			$wrapper
				.find('.f-label')
				.attr('for', fieldId)
				.append($deleteFieldTemplate.clone());

			// Textarea actions
			$wrapper
				.appendTo($fieldsContainer)
				.find('.js-flexfield')
				.attr('id', fieldId)
				.each(function () {
					flexfield.trigger(this);
				});

		})
		.on('click', '.js-remove', function (e) {
			$(this)
				.closest('.f-wrapper')
				.remove();
		})
		.on('flexfield-resize', '.js-flexfield', function (e) {
			var change  = e.originalEvent.detail.change,
				$change = $('<span>')
					.css('color', change === 'grow' ? 'green' : 'red')
					.text(change);

			$(this)
				.closest('.f-wrapper')
				.find('.js-field-change-indicator')
				.text('Last event: ')
				.append($change);
		});

})();
