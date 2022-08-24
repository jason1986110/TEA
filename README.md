# DEFG - Beautiful Documentation from Code Comments

![logo](./icon.png)

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

<div style="background:#C4A997;padding:1em 3em 3em 1em;margin:2em 4em;border:1px solid #AD876E;border-radius:6px;">

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

  ```
  format: A4
  margin: 20mm 20mm
  printBackground: true
  headerTemplate: |-
    <style>
      .header, .footer {
        width: calc(100% - 30mm);
        margin: 0 auto;
        text-align: left;
        font-family: system-ui;
        font-size: 6px;
        padding: 4px;
      }
      .header {
        border-bottom: 1px solid #333;
      }
      .footer {
        border-top: 1px solid #333;
        text-align: center;
      }
      .date {
        display: block;
        float: right;
      }
    </style>
    <div class="header">
       <span>My Document</span>
       <span class="date"></span>
    </div>
  footerTemplate: |-
    <div class="footer">
        Page <span class="pageNumber"></span>
        of <span class="totalPages"></span>
    </div>
  ```


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
   --src:          path of source files (or path of a single source file)
   --readme:       path of README file to check (./README.md by default)
   --style:        path of CSS file containing stying (./README.css by default)
   --pdf:          path of pdf generated (./README.pdf by default)
   --ext:          list of valid source file extensions (js,py,java,sql,ts,sh,go,c,cpp by default)
   --ignore-src:   ignore source and just generate from readme
```