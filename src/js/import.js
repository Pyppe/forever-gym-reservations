$(() => {
  const styleOption = (opt) => {
    const $el = $(opt.element);
    return $(`<div class="calendar-option"><span style="background-color: ${$el.data('backgroundColor')}"></span> ${opt.text}</div>`);
  };
  const $select = $('#import select');
  const $buttonText = $('#import button [cal-name]');
  const onCalendarChange = () => {
    const calendarId = $select.val();
    $buttonText.text(
      $select.find(`option[value="${calendarId}"]`).text()
    );
    $.get('/api/google/removed-events', {calendarId: calendarId}).
      done(res => {
        console.log(res);
      });
  };
  $select.select2({
    templateSelection: styleOption,
    templateResult: styleOption
  }).change(onCalendarChange);
  onCalendarChange();

});
