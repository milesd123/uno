//import  Module from './gen.js';
const Module = require('./gen.js');

Module().then((mod) => {
	const generator = mod.cwrap('generator', 'number', ['number']);
	const cardNum = generator(Date.now());
	console.log(cardNum);
});
