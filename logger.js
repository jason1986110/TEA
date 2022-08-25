'use strict'

function init(out) {
  if(out) return log;
  else return () => 1;

  function log() {
    for(let i = 0;i < arguments;i++) {
      out(shorten(arguments[i]));
    }
}

function shorten(a) {
  if(Array.isArray(a) && typeof(a[0]) === "string") {
    const aa = [];
    let tot = 0;
    for(let i = 0;i < a.length;i++) {
      const v = a[i];
      tot += v.length;
      aa.push(v.substring(0, 16))
      if(tot > 40) break;
    }
    return JSON.stringify(aa);
  }
  if(Array.isArray(a) && typeof(a[0]) === "object") {
    const aa = a.map(o => {
      return {
        ...o,
        v: o.v.substring(0,16)
      };
    });
    return JSON.stringify(aa);
  }
  return a;
}


module.exports = init;
