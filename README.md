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
  <div style="background:white;border-radius:4px;">
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
   --src:          path of source files (or path of a single source file)
   --readme:       path of README file to check (./README.md by default)
   --style:        path of CSS file containing styling (./README.css by default)
   --page-def:     path of file containing pdf page definition
   --pdf:          path of pdf generated (./README.pdf by default)
   --ext:          list of valid source file extensions (js,py,java,sql,ts,sh,go,c,cpp by default)
   --ignore-src:   ignore source and just generate from readme
```

<div class="page-break"></div>

# Technical Details

<div class="insert-block">
For those interested, this section discusses some algorithmic details of <code>defg</code>.
  <div class="techdets">
    <img alt="techdets" src="./techdets.png"></img>
  </div>
</div>

We have three fundamental problems we are solving in `defg`:

1. Reconciling differences between the old README and updated documentation comments.
2. Preserving images, formatting, and `insert-block`s in the README.
3. Assembling the scattered documentation comments together in the right way to match the README.


To solve (1) we will use the standard [Myers-Diff](http://www.xmailserver.org/diff2.pdf) algorithm 
This has been around a long while and probably has the best balance between speed and getting a reasonable result.
However, notice that in order to solve (1) effectively, we need to have a solution for (3) and (2) as well.

Let us define $D_x$ as a "docblock" - a block of documentation comments in a file. If we have $(D_0,D_1,\ldots,D_m)$
docblocks let us define $\Theta_{m!}$ as the set of all permutations of these docblocks. Taking $R$ as the
README, problem (3) then reduces to finding:

$$
  d_i \text{ where } \min_{\forall d_i \in \Theta_{m!}} (R - d_i)
$$

To solve (2), once we have found the best (minimum) $d_i$, we add lines that insert images, formatting, and
inserted blocks to a set of "special" lines $Sp$. Then we find the corresponding docblock for each special
line in $Sp$ and copy the line across in roughly the same position.

<div class="page-break"></div>

## Performance Discussion

There are two major costs we can identify from the above:

1. Calculating $\forall d_i \in \Theta_{m!}$, and
2. Calculating $(R - d_i)$

### Calculating $d_i$

Calculating $\forall d_i \in \Theta_{m!}$ involves finding all the permutations of the elements in $\Theta_{m!}$.
This gives us an upper bound of $O(m!)$. Now this is one of the worst upper bounds we could possibly have
and that means that the algorithm is extremely sensitive to the performance of $(R - d_i)$.

### Calculating $(R - d_i)$

The standard method for calculating $(R - d_i)$ is to use the [Levenshtein distance](https://en.wikipedia.org/wiki/Levenshtein_distance)
or [Dice's Coefficient](https://en.wikipedia.org/wiki/Sørensen–Dice_coefficient). However these have roughly exponential $O(n^2)$ where $n$ is the length of the README.

### Bad News
The total performance of a generic implementation would therefore be $O(m!n^2)$. This is such a slow process it
would almost certainly be useless as the size of the README and number of "docblocks" increases.

We shall see how to handle this issue next.

<div class="page-break"></div>

## Algorithm Design

We therefore have to design an algorithm which can handle all our requirements but also has a fighting chance of
working with reasonable performance.  This is how we do it:

1. Construct a permutation $d_i$ by selecting each docblock $(D_0,D_1,\ldots,D_m)$ in turn, and recursively permuting
   the rest.
2. During the construction, at every step we calculate $(R' - d_i')$ - the difference that we can calculate thus far.
3. During the recursion, we use $(R' - d_i')$ as the starting difference and calculate only the difference from that
   point onward.
4. If, at any point, we discover that the difference is greater than an already calculated difference, we can
   "short-circuit" that entire branch because we know that the minimum value cannot be down that path.

To calculate the partial difference $(R' - d_i')$, we use a line-wise algorithm:

1. Start with pointers at the beginning of $R'$ and $d_i'$.
2. Compare the lines at the current pointers, advancing both if they match
3. If they do not match, look ahead some $\Delta$ lines to see if there is a match.
4. If there is, it must be an insert (or delete) and so advance the corresponding pointer and count the number
   of lines inserted/deleted into the difference.
6. If there is no match, then count the lines as changed, and increase the difference by 2 (counting both lines).

This algorithm has the advantage that (a) it can work with partial permutations and resume them as we needed, (b)
it can incorporate all $Sp$ lines by simply recognizing them during the and, (c) it can exit very early in the cycle
thus trimming the tree effectively.

<div class="insert-block">
In brief, this is the algorithm we are using in <code>defg</code>. You can see the code and details in <code>regen.js</code>.
</div>