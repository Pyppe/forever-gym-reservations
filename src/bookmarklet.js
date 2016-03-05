
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

function isRightPage() {
  return location.hostname === "forever.bypolar.fi" &&
    location.search.indexOf("webUserReservations") > 0;
}

function parseReservations() {
  const $rows = $('.searchResults tbody tr');

  function parseIsoDate(str) {
    const pad = x => x.length === 1 ? `0${x}` : x;
    const m = str.match(/^(\d{1,2}).(\d{1,2}).(\d{4})$/);
    return `${pad(m[3])}-${pad(m[2])}-${pad(m[1])}`;
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

function saveReservations(reservations, url) {
  return $.ajax({
    url: url,
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

if (isRightPage()) {
  const baseUrl = '<BASEURL>';
  const bookmarkletVersion = '<BOOKMARKLET_VERSION>';

  const saveReservationsAction = () => {
    saveReservations(parseReservations(), `${baseUrl}/reservations`).done(res => {
      window.open(`${baseUrl}/authenticate?id=${res.id}`);
    });
  };

  if (typeof jQuery == 'undefined') {
    loadScript('https://code.jquery.com/jquery.min.js', saveReservationsAction);
  } else {
    $.get(`${baseUrl}/version`).done(latestVersion => {
      if (latestVersion === bookmarkletVersion) {
        saveReservationsAction();
      } else {
        alert([
          `Bookmarkletin versio on päivittynyt (${latestVersion})`,
          `Ole hyvä ja päivitä kirjanmerkkisi osoitteesta ${baseUrl}`
        ].join('\n'));
      }
    });
  }
} else {
  alert([
    'Et ole oikealla sivulla.',
    `Kirjaudu sisään osoitteessa https://forever.bypolar.fi/, ja mene "Omat varaukset" -sivulle.`
  ].join('\n'));
}


