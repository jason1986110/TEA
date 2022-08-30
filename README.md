# DEFG
Generate beautiful PDF documentation from code

![logo](./icon.png)

## How it Works

1. Step 1: Write documentation comments in code (`//**` or `##**` comments)
2. Step 2: `defg` merges comments into your README/markdown file, updating it.
3. Step 3: `defg` uses plugins to generate a beautifully formatted PDF.

![schematic](./schematic.png)

## Motivation

I find that README's and other documentations tend to get out of
date quickly. `defg` generates a README from documentation
comments, and as these comments are close
to the code, they are be easier to access, modify, and update.

## How does it work?

`defg` trawls through all 'programming' files (.js, .sh, .java, .c, .cpp,...)
it finds and extracts 'special' comments that start with `//**` or `##**`.
These are considered 'user documentation' comments in markdown.
It then uses them to update the README, generate a nice PDF, and opens it.

## First Run

If you run `defg` and there is no README.md file, it will generate one from
all the documentation it has found. During this process, it can get the order
of comments all mixed up. You are encouraged to then go and reorder all the
pieces in the README.md to get it into a nice shape.

## Improving the README

You can also update your README to make it more readable. You can:

1. Add pictures.
2. Add styling.
3. Add text.
4. Configure the page layout.

As you do all these, `defg` will preserve your changes whenever it updates your README.

<div class="page-break"></div>

<div class="sidenote">

### HOW TO IMPROVE THE README

<img style="width:32px;display:block;margin:0 auto" src="./edit.png"></img>

- You can add images in markdown or using the `<img..` tag. Similarily,
  you can add other HTML styling in the document to improve it's look.

- For better control on your styling you can add a README.css which will
  apply the CSS styles to your README while generating the PDF.

- To insert additional text in the README, wrap the additional text
  in a `<div class="insert-block">...</div>`.

- To insert a page break insert a `<div class="page-break" />` and add the style to your CSS:
  ```css
  .page-break {
    page-break-after: always
  }

- To design the page layout, create a `pages.defg` file. Here you can decide the page
  size, header & footer using the following Puppeteer options: https://pptr.dev/api/puppeteer.pdfoptions

<div class="insert-block" style="margin-left:2.2em">
  <h4>Sample</h4>
  <div style="background:white;border-radius:4px;white-space:pre;">
  <code style="white-space:pre">
    format: A4
    margin: 20mm 20mm
    headerTemplate: |-
      &lt;style&gt;
        .header, .footer {
          font-family: system-ui;
          font-size: 6px;
        }
        .header {
          border-bottom: 1px solid #333;
        }
      &lt;/style&gt;
      &lt;div class="header"&gt;
         &lt;span&gt;My Document&lt;/span&gt;
         &lt;span class="date"&gt;&lt;/span&gt;
      &lt;/div&gt;
    footerTemplate: |-
      &lt;div class="footer"&gt;
          Page &lt;span class="pageNumber"&gt;&lt;/span&gt;
          of &lt;span class="totalPages"&gt;&lt;/span&gt;
      &lt;/div&gt;
    </code>
    </div>
</div>


</div>


<div class="page-break"></div>

## Usage

```
$> defg
  # ensures README contains all 'user documentation' comments (//** or ##** comments)
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
   --pdf:          path of output pdf generated (./README.pdf by default)
   --ignore-src:   ignore source and just generate PDF from README.md
   --quick:        use faster (but less accurate) resolution algorithm
```
