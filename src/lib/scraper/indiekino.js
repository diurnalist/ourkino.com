import { addDays } from 'date-fns';
import cheerio from 'cheerio';
import { todayUTC, parse } from '../datetime.js';
import debug from 'debug';
import request from 'request';
import url from 'url';

const log = debug('scraper:indiekino');

export default (callback) => {
  log('starting');

  const host = 'http://www.indiekino.de';

  request(url.resolve(host, 'kinoprogramm/de/berlin/'), (err, res) => {
    if (err)  {
      return callback(err);
    }

    const $ = cheerio.load(res.body);
    const $sections = $('.gp');

    const showtimes = [];

    const now = todayUTC();
    const dateColumns = $sections.map((i) => {
      return addDays(now, i);
    }).get();

    $sections.each((i, schedule) => {
      $('.pa', schedule).each((_, list) => {
        const location = $('.kino', list).text();

        $('.termin', list).each((__, item) => {
          const [ hours, minutes ] = $('.zi', item).text().split(':');
          const language = $('.fassung', item).text();
          const anchor = $('.titel > a', item);

          const title = anchor.length ? anchor.text() : $('.titel', item).text();
          const deepLink = anchor.length ? url.resolve(host, anchor.attr('href')) : null;

          const showtime = parse(dateColumns[i]);
          showtime.setUTCHours(hours);
          showtime.setUTCMinutes(minutes);

          showtimes.push({
            deepLink,
            language,
            location,
            showtime,
            title
          });
        });
      });
    });

    log(`got ${showtimes.length} results`);
    callback(null, showtimes);
  });
};
