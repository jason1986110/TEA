'use strict'

function init(out) {
  if(out) return log;
  else return () => 1;

  function log() {
    if(arguments.length === 0) {
      out("");
      out("");
    }
    const l = [];
    for(let i = 0;i < arguments.length;i++) {
      l.push(shorten(arguments[i]));
    }
    out(l.join(" "));
  }
}

function shorten(a) {

  if(Array.isArray(a) && typeof(a[0]) === "string") {
    const aa = [];
    let tot = 0;
    for(let i = 0;i < a.length;i++) {
      const v = a[i].trim();
      tot += v.length;
      aa.push(v.substring(0, 16))
      if(tot > 40) break;
    }
    return JSON.stringify(aa);
  }

  if(Array.isArray(a) && Array.isArray(a[0])) {
    const aa = [];
    for(let i = 0;i < a.length;i++) {
      aa.push(shorten(a[i]));
    }
    return aa;
  }

  if(Array.isArray(a) && typeof(a[0]) === "object") {
    const aa = a.map(o => {
      return {
        ...o,
        value: o.value.trim().substring(0,16)
      };
    });
    return JSON.stringify(aa);
  }

  if(typeof(a) === "string") return a.substring(0, 32);
  return JSON.stringify(a);
}


module.exports = init;
