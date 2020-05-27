var activeDoc = DocumentApp.getActiveDocument();
var gridRegex = /^[A-Z\.]( [A-Z\.])+$/;
var clueRegex = /^(\d+)([AD])\t[A-Z]{3,}\t(.*)$/;

/**
 * Test to make sure we can access functions in the Library.
 */
function testlib() {
	var res = AppLib.test()
	Logger.log(res);
}

/** 
 * Adds the menu item on open. 
 */
function onOpen(e) {
	DocumentApp.getUi()
		.createMenu('Puzzle')
		.addItem('Upload .puz', 'uploadStarter')
		.addItem('Download as .puz', 'starter')
		// .addItem('JPZ test', 'jpzTest')
		.addItem('Download as .jpz', 'jpzStarter')
		.addToUi();
}

/** 
 * Returns an HTML dialog with the download link.
 */
function starter() {
	var html = HtmlService.createTemplateFromFile('dialog')
		.evaluate()
		.setWidth(300)
		.setHeight(150); 
	DocumentApp.getUi().showModalDialog(html, 'Download');
}

function jpzStarter() {
	var html = HtmlService.createTemplateFromFile('jpzDialog')
		.evaluate()
		.setWidth(300)
		.setHeight(100);
	DocumentApp.getUi().showModalDialog(html, 'Download');
}

/**
 * Returns an HTML dialog with a file input to upload a .puz.
 */
function uploadStarter() {
	var html = HtmlService.createTemplateFromFile('upload')
		.evaluate()
		.setWidth(300)
		.setHeight(200);
	DocumentApp.getUi().showModalDialog(html, 'Upload .puz');
}

/**
 * Function to make JPZ
 */
function makeJpzObj() {
	var paras = getDocParasJPZ(activeDoc).filter(para => para.getText().trim());
	var paraTexts = paras.map(para => para.getText());
	var obj = {
		info: {}
	};

	var gridArr = [];
	var clueArr = [];

	obj.info.title = paraTexts[0];
	obj.info.author = paraTexts[1];

	for (i=2; i<paras.length; i++) {
		//var paraText = paras[i].getText();
		if (gridRegex.test(paraTexts[i])) {
			gridArr.push(paraTexts[i]);
		} else if (clueRegex.test(paraTexts[i])) {
			clueArr.push(paras[i]);
		} else {
			continue;
		}
	}
	
	var grid = makeGridJPZ(gridArr);
	var words = countJPZWords(grid); 

	obj.grid = grid;
	obj.words = words;

	console.log(`${words[words.length - 1].word} words; ${clueArr.length} clues`);

	if (words[words.length - 1].word !== clueArr.length) {
		var offsetKind = words.length > clueArr.length ? 'few' : 'many';
		throw new Error(`There are too ${offsetKind} clues for this grid! Can't make JPZ.`)
	} else {
		var numWords = clueArr.length
	}

	var clues = makeCluesJPZ(clueArr);

	obj.clues = clues;
	// Logger.log(obj);
	return makeJPZXML(obj, numWords);
}

/**
 * Decodes and processes a .puz file into a templated doc.
 * 
 * @param {*} base64data 
 */
async function processUploadFile(base64data) {
	try {
		var raw = base64data.replace(/^data.*?base64,/, '');
		var decode = Utilities.base64Decode(raw);
		var puz = await AppLib.getPuz(decode);

		var formatPuz = formatPuzForDoc(puz);

		var style = {};
		style[DocumentApp.Attribute.HORIZONTAL_ALIGNMENT] =
			DocumentApp.HorizontalAlignment.RIGHT;
		style[DocumentApp.Attribute.FONT_FAMILY] = 'Roboto Mono';
		style[DocumentApp.Attribute.FONT_SIZE] = 11;

		var body = DocumentApp.getActiveDocument().getBody();
		body.setText(formatPuz);
		body.setAttributes(style);
		body.getParagraphs().forEach(para => {
			para.setIndentFirstLine(0);
			para.setIndentStart(144);
		})
	} catch (e) {
		throw new Error ('Unable to upload. Puz file may be corrupt.')
	}

	// Logger.log('processed!')
}

/*
 * Creates a .puz from the active document.
 *
 * @returns {Object} puz - The puz file as an object.
 * @returns {string} puz.filename - The name of the file.
 * @returns {string} puz.data - The file (base64 encoded.)
 */
function createPuz() {
	try {
		var puzObj = makePuzObj(activeDoc);
		var puzBuf = JSON.parse(AppLib.makePuz(puzObj));
		var puzB64 = puzBuf.data.replace('base64:', '');
		var docName = activeDoc.getName();
		return {
			filename: `${docName}.puz`,
			data: puzB64
		};
	} catch (e) {
		throw new Error ('Couldn\'t make a PUZ file. Check document formatting.')
	}
}

/**
 * creates a jpz file (XML, but base-64 encoded for ease of download.)
 */
function createJpz() {
	try {
		var jpzXml = makeJpzObj();
		var jpzB64 = Utilities.base64Encode(jpzXml, Utilities.Charset.UTF_8);
		var docName = activeDoc.getName();
		return {
			filename: `${docName}.jpz`,
			data: jpzB64
		};
	} catch (e) {
		throw new Error ('Couldn\'t make a JPZ file. Check document formatting.')
	}
}

/*
 * Function to get all document text as an array of paragraphs.
 *
 * @param {Object} doc - The document
 * @return {string[]} An array of trimmed strings
 */
function getDocParas(doc) {
	var paras = doc.getBody().getParagraphs();

	var paraTexts = paras.map(para => {
		return para.getText().trim();
	});

	return paraTexts;
}

/*
 * Function to get all document text as an array of paragraphs.
 */
function getDocParasJPZ(doc) {
	return doc.getBody().getParagraphs();
}

/*
 * Turns a document into an xpuz-compatible JSON object.
 *
 * @param {Object} doc - The document
 * @returns {Object} puz - The puzzle object
 * @reutrns {string} puz.title - The title of the puzzle
 * @reutrns {string} puz.author - The author of the puzzle
 * @reutrns {string} puz.grid - The puzzle grid
 * @reutrns {string} puz.clues - The puzzle clues
 */
function makePuzObj(doc) {
	var paras = getDocParas(doc).filter(para => para);
	var obj = {
		info: {}
	};

	var gridArr = [];
	var clueArr = [];

	obj.info.title = paras[0];
	obj.info.author = paras[1];

	for (i=2; i<paras.length; i++) {
		if (gridRegex.test(paras[i])) {
			gridArr.push(paras[i]);
		} else if (clueRegex.test(paras[i])) {
			clueArr.push(paras[i]);
		} else {
			continue;
		}
	}
	obj.grid = makeGrid(gridArr);
	obj.clues = makeClues(clueArr);

	return obj;
}

/**
 * Returns an xpuz-compatible grid object from the google doc.
 * 
 * @param {*} gridArr 
 */
function makeGrid(gridArr) {
	gridObj = gridArr.map(rowStr => {
		var cells = rowStr.split(' ');
		return cells.map(ltr => {
			return ltr === '.' ?
				{'isBlockCell': true} :
				{'solution': ltr}
		})
	});
	return gridObj;
}

/**
 * Returns an JPZ-ready grid object from the google doc.
 * 
 * @param {*} gridArr 
 */
function makeGridJPZ(gridArr) {
	grid = gridArr.map(rowStr => rowStr.trim().split(' '));
	var numCounter = 0;

	gridObj = grid.map((row, rowIndex) => {
		return row.map((cell, cellIndex) => {
      var above = rowIndex === 0 ? '.' : grid[rowIndex - 1][cellIndex];
      var prev = cellIndex === 0 ? '.' : row[cellIndex - 1];
			if ((above === '.' || prev === '.') && cell !== '.') {
				numCounter++;
        return {
					'solution': cell,
					'x': cellIndex + 1,
					'y': rowIndex + 1,
					'number': numCounter.toString()
				}
			} else if (cell === '.') {
				return {
					'isBlockCell': true,
					'x': cellIndex + 1,
					'y': rowIndex + 1,
				}
			} else {
				return {
					'solution': cell,
					'x': cellIndex + 1,
					'y': rowIndex + 1,
				}
			}
		})
	})

	return gridObj;
}

/**
 * Complicated function to label create a list of words by the cells they
 * are comprised of. Word ids start at 1 and increase by one, in the standard
 * order of crossword clue lists (that is, all of the acrosses starting from 1A,
 * and then all of the downs starting from 1D.)
 * 
 * @param {*} jpzGridObj 
 */
function countJPZWords(jpzGridObj) {
	var cells = [];
	var wordCounter = 0;
	var width = jpzGridObj[0].length;
	var height = jpzGridObj.length;

	// loop for acrosses
	for (var r = 0; r < height; r++) {
		for (var c = 0; c < width; c++) {
			if (jpzGridObj[r][c].solution) {
				if (!jpzGridObj[r][c-1] || jpzGridObj[r][c-1].isBlockCell) {
					wordCounter++;
				}
				cells.push({
					x: c + 1,
					y: r + 1,
					word: wordCounter 
				})	
			}
		}
	}

	// loop for downs
	for (var r = 0; r < height; r++) {
		for (var c = 0; c < width; c++) {
			var above = jpzGridObj[r-1] ? jpzGridObj[r-1][c] : undefined;
			var cell = jpzGridObj[r][c];
			if ((!above || above.isBlockCell) && cell.solution) {
				wordCounter++;
				for (var r2 = r; r2 < height; r2++) {
					if (jpzGridObj[r2][c].solution) {
						cells.push({
							x: c + 1,
							y: r2 + 1,
							word: wordCounter
						})
					} else {
						break;
					}
				}
			}
		}
	}

	return cells;
}



/**
 * Returns an xpuz-compatible clue object from the google doc.
 * 
 * @param {*} clueArr 
 */
function makeClues(clueArr) {
	var clues = {
		across: {},
		down: {}
	};
	clueArr.forEach(clue => {
		var parts = clueRegex.exec(clue);
		if (parts[2] === 'A') {
			clues.across[parts[1]] = parts[3]
		} else if (parts[2] === 'D') {
			clues.down[parts[1]] = parts[3]
		}
	});
	return clues;
}

/**
 * Returns an xpuz-compatible clue object from the google doc.
 * 
 * @param {*} clueArr - array of Clue Texts (gd element)
 */
function makeCluesJPZ(clueArr) {
	var clues = {
		across: [],
		down: []
	};
	clueArr.forEach((cluePara, clueIndex) => {
		var clueText = cluePara.getText();
		var [full, num, dir, clue] = clueRegex.exec(clueText);
		if (dir === 'A') {
			clues.across.push({
				number: num,
				word: clueIndex + 1,
				clueText: processItals(cluePara).trim().replace(/^.*\t/, '')
			})
		} else if (dir === 'D') {
			clues.down.push({
				number: num,
				word: clueIndex + 1,
				clueText: processItals(cluePara).trim().replace(/^.*\t/, '')
			})
		}
	});
	return clues;
}

/**
 * For each paragraph, add {{{i}}} tags around italics (later converted to 
 * <i> tags in the XML.)
 * 
 * @param {*} para 
 */
function processItals(para) {
	var textElem = para.editAsText();
	if (textElem.isItalic() === null) {
		var string = '';
		var text = textElem.getText();
		for (i = 0; i<text.length; i++) {
			if (textElem.isItalic(i)) {
				if (i === 0 || !textElem.isItalic(i-1)) {
					string += '{{{i}}}';
				}
				string += text[i];
				if (i === text.length - 1 || !textElem.isItalic(i+1)) {
					string += '{{{/i}}}'
				}
			} else {
				string += text[i]
			}
		}
		return string;
	} else {
		return textElem.getText();
	}
}



/**
 * Returns a string corresponding to a crossword puzzle from an xpuz object.
 * 
 * @param {*} puz 
 */
function formatPuzForDoc(puz) {
	var formatInfo = `${puz.info.title}\n${puz.info.author}`;
	
	var formatGrid = formatGridForDoc(puz.grid);

	var flatGrid = puz.grid.flat();
	var formatCluesA = formatCluesForDoc(puz.clues, 'across', 'A', flatGrid);
	var formatCluesD = formatCluesForDoc(puz.clues, 'down', 'D', flatGrid);

	return `${formatInfo}\n\n${formatGrid}\n\n${formatCluesA}\n\n${formatCluesD}`;
}

/**
 * Returns a text representation of the grid from an xpuz object.
 * 
 * @param {*} grid 
 */
function formatGridForDoc(grid) {
	return grid.map(row => {
		return row.map(cell => {
			if (cell.isBlockCell) {
				return '.'
			} else {
				return cell.solution
			}
		}).join(' ')
	}).join('\n');
}

/**
 * Returns a text representation of clues and answers from an xpuz object.
 * 
 * @param {obj} clues - The clues object
 * @param {string} dir - The direction
 * @param {string} dirSuffix - The directional suffix (A or D) 
 * @param {*} flatGrid - xpuz grid object, as a 1-D array. 
 */
function formatCluesForDoc(clues, dir, dirSuffix, flatGrid) {
	var nums = Object.keys(clues[dir]);
	return nums.map(num => {
		var solution = '';
		flatGrid.forEach((cell) => {
			if (!cell.isBlockCell) {
				if (cell.containingClues[dir] === parseInt(num)) {
					solution += cell.solution;
				}
			}
		});
		return `${num}${dirSuffix}\t${solution}\t${clues[dir][num]}`
	}).join('\n')
}


/**
 * XML builder... should probably be split into separate functions
 * 
 * @param {*} jpzObj 
 * @param {*} numWords 
 */
function makeJPZXML(jpzObj, numWords) {
	var xDoc = XmlService.parse(`<crossword-compiler-applet>
		<rectangular-puzzle>
			<metadata></metadata>
			<crossword>
				<grid one-letter-words="false"></grid>
			</crossword>
		</rectangular-puzzle>
	</crossword-compiler-applet>`);

	var root = xDoc.getRootElement();
	
	var puzElem = root.getChild('rectangular-puzzle');
	// do meta
	var metaElem = puzElem.getChild('metadata');
	metaElem.addContent(
		XmlService.createElement('creator').setText(jpzObj.info.author)
	);
	metaElem.addContent(
		XmlService.createElement('title').setText(jpzObj.info.title)
	);

	var xwElem = puzElem.getChild('crossword');

	var gridElem = xwElem.getChild('grid')
		.setAttribute('height', jpzObj.grid.length.toString())
		.setAttribute('width', jpzObj.grid[0].length.toString());
		
	jpzObj.grid.flat().forEach(cell => {
		var cellElem = XmlService.createElement('cell')
			.setAttribute('x', cell.x.toString())
			.setAttribute('y', cell.y.toString());
		if (cell.number) {
			cellElem.setAttribute('number', cell.number)
		}
		if (cell.isBlockCell) {
			cellElem.setAttribute('type', 'block');
		}	else {
			cellElem.setAttribute('solution', cell.solution);
		}
		gridElem.addContent(cellElem);
	})

	for (var i=1; i < numWords + 1; i++) {
		var word = XmlService.createElement('word')
			.setAttribute('id', i.toString());
		var cells = jpzObj.words.filter(entry => entry.word === i);
		cells.forEach(cell => {
			var xCell = XmlService.createElement('cells')
				.setAttribute('x', cell.x.toString())
				.setAttribute('y', cell.y.toString());
			word.addContent(xCell)
		})
		xwElem.addContent(word);
	}

	// acrosses 
	var aClues = XmlService.createElement('clues');
	aClues.addContent(
		XmlService.createElement('title')
		.addContent(XmlService.createElement('b').setText('Across'))
	)

	jpzObj.clues.across.forEach(acrossClue => {
		var xClue = XmlService.createElement('clue')
			.setAttribute('number', acrossClue.number)
			.setAttribute('word', acrossClue.word.toString())
			.addContent(
				XmlService.createElement('span').setText(sanitizeClueText(acrossClue.clueText))
			)
		aClues.addContent(xClue);
	})

	xwElem.addContent(aClues);
	
	// downs
	var dClues = XmlService.createElement('clues');
	dClues.addContent(
		XmlService.createElement('title')
		.addContent(XmlService.createElement('b').setText('Down'))
	);

	jpzObj.clues.down.forEach(downClue => {
		var xClue = XmlService.createElement('clue')
			.setAttribute('number', downClue.number)
			.setAttribute('word', downClue.word.toString())
			.addContent(
				XmlService.createElement('span').setText(sanitizeClueText(downClue.clueText))
			)
		dClues.addContent(xClue);
	});

	xwElem.addContent(dClues);

	var xmlText = XmlService.getPrettyFormat().format(xDoc);

	return xmlText.replace(/{{{/g, '<').replace(/}}}/g, '>');
}

// replace non-xml safe characters
function sanitizeClueText(clueText) {
	return clueText.replace(/</g, '&lt;')
								 .replace(/>/g, '&gt;')
								 .replace(/&/g, '&amp;')
}
