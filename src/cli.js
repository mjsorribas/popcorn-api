// Import the neccesary modules.
import bytes from "bytes";
import parseTorrent from "parse-torrent";
import path from "path";
import program from "commander";
import prompt from "prompt";
import torrentHealth from "torrent-tracker-health";

import Index from "./index";
import AnimeHelper from "./providers/anime/helper";
import MovieHelper from "./providers/movie/helper";
import packageJSON from "../package.json";
import Setup from "./config/setup";
import ShowHelper from "./providers/show/helper";
import Util from "./util";

/** Class The class for the command line interface. */
export default class CLI {

  /**
   * Create a cli object.
   * @param {String} [providerName=CLI] - The default provider name.
   */
  constructor(providerName = "CLI") {
    /**
     * The util object with general functions.
     * @type {Util}
     */
    this._util = new Util();

    // Setup the CLI program.
    program
      .version(`${packageJSON.name} v${packageJSON.version}`)
      .option("-c, --content <type>", "Add content from the MongoDB database (anime | show | movie).", /^(anime)|^(show)|^(movie)/i, false)
      .option("-r, --run", "Run the API and start the scraping process.")
      .option("-s, --server", "Run the API without starting the scraping process.")
      .option("-e, --export <collection>", "Export a collection to a JSON file.", /^(anime)|^(show)|^(movie)/i, false)
      .option("-i, --import <collection>", "Import a JSON file to the database.");

    // Extra output on top of the default help output
    program.on("--help", () => {
      console.log("  Examples:");
      console.log("");
      console.log("    $ popcorn-api -c <anime|movie|show>");
      console.log("    $ popcorn-api --content <anime|movie|show>");
      console.log("");
      console.log("    $ popcorn-api -r");
      console.log("    $ popcorn-api --run");
      console.log("");
      console.log("    $ popcorn-api -s");
      console.log("    $ popcorn-api --server");
      console.log("");
      console.log("    $ popcorn-api -e <anime|movie|show>");
      console.log("    $ popcorn-api --export <anime|movie|show>");
      console.log("");
      console.log("    $ popcorn-api -i <path-to-json>");
      console.log("    $ popcorn-api --import <path-to-json>");
      console.log("");
    });

    // Parse the command line arguments.
    program.parse(process.argv);

    // The imdb property.
    const imdb = {
      description: "The imdb id of the show/movie to add (tt1234567)",
      type: "string",
      pattern: /^(tt\d{7}|)|^(.*)/i,
      message: "Not a valid imdb id.",
      required: true
    };

    // The Hummingbird id property.
    const hummingbirdId = {
      description: "The Hummingbird id of the anime to add",
      type: "string",
      pattern: /^(.*)/i,
      message: "Not a validHhummingbird id.",
      required: true
    };

    // The torrent property.
    const torrent = {
      description: "The link of the torrent to add",
      type: "string",
      message: "Not a valid torrent.",
      required: true
    };

    // The language property.
    const language = {
      description: "The language of the torrent to add (en, fr, jp)",
      type: "string",
      pattern: /^([a-zA-Z]{2})/i,
      message: "Not a valid language",
      required: true
    }

    // The quality property.
    const quality = {
      description: "The quality of the torrent (480p | 720p | 1080p)",
      type: "string",
      pattern: /^(480p|720p|1080p)/i,
      message: "Not a valid quality.",
      required: true
    };

    // The season property.
    const season = {
      description: "The season number of the torrent",
      type: "integer",
      pattern: /^(\d+)/i,
      message: "Not a valid season.",
      required: true
    };

    // The episode property.
    const episode = {
      description: "The episode number of the torrent",
      type: "integer",
      pattern: /^(\d+)/i,
      message: "Not a valid episode.",
      required: true
    };

    const confirm = {
      description: "Do you really want to import a collection, this can override the current data?",
      type: "string",
      pattern: /^(yes|no|y|n)$/i,
      message: "Type yes/no",
      required: true,
      default: "no"
    };

    /**
     * The shema used by `prompt` insert an anime show.
     * @type {Object}
     */
    this._animeSchema = {
      properties: {
        "imdb": hummingbirdId,
        "season": season,
        "episode": episode,
        "torrent": torrent,
        "quality": quality
      }
    };

    /**
     * The schema used by `prompt` insert a movie.
     * @type {Object}
     */
    this._movieSchema = {
      properties: {
        "imdb": imdb,
        "language": language,
        "torrent": torrent,
        "quality": quality
      }
    };

    /**
     * The schema used by `prompt` insert a show.
     * @type {Object}
     */
    this._showSchema = {
      properties: {
        "imdb": imdb,
        "season": season,
        "episode": episode,
        "torrent": torrent,
        "quality": quality
      }
    };

    /**
     * The schema used by `prompt` to confirm an import.
     * @type {Object}
     */
    this._importSchema = {
      properties: {
        "confirm": confirm
      }
    };
  };

  /** Adds a show to the database through the CLI. */
  _animePrompt() {
    prompt.get(this._showSchema, async(err, result) => {
      if (err) {
        util.onError(`An error occurred: ${err}`);
        process.exit(1);
      } else {
        try {
          const { hummingbirdId, season, episode, quality, torrent } = result;
          const animeHelper = new AnimeHelper(providerName);
          const newAnime = await animeHelper.getHummingbirdInfo(hummingbirdId);
          if (newAnime && newAnime._id) {
            const data = await getShowTorrentDataRemote(torrent, quality, season, episode);
            await animeHelper.addEpisodes(newAnime, data, hummingbirdId);
            process.exit(0);
          }
        } catch (err) {
          this._util.onError(`An error occurred: ${err}`);
          process.exit(1);
        }
      }
    });
  };

  /**
   * Get movie data from a given torrent url.
   * @param {String} torrent - The url of the torrent.
   * @param {String} language - The language of the torrent.
   * @param {String} quality - The quality of the torrent.
   * @returns {Promise} - Movie data from the torrent.
   */
  _getMovieTorrentDataRemote(torrent, language, quality) {
    return new Promise((resolve, reject) => {
      parseTorrent.remote(torrent, (err, result) => {
        if (err) return reject(err);

        const magnet = parseTorrent.toMagnetURI(result);
        torrentHealth(magnet).then(res => {
          const { seeds, peers } = res;
          const data = {};
          if (!data[language]) data[language] = {};
          if (!data[language][quality]) data[language][quality] = {
            url: magnet,
            seed: seeds,
            peer: peers,
            size: result.length,
            filesize: bytes(result.length),
            provider: providerName
          };
          return resolve(data);
        }).catch(err => reject(err));
      });
    });
  };

  /** Adds a movie to the database through the CLI. */
  _moviePrompt() {
    prompt.get(this._movieSchema, async(err, result) => {
      if (err) {
        util.onError(`An error occurred: ${err}`);
        process.exit(1);
      } else {
        try {
          const { imdb, quality, language, torrent } = result;
          const movieHelper = new MovieHelper(providerName);
          const newMovie = await movieHelper.getTraktInfo(imdb);
          if (newMovie && newMovie._id) {
            const data = await getMovieTorrentDataRemote(torrent, language, quality);
            await movieHelper.addTorrents(newMovie, data);
            process.exit(0);
          }
        } catch (err) {
          this._util.onError(`An error occurred: ${err}`);
          process.exit(1);
        }
      }
    });
  };

  /**
   * Get show data from a given torrent url.
   * @param {String} torrent - The url of the torrent.
   * @param {String} quality - The quality of the torrent.
   * @param {Integer} season - The season of the show from the torrent file.
   * @param {Integer} episode - The episode of the show from the torrent.
   * @returns {Promise} - Show data from the torrent.
   */
  _getShowTorrentDataRemote(torrent, quality, season, episode) {
    return new Promise((resolve, reject) => {
      parseTorrent.remote(torrent, (err, result) => {
        if (err) return reject(err);

        const magnet = parseTorrent.toMagnetURI(result);
        torrentHealth(magnet).then(res => {
          const { seeds, peers } = res;
          const data = {};
          if (!data[season]) data[season] = {};
          if (!data[season][episode]) data[season][episode] = {};
          if (!data[season][episode][quality]) data[season][episode][quality] = {
            url: magnet,
            seeds,
            peers,
            provider: providerName
          };
          return resolve(data);
        }).catch(err => reject(err));
      });
    });
  };

  /** Adds a show to the database through the CLI. */
  _showPrompt() {
    prompt.get(this._showSchema, async(err, result) => {
      if (err) {
        this._util.onError(`An error occurred: ${err}`);
        process.exit(1);
      } else {
        try {
          const { imdb, season, episode, quality, torrent } = result;
          const showHelper = new ShowHelper(providerName);
          const newShow = await showHelper.getTraktInfo(imdb);
          if (newShow && newShow._id) {
            const data = await getShowTorrentDataRemote(torrent, quality, season, episode);
            await showHelper.addEpisodes(newShow, data, imdb);
            process.exit(0);
          }
        } catch (err) {
          this._util.onError(`An error occurred: ${err}`);
          process.exit(1);
        }
      }
    });
  };

  /** Confimation to import a collection */
  _importPrompt() {
    prompt.get(this._importSchema, (err, result) => {
      if (err) {
        this._util.onError(`An error occured: ${err}`);
        process.exit(1);
      } else {
        if (result.confirm.match(/^(y|yes)/i)) {
          let collection = path.basename(program.import);
          const index = collection.lastIndexOf(".");
          collection = collection.substring(0, index);
          this._util.importCollection(collection, program.import)
            .catch(err => console.error(err));
        } else if (result.confirm.match(/^(n|no)/i)) {
          process.exit(0);
        }
      }
    });
  };

  /** Run the CLI program. */
  run() {
    if (program.run) {
      new Index({start: true, pretty: true, debug: false});
    } else if (program.server) {
      new Index({start: false, pretty: true, debug: false});
    } else if (program.content) {
      prompt.start();
      Setup.connectMongoDB();

      if (program.content.match(/^(show)/i)) {
        this._showPrompt();
      } else if (program.content.match(/^(movie)/i)) {
        this._moviePrompt();
      }
    } else if (program.export) {
      this._util.exportCollection(program.export);
    } else if (program.import) {
      this._importPrompt();
    } else {
      this._util.onError("\n  \x1b[31mError:\x1b[36m No valid command given. Please check below:\x1b[0m");
      program.help();
    }
  };

};
