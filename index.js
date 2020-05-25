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
		.addItem('Download as .puz', 'starter')
		.addItem('Upload .puz', 'uploadStarter')
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

function uploadStarter() {
	var html = HtmlService.createTemplateFromFile('upload')
		.evaluate()
		.setWidth(300)
		.setHeight(200);
	DocumentApp.getUi().showModalDialog(html, 'Upload .puz');
}



async function processUploadFile(base64data) {
	var raw = base64data.replace(/^data.*?base64,/, '');
	var decode = Utilities.base64Decode(raw);
	var puz = await AppLib.getPuz(decode);

	console.log(puz.grid);
	Logger.log(puz.grid);

	var formatPuz = formatFromPuz(puz);


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


	Logger.log('processed!')
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
	});
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
	});
	return clues;
}

function formatFromPuz(puz) {
	var formatInfo = `${puz.info.title}\n${puz.info.author}`;
	
	var formatGrid = puz.grid.map(row => {
		return row.map(cell => {
			if (cell.isBlockCell) {
				return '.'
			} else {
				return cell.solution
			}
		}).join(' ')
	}).join('\n');

	var acrosses = Object.keys(puz.clues.across);
	var downs = Object.keys(puz.clues.down);
	var flatGrid = puz.grid.flat();

	var formatCluesA = acrosses.map(num => {
		var solution = '';
		flatGrid.forEach((cell) => {
			if (!cell.isBlockCell) {
				if (cell.containingClues.across === parseInt(num)) {
					solution += cell.solution;
				}
			}
		});
		return `${num}A\t${solution}\t${puz.clues.across[num]}`
	}).join('\n')

	var formatCluesD = downs.map(num => {
		var solution = '';
		flatGrid.forEach((cell) => {
			if (!cell.isBlockCell) {
				if (cell.containingClues.down === parseInt(num)) {
					solution += cell.solution;
				}
			}
		});
		return `${num}D\t${solution}\t${puz.clues.down[num]}`
	}).join('\n')

	return `${formatInfo}\n\n${formatGrid}\n\n${formatCluesA}\n\n${formatCluesD}`;
}
