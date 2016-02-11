
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

function reservations() {
  const $rows = $('.searchResults tbody tr');
  $rows.toArray().map(row => {
    const parseCol = (idx) => $.trim($row.find(`td:eq(${idx})`).text());
    const $row = $(row);
    const date = parseCol(0);
    const time = parseCol(1);
    const event = parseCol(2);
    return {
      date: date,
      time: time
    };
  });
}

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

loadScript('https://code.jquery.com/jquery.min.js', () => {
  uploadFile('testing.json', 'Pyppe testaa', 'foo\nbar\nhehe').done(url => {
    alert(url);
  });
});

