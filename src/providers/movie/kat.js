// Import the neccesary modules.
import asyncq from "async-q";
import KatAPI from "kat-api-pt";
import { maxWebRequest, katMap } from "../../config/constants";
import Helper from "./helper";
import Util from "../../util";

/** Class for scraping movies from https://kat.cr/. */
export default class KAT {

  /**
   * Create a kat object.
   * @param {String} name - The name of the torrent provider.
   * @param {Boolean} debug - Debug mode for extra output.
   */
  constructor(name, debug) {
    /**
     * The name of the torrent provider.
     * @type {String}  The name of the torrent provider.
     */
    this.name = name;

    /**
     * The helper object for adding movies.
     * @type {Helper}
     */
    this._helper = new Helper(this.name);

    /**
     * A configured KAT API.
     * @type {KatAPI}
     * @see https://github.com/ChrisAlderson/kat-api-pt
     */
    this._kat = new KatAPI({ debug });

    /**
     * The util object with general functions.
     * @type {Util}
     */
    this._util = new Util();
  };

  /**
   * Get all the movies.
   * @param {Object} katMovie - The movie information.
   * @returns {Movie} - A movie.
   */
  async _getMovie(katMovie) {
    try {
      const newMovie = await this._helper.getTraktInfo(katMovie.slugYear);
      if (newMovie && newMovie._id) {
        delete katMovie.movieTitle;
        delete katMovie.slug;
        delete katMovie.slugYear;
        delete katMovie.torrentLink;
        delete katMovie.quality;
        delete katMovie.year;
        delete katMovie.language;

        return await this._helper.addTorrents(newMovie, katMovie);
      }
    } catch (err) {
      return this._util.onError(err);
    }
  };

  /**
   * Extract movie information based on a regex.
   * @param {Object} torrent - The torrent to extract the movie information from.
   * @param {String} language - The language of the torrent.
   * @param {Regex} regex - The regex to extract the movie information.
   * @returns {Object} - Information about a movie from the torrent.
   */
  _extractMovie(torrent, language, regex) {
    let movieTitle = torrent.title.match(regex)[1];
    if (movieTitle.endsWith(" ")) movieTitle = movieTitle.substring(0, movieTitle.length - 1);
    movieTitle = movieTitle.replace(/\./g, " ");
    let slug = movieTitle.replace(/\s+/g, "-").toLowerCase();
    slug = slug in katMap ? katMap[slug] : slug;
    const year = torrent.title.match(regex)[2];
    const quality = torrent.title.match(regex)[3];

    const movie = { movieTitle, slug, slugYear: `${slug}-${year}`, torrentLink: torrent.link, year, quality, language };

    movie[language] = {};
    movie[language][quality] = {
      url: torrent.magnet,
      seed: torrent.seeds,
      peer: torrent.peers,
      size: torrent.size,
      fileSize: torrent.fileSize,
      provider: this.name
    };

    return movie;
  };

  /**
   * Get movie info from a given torrent.
   * @param {Object} torrent - A torrent object to extract movie information from.
   * @param {String} language - The language of the torrent.
   * @returns {Object} - Information about a movie from the torrent.
   */
  _getMovieData(torrent, language) {
    const threeDimensions = /(.*).(\d{4}).[3Dd]\D+(\d{3,4}p)/;
    const fourKay = /(.*).(\d{4}).[4k]\D+(\d{3,4}p)/;
    const withYear = /(.*).(\d{4})\D+(\d{3,4}p)/;
    if (torrent.title.match(threeDimensions)) {
      return this._extractMovie(torrent, language, threeDimensions);
    } else if (torrent.title.match(fourKay)) {
      return this._extractMovie(torrent, language, fourKay);
    } else if (torrent.title.match(withYear)) {
      return this._extractMovie(torrent, language, withYear);
    } else {
      console.warn(`${this.name}: Could not find data from torrent: '${torrent.title}'`);
    }
  };

  /**
   * Puts all the found movies from the torrents in an array.
   * @param {Array} torrents - A list of torrents to extract movie information.
   * @param {String} language - The language of the torrent.
   * @returns {Array} - A list of objects with movie information extracted from the torrents.
   */
  async _getAllKATMovies(torrents, language) {
    try {
      const movies = [];
      await asyncq.mapSeries(torrents, torrent => {
        if (torrent) {
          const movie = this._getMovieData(torrent, language);
          if (movie) {
            if (movies.length != 0) {
              const { movieTitle, slug, language, quality } = movie;
              const matching = movies
                .filter(m => m.movieTitle === movieTitle)
                .filter(m => m.slug === slug);

              if (matching.length != 0) {
                const index = movies.indexOf(matching[0]);
                if (!matching[0][language][quality]) matching[0][language][quality] = movie[language][quality];

                movies.splice(index, 1, matching[0]);
              } else {
                movies.push(movie);
              }
            } else {
              movies.push(movie);
            }
          }
        }
      });
      return movies;
    } catch (err) {
      return this._util.onError(err);
    }
  };

  /**
   * Get all the torrents of a given provider.
   * @param {Integer} totalPages - The total pages of the query.
   * @param {Object} provider - The provider to query https://kat.cr/.
   * @returns {Array} - A list of all the queried torrents.
   */
  async _getAllTorrents(totalPages, provider) {
    try {
      let katTorrents = [];
      await asyncq.timesSeries(totalPages, async page => {
        try {
          provider.query.page = page + 1;
          console.log(`${this.name}: Starting searching KAT on page ${provider.query.page} out of ${totalPages}`);
          const result = await this._kat.search(provider.query);
          katTorrents = katTorrents.concat(result.results);
        } catch (err) {
          return this._util.onError(err);
        }
      });
      console.log(`${this.name}: Found ${katTorrents.length} torrents.`);
      return katTorrents;
    } catch (err) {
      return this._util.onError(err);
    }
  };

  /**
   * Returns a list of all the inserted torrents.
   * @param {Object} provider - The provider to query https://kat.cr/.
   * @returns {Array} - A list of scraped movies.
   */
  async search(provider) {
    try {
      if (!provider.query.language) return this._util.onError(`Provider with name: '${this.name}' does not have a language set!`);

      console.log(`${this.name}: Starting scraping...`);
      provider.query.page = 1;
      provider.query.category = "movies";
      provider.query.verified = 1;
      provider.query.adult_filter = 1;

      const getTotalPages = await this._kat.search(provider.query);
      const totalPages = getTotalPages.totalPages; // Change to 'const' for production.
      if (!totalPages) return this._util.onError(`${this.name}: totalPages returned: '${totalPages}'`);
      // totalPages = 3; // For testing purposes only.
      console.log(`${this.name}: Total pages ${totalPages}`);

      const katTorrents = await this._getAllTorrents(totalPages, provider);
      const katMovies = await this._getAllKATMovies(katTorrents, provider.query.language);
      return await asyncq.mapLimit(katMovies, maxWebRequest,
        katMovie => this._getMovie(katMovie).catch(err => this._util.onError(err)));
    } catch (err) {
      this._util.onError(err);
    }
  };

};
