require("regenerator-runtime/runtime");

var Buffer = require('buffer/').Buffer;
const BJSON = require('buffer-json');
const {Parsers, Puzzle} = require('xpuz');

// async function getPuz() {
//   // const testpuz = './agard-tny-december-friday.puz';
//   const testpuz = './out/agard-test-puz.puz';
//   // const testpuz = 'NL_NLer_5.puz';

//   let parser = new Parsers.PUZ;
//   let puzdata = await parser.parse(testpuz);

//   let gridarray = [];
//   puzdata.grid.forEach(row => {
//     let rowarray = [];
//     row.forEach(cell => {
//       // rowarray.push(cell.isBlockCell ? '.' : cell.solution);
//       if (cell.isBlockCell) { 
//         rowarray.push({isBlockCell: true});
//       } else {
//         rowarray.push({solution: cell.solution});
//       }
//     })
//     gridarray.push(rowarray);
//     // console.log(rowarray.join(' '));
//   })

//   // console.log(gridarray);
//   console.log(puzdata.clues.across['1'])
// }

function makePuz(puzobj) {
  try {
    let newpuz =  new Puzzle(puzobj);
    let parser = new Parsers.PUZ;

    let puzfile = Buffer.from(parser.generate(newpuz));

    console.log('made .puz.');
    return BJSON.stringify(puzfile);
  } catch(e) {
    console.log(e);
  }
}

const test = () => 'lib is working';

export {
  makePuz,
  test
};
