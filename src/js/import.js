$(() => {
  const $select = $('#import select');
  if ($select.length === 0) return;

  const styleOption = (opt) => {
    const $el = $(opt.element);
    return $(`<div class="calendar-option"><span style="background-color: ${$el.data('backgroundColor')}"></span> ${opt.text}</div>`);
  };
  const $button = $('#import button');
  const $buttonText = $button.find('[cal-name]');
  const $eventsToRemove = $('#events-to-remove');

  const {previousCalendarId, saveCalendarId} = (() => {
    const key = 'googleCalendarId';

    return {
      previousCalendarId:  () => localStorage.getItem(key),
      saveCalendarId: (value) => localStorage.setItem(key, value)
    };
  })();

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
    $.get('/api/google/cancelled-events', {calendarId: calendarId, html: true}).
      done(html => {
        if (html === '') {
          $eventsToRemove.hide();
        } else {
          $eventsToRemove.find('> *').remove();
          $('<h3><i class="fa fa-calendar-plus-o"></i> Peruutetut varaukset</h3>').appendTo($eventsToRemove);
          $(`<div class="alert alert-warning">Seuraavat peruutetut varaukset poistetaan kalenterista <b>${calendarName}</b>:</div>`).appendTo($eventsToRemove);
          $(html).appendTo($eventsToRemove);
          $eventsToRemove.show();
        }
        ajaxInProgress(false);
      });
  };

  $button.click(() => {
    $button.prop('disabled', true);
    $select.prop('disabled', true);
    $('<span> <i class="fa fa-spin fa-spinner"></i></span>').insertAfter($button);
    const cancelledIds = $eventsToRemove.find('[data-event-id]').map(function() {
      return $(this).data('eventId');
    }).toArray();
    const calendarId = $select.val();

    saveCalendarId(calendarId);
    $.ajax({
      url: '/api/google/sync-reservations',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        calendarId: calendarId,
        cancelledEventIds: cancelledIds
      })
    }).done(response => {
      const hasErrors = response.errors > 0;
      $('#import').hide();
      const text = hasErrors ?
        'Kalenterin synkronointi epäonnistui osittain. :(' :
        'Kalenteri synkronoitiin onnistuneesti!';
      const icon = `<i class="fa fa-lg fa-${hasErrors ? 'warning' : 'check-circle-o'}"></i>`;
      $(`<div class="alert ${hasErrors ? 'alert-danger' : 'alert-success'}">${icon} ${text}</div>`).insertAfter($('#import'));
    });
  });

  if (previousCalendarId()) {
    const prevId = previousCalendarId();
    if ($select.find(`option[value="${prevId}"]`).length > 0) {
      $select.val(prevId);
    }
  }
  $select.select2({
    templateSelection: styleOption,
    templateResult: styleOption
  }).change(onCalendarChange);
  onCalendarChange();

});
