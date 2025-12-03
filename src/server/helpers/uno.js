import  Module from '../../wasm/gen.js';
//const Module = require('./gen.js');

let generator = null;
let loaded = null;
let cnt = 0;

async function ensureLoading() {
  if (generator) return;
  if (!loaded) {
    loaded = Module().then((mod) => {
        //module object: generator function, return and input value types
        generator = mod.cwrap('generator', 'number', ['number']);
        const cardNum = generator(Date.now());
        return cardNum;
    });
  }
  await loaded;
}

export async function newCard(){
    // wait for the module to load
    await ensureLoading();
    const rand = Math.random();
    const cardNum = Math.floor(rand * Number.MAX_SAFE_INTEGER);
    return generator(cardNum);
}
