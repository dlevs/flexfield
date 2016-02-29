(function () {

	var $fieldsContainer     = $('.js-fields-container'),
		$fieldTemplate       = $('.js-field-template'),
		$deleteFieldTemplate = $('<button>')
			.text('remove')
			.addClass('js-remove subtle-button block');

	$(document)
		.on('click', '.js-add-field', function () {

			var $wrapper = $fieldTemplate
				.clone()
				.removeClass('js-field-template');

			$wrapper
				.find('.f-label')
				.append($deleteFieldTemplate.clone());

			$wrapper
				.appendTo($fieldsContainer)
				.find('.js-flexfield')
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
