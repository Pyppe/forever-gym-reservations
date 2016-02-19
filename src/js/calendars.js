$(() => {
  const styleOption = (opt) => {
    const $el = $(opt.element);
    return $(`<div class="calendar-option"><span style="background-color: ${$el.data('backgroundColor')}"></span> ${opt.text}</div>`);
  };
  $('#calendars select').select2({
    templateSelection: styleOption,
    templateResult: styleOption
  });
});
