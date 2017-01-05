const addHours = require('date-fns/add_hours');
const request = require('request');
const split = require('split');
const url = require('url');

const dataExtractRegex = /dataLayer\.push\((.*?)\);$/;
const host = 'https://www.kinoheld.de';

function getViewData(permalink) {
  return new Promise((resolve, reject) => {
    request({
      url: url.resolve(host, `kino-berlin/${permalink}`),
      qs: {
        layout: 'shows'
      }
    })
    .pipe(split())
    .on('data', (line) => {
      const [, json] = line.match(dataExtractRegex) || []

      if (json) {
        resolve(JSON.parse(json));
      }
    })
    .on('error', reject);
  });
}

module.exports = (location, permalink) => (callback) => {
  const log = require('debug')(`scraper:${location.toLowerCase().replace(' ', '')}`);

  log('starting');
  getViewData(permalink)
    .then(({ shows, movies }) => {
      const showtimes = [];

      Object.keys(shows).forEach((key) => {
        const show = shows[key];
        const movie = movies[show.movieId];

        const deepLink = url.resolve(host, show.url);
        const language = show.flags[0] || null;
        // TODO: this is brittle. need to account for DST
        // The times stored on kinoheld are UTC, then they are somehow supposed
        // to be displayed in the proper timezone
        const showtime = addHours(new Date(show.start), 1);
        const title = movie.name.replace(/\((ov|ome?u)\)/i, '').trim();

        showtimes.push({
          deepLink,
          language,
          location,
          showtime,
          title
        });
      });

      log(`got ${showtimes.length} results`);
      callback(null, showtimes);
    }, callback);
};