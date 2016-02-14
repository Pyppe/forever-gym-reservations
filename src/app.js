
function loadScript(url, onSuccess) {
  const script = document.createElement('script');
  script.src = url;
  const head = document.getElementsByTagName('head')[0];
  let done = false;

  // Attach handlers for all browsers
  script.onload = script.onreadystatechange = function() {
    const ready = !this.readyState ||
                  this.readyState == 'loaded' ||
                  this.readyState == 'complete';
    if (!done &&  ready) {
      done = true;
      onSuccess();
      script.onload = script.onreadystatechange = null;
      head.removeChild(script);
    }
  };
  head.appendChild(script);
}

function parseReservations() {
  const $rows = $('.searchResults tbody tr');

  function parseIsoDate(str) {
    const pad = x => x.length === 1 ? `0${x}` : x;
    const m = str.match(/^(\d{1,2}).(\d{1,2}).(\d{4})$/);
    return `${pad(m[3])}-${pad(m[2])}-${m[1]}`;
  }

  function parseTimes(str) {
    const m = str.match(/^(\d\d:\d\d)\s*.\s*(\d\d:\d\d)$/);
    return [`${m[1]}:00`, `${m[2]}:00`];
  }

  function trimText(t) {
    return $.trim(t.replace(/([\n\r\t\s]+)/g, ' '));
  }

  return $rows.toArray().map(row => {
    const $row = $(row);
    const parseCol = (idx) => trimText($row.find(`td:eq(${idx})`).text());
    const date = parseIsoDate(parseCol(0));
    const [startTime, endTime] = parseTimes(parseCol(1));
    return {
      startTime   : `${date}T${startTime}`,
      endTime     : `${date}T${endTime}`,
      summary     : parseCol(2),
      location    : trimText($('#club-name').text()),
      description : [
        `- Sijainti: ${parseCol(3)}`,
        `- Ohjaaja: ${parseCol(4)}`,
      ].join('\n')
    };
  });
}

function saveReservations(reservations) {
  return $.ajax({
    url: 'http://localhost:3000/reservations',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(reservations)
  }).error(err => {
    alert('Virhe');
  });
}

/*
function uploadFile(filename, description, content) {
  return $.ajax({
    url: 'https://api.github.com/gists',
    type: 'POST',
    dataType: 'json',
    data: JSON.stringify({
      description: description,
      public: false,
      "files": {
        [filename]: {
          "content": content
        }
      }
    })
  }).error(err => {
    alert('Virhe');
  }).then(res => res.files[filename].raw_url);
}
*/

loadScript('https://code.jquery.com/jquery.min.js', () => {
  /*
  uploadFile('testing.json', 'Pyppe testaa', 'foo\nbar\nhehe').done(url => {
    alert(url);
  });
  */
  saveReservations(parseReservations()).done(res => {
    window.open(`http://localhost:3000/authenticate?id=${res.id}`);
  });
});

