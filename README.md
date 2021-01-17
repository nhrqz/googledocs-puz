# googledocs-puz

Import a `.puz` crossword file to a Google Doc, and export a Google Doc to a `.puz` or `.jpz` crossword file.

Designed to be employed as a Google Apps Script bound to a Google Doc, `googledocs-puz` generates a `.puz` file (specification [here](https://code.google.com/archive/p/puz/wikis/FileFormat.wiki)) from text in a Google Doc.

`googledocs-puz` relies on a [fork](https://github.com/nhrqz/xpuz) of [`xpuz`](https://www.npmjs.com/package/xpuz) to work with `.puz` files. (The fork removes some references to Node's `fs` module to ensure code can run in the browser, and fixes a bug that prevents some `.puz` files from being read at all.)

- [How to use](#how-to-use)
- [Google Doc formatting](#google-doc-formatting)
- [Structure](#structure)

---

## How to use

`googledocs-puz` uses [`webpack`](https://webpack.js.org/) to bundle and [`clasp`](https://github.com/google/clasp) for deployment. It is exclusively compatible with the v8 runtime of Google Apps Script. 

To initiate the project on an existing Google Doc:

```sh
npm run init -- <PARENT DOCUMENT ID>
```

To re-initiate the project on a different (existing) Google Doc: 

```sh
npm run reinit -- <PARENT DOCUMENT ID>
```

To re-deploy the GAS project after making changes:

```sh
npm run deploy
```

To create the `dist/` directory without doing a `clasp push`:

```
npm run gas
```

---

## Google Doc formatting

`googledocs-puz` expects the Google Doc to be formatted a particular way (ignoring any empty lines). Uploaded puzzles will be rendered in this format. Here's how the [2019-12-09 *New Yorker* puzzle](https://www.newyorker.com/crossword/puzzles-dept/2019/12/09) should look:

```txt
The Weekday Crossword: Monday, December 9, 2019
Natan Last

D F L A T . E R R S . A S H E
A L A M O . P E E L . S P A R
B E B O P . I N D U E T I M E
O A R S . D R E A M G I R L S
M B A . C R U E L . G R E E T
B A D G U Y S . G A H . S T U
. G O O F S . P A L E O . . .
. . R E F U G E E C A M P . .
. . . S L I E R . O D E L L .
H O G . I T S . A V E N U E Q
A G A I N . T A S E D . S A W
C L I C K F A R M S . M O V E
K A M A S U T R A . D I N E R
E L A N . M E I R . A L E U T
R A N T . E D D A . M E S S Y

1A	DFLAT	Key of Debussy's "Clair de Lune"
6A	ERRS	Transgresses
10A	ASHE	Queens stadium
[...]
60A	MESSY	Like some breakups

1D	DABOMB	All that, even more hokily
2D	FLEABAG	Fourth-wall-breaking Phoebe Waller-Bridge series
3D	LABRADOR	It might be chocolate
4D	AMOS	"Crucify" singer Tori
[...]
54D	DAM	Water gate?
```

`googledocs-puz` assumes the first and second lines of the document are title and author, respectively (both are required). The filename of the output will be the name of the Google Doc, suffixed with `.puz` or `.jpz`.

The grid should use only capital letters and `.` to denote blocks. Every clue consists of three parts: a clue address, the corresponding answer (again, capitals only), and the clue, all separated with tabs. (I.e., for a standard 15x15 grid: `^[0-9]+[AD]\t[A-Z]{3,15}\t.*$`)

Any non-grid or non-clue text is ignored.

Like all `.puz` files, those generated by `googledocs-puz` are not Unicode compatible (their character set is limited to Extended ASCII.) Any non-compatible characters will be converted to `?` in the `.puz` output. (Curly quotes, however, will be replaced with straight ones.)

`.jpz` files _are_ Unicode compatible. 

---

## Structure

### [`src/lib.js`](./src/lib.js)

This is compiled to become the `AppLib` referenced in `index.js`. Contains two functions: 

`makePuz` creates a `.puz` file (as a JSON object with base-64 encoded data) from a xpuz-compatible JSON puzzle object. 

`test` checks that the library is accessible.

### [`index.js`](./index.js)

Contains only Google Apps Script (`.gs`) code. Reads the document, calls out to create the `.puz`, and serves the dialog.

### [`dialog.html`](./dialog.html)

A small [HTML template](https://developers.google.com/apps-script/guides/html/templates) served as a dialog, to download the `.puz`.
