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
  	.createMenu('TNY')
  	.addItem('Download as .puz', 'starter')
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

/*
 * Creates a .puz from the active document.
 *
 * @returns {Object} puz - The puz file as an object.
 * @returns {string} puz.filename - The name of the file.
 * @returns {string} puz.data - The file (base64 encoded.)
 */
function createPuz() {
	var puzObj = makePuzObj(activeDoc);
	var puzBuf = JSON.parse(AppLib.makePuz(puzObj));
	var puzB64 = puzBuf.data.replace('base64:', '');
	var docName = activeDoc.getName();
	return {
		filename: `${docName}.puz`,
		data: puzB64
	};
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

function makeGrid(gridArr) {
	gridObj = gridArr.map(rowStr => {
		var cells = rowStr.split(' ');
		return cells.map(ltr => {
			return ltr === '.' ?
				{'isBlockCell': true} :
				{'solution': ltr}
		})
	})
	return gridObj;
}

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
	})
	return clues;
}
