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
//** it finds and extracts 'special' comments that start with `//**` or `##**` -
//** these are considered 'user documentation' comments. It then checks that all these
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
//**   # ensures README contains all 'user documentation' comments (//** or ##** comments)
//**   # and then generates and opens a PDF with the user documentation
//**
//** Options
//**    -h, --help:     show help
//**    -v, --version:  show version
//**    --src:          path of source files (or path of a single source file)
//**    --readme:       path of README file to check (./README.md by default)
//**    --style:        path of CSS file containing stying (./README.css by default)
//**    --pdf:          path of pdf generated (./README.pdf by default)
//**    --ext:          list of valid source file extensions (js,py,java,sql,ts,sh,go,c,cpp by default)
//**    --ignore-src:   ignore source and just generate from readme
//** ```
const fs = require('fs')
const path = require('path')
const { mdToPdf } = require('md-to-pdf')
const { exec } = require('child_process')
const arg = require('arg')
const { version } = require('./package.json')

const Diff = require('diff')
const chalk = require('chalk')

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
    '--style': String,
    '--pdf': String,
    '--ext': [ String ],
    '--ignore-src': Boolean,

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

  if(args['--style']) ctx.style = args['--style']
  else if(fs.existsSync("README.css")) ctx.style = "README.css"

  const readme = readreadme(ctx)
  if(args['--ignore-src']) {
    openPDF(ctx)
  } else {
    const docblocks = xtractUserDocz(ctx)
    if(!docblocks) {
      console.log("No documentation comments found...")
      console.log("Documentation comments are single line comments that start with \/\/** or \#\#**")
      openPDF(ctx)
      return
    }

    if(readme == null) {
      saveReadme(ctx, asDiff(docblocks))
    } else {
      regen_readme(ctx, readme, docblocks)
    }
  }
}

function asDiff(docblocks) {
  let diff = []
  docblocks.map(block => {
    diff = diff.concat(block.map(value => {
      value += "\n"
      return { fresh: true, value }
    }))
  })
  return diff
}

/*    way/
 * Find the closest of all permutations of the docblocks
 * and apply that to the README, trying to preserve images already
 * in the README.
 */
function regen_readme(ctx, readme, docblocks) {
  const n = docblocks.length
  const chosen = []
  const perm = []
  const dists = []

  const rlines = readme.split(/[\r\n]/g)

  const min = { dist: null, data: null }
  gen_1(find_min_1)

  const data = min.data.join("\n").trim()
  const diff = Diff.diffLines(readme, data, { ignoreWhitespace: false, newlineIsToken: false })

  saveReadme(ctx, diff)

  function gen_1(cb) {
    if(perm.length == n) return cb()
    for(let i = 0;i < n;i++) {
      if(chosen[i]) continue;
      chosen[i] = true
      perm.push(docblocks[i])
      gen_1(cb)
      perm.pop()
      chosen[i] = false
    }
  }

  /*    way/
   * walk both data and readme in lockstep, inserting special lines from the README into non-matching
   * data (looking 'n' lines ahead for a reasonable match)
   */
  function find_min_1() {
    let data = []
    perm.map(block => data = data.concat(block))
    let nd = 0
    let nr = 0
    let dist = 0
    while(nd < data.length && nr < rlines.length) {
      const ld = data[nd]
      const lr = rlines[nr]
      if(ld === lr) {
        nd++
        nr++
        continue
      }
      if(!ld || isSplLine(ld)) {
        nd++
        continue
      }
      if(!lr || isSplLine(lr)) {
        nr++
        data.splice(nd, 0, lr)
        nd++
        continue
      }
      const maxLookAhead = 7
      let i = 1;
      for(;i < maxLookAhead;i++) {
        const ld_ = data[nd+i]
        const lr_ = rlines[nr+i]
        if(lr_ === ld) {
          dist += i
          nr += i
          break
        }
        if(ld_ === lr) {
          dist += i
          nd += i
          break
        }
      }
      if(i == maxLookAhead) {
        dist += 2
      }
      nd++
      nr++
      if(min.dist != null && dist > min.dist) return
    }
    dists.push(dist)
    min.dist = dist
    min.data = data
  }
}

function isSplLine(l) {
  return l.match(/^[ \t]*[!]\[.*\]\([^)]*\)[ \t\n]*$/) || l.match(/^[ \t]*<.*>[ \t\n]*$/)
}


function showHelp() {
  console.log(`$> defg
  # ensures README contains all 'user documentation' comments (${"//"}** or ${"##"}** comments)
  # and then generates and opens a PDF with the user documentation

Options
   -h, --help:     show help
   -v, --version:  show version
   --src:          path of source files (or path of a single source file)
   --readme:       path of README file to check (./README.md by default)
   --style:        path of CSS file containing stying (./README.css by default)
   --pdf:          path of pdf generated (./README.pdf by default)
   --ext:          list of valid source file extensions (js,py,java,sql,ts,sh,go,c,cpp by default)
   --ignore-src:   ignore source and just generate from readme
`)
}
function showVersion() {
  console.log(version)
}

/*    way/
 * safely read the readme file
 */
function readreadme(ctx) {
  try {
    return fs.readFileSync(ctx.readme, 'utf8').trim()
  } catch(e) {
    if(e.code === 'ENOENT') return null
    throw e
  }
}

/*    way/
 * extract user documentation comment lines from
 * all javascript files, ignoring some common directories (node_modules etc)
 */
function xtractUserDocz(ctx) {
  const docblocks = []

  const stat = fs.lstatSync(ctx.src)
  if(stat && stat.isFile()) xtract_1(ctx.src, docblocks)
  else x_1(ctx.src)
  if(docblocks.length) return docblocks

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
      if(m) xtract_1(path.join(p, ntry.name), docblocks)
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

  /*    understand/
   * extract all the comments in files in blocks so they can be
   * re-arranged.
   * Eg:
   *   file1.js:
   *      comment1
   *      comment1
   *      ...
   *      comment2
   *      comment2
   *   file2.js:
   *      ...
   *      comment3
   *      comment3
   *
   * will be extracted as:
   *    [
   *      ["comment1", "comment1"],
   *      ["comment2", "comment2"],
   *      ["comment3", "comment3"],
   *    ]
   *
   *      way/
   * Add each documentation line to an active docblock list, closing the
   * existing active list whenever we find a non-documentation
   * line and creating a new one when needed.
   */
  function xtract_1(f, docblocks) {
    let active = null

    const data = fs.readFileSync(f, "utf8")
    const lines = data.split(/[\r\n]/g)
    lines.map(l => {
      const doc = xtract_doc_comment_1(l)
      if(doc === null) {
        active = null
      } else {
        if(!active) {
          active = []
          docblocks.push(active)
        }
        active.push(doc)
      }
    })
  }

  function xtract_doc_comment_1(l) {
    let m
    m = l.match(/[/#][/#]\*\* ?$/)
    if(m) return ""
    m = l.match(/[/#][/#]\*\* (.*)/)
    if(m) return m[1]
    return null
  }
}

function saveReadme(ctx, diff) {
  const o = []
  for(let i = 0;i < diff.length;i++) {
    const part = diff[i]
    if(part.fresh) {
      console.log(chalk.magenta(part.value.trim()))
      o.push(part.value);
    } else if(part.removed) {
      console.log(chalk.red('xxx '+part.value.trim()+' xxx'))
    } else if(part.added) {
      console.log(chalk.blue(part.value.trim()))
      o.push(part.value);
    } else {
      console.log(chalk.grey(part.value.trim()))
      o.push(part.value);
    }
  }
  const data = o.join("").trim()
  fs.writeFile(ctx.readme, data, err => {
    if(err) console.error(err)
    else openPDF(ctx);
  })
}

/*    way/
 * generate and open pdf
 */
async function openPDF(ctx) {
  if(!fs.existsSync(ctx.readme)) {
    console.log(`${ctx.readme} not found to open!`)
    return
  }
  const options = { dest: ctx.pdf }
  if(ctx.style) options.stylesheet = ctx.style
  await mdToPdf({ path: ctx.readme }, options).catch(console.error)
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

main()
