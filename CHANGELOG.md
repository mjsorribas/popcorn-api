2.1.0 - You weeaboos - 2 August 2016
====================================

New features:
 - Anime! For all you weeaboos.
 - Get a random TV show at `/random/show`.
 - Import & export collection.

Bug fixes:
 - Fixed search not working correctly.
 - Fixed #25.

Notes:
 - Moved documentation over to ESDoc.
 - Documentation will now be on GitHub.
 - Added Travis CI.
 - Using ES6 classes instead of factory functions.

2.0.0 - Whatcha Babbling about? - 20 June 2016
==============================================

New features:
 - Get a random movie at `/random/movie`.
 - Added YTS as a movie provider.
 - Movies now support multiple languages.
 - Moved the entire project to ES6 with [Babel](https://babeljs.io/).
 - The API can now be installed globally.
 - Added a command line interface to the API ([See CLI](README.md#cli)).
   - Able to add new show torrents through the CLI.
   - Able to add new movie torrents through the CLI.
 - Added support for the Gulp build system ([See Gulp](README.md#gulp)).
 - Documentation can be generated with the `npm run docs`.
 - Added option to start with the forever module (`npm run forever`).

Bug fixes:
 - Fixed bug where the cron job was not working.
 - Fixed bug where better movie and show torrents did not update.
 - Fixed bug where `num_seasons` was fluctuating.

Notes:
 - Changed the projection of movies so it can be used with a [popcorntime provider](https://github.com/ChrisAlderson/butter-provider-movies).
 - (HTTP) Logging is done with the Winston library.
 - Added configuration for JSCS linter.
 - Changed license from GPLv3 to MIT.
 - Moved the library for eztv scraping to its own module over [here](https://github.com/ChrisAlderson/eztv-api-pt).
 - Moved the library for kat scraping to its own module over [here](https://github.com/ChrisAlderson/kat-api-pt).
 - Redid the [README.md](README.md).
 - Redid the kat providers.

1.1.0 - Wanna catch a movie? - 20 March 2016
============================================

New features:
 - Movies!
  - Scrape movies from kat.cr the same way shows work.
  - Routes to get a list of movies or a specific movie.
 - Added `/logs/error` to see the error log.
 - Added `imdbMap` in `config.js` for correcting imdb ids.

Bug fixes:
 - Fixed issue where some season based episodes from EZTV where not added (Including [Last Week Tonight with John Oliver](https://eztv.ag/shows/1025/last-week-tonight-with-john-oliver/)).
 - Partially fixed issue with MongoDB limitations to sorting.
 - Status will now be set to `Idle` after scraping is done.

Notes:
 - Disabled `/shows/search/`, `/shows/update/`, `/shows/last_updated` routes as they don't seem to be used by Popcorn Time.
 - Made scraping EZTV faster by merging the `getShowDetails` and `getAllEpisodes` functions.
 - Required NodeJS version was changed in 1.0.2 to NodeJS v.5.0.0.

1.0.2 - Wanna retry? - 14 March 2016
====================================

New features:
 - Resets the log files on each scrape.
 - Added `repo` to the index.

Bug fixes:
 - Now properly updates metadata.
 - Some fixes to prevent ETIMEDOUT.

Notes:
 - Removed dependency on Q.
 - Replaced `slug` with `imdb` for getting seasonal metadata from trakt.tv.

1.0.1 - What's trending? - 6 March 2016
======================================

Bug fixes:
 - Sort by trending.

1.0.0 - Let's kick some ass! - 1 March 2016
============================================

Features:
 - Scraping EZTV.ag just like the old API.
 - Scraping kat.cr with 17 different providers.
 - Able to add more providers for kat.cr scraping.
