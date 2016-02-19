$(() => {
  const $select = $('#import select');
  if ($select.length === 0) return;

  const styleOption = (opt) => {
    const $el = $(opt.element);
    return $(`<div class="calendar-option"><span style="background-color: ${$el.data('backgroundColor')}"></span> ${opt.text}</div>`);
  };
  const $button = $('#import button');
  const $buttonText = $button.find('[cal-name]');
  const onCalendarChange = () => {
    const ajaxInProgress = loading => {
      $button.prop('disabled', loading);
      $select.prop('disabled', loading);
      if (loading) {
        $('<i class="fa fa-spin fa-spinner"></i>').appendTo($('.select-container'));
      } else {
        $('.fa.fa-spin').remove();
      }
    };
    const calendarId = $select.val();
    const calendarName = $select.find(`option[value="${calendarId}"]`).text();
    $buttonText.text(calendarName);
    ajaxInProgress(true);
    $.get('/api/google/removed-events', {calendarId: calendarId, html: true}).
      done(html => {
        const $eventsToRemove = $('#events-to-remove');
        if (html === '') {
          $eventsToRemove.hide();
        } else {
          $eventsToRemove.find('> *').remove();
          $('<h3><i class="fa fa-trash"></i> Peruutetut varaukset</h3>').appendTo($eventsToRemove);
          $(`<div class="alert alert-warning">Seuraavat peruutetut varaukset poistetaan kalenterista <b>${calendarName}</b>:</div>`).appendTo($eventsToRemove);
          $(html).appendTo($eventsToRemove);
          $eventsToRemove.show();
        }
        ajaxInProgress(false);
      });
  };
  $select.select2({
    templateSelection: styleOption,
    templateResult: styleOption
  }).change(onCalendarChange);
  onCalendarChange();

});
