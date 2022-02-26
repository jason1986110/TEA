#!/usr/bin/env node
//** # DEFG - Generate documentation from code comments
//**
//** ## WHY!?
//**
//** I find that README's and other documentations tend to get out of
//** date really _really_ quickly. The hope here is that user documentation
//** kept close to code should be easier to access, modify, and update.
//**
//** ## How does it work?
//**
//** `defg` trawls through all 'programming' files (.js, .sh, .java, .c, .cpp,...)
//** it finds and extracts 'special' comments that start with `//**` - these are
//** considered 'user documentation' comments. It then checks that all these
//** lines are present in the README. If they are, it generates a nice PDF from
//** and opens it.
//**
//** ## Why not just generate the PDF from the code documentation?
//**
//** Because when we write documentation in code file it's probably related to the
//** code in the file. This documentation may be distributed across multiple
//** files.
//**
//** The actual user documentation will have (a) a nice, defined, flow (ordering
//** of the documentation pieces) and (b) additional information that may not
//** quite fit into a specific code file.
//**
//** All in all, having the documentation updated separately turns out to be better
//** than trying to auto-generate it.
//**
//** ## Usage
//** ```
//** $> defg
//**   # ensures README contains all 'user documentation' comments (//** comments)
//**   # and then generates and opens a PDF with the user documentation
//**
//** Options
//**    -h, --help:     show help
//**    -v, --version:  show version
//**    --src:          path of source files (or path of a single source file)
//**    --readme:       path of README file to check (./README.md by default)
//**    --pdf:          path of pdf generated (./README.pdf by default)
//**    --ext:          list of valid source file extensions (js,py,java,sql,ts,sh,go,c,cpp by default)
//** ```
const fs = require('fs')
const path = require('path')
const { mdToPdf } = require('md-to-pdf')
const { exec } = require('child_process')
const arg = require('arg')
const { version } = require('./package.json')

/*    understand/
 * main entry point into our program
 *
 *    way/
 * find all user documentation comments and check them against
 * the README.md. Display any not found or, if all found, open
 * the README as pdf.
 */
function main() {
  const args = arg({
    '--help': Boolean,
    '--version': Boolean,
    '--src': String,
    '--readme': String,
    '--pdf': String,
    '--ext': [ String ],

    '-h': '--help',
    '-v': '--version',
    '-e': '--ext',
  })
  if(args['--help']) return showHelp()
  if(args['--version']) return showVersion()

  const ctx = {
    readme: args['--readme'] || 'README.md',
    src: args['--src'] || '.',
    exts: args['--ext'] || ['js,py,java,sql,ts,sh,go,c,cpp']
  }
  ctx.exts = ctx.exts.join(',').split(',').map(e => '.' + e.trim())
  ctx.pdf = args['--pdf'] || path.join(path.dirname(ctx.readme), path.basename(ctx.readme, '.md') + '.pdf')

  const readme = readreadme(ctx)
  const docs = xtractUserDocz(ctx)
  if(!docs) {
    console.log("no documentation comments \/\/** found")
    openPDF(ctx)
    return
  }
  const missing = checkAgainstReadme(readme, docs)
  if(!missing) openPDF(ctx)
  else display(missing)
}

function showHelp() {
  console.log(`defg: Generate README.md from code documentation (\/\/** documentation comments)`)
}
function showVersion() {
  console.log(version)
}

/*    way/
 * safetly read the output readme file
 */
function readreadme(ctx) {
  try {
    return fs.readFileSync(ctx.readme, 'utf8')
  } catch(e) {
    if(e.code === 'ENOENT') return ""
    throw e
  }
}

/*    way/
 * extract user documentation comment lines from
 * all javascript files, ignoring some common directories (node_modules etc)
 */
function xtractUserDocz(ctx) {
  const docs = {}

  const stat = fs.lstatSync(ctx.src)
  if(stat && stat.isFile()) xtract_1(ctx.src)
  else x_1(ctx.src)
  if(Object.keys(docs).length) return docs

  function x_1(p) {
    const ntries = fs.readdirSync(p, { withFileTypes: true })
    ntries.map(ntry => {
      if(ntry.isDirectory() && is_ok_1(ntry.name)) return x_1(path.join(p, ntry.name))
      if(!ntry.isFile()) return
      if(!ntry.name) return
      let m = false
      ctx.exts.map(ext => {
        if(ntry.name.endsWith(ext)) m = true
      })
      if(m) xtract_1(path.join(p, ntry.name))
    })
  }

  function is_ok_1(n) {
    if(!n) return
    if(n === 'node_modules') return
    if(n.startsWith('.')) return
    if(n === 'dist') return
    if(n === 'tmp' || n === '_tmp') return

    return true
  }

  function xtract_1(f) {
    const data = fs.readFileSync(f, "utf8")
    const lines = data.split(/[\r\n]+/g)
    lines.map(l => {
      let d
      const e = l.match(/\/\/\*\* ?$/)
      if(e) d = ""
      else {
        const m = l.match(/\/\/\*\* (.*)/)
        if(!m) return
        d = m[1]
      }
      if(!docs[f]) docs[f] = []
      docs[f].push(d)
    })
  }
}

/*    way/
 * walk each documentation line and check that
 * it is present in the readme, returning missing lines
 */
function checkAgainstReadme(readme, docs) {
  const lines = readme.split(/\r\n|\n|\r/g)
  const missing = {}
  for(let f in docs) {
    const issing = docs[f].filter(l => {
      if(l === '') return true
      const ndx = lines.indexOf(l)
      if(ndx === -1) return true
      lines.splice(ndx, 1)
    })
    const issin = strip_1(issing)
    if(issin) missing[f] = issin
  }
  if(Object.keys(missing).length) return missing


  /*    way/
   * walk forward until the first non-blank line
   * then walk until the last non-blank line
   */
  function strip_1(a) {
    if(!a) return
    let s = -1
    let e = -1
    for(let i = 0;i < a.length;i++) {
      if(s == -1 && a[i] !== '') s = i
      if(a[i] !== '') e = i+1
    }
    if(e > 0) return a.slice(s, e)
  }
}

/*    way/
 * generate and open pdf
 */
async function openPDF(ctx) {
  if(!fs.existsSync(ctx.readme)) {
    console.log(`${ctx.readme} not found to open!`)
    return
  }
  await mdToPdf({ path: ctx.readme }, { dest: ctx.pdf }).catch(console.error)
  openItem(ctx.pdf)
}

/*    way/
 * call the default open application based on platform
 */
function openItem(n) {
  switch (process.platform) {
    case 'darwin' : return exec('open ' + n)
    case 'win32' : return exec('start ' + n)
    case 'win64' : return exec('start ' + n)
    default : return exec('xdg-open ' + n)
  }
}

/*    way/
 * show the missing lines
 */
function display(missing) {
  console.log("README missing these lines:")
  for(let f in missing) {
    console.log("\n" + f +":")
    missing[f].map(l => console.log(l))
  }
}

main()
