#!/usr/bin/env node
//** # DEFG - Beautiful Documentation from Code Comments
//**
//** ## Motivation
//**
//** I find that README's and other documentations tend to get out of
//** date quickly. `defg` generates a README from documentation
//** comments, and as these comments are close
//** to the code, they are be easier to access, modify, and update.
//**
//** ## How does it work?
//**
//** `defg` trawls through all 'programming' files (.js, .sh, .java, .c, .cpp,...)
//** it finds and extracts 'special' comments that start with `//**` or `##**`.
//** These are considered 'user documentation' comments in markdown.
//** It then uses them to update the README, generate a nice PDF, and opens it.
//**
//** ## First Run
//**
//** If you run `defg` and there is no README.md file, it will generate one from
//** all the documentation it has found. During this process, it can get the order
//** of comments all mixed up. You are encouraged to then go and reorder all the
//** pieces in the README.md to get it into a nice shape.
//**
//** ## Improving the README
//**
//** You can also update your README to make it more readable. You can:
//**
//** 1. Add pictures.
//** 2. Add styling.
//** 3. Add text.
//** 4. Configure the page layout.
//**
//** As you do all these, `defg` will preserve your changes whenever it updates your README.
//**
//** ### HOW TO IMPROVE THE README
//**
//** - You can add images in markdown or using the `<img..` tag. Similarily,
//**   you can add other HTML styling in the document to improve it's look.
//**
//** - For better control on your styling you can add a README.css which will
//**   apply the CSS styles to your README while generating the PDF.
//**
//** - To insert additional text in the README, wrap the additional text
//**   in a `<div class="insert-block">...</div>`.
//**
//** - To insert a page break insert a `<div class="page-break" />` and add the style to your CSS:
//**   ```css
//**   .page-break {
//**     page-break-after: always
//**   }
//**
//** - To design the page layout, create a `pages.defg` file. Here you can decide the page
//**   size, header & footer using the following Puppeteer options: https://pptr.dev/api/puppeteer.pdfoptions
//**
//** ## Usage
//**
//** ```
//** $> defg
//**   # ensures README contains all 'user documentation' comments (//** or ##** comments)
//**   # and then generates and opens a PDF with the user documentation
//**
//** Options
//**    -h, --help:     show help
//**    -v, --version:  show version
//**    --src:          glob paths to source files [can be multiple]
//**    --skip:         glob paths to exclude/ignore when searching source files
//**    --ext:          list of valid source file extensions (js,py,java,sql,ts,sh,go,c,cpp by default)
//**    --readme:       path of README file to merge (./README.md by default)
//**    --style:        path of CSS file containing styling (./README.css by default)
//**    --page-def:     path of file containing pdf page definition
//**    --pdf:          path of output pdf generated (./README.pdf by default)
//**    --ignore-src:   ignore source and just generate PDF from README.md
//**    --quick:        use faster (but less accurate) resolution algorithm
//** ```
const fs = require('fs')
const path = require('path')
const { mdToPdf } = require('md-to-pdf')
const { exec } = require('child_process')
const arg = require('arg')
const { version } = require('./package.json')

const chalk = require('chalk')
let globby
import('globby')
.then(v => {
  globby = v;
  main();
})

const matter = require('gray-matter')

const regen = require('./regen.js')

/*    understand/
 * main entry point into our program
 *
 *    way/
 * load the context with user parameters, load any plugins,
 * extract all the documenation comments if needed, and regenerate the documentation.
 */
function main() {
  const ctx = loadCtx();

  loadPlugins(ctx, (err, plugins) => {
    if(err) return console.error(err);
    ctx.plugins = plugins;
    readreadme(ctx, (err, readme) => {
      if(err) return console.error(err);
      if(ctx.ignore_src) {
        docFromMd(ctx);
      } else {
        xtractUserDocz(ctx, (err, docblocks) => {
          if(err) return console.error(err);
          regenerate(ctx, readme, docblocks);
        });
      }
    });
  });
}

function loadCtx() {
  const args = arg({
    '--help': Boolean,
    '--version': Boolean,
    '--src': [ String ],
    '--skip': [ String ],
    '--ext': [ String ],
    '--readme': String,
    '--style': String,
    '--page-def': String,
    '--pdf': String,
    '--ignore-src': Boolean,
    '--quick': Boolean,
    '--as-html': Boolean,
    '--plugin': [ String ],

    '-h': '--help',
    '-v': '--version',
    '-e': '--ext',
  })
  if(args['--help']) return showHelp()
  if(args['--version']) return showVersion()

  const ctx = {
    readme: args['--readme'] || 'README.md',
    src: args['--src'] || ['**'],
    skip: args['--skip'],
    exts: args['--ext'] || ['js,py,java,sql,ts,sh,go,c,cpp'],
    page_options: args['--page-def'] || 'page.defg',
    quick: args['--quick'] || false,
    html: args['--as-html'] || false,
    mathjax: "mathjax-config.js",
    plugins: args['--plugin'],
    ignore_src: args['--ignore-src'],
  }

  ctx.exts = ctx.exts.join(',').split(',').map(e => '.' + e.trim())
  ctx.pdf = args['--pdf'] || path.join(path.dirname(ctx.readme), path.basename(ctx.readme, '.md') + '.pdf')
  if(ctx.html) ctx.html = path.join(path.dirname(ctx.pdf), path.basename(ctx.pdf, '.pdf') + '.html')

  if(args['--style']) ctx.style = args['--style']
  else if(fs.existsSync("README.css")) ctx.style = "README.css"

  return ctx;
}

function loadPlugins(ctx, cb) {
  if(!ctx.plugins) return cb();
  const plugins = {}
  for(let i = 0;i < ctx.plugins.length;i++) {
    const p = ctx.plugins[i];
    try {
      plugins[p] = require(p);
    } catch(e) {
      return cb(`Failed to load plugin: ${p}`);
    }
  }
  return cb(null, plugins);
}

function asDiff(docblocks) {
  let diff = []
  docblocks.map(block => {
    diff = diff.concat(block.map(value => {
      return { fresh: true, value }
    }))
  })
  return diff
}

function showHelp() {
  console.log(`$> defg
  # ensures README contains all 'user documentation' comments (${"//"}** or ${"##"}** comments)
  # and then generates and opens a PDF with the user documentation

Options
   -h, --help:     show help
   -v, --version:  show version
   --src:          glob paths to source files [can be multiple]
   --skip:         glob paths to exclude/ignore when searching source files
   --ext:          list of valid source file extensions (js,py,java,sql,ts,sh,go,c,cpp by default)
   --readme:       path of README file to merge (./README.md by default)
   --style:        path of CSS file containing styling (./README.css by default)
   --page-def:     path of file containing pdf page definition
   --pdf:          path of pdf generated (./README.pdf by default)
   --ignore-src:   ignore source and just generate PDF from README.md
   --quick:        use a faster (but less accurate) resolution algorithm
`)
}
function showVersion() {
  console.log(version)
}

function readreadme(ctx, cb) {
  readsafely(ctx.readme, (err, data) => {
    if(err) return cb(err);
    if(!ctx.plugins) return cb(null, data);
    const names = Object.keys(ctx.plugins);
    p_r_1(0);
  });

  function p_r_1(ndx) {
    if(ndx >= names.length) return cb(null, data);
    const plugin = ctx.plugins[names[ndx]];
    if(plugin.raw_readme) data = plugin.raw_readme(data);
    p_r_1(ndx+1);
  }
}

function readpageoptions(ctx, cb) {
  readsafely(ctx.page_options, (err, page_options) => {
    if(err) return cb(err);

    if(!page_options) return cb();

    if(!page_options.match(/^[ \t]/)) {
      page_options = page_options.split(/[\r\n]/g).map(l => '  ' + l).join("\n");
    }

    const front = matter(`---
${page_options}
---
  `);

    if(front) cb(null, front.data);
  });
}

/*    way/
 * safely read a file
 */
function readsafely(f, cb) {
  fs.readFile(f, 'utf8', (err, data) => {
    if(err) {
      if(err.code === 'ENOENT') return cb();
      return cb(err);
    } else {
      return cb(null, data);
    }
  });
}

/*    way/
 * safely read the readme file
 */
function read(ctx) {
  try {
    return fs.readFileSync(ctx.readme, 'utf8').trim()
  } catch(e) {
    if(e.code === 'ENOENT') return null
    throw e
  }
}

/*    way/
 * extract user documentation comment lines from all files with the relevant extensions
 */
function xtractUserDocz(ctx, cb) {
  if(!ctx.src) return cb("No source files found to search. Do you want to --ignore-src?");

  const globbyopts = { ignoreFiles: '.gitignore' };
  if(ctx.skip) globbyopts.ignore = ctx.skip;
  const src = globby.globbySync(ctx.src, globbyopts);

  const docblocks = [];
  src.forEach(f => {
    let m = true;
    if(ctx.exts) {
      m = false;
      ctx.exts.forEach(ext => {
        if(f.endsWith(ext)) m = true
      });
    }
    if(m) xtract_1(f, docblocks)
  });

  if(!docblocks.length) cb("No documentation comments found!");
  else cb(null, docblocks);

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

/*    way/
 * create a new markdown or merge the existing markdown then generate the doc from it.
 */
function regenerate(ctx, readme, docblocks) {
  if(readme == null) {
    saveReadme(ctx, asDiff(docblocks));
  } else {
    regen_readme(ctx, readme, docblocks)
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
  const data = o.join("\n").trim()
  fs.writeFile(ctx.readme, data, err => {
    if(err) console.error(err)
    else docFromMd(ctx);
  })
}

/*    way/
 * generate and open pdf/html from the markdown
 */
async function docFromMd(ctx) {
  if(!fs.existsSync(ctx.readme)) {
    console.error(`${ctx.readme} not found to open!`)
    return
  }

  readreadme(ctx, (err, readme) => {
    if(err) return console.error(err);
    readpageoptions(ctx, (err, page_options) => {
      if(err) return console.error(err);

      let created = false

      const options = {}
      if(ctx.html) {
        options.dest = ctx.html;
        options.as_html = true;
      } else {
        options.dest = ctx.pdf;
      }
      if(ctx.style) options.stylesheet = ctx.style
      if(page_options) {
        options.pdf_options = page_options
        options.pdf_options.displayHeaderFooter = true
      }
      const mathjax = ctx.mathjax ? path.resolve(ctx.mathjax) : null;
      if(mathjax) {
        if(!fs.existsSync(mathjax)) {
          const mconf = `MathJax = {
	tex: {
		tags: 'ams',
		inlineMath: [
			['$', '$'],
		],
	},
};`
          fs.writeFileSync(mathjax, mconf)
          created = true
        }
        options.script = [
          { path: mathjax },
          { url: "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js" },
        ]
      }

      mdToPdf({ path: ctx.readme }, options)
        .then(() => {
          if(created) fs.unlinkSync(mathjax)

          if(ctx.html) openItem(ctx.html);
          else openItem(ctx.pdf);
        })
        .catch(console.error)

    });

  });
}

function regen_readme(ctx, readme, docblocks) {
  const diff = regen(ctx, readme, docblocks)
  saveReadme(ctx, diff)
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
