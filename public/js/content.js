$(function() {
  if ($('[data-apos-donate-form]').length) {

    apos.requireScene('user', function(){
      var schema = apos.data.aposDonate.schema;
      var $el = $('[data-apos-donate-form]');
      var $container = $('[data-apos-donate-form-container]');

      var data = aposSchemas.newInstance(schema);

      aposSchemas.populateFields($el, schema, data, function(){});

      $('body').on('submit', '[data-apos-donate-form]', function(e) {
        e.preventDefault();
        e.stopPropagation();

        var data = {};
        $el.find('.apos-donate-pending').addClass('apos-donate-show');
        aposSchemas.convertFields($el, schema, data, function(error) {
          if(error) {
            $el.find('.apos-donate-pending').removeClass('apos-donate-show');
            aposSchemas.scrollToError($el);
            return;
          }
          $.post('/apos-donate', data, function(data){
            if (data.status == 'ok') {
              $('[data-apos-donate-form-thanks]').show();
              $('[data-apos-donate-form]').remove();
            } else {
              //re-render form with errors
              _.each(data.errors, function(value, key){
                var $targetFieldset = aposSchemas.findFieldset($el, key);
                var $error = $('<span data-apos-donate-error></span>');
                $targetFieldset.find('[data-apos-donate-error]').remove();
                $error.text(value);
                $targetFieldset.append($error);
              });
            }
            $el.find('.apos-donate-pending').removeClass('apos-donate-show');
          });
        });
      });
    });
  }

});
